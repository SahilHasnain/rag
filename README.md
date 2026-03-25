# Urdu Book RAG Application

A Retrieval-Augmented Generation (RAG) application built with Next.js and LangChain for querying a 5000-page Urdu book.

## Features

- 📚 Index large Urdu text documents
- 🔍 Semantic search using OpenAI embeddings
- 💬 Chat interface for asking questions
- 🎯 Source-of-truth responses only from your book
- 🐳 Docker support for easy deployment
- 🌙 Dark mode support

## Tech Stack

- **Next.js 16.2** - React framework with App Router
- **LangChain** - RAG orchestration framework
- **FAISS** - Local vector database
- **OpenAI** - Embeddings (text-embedding-3-large) and LLM (GPT-4)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## Getting Started

### Prerequisites

- Node.js 20+
- OpenAI API key

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Index Your Book

- Paste your Urdu book text in the left panel
- Click "Index Book" to process and store embeddings
- Wait for confirmation message

### 2. Ask Questions

- Type questions in the chat interface
- Get answers based only on your book content
- View source excerpts for each answer

## Project Structure

```
├── app/
│   ├── actions.ts              # Server Actions for RAG operations
│   ├── components/
│   │   ├── ChatInterface.tsx   # Chat UI component
│   │   └── UploadSection.tsx   # Book upload component
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── vectorstore.ts          # Vector store operations
├── data/                       # Vector store persistence (auto-created)
└── package.json
```

## How It Works

1. **Indexing Pipeline**:
   - Text is split into 1000-character chunks with 200-character overlap
   - Each chunk is embedded using OpenAI's text-embedding-3-large
   - Embeddings are stored in FAISS vector database locally

2. **Query Pipeline**:
   - User question is embedded
   - Top 3 most similar chunks are retrieved
   - Context + question sent to GPT-4
   - Response generated based only on retrieved context

## Configuration

### Chunk Size & Overlap

Edit `lib/vectorstore.ts`:

```typescript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // Adjust for your needs
  chunkOverlap: 200,    // Overlap between chunks
});
```

### Number of Retrieved Documents

Edit `app/actions.ts`:

```typescript
const relevantDocs = await searchSimilarDocuments(query, 3); // Change 3 to desired number
```

### LLM Model

Edit `app/actions.ts`:

```typescript
const model = new ChatOpenAI({
  modelName: 'gpt-4',  // or 'gpt-3.5-turbo' for faster/cheaper
  temperature: 0,
});
```

## Multilingual Support

The app supports Urdu and other languages. OpenAI's embeddings handle 100+ languages including:
- Urdu (اردو)
- Arabic (العربية)
- English
- And more

## Performance Tips

- For faster development, start with smaller text samples
- Use `gpt-3.5-turbo` instead of `gpt-4` for quicker responses
- Adjust chunk size based on your book's structure
- Consider using Anthropic Claude for better multilingual support

## Troubleshooting

### "Vector store not initialized"
- Make sure you've uploaded and indexed your book text first

### Slow indexing
- Large texts take time to process
- Consider breaking into smaller sections for testing

### Poor answer quality
- Adjust chunk size and overlap
- Increase number of retrieved documents
- Try different embedding models

## Next Steps

- [ ] Add PDF upload support
- [ ] Implement conversation history
- [ ] Add multiple book support
- [ ] Deploy to production (Vercel/Railway)
- [ ] Add authentication

## License

MIT
