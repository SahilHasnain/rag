'use server';

import { initializeVectorStore, searchSimilarDocuments, multiQueryRetrieval } from '@/lib/vectorstore';
import { createJob, updateJob, getJob } from '@/lib/jobQueue';
import pdf from 'pdf-parse';

export async function uploadBookText(text: string) {
  try {
    await initializeVectorStore(text);
    return { success: true, message: 'Book indexed successfully!' };
  } catch (error) {
    console.error('Error indexing book:', error);
    return { success: false, message: `Failed to index book: ${error}` };
  }
}

export async function uploadBookPDF(formData: FormData) {
  try {
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return { success: false, message: 'No file provided' };
    }

    if (file.type !== 'application/pdf') {
      return { success: false, message: 'Please upload a PDF file' };
    }

    // Create a job for tracking
    const job = createJob('pdf_indexing');

    // Start background processing (don't await)
    processBookPDFInBackground(file, job.id).catch(err => {
      console.error('Background processing error:', err);
      updateJob(job.id, {
        status: 'failed',
        message: `Error: ${err.message}`,
        completedAt: Date.now(),
      });
    });

    return { 
      success: true, 
      jobId: job.id,
      message: `PDF upload started! Processing in background. Job ID: ${job.id}` 
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    return { success: false, message: `Failed to process PDF: ${error}` };
  }
}

async function processBookPDFInBackground(file: File, jobId: string) {
  updateJob(jobId, { status: 'processing', message: 'Extracting text from PDF...' });

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract text from PDF
  const data = await pdf(buffer);
  const extractedText = data.text;

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error('No text found in PDF. Make sure it\'s not a scanned image.');
  }

  updateJob(jobId, { 
    message: `Extracted ${data.numpages} pages. Creating embeddings...` 
  });

  // Index with progress tracking
  await initializeVectorStore(
    extractedText,
    { bookName: file.name },
    (processed, total) => {
      const progress = Math.round((processed / total) * 100);
      updateJob(jobId, {
        progress,
        totalChunks: total,
        processedChunks: processed,
        message: `Processing embeddings: ${processed}/${total} chunks (${progress}%)`,
      });
    }
  );

  updateJob(jobId, {
    status: 'completed',
    progress: 100,
    message: `✅ Successfully indexed ${data.numpages} pages with ${extractedText.length} characters!`,
    completedAt: Date.now(),
  });
}

export async function getJobStatus(jobId: string) {
  const job = getJob(jobId);
  return job;
}

async function callHuggingFaceAPI(prompt: string, maxTokens: number = 500): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not set in .env.local');
  }

  console.log('Calling HuggingFace API...');

  const response = await fetch(
    'https://router.huggingface.co/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.3, // Slightly higher for more natural scholarly responses
      }),
    }
  );

  console.log('HuggingFace API response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('HuggingFace API error:', error);
    throw new Error(`HuggingFace API error: ${error}`);
  }

  const data = await response.json();
  console.log('HuggingFace API response received');
  
  const result = data.choices?.[0]?.message?.content || 'No response generated';
  
  return result;
}

export async function queryBook(query: string) {
  try {
    // Use multi-query retrieval for better coverage
    const relevantDocs = await multiQueryRetrieval(query);
    
    if (relevantDocs.length === 0) {
      return {
        success: true,
        answer: 'معذرت، اس سوال کے بارے میں کتاب میں کوئی معلومات نہیں ملیں۔\n\nApologies, no relevant information found in the book for this question.',
        sources: [],
      };
    }

    // Prepare context with proper citations
    const contextWithCitations = relevantDocs
      .map((doc, i) => {
        const bookName = doc.metadata?.bookName || 'Islamic Book';
        const chunkIndex = doc.metadata?.chunkIndex || i;
        return `[مصدر ${i + 1} - ${bookName} - حصہ ${chunkIndex + 1}]:\n${doc.pageContent}`;
      })
      .join('\n\n---\n\n');

    // Enhanced scholarly prompt
    const prompt = `You are a knowledgeable Islamic scholar (عالم دین) with deep understanding of Islamic texts, theology, jurisprudence, and traditions. You have been trained on authentic Islamic literature.

Your role is to:
1. Provide scholarly, well-reasoned answers based on the provided texts
2. Synthesize information from multiple sources when relevant
3. Explain concepts with proper context and reasoning
4. Cite sources appropriately
5. Answer in the same language as the question (Urdu or English)
6. If the texts don't contain sufficient information, acknowledge this honestly

Context from Islamic texts:
${contextWithCitations}

Student's Question: ${query}

Instructions for your response:
- Begin with a direct answer to the question
- Provide detailed explanation with reasoning
- Reference the sources (مصدر 1, مصدر 2, etc.) when making specific claims
- If multiple perspectives exist in the texts, present them fairly
- Use scholarly tone but remain accessible
- If the question cannot be fully answered from the provided texts, state this clearly
- Answer in ${query.match(/[\u0600-\u06FF]/) ? 'Urdu (اردو)' : 'English'}

Scholarly Answer:`;

    // Call HuggingFace API with increased token limit for detailed responses
    const answer = await callHuggingFaceAPI(prompt, 1000);
    
    return {
      success: true,
      answer,
      sources: relevantDocs.map((doc, i) => ({
        id: i + 1,
        content: doc.pageContent.substring(0, 300) + '...',
        bookName: doc.metadata?.bookName || 'Islamic Book',
        chunkIndex: doc.metadata?.chunkIndex || i,
      })),
    };
  } catch (error) {
    console.error('Error querying book:', error);
    
    // Fallback: return context directly if API fails
    try {
      const relevantDocs = await multiQueryRetrieval(query);
      const context = relevantDocs
        .map((doc, i) => {
          const bookName = doc.metadata?.bookName || 'Islamic Book';
          return `[مصدر ${i + 1} - ${bookName}]:\n${doc.pageContent}`;
        })
        .join('\n\n---\n\n');

      return {
        success: true,
        answer: `⚠️ API Error occurred. Here are the relevant passages from the Islamic texts:\n\n${context}\n\n---\n\nPlease read the above passages to find your answer.`,
        sources: relevantDocs.map((doc, i) => ({
          id: i + 1,
          content: doc.pageContent.substring(0, 300) + '...',
          bookName: doc.metadata?.bookName || 'Islamic Book',
          chunkIndex: doc.metadata?.chunkIndex || i,
        })),
      };
    } catch (fallbackError) {
      return {
        success: false,
        answer: 'An error occurred while processing your question.',
        sources: [],
      };
    }
  }
}
