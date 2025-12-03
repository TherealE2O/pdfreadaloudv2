import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Play, Square, Loader2, Volume2, Info, MessageSquarePlus, Pause } from 'lucide-react';
import { createPcmBlob, decode, decodeAudioData, resampleTo16k } from '../utils/audio-utils';
import AudioVisualizer from './AudioVisualizer';
import PDFViewer from './PDFViewer';

interface LiveSessionProps {
    pdfText: string;
    pdfFile: File;
    apiKey: string;
    onDisconnect: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ pdfText, pdfFile, apiKey }) => {
    // --- Gemini Live State ---
    const [isConnected, setIsConnected] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('Ready to connect');
    const [isReconnecting, setIsReconnecting] = useState(false);

    // --- TTS (Browser) State ---
    const [isReading, setIsReading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');

    // --- Refs ---
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const inputNodeRef = useRef<GainNode | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // --- TTS Logic ---
    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);
            // Try to find a good Google English voice, or fallback to first
            const defaultVoice = available.find(v => v.name.includes('Google US English')) || available[0];
            setSelectedVoice(defaultVoice);
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        setIsPaused(false);

        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.rate = 1.0;

        utterance.onstart = () => setIsReading(true);
        utterance.onend = () => setIsReading(false);
        utterance.onerror = () => setIsReading(false);
        utterance.onpause = () => setIsPaused(true);
        utterance.onresume = () => setIsPaused(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const stopReading = () => {
        window.speechSynthesis.cancel();
        setIsReading(false);
        setIsPaused(false);
    };

    const togglePause = () => {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
        } else {
            window.speechSynthesis.pause();
            setIsPaused(true);
        }
    };

    // --- Gemini Logic ---

    const cleanupAudio = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { }
        });
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const disconnect = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try {
                    session.close();
                } catch (e) {
                    console.warn("Error closing session", e);
                }
            });
            sessionPromiseRef.current = null;
        }

        cleanupAudio();
        setIsConnected(false);
        setStatus('Disconnected');
    }, [cleanupAudio]);

    const connectToLiveAPI = async () => {
        try {
            setError(null);
            setStatus('Initializing Audio...');
            setIsReconnecting(true);

            // 1. Setup Audio Contexts
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContextClass();
            outputAudioContextRef.current = new AudioContextClass();

            inputNodeRef.current = inputAudioContextRef.current.createGain();
            outputNodeRef.current = outputAudioContextRef.current.createGain();
            outputNodeRef.current.connect(outputAudioContextRef.current.destination);

            // 2. Get Microphone Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            setStatus('Connecting to Gemini...');

            // 3. Initialize Gemini Client
            const ai = new GoogleGenAI({ apiKey });

            // 4. Connect Session
            const safeContext = pdfText.slice(0, 50000);

            const systemInstruction = `
        You are an intelligent tutor and assistant.
        The user is reading the following document (provided below).
        
        YOUR ROLE:
        - The user is using a separate "Read Aloud" tool to listen to the document.
        - You should NOT read the document aloud yourself.
        - Your job is to answer questions, explain complex terms, or summarize sections ONLY when the user asks.
        - Listen to the user. If they speak, answer them concisely.
        
        DOCUMENT CONTEXT:
        ${safeContext}
        DOCUMENT END.
      `;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                    systemInstruction: systemInstruction,
                },
                callbacks: {
                    onopen: () => {
                        setStatus('Connected (Listening)');
                        setIsConnected(true);
                        setIsReconnecting(false);

                        // Setup Input Processing
                        if (!inputAudioContextRef.current || !streamRef.current) return;

                        const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (e) => {
                            if (!isMicOn) return;
                            if (!inputAudioContextRef.current) return;

                            // CRITICAL: If the Browser TTS is reading, DO NOT send audio to Gemini.
                            // This prevents the model from hearing the computer's own voice and interrupting.
                            // We access the state via a ref check or just the closure if it updates, 
                            // but to be safe inside the callback, we check the global window speech state or reliance on React state
                            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                                return;
                            }

                            const inputData = e.inputBuffer.getChannelData(0);
                            const resampledData = resampleTo16k(inputData, inputAudioContextRef.current.sampleRate);
                            const pcmBlob = createPcmBlob(resampledData);

                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Interruption
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            console.log("Interrupted!");
                            sourcesRef.current.forEach((source) => {
                                try { source.stop(); } catch (e) { }
                                sourcesRef.current.delete(source);
                            });
                            nextStartTimeRef.current = 0;
                        }

                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                            // If Gemini speaks, pause the TTS automatically so they don't talk over each other
                            if (window.speechSynthesis.speaking) {
                                window.speechSynthesis.pause();
                                setIsPaused(true);
                            }

                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                ctx,
                                24000,
                                1
                            );

                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNodeRef.current);

                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onclose: () => {
                        if (!isReconnecting) {
                            setStatus('Connection Closed');
                            setIsConnected(false);
                        }
                    },
                    onerror: (err) => {
                        console.error(err);
                        setError("Connection Error. Please try again.");
                        setIsConnected(false);
                    }
                }
            });

            await sessionPromise;
            sessionPromiseRef.current = sessionPromise;

        } catch (err: any) {
            setError(err.message || "Failed to initialize audio or connection.");
            setIsConnected(false);
            cleanupAudio();
        }
    };

    const toggleMic = () => {
        setIsMicOn(prev => !prev);
    };

    const handleTextSelection = (text: string) => {
        setSelectedText(text);
    };

    const handleReadSelection = () => {
        if (selectedText) {
            speak(selectedText);
        }
    };

    const handleReadFull = () => {
        speak(pdfText);
    };

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[800px]">

            {/* Header Bar */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-xl z-10 gap-4">

                {/* Left: Branding & Status */}
                <div className="flex flex-col min-w-[140px]">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-indigo-600" />
                        Live Reader
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate max-w-[120px]">{status}</span>
                    </div>
                </div>

                {/* Center: TTS Controls */}
                <div className="flex-1 flex items-center justify-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                    <select
                        className="text-xs max-w-[120px] p-1.5 rounded border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 truncate"
                        onChange={(e) => {
                            const v = voices.find(v => v.name === e.target.value);
                            if (v) setSelectedVoice(v);
                        }}
                        value={selectedVoice?.name || ""}
                    >
                        {voices.map(v => (
                            <option key={v.name} value={v.name}>{v.name.replace('Google', '').replace('Microsoft', '')}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => isReading ? togglePause() : handleReadFull()}
                        className={`p-2 rounded-full transition-all ${isReading
                            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                            }`}
                        title={isReading ? (isPaused ? "Resume" : "Pause") : "Read Document"}
                    >
                        {isReading && !isPaused ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    {isReading && (
                        <button
                            onClick={stopReading}
                            className="p-2 rounded-full hover:bg-red-100 text-slate-500 hover:text-red-600 transition-all"
                            title="Stop Reading"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    )}
                </div>

                {/* Right: Live Controls */}
                <div className="flex items-center gap-2 min-w-[160px] justify-end">
                    {isConnected && (
                        <div className="h-8 w-20 mx-2">
                            <AudioVisualizer isActive={true} />
                        </div>
                    )}

                    {!isConnected ? (
                        <button
                            onClick={() => connectToLiveAPI()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
                        >
                            {isReconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                            {isReconnecting ? "..." : "Connect AI"}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={toggleMic}
                                className={`p-2 rounded-lg transition-all border ${isMicOn
                                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    : 'bg-red-50 border-red-200 text-red-600'
                                    }`}
                                title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
                            >
                                {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                            </button>

                            <button
                                onClick={disconnect}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all"
                                title="Disconnect AI"
                            >
                                <Square className="w-4 h-4 fill-current" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Area - Full PDF Viewer */}
            <div className="flex-1 overflow-hidden bg-slate-100 relative">
                <PDFViewer file={pdfFile} onSelectionChange={handleTextSelection} />

                {/* Floating Read Selection Button */}
                {selectedText && selectedText.length > 0 && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
                        <button
                            onClick={handleReadSelection}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all border-2 border-white ring-2 ring-indigo-200"
                        >
                            <MessageSquarePlus className="w-5 h-5" />
                            Read Selection
                        </button>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 text-indigo-800 text-xs flex justify-center text-center gap-4">
                <span>Highlight text to read specific sections.</span>
                <span className="text-indigo-400">|</span>
                <span>Connect AI to ask questions about the document.</span>
            </div>

            {error && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow-md border border-red-200 text-sm flex items-center gap-2 z-50">
                    <Info className="w-4 h-4" />
                    {error}
                </div>
            )}

        </div>
    );
};

export default LiveSession;