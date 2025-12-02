# PDF Reader AI

A modern PDF reader with AI-powered features built with React, TypeScript, and Vite.

## Features

- 📄 **PDF Upload & Viewing** - Upload and view PDF documents
- 🔊 **Text-to-Speech** - Listen to your PDFs read aloud
- 🤖 **AI Chat** - Ask questions about your document content using Google Gemini AI

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **PDF Rendering**: PDF.js
- **AI**: Google Generative AI (Gemini)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env.local` file:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## Deployment

This app is configured for easy deployment on Vercel:

1. Push to GitHub
2. Import repository in Vercel
3. Add `VITE_GEMINI_API_KEY` environment variable
4. Deploy!

## License

MIT
