// Vercel deployment fix: Use import.meta.env instead of process.env
const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;
