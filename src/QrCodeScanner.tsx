import { useRef, useEffect, useCallback } from 'react';
import jsQR, { type QRCode } from 'jsqr';

interface QRCodeScannerProps {
  videoViewWidth: number;
  videoViewHeight: number;
  onDetected: (detectedParams: DetectedParams) => void;
  onError: (error: Error) => void;
}

async function setCameraStream(videoElement: HTMLVideoElement, facingMode: 'user' | 'environment' = 'environment'): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
    videoElement.srcObject = stream;
    videoElement.setAttribute('playsinline', 'true');
    if (videoElement.paused) {
      await videoElement.play();
    }
  } catch (err) {
    console.error('カメラへのアクセスに失敗しました:', err);
    throw err;
  }
}
const stopStream = (videoElement: HTMLVideoElement) => {
  if (videoElement?.srcObject) {
    const tracks = (videoElement.srcObject as MediaStream).getTracks();
    tracks.forEach(track => track.stop());
  }
};
function drawVideoToCanvas(videoElement: HTMLVideoElement, context: CanvasRenderingContext2D) {
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return null;
  }
  if (context) {
    context.canvas.width = videoElement.videoWidth;
    context.canvas.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, context.canvas.width, context.canvas.height);
    return context.getImageData(0, 0, context.canvas.width, context.canvas.height);
  }
  return null;
}

export interface DetectedParams extends QRCode {
  lastImage: ImageData;
}
export const QRCodeScanner: React.FC<QRCodeScannerProps> = (props: QRCodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const errorHandler = props.onError;

  const startScanning = useCallback(async () => {
    console.log('startScanning');
    if (!videoRef.current) {
      return;
    }
    try {
      await setCameraStream(videoRef.current);
      canvasContext.current = canvasRef.current?.getContext('2d') ?? null;
      requestAnimationFrame(scanQRCode);
    } catch (err) {
      errorHandler(err as Error);
    }
  }, []);
  const stopScanning = () => {
    try {
      canvasContext.current = null;
      if (!videoRef.current) {
        return;
      }
      stopStream(videoRef.current!);
    } catch (err) {
      errorHandler(err as Error);
    }
  };
  const scanQRCode = () => {
    if (!videoRef.current || !canvasContext.current) {
      return;
    }

    try {
      const imageData = drawVideoToCanvas(videoRef.current, canvasContext.current);
      const qrCodeData = imageData ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' }) : null;
      if (!qrCodeData || qrCodeData.data === null || qrCodeData.binaryData.length === 0) {
        requestAnimationFrame(scanQRCode);
        return;
      }
      props.onDetected({
        ...qrCodeData,
        lastImage: imageData!,
      });
    } catch (err) {
      errorHandler(err as Error);
    }
  };

  useEffect(() => {
    startScanning();
    return stopScanning;
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ width: props.videoViewWidth, height: props.videoViewHeight }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
