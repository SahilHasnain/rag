import ChatInterface from './components/ChatInterface';
import UploadSection from './components/UploadSection';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Urdu Book RAG Assistant
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Ask questions about your book and get accurate answers
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <UploadSection />
          <ChatInterface />
        </div>
      </div>
    </main>
  );
}
