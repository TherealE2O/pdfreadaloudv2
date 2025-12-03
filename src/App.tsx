import { useState, useEffect } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import LiveSession from './components/LiveSession';
import ApiKeyInput from './components/ApiKeyInput';

const App: React.FC = () => {
  const [pdfData, setPdfData] = useState<{ file: File, text: string } | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Check for stored API key on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const loadExamplePDF = async () => {
    try {
      const response = await fetch('/example.pdf');
      const blob = await response.blob();
      const file = new File([blob], 'Real-World Bug Hunting - A Field Guide to Web Hacking.pdf', { type: 'application/pdf' });

      // Import the extraction function
      const { extractTextFromPdf } = await import('./utils/pdf-utils');
      const text = await extractTextFromPdf(file);

      setPdfData({ file, text });
    } catch (error) {
      console.error('Error loading example PDF:', error);
      alert('Failed to load example PDF');
    }
  };

  // Show API key input if no key is set
  if (!apiKey) {
    return <ApiKeyInput onApiKeySet={setApiKey} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">Gemini Live Reader</span>
          </div>
          <div className="flex items-center gap-4">
            {!pdfData && (
              <button
                onClick={loadExamplePDF}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium underline"
              >
                Try Example PDF
              </button>
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Powered by Gemini 2.5</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Intro Section */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Turn your PDFs into <span className="text-indigo-600">Active Conversations</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Upload a document, let the AI read it to you, and interrupt anytime to ask questions or discuss the content in real-time.
          </p>
        </div>

        {/* Application Logic */}
        <div className="space-y-6">

          {!pdfData && (
            <PDFUploader
              onFileProcessed={(file, text) => setPdfData({ file, text })}
              onClear={() => setPdfData(null)}
            />
          )}

          {pdfData && (
            <div className="animate-fade-in-up">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setPdfData(null)}
                  className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                  ← Upload different file
                </button>
                <div className="text-xs text-slate-400">
                  File: {pdfData.file.name}
                </div>
              </div>

              <LiveSession
                pdfText={pdfData.text}
                pdfFile={pdfData.file}
                apiKey={apiKey}
                onDisconnect={() => { }}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;

