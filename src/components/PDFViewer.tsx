import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getPdfDocument } from '../utils/pdf-utils';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
    file: File;
    onSelectionChange?: (text: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ file, onSelectionChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [pages, setPages] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPdf = async () => {
            setLoading(true);
            try {
                const doc = await getPdfDocument(file);
                setPdfDoc(doc);
                setPages(Array.from({ length: doc.numPages }, (_, i) => i + 1));
            } catch (err) {
                console.error("Error loading PDF for viewer:", err);
            } finally {
                setLoading(false);
            }
        };
        loadPdf();
    }, [file]);

    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : '';
            if (onSelectionChange) {
                onSelectionChange(text);
            }
        };

        const el = containerRef.current;
        if (el) {
            el.addEventListener('mouseup', handleSelection);
            el.addEventListener('keyup', handleSelection); // For keyboard selection
        }
        return () => {
            if (el) {
                el.removeEventListener('mouseup', handleSelection);
                el.removeEventListener('keyup', handleSelection);
            }
        };
    }, [onSelectionChange]);

    return (
        <div
            ref={containerRef}
            className="w-full bg-slate-200 p-4 overflow-y-auto custom-scrollbar flex flex-col items-center gap-4 h-full"
        >
            {loading && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium">Loading Document...</span>
                </div>
            )}

            {pdfDoc && pages.map(pageNum => (
                <LazyPDFPage key={pageNum} pdfDoc={pdfDoc} pageNum={pageNum} />
            ))}
        </div>
    );
};

interface LazyPDFPageProps {
    pdfDoc: pdfjsLib.PDFDocumentProxy;
    pageNum: number;
}

const LazyPDFPage: React.FC<LazyPDFPageProps> = ({ pdfDoc, pageNum }) => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    // Optional: once rendered, we can disconnect if we don't want to unmount on scroll off
                    // observer.disconnect(); 
                }
            },
            {
                root: null, // viewport
                rootMargin: '200px', // Pre-load 200px before view
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="pdf-page-container bg-white relative shadow-sm transition-all"
            style={{
                minHeight: height ? `${height}px` : '800px', // Approximate A4 height @ 1.5 scale placeholder
                minWidth: '600px'
            }}
        >
            {isVisible ? (
                <PDFPageContent
                    pdfDoc={pdfDoc}
                    pageNum={pageNum}
                    onDimensionsResolved={(h) => setHeight(h)}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <span className="text-slate-300 text-4xl font-bold opacity-20">{pageNum}</span>
                </div>
            )}
        </div>
    );
};

interface PDFPageContentProps {
    pdfDoc: pdfjsLib.PDFDocumentProxy;
    pageNum: number;
    onDimensionsResolved: (height: number) => void;
}

const PDFPageContent: React.FC<PDFPageContentProps> = ({ pdfDoc, pageNum, onDimensionsResolved }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(pageNum);

                const scale = 1.5;
                const viewport = page.getViewport({ scale });

                // Notify parent of actual height to prevent layout shift
                onDimensionsResolved(viewport.height);

                // Setup Canvas
                const canvas = canvasRef.current;
                const context = canvas?.getContext('2d');
                if (canvas && context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (renderTaskRef.current) {
                        renderTaskRef.current.cancel();
                    }

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };

                    renderTaskRef.current = page.render(renderContext);
                    await renderTaskRef.current.promise;
                }

                // Setup Text Layer
                const textLayerDiv = textLayerRef.current;
                if (textLayerDiv) {
                    textLayerDiv.innerHTML = ''; // Clear previous
                    textLayerDiv.style.height = `${viewport.height}px`;
                    textLayerDiv.style.width = `${viewport.width}px`;

                    try {
                        const textContent = await page.getTextContent();
                        renderCustomTextLayer(textContent, textLayerDiv, viewport);
                    } catch (e) {
                        console.error("Error rendering text layer:", e);
                    }
                }
                setLoaded(true);
            } catch (err) {
                if ((err as any).name !== 'RenderingCancelledException') {
                    console.error(`Error rendering page ${pageNum}:`, err);
                }
            }
        };

        renderPage();

        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [pdfDoc, pageNum, onDimensionsResolved]);

    return (
        <>
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className="textLayer" />
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
            )}
        </>
    );
};

// Helper to multiply a point [x, y] by a matrix [a, b, c, d, e, f]
function transformPoint(x: number, y: number, m: number[]) {
    return [
        m[0] * x + m[2] * y + m[4],
        m[1] * x + m[3] * y + m[5]
    ];
}

// Manual Text Layer Renderer
function renderCustomTextLayer(textContent: any, container: HTMLElement, viewport: any) {
    container.innerHTML = '';

    for (const item of textContent.items) {
        if (!item.str.trim()) continue;

        const tx = item.transform;
        const viewportTx = viewport.transform;

        // Transform the text origin to viewport coordinates
        const [x, y] = transformPoint(tx[4], tx[5], viewportTx);

        // Calculate estimated font size (hypotenuse of scale vector)
        const fontHeightPDF = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
        const fontSize = fontHeightPDF * viewport.scale;

        const span = document.createElement('span');
        span.textContent = item.str;

        // Position text. PDF origin is bottom-left, Canvas is top-left.
        // We adjust 'top' by subtracting font size to align baseline roughly.
        span.style.left = `${x}px`;
        span.style.top = `${y - fontSize}px`;
        span.style.fontSize = `${fontSize}px`;
        span.style.fontFamily = 'sans-serif';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';
        span.style.cursor = 'text';
        span.style.transformOrigin = '0% 0%';
        span.style.lineHeight = '1';

        container.appendChild(span);
    }
}

export default PDFViewer;
