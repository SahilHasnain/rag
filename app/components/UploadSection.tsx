'use client';

import { useState, useTransition } from 'react';
import { uploadBookText, uploadBookPDF, getJobStatus } from '../actions';

export default function UploadSection() {
    const [text, setText] = useState('');
    const [uploadMode, setUploadMode] = useState<'text' | 'pdf'>('pdf');
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobProgress, setJobProgress] = useState<{ progress: number; message: string } | null>(null);

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

    const handlePDFUpload = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const file = formData.get('pdf') as File;

        // Validate file size (100MB limit)
        if (file && file.size > 100 * 1024 * 1024) {
            setMessage({
                type: 'error',
                text: 'File size exceeds 100MB limit. Please upload a smaller file.',
            });
            return;
        }

        // Show file size info
        const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : '0';
        console.log(`Uploading PDF: ${file?.name} (${fileSizeMB} MB)`);

        startTransition(async () => {
            const result = await uploadBookPDF(formData);

            if (result.success && result.jobId) {
                setJobId(result.jobId);
                setMessage({
                    type: 'success',
                    text: 'PDF processing started in background! You can close this page and come back later.',
                });

                // Start polling for progress
                pollJobProgress(result.jobId);
            } else {
                setMessage({
                    type: result.success ? 'success' : 'error',
                    text: result.message,
                });
            }

            if (result.success) {
                e.currentTarget.reset();
                setSelectedFile(null);
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

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-white">
                Upload Book Content
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
                    📄 PDF Upload
                </button>
                <button
                    onClick={() => setUploadMode('text')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${uploadMode === 'text'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                >
                    📝 Text Paste
                </button>
            </div>

            {/* PDF Upload Mode */}
            {uploadMode === 'pdf' && (
                <form onSubmit={handlePDFUpload} className="space-y-4">
                    <div>
                        <label htmlFor="pdfFile" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Select your Urdu book PDF:
                        </label>
                        <input
                            type="file"
                            id="pdfFile"
                            name="pdf"
                            accept=".pdf"
                            required
                            disabled={isPending}
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg 
                                     bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                                     file:mr-4 file:py-2 file:px-4
                                     file:rounded-lg file:border-0
                                     file:text-sm file:font-semibold
                                     file:bg-blue-50 file:text-blue-700
                                     hover:file:bg-blue-100
                                     dark:file:bg-slate-600 dark:file:text-slate-200
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {selectedFile && (
                            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                📄 {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || !!jobId}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                                 text-white font-semibold py-3 px-6 rounded-lg
                                 transition-colors duration-200
                                 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Uploading...' : jobId ? 'Processing...' : 'Upload & Index PDF'}
                    </button>

                    {/* Progress Bar */}
                    {jobProgress && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>{jobProgress.message}</span>
                                <span>{jobProgress.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${jobProgress.progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                💡 This may take 2-3 hours for large books. You can close this page and come back later!
                            </p>
                        </div>
                    )}

                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                        <p>💡 Tips:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Upload your 5000-page Urdu book PDF (up to 100MB)</li>
                            <li>PDF must be text-based (not scanned images)</li>
                            <li>Processing may take a few moments for large files</li>
                            <li>Urdu RTL text is handled automatically ✓</li>
                        </ul>
                    </div>
                </form>
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
