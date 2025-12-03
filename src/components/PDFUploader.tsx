import { useState } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdf-utils';

interface PDFUploaderProps {
    onFileProcessed: (file: File, text: string) => void;
    onClear: () => void;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onFileProcessed, onClear }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const processFile = async (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }

        setLoading(true);
        try {
            const text = await extractTextFromPdf(file);
            if (!text || text.length < 10) {
                throw new Error("Could not extract sufficient text from this PDF. It might be an image scan.");
            }
            setFileName(file.name);
            onFileProcessed(file, text);
        } catch (err: any) {
            console.error(err);
            alert(`Error parsing PDF: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    if (fileName) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">{fileName}</h3>
                            <p className="text-sm text-green-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Ready for Live Reader
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setFileName(null);
                            onClear();
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative border-2 border-dashed rounded-xl p-10 transition-all text-center ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400'
                }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                    <p className="text-slate-600 font-medium">Extracting text from PDF...</p>
                </div>
            ) : (
                <>
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Upload your PDF</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                        Drag and drop your file here, or click to browse. We'll parse the text for the AI reader.
                    </p>
                    <input
                        type="file"
                        accept="application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileInput}
                    />
                    <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg shadow-sm hover:bg-slate-50 pointer-events-none">
                        Select File
                    </button>
                </>
            )}
        </div>
    );
};

export default PDFUploader;
