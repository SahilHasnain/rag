'use client';

import { useState, useTransition } from 'react';
import { queryBook } from '../actions';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        id: number;
        content: string;
        bookName?: string;
        chunkIndex?: number;
    }>;
};

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');

        startTransition(async () => {
            const result = await queryBook(input);

            const assistantMessage: Message = {
                role: 'assistant',
                content: result.answer,
                sources: result.sources,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col h-[600px]">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
                Ask Questions
            </h2>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 mt-8">
                        <p className="text-lg mb-2">🕌 اسلامی عالم سے سوال کریں</p>
                        <p className="text-lg mb-4">Ask the Islamic Scholar</p>
                        <div className="text-sm space-y-1">
                            <p>Example questions:</p>
                            <p className="text-slate-400">• "عقائد کے بارے میں کیا کہتے ہو؟"</p>
                            <p className="text-slate-400">• "What does the book say about faith?"</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded-lg ${message.role === 'user'
                                ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                                : 'bg-slate-50 dark:bg-slate-700/50 mr-8'
                                }`}
                        >
                            <div className="font-semibold text-sm mb-1 text-slate-700 dark:text-slate-300">
                                {message.role === 'user' ? '👤 You (آپ)' : '🕌 Islamic Scholar (عالم دین)'}
                            </div>
                            <div className="text-slate-900 dark:text-white whitespace-pre-wrap">
                                {message.content}
                            </div>

                            {message.sources && message.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                                        📚 Sources (مصادر):
                                    </div>
                                    <div className="space-y-2">
                                        {message.sources.map((source) => (
                                            <details
                                                key={source.id}
                                                className="text-xs bg-slate-100 dark:bg-slate-800 rounded p-2"
                                            >
                                                <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400">
                                                    مصدر {source.id} - {source.bookName || 'Islamic Book'}
                                                    {source.chunkIndex !== undefined && ` (حصہ ${source.chunkIndex + 1})`}
                                                </summary>
                                                <div className="mt-2 text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-blue-300 dark:border-blue-600">
                                                    {source.content}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}

                {isPending && (
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 mr-8">
                        <div className="flex items-center space-x-2">
                            <div className="animate-pulse">🤔 عالم سوچ رہے ہیں... Scholar is thinking...</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isPending}
                    className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg
                   bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-slate-100 dark:disabled:bg-slate-800"
                />
                <button
                    type="submit"
                    disabled={isPending || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                   text-white font-semibold py-3 px-6 rounded-lg
                   transition-colors duration-200
                   disabled:cursor-not-allowed"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
