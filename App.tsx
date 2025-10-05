
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState } from './types';
import type { JScanify } from './types';

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin h-8 w-8 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" /></svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z" /></svg>
);

const RescanIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
);

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.LOADING);
    const [error, setError] = useState<string | null>(null);
    const [scannedImage, setScannedImage] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const captureCanvasRef = useRef<HTMLCanvasElement>(null);
    const displayCanvasRef = useRef<HTMLCanvasElement>(null);
    const scannerRef = useRef<JScanify | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const stopScanLoop = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
    }, []);

    const startScanLoop = useCallback(() => {
        if (!videoRef.current || !captureCanvasRef.current || !displayCanvasRef.current || !scannerRef.current) return;
        
        const video = videoRef.current;
        const captureCanvas = captureCanvasRef.current;
        const displayCanvas = displayCanvasRef.current;
        const captureCtx = captureCanvas.getContext('2d');
        const displayCtx = displayCanvas.getContext('2d');
        const scanner = scannerRef.current;

        const loop = () => {
            if (captureCtx && displayCtx) {
                captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
                const highlightedCanvas = scanner.highlightPaper(captureCanvas, { color: "#00bfa6", thickness: 8 });
                displayCtx.drawImage(highlightedCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
            }
            animationFrameIdRef.current = requestAnimationFrame(loop);
        };
        loop();
    }, []);

    useEffect(() => {
        const initScanner = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (videoRef.current && captureCanvasRef.current && displayCanvasRef.current) {
                            videoRef.current.play();

                            const videoWidth = videoRef.current.videoWidth;
                            const videoHeight = videoRef.current.videoHeight;
                            
                            captureCanvasRef.current.width = videoWidth;
                            captureCanvasRef.current.height = videoHeight;
                            displayCanvasRef.current.width = videoWidth;
                            displayCanvasRef.current.height = videoHeight;
                            
                            scannerRef.current = new window.jscanify();
                            setAppState(AppState.READY);
                            startScanLoop();
                        }
                    };
                }
            } catch (err) {
                console.error("Camera access error:", err);
                setError("Camera access denied. Please allow camera permissions in your browser settings and refresh the page.");
                setAppState(AppState.ERROR);
            }
        };

        const libsCheckInterval = setInterval(() => {
            if (window.cv && window.jscanify) {
                clearInterval(libsCheckInterval);
                initScanner();
            }
        }, 100);

        return () => {
            clearInterval(libsCheckInterval);
            stopScanLoop();
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startScanLoop, stopScanLoop]);

    const handleExtract = () => {
        stopScanLoop();
        setAppState(AppState.SCANNING);

        if (videoRef.current && captureCanvasRef.current && scannerRef.current) {
            const captureCanvas = captureCanvasRef.current;
            const captureCtx = captureCanvas.getContext('2d');
            
            if(!captureCtx) {
                setError("Could not get canvas context.");
                setAppState(AppState.ERROR);
                return;
            }

            captureCtx.drawImage(videoRef.current, 0, 0, captureCanvas.width, captureCanvas.height);
            const extractedCanvas = scannerRef.current.extractPaper(captureCanvas, 850, 1100); // A4-like aspect ratio
            
            if (extractedCanvas) {
                setScannedImage(extractedCanvas.toDataURL('image/jpeg'));
                setAppState(AppState.PREVIEW);
            } else {
                alert("No document detected. Please try again.");
                setAppState(AppState.READY);
                startScanLoop();
            }
        }
    };

    const handleRescan = () => {
        setScannedImage(null);
        setAppState(AppState.READY);
        startScanLoop();
    };

    const handleDownload = () => {
        if (!scannedImage) return;
        const link = document.createElement('a');
        link.href = scannedImage;
        link.download = `scan-${new Date().toISOString()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
            <header className="w-full max-w-4xl text-center mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-teal-300">Smart Document Scanner</h1>
                <p className="text-gray-400 mt-2">Point your camera at a document to see it highlighted in real-time.</p>
            </header>

            <main className="w-full max-w-4xl aspect-[4/3] sm:aspect-video bg-gray-800 rounded-xl shadow-2xl overflow-hidden relative flex items-center justify-center">
                {appState === AppState.LOADING && (
                    <div className="flex flex-col items-center gap-4 text-gray-300">
                        <LoadingSpinner />
                        <span>Initializing Scanner...</span>
                    </div>
                )}
                {appState === AppState.ERROR && (
                    <div className="p-8 text-center text-red-400">
                        <h2 className="text-xl font-semibold mb-2">Error</h2>
                        <p>{error}</p>
                    </div>
                )}
                
                <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover -z-10 opacity-0" playsInline />
                <canvas ref={captureCanvasRef} className="hidden" />
                <canvas ref={displayCanvasRef} className="w-full h-full object-contain" />
                
                {appState === AppState.SCANNING && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-20">
                        <LoadingSpinner />
                        <span className="mt-4 text-gray-200">Processing...</span>
                    </div>
                )}

                {appState === AppState.PREVIEW && scannedImage && (
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-30 p-4">
                        <h2 className="text-2xl font-bold text-teal-300 mb-4">Scanned Result</h2>
                        <img src={scannedImage} alt="Scanned document" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg mb-6"/>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105">
                                <DownloadIcon className="w-5 h-5" />
                                Download
                            </button>
                            <button onClick={handleRescan} className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105">
                                <RescanIcon className="w-5 h-5" />
                                Scan Another
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {appState === AppState.READY && (
                <footer className="mt-6">
                    <button onClick={handleExtract} className="flex items-center gap-3 px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white text-lg font-bold rounded-full shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-400 focus:ring-opacity-50">
                        <CameraIcon className="w-7 h-7" />
                        Extract Document
                    </button>
                </footer>
            )}
        </div>
    );
};

export default App;
