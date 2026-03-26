'use client';

import { useState, useTransition, useEffect } from 'react';
import { uploadBookText, listPDFs, indexPDF, getJobStatus } from '../actions';

export default function UploadSection() {
    const [text, setText] = useState('');
    const [uploadMode, setUploadMode] = useState<'pdf' | 'text'>('pdf');
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [pdfFiles, setPdfFiles] = useState<Array<{ name: string; size: number; sizeInMB: string; modifiedAt: string }>>([]);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState<{ progress: number; message: string } | null>(null);

    // Load PDF list on mount
    useEffect(() => {
        if (uploadMode === 'pdf') {
            loadPDFs();
        }
    }, [uploadMode]);

    const loadPDFs = () => {
        startTransition(async () => {
            const result = await listPDFs();
            if (result.success) {
                setPdfFiles(result.files);
            }
        });
    };

    const handleIndexPDF = (filename: string) => {
        startTransition(async () => {
            const result = await indexPDF(filename);

            if (result.success && result.jobId) {
                setJobId(result.jobId);
                setMessage({
                    type: 'success',
                    text: 'PDF indexing started in background! You can close this page.',
                });

                // Start polling for progress
                pollJobProgress(result.jobId);
            } else {
                setMessage({
                    type: 'error',
                    text: result.message,
                });
            }
        });
    };

    const pollJobProgress = async (id: string) => {
        const interval = setInterval(async () => {
            const job = await getJobStatus(id);

            if (!job) {
                clearInterval(interval);
                return;
            }

            setJobProgress({
                progress: job.progress || 0,
                message: job.message || 'Processing...',
            });

            if (job.status === 'completed') {
                clearInterval(interval);
                setMessage({
                    type: 'success',
                    text: job.message || 'Processing completed!',
                });
                setJobId(null);
                setJobProgress(null);
            } else if (job.status === 'failed') {
                clearInterval(interval);
                setMessage({
                    type: 'error',
                    text: job.message || 'Processing failed',
                });
                setJobId(null);
                setJobProgress(null);
            }
        }, 2000); // Poll every 2 seconds
    };

    const handleTextUpload = () => {
        if (!text.trim()) {
            setMessage({ type: 'error', text: 'Please paste some text first' });
            return;
        }

        startTransition(async () => {
            const result = await uploadBookText(text);
            setMessage({
                type: result.success ? 'success' : 'error',
                text: result.message,
            });

            if (result.success) {
                setText('');
            }
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
                📚 Index Islamic Books
            </h2>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setUploadMode('pdf')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${uploadMode === 'pdf'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    📄 Index PDF
                </button>
                <button
                    onClick={() => setUploadMode('text')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${uploadMode === 'text'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    📝 Index Text
                </button>
            </div>

            {/* PDF List Mode */}
            {uploadMode === 'pdf' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                            📤 Upload PDFs to server first:
                        </p>
                        <code className="text-xs bg-blue-100 dark:bg-blue-900/40 p-2 rounded block">
                            scp your-book.pdf user@vps-ip:~/opt/rag/pdfs/
                        </code>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                            Then refresh this page to see your PDFs below.
                        </p>
                    </div>

                    <button
                        onClick={loadPDFs}
                        disabled={isPending}
                        className="w-full bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 
                                 text-white font-semibold py-2 px-4 rounded-lg
                                 transition-colors duration-200"
                    >
                        🔄 Refresh PDF List
                    </button>

                    {/* PDF Files List */}
                    {pdfFiles.length === 0 ? (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                            <p>No PDFs found in /pdfs folder</p>
                            <p className="text-sm mt-2">Upload PDFs using SCP/SFTP first</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h3 className="font-medium text-slate-700 dark:text-slate-300">
                                Available PDFs ({pdfFiles.length}):
                            </h3>
                            {pdfFiles.map((file) => (
                                <div
                                    key={file.name}
                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {file.sizeInMB} MB
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleIndexPDF(file.name)}
                                        disabled={isPending || !!jobId}
                                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 
                                                 text-white font-semibold py-2 px-4 rounded-lg
                                                 transition-colors duration-200 text-sm"
                                    >
                                        {jobId ? '⏳ Processing...' : '▶️ Index'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Progress Bar */}
                    {jobProgress && (
                        <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <div className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
                                <span>{jobProgress.message}</span>
                                <span className="font-bold">{jobProgress.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out flex items-center justify-center text-xs text-white font-bold"
                                    style={{ width: `${jobProgress.progress}%` }}
                                >
                                    {jobProgress.progress > 10 && `${jobProgress.progress}%`}
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                💡 This may take 2-3 hours for large books. You can close this page and come back later!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Text Paste Mode */}
            {uploadMode === 'text' && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="bookText" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Paste your Urdu book text here:
                        </label>
                        <textarea
                            id="bookText"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-lg 
                                     bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     resize-none font-urdu"
                            placeholder="اپنی کتاب کا متن یہاں پیسٹ کریں..."
                            dir="rtl"
                            disabled={isPending}
                        />
                    </div>

                    <button
                        onClick={handleTextUpload}
                        disabled={isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                                 text-white font-semibold py-3 px-6 rounded-lg
                                 transition-colors duration-200
                                 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Processing...' : 'Index Text'}
                    </button>

                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <p>💡 Tips:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Paste text from your Urdu book</li>
                            <li>Text will be split into chunks and indexed</li>
                            <li>Useful for testing with smaller samples</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Status Message */}
            {message && (
                <div
                    className={`mt-4 p-4 rounded-lg ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                        }`}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}
