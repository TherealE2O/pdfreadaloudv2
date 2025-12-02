import { useState } from 'react'
import { BookOpen, Upload, FileText } from 'lucide-react'

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState<string>('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file')
      return
    }

    setPdfFile(file)

    // Extract text from PDF
    try {
      const text = await extractTextFromPDF(file)
      setPdfText(text)
    } catch (error) {
      console.error('Error extracting text:', error)
      alert('Failed to extract text from PDF')
    }
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    // Simplified text extraction - will implement with PDF.js later
    return `PDF loaded: ${file.name}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">PDF Reader AI</h1>
              <p className="text-sm text-slate-600">Read, Listen, and Chat with your PDFs</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!pdfFile ? (
          /* Upload Section */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-slate-300 p-12 text-center hover:border-indigo-400 transition-colors">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-100 p-4 rounded-full">
                  <Upload className="w-12 h-12 text-indigo-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Upload Your PDF
              </h2>
              <p className="text-slate-600 mb-6">
                Drag and drop or click to select a PDF file
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 cursor-pointer transition-colors">
                  <FileText className="w-5 h-5" />
                  Choose PDF File
                </span>
              </label>
            </div>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Read PDFs</h3>
                <p className="text-sm text-slate-600">
                  View and navigate your PDF documents with ease
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828 2.828" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Listen</h3>
                <p className="text-sm text-slate-600">
                  Text-to-speech reads your documents aloud
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Chat with AI</h3>
                <p className="text-sm text-slate-600">
                  Ask questions about your document content
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* PDF Viewer Section */
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <div>
                  <h2 className="font-semibold text-slate-900">{pdfFile.name}</h2>
                  <p className="text-sm text-slate-600">{(pdfFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPdfFile(null)
                  setPdfText('')
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Upload Different File
              </button>
            </div>

            <div className="border-2 border-slate-200 rounded-lg p-8 min-h-[400px] bg-slate-50">
              <p className="text-slate-700">{pdfText}</p>
              <p className="text-sm text-slate-500 mt-4">
                Full PDF viewer with text-to-speech and AI chat coming soon...
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
