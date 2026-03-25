import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';

const VECTOR_STORE_PATH = path.join(process.cwd(), 'data', 'vectorstore.json');

let cachedVectorStore: MemoryVectorStore | null = null;

export async function initializeVectorStore(
  text: string, 
  metadata?: { bookName?: string; author?: string },
  onProgress?: (processed: number, total: number) => void
) {
  // Split text into larger chunks for better context
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500, // Increased from 1000 for more context
    chunkOverlap: 300, // Increased overlap for better continuity
  });

  const docs = await textSplitter.createDocuments([text]);
  
  console.log(`📚 Total chunks to process: ${docs.length}`);
  
  // Add metadata to each chunk
  const docsWithMetadata = docs.map((doc, index) => {
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        chunkIndex: index,
        totalChunks: docs.length,
        bookName: metadata?.bookName || 'Islamic Book',
        author: metadata?.author || 'Unknown',
        chunkSize: doc.pageContent.length,
      },
    });
  });

  // Create embeddings using Transformers.js (FREE & LOCAL!)
  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: 'Xenova/all-MiniLM-L6-v2',
  });

  // Process in batches with progress tracking
  const batchSize = 10;
  const allEmbeddings: number[][] = [];
  
  for (let i = 0; i < docsWithMetadata.length; i += batchSize) {
    const batch = docsWithMetadata.slice(i, i + batchSize);
    const batchTexts = batch.map(doc => doc.pageContent);
    
    // Generate embeddings for batch
    const batchEmbeddings = await embeddings.embedDocuments(batchTexts);
    allEmbeddings.push(...batchEmbeddings);
    
    // Report progress
    const processed = Math.min(i + batchSize, docsWithMetadata.length);
    console.log(`⏳ Progress: ${processed}/${docsWithMetadata.length} chunks (${Math.round(processed / docsWithMetadata.length * 100)}%)`);
    
    if (onProgress) {
      onProgress(processed, docsWithMetadata.length);
    }
  }

  // Create vector store
  const vectorStore = new MemoryVectorStore(embeddings);
  
  // Add documents with pre-computed embeddings
  await vectorStore.addVectors(allEmbeddings, docsWithMetadata);
  
  // Save to disk as JSON
  const data = await vectorStore.memoryVectors;
  
  // Ensure directory exists
  if (!fs.existsSync(path.dirname(VECTOR_STORE_PATH))) {
    fs.mkdirSync(path.dirname(VECTOR_STORE_PATH), { recursive: true });
  }
  
  fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(data));
  
  // Cache it
  cachedVectorStore = vectorStore;
  
  console.log(`✅ Indexed ${docs.length} chunks from ${metadata?.bookName || 'book'}`);
  
  return vectorStore;
}

export async function loadVectorStore() {
  // Return cached if available
  if (cachedVectorStore) {
    return cachedVectorStore;
  }

  if (!fs.existsSync(VECTOR_STORE_PATH)) {
    throw new Error('Vector store not initialized. Please upload your book first.');
  }

  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: 'Xenova/all-MiniLM-L6-v2',
  });

  // Load from disk
  const data = JSON.parse(fs.readFileSync(VECTOR_STORE_PATH, 'utf-8'));
  
  // Recreate vector store
  const vectorStore = new MemoryVectorStore(embeddings);
  vectorStore.memoryVectors = data;
  
  cachedVectorStore = vectorStore;
  
  return vectorStore;
}

export async function searchSimilarDocuments(query: string, k: number = 10) {
  const vectorStore = await loadVectorStore();
  return await vectorStore.similaritySearch(query, k);
}

// Multi-query retrieval: generate related questions and search for all
export async function multiQueryRetrieval(query: string): Promise<Document[]> {
  const vectorStore = await loadVectorStore();
  
  // Generate related queries (you can enhance this with LLM later)
  const relatedQueries = [
    query,
    `${query} کی تفصیل`, // Details about query
    `${query} کے بارے میں`, // About query
  ];
  
  const allDocs: Document[] = [];
  const seenContent = new Set<string>();
  
  for (const q of relatedQueries) {
    const docs = await vectorStore.similaritySearch(q, 5);
    
    // Deduplicate based on content
    for (const doc of docs) {
      if (!seenContent.has(doc.pageContent)) {
        seenContent.add(doc.pageContent);
        allDocs.push(doc);
      }
    }
  }
  
  return allDocs.slice(0, 10); // Return top 10 unique documents
}
