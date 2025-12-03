import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    isActive: boolean;
    analyzer?: AnalyserNode; // Accept analyzer from parent if available
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
    // Purely cosmetic visualizer for this demo state since accessing the raw stream 
    // from the deeply nested LiveSession component is complex.
    // We will simulate activity when active.

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isActive || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const bars = 30;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const width = canvas.width / bars;

            for (let i = 0; i < bars; i++) {
                const height = Math.random() * canvas.height * 0.8;
                const x = i * width;
                const y = (canvas.height - height) / 2;

                ctx.fillStyle = `rgba(99, 102, 241, ${Math.random() * 0.5 + 0.5})`; // Indigo-500
                ctx.fillRect(x + 1, y, width - 2, height);
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, [isActive]);

    if (!isActive) {
        return (
            <div className="h-16 w-full flex items-center justify-center bg-slate-100 rounded-lg">
                <span className="text-slate-400 text-sm">Visualizer Inactive</span>
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={64}
            className="w-full h-16 rounded-lg bg-slate-900"
        />
    );
};

export default AudioVisualizer;
