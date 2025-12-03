import React, { useState } from 'react';
import { Key, Eye, EyeOff, Check } from 'lucide-react';

interface ApiKeyInputProps {
    onApiKeySet: (apiKey: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySet }) => {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!apiKey.trim()) {
            setError('Please enter an API key');
            return;
        }

        if (!apiKey.startsWith('AIza')) {
            setError('Invalid API key format. Gemini API keys start with "AIza"');
            return;
        }

        // Store in localStorage for persistence
        localStorage.setItem('gemini_api_key', apiKey);
        onApiKeySet(apiKey);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 animate-fade-in-up">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                            <Key className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Gemini API Key Required</h1>
                        <p className="text-slate-600 text-sm">
                            Enter your Gemini API key to use the AI-powered PDF reader
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 mb-2">
                                API Key
                            </label>
                            <div className="relative">
                                <input
                                    id="apiKey"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setError('');
                                    }}
                                    placeholder="AIza..."
                                    className={`w-full px-4 py-3 pr-12 rounded-lg border ${error ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'
                                        } focus:outline-none focus:ring-2 transition-all`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {error && (
                                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                    <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                    {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            Continue
                        </button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-600 mb-2">
                            <strong>Don't have an API key?</strong>
                        </p>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                        >
                            Get your free Gemini API key →
                        </a>
                        <p className="text-xs text-slate-500 mt-3">
                            Your API key is stored locally in your browser and never sent to our servers.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyInput;
