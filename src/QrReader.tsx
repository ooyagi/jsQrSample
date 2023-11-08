import React, { useRef, useState, useEffect, useCallback } from 'react';
import jsQR, { QRCode } from 'jsqr';

// カメラへのアクセスを要求し、videoRefにストリームを設定
async function setCameraStream(videoElement: HTMLVideoElement, facingMode: 'user' | 'environment' = 'environment'): Promise<void> {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode } })
    .then((stream) => {
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.play();
    })
    .catch((err) => {
      console.error('カメラへのアクセスに失敗しました:', err);
      throw err;
    });
}
// カメラの映像をCanvasに描画
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
function drawVideoToImgCanvas(videoElement: HTMLVideoElement, context: CanvasRenderingContext2D, videoViewWidth: number, videoViewHeight: number): VideoDrawResult {
  const { videoWidth, videoHeight } = videoElement;
  const scale = Math.min(videoViewWidth / videoWidth, videoViewHeight / videoHeight);
  const vidH = videoHeight * scale;
  const vidW = videoWidth * scale;
  const left = (videoViewWidth - vidW) / 2;
  const top = (videoViewHeight - vidH) / 2;

  context.drawImage(videoElement, left, top, vidW, vidH);
  return { scale, offsetX: left, offsetY: top };
}

// Canvasに矩形を描画
function drawRectToCanvas(context: CanvasRenderingContext2D , location: QRCode['location'], drawResult: VideoDrawResult) {
  if (context) {
    context.beginPath();
    context.moveTo(location.topLeftCorner.x * drawResult.scale + drawResult.offsetX, location.topLeftCorner.y * drawResult.scale + drawResult.offsetY);
    context.lineTo(location.topRightCorner.x * drawResult.scale + drawResult.offsetX, location.topRightCorner.y * drawResult.scale + drawResult.offsetY);
    context.lineTo(location.bottomRightCorner.x * drawResult.scale + drawResult.offsetX, location.bottomRightCorner.y * drawResult.scale + drawResult.offsetY);
    context.lineTo(location.bottomLeftCorner.x * drawResult.scale + drawResult.offsetX, location.bottomLeftCorner.y * drawResult.scale + drawResult.offsetY);
    context.closePath();

    context.lineWidth = 5;
    context.strokeStyle = 'red';
    context.stroke();
  }
}

// CanvasからQRコードを解析
function decodeQRFromCanvas(imageData: ImageData | null): QRCode | null {
  return imageData ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' }) : null;
}
// ストリームを停止
const stopStream = (videoElement: HTMLVideoElement) => {
  if (videoElement?.srcObject) {
    const tracks = (videoElement.srcObject as MediaStream).getTracks();
    tracks.forEach(track => track.stop());
  }
};

interface VideoDrawResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface QrReaderProps {
  videoViewWidth: number;
  videoViewHeight: number;
}

export const QrReader: React.FC<QrReaderProps> = ({ videoViewWidth, videoViewHeight }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tmpCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const tmpCanvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const imgCanvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const scanningRef = useRef<boolean>(scanning);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);

  const restartScanning = useCallback(async () => {
    try {
      setQrCode(null);
      setScanning(true);
      tmpCanvasContext.current = tmpCanvasRef.current?.getContext('2d') ?? null;
      imgCanvasContext.current = imgCanvasRef.current?.getContext('2d') ?? null;
      if (videoRef.current) {
        await setCameraStream(videoRef.current);
      }
    } catch (err) {
      setErrorMessages([...errorMessages, (err as Error).message + (err as Error).stack]);
    }
  }, []);
  const scanQRCode = () => {
    if (!videoRef.current || !tmpCanvasContext.current || !scanningRef.current) {
      return;
    }

    try {
      const imageData = drawVideoToCanvas(videoRef.current, tmpCanvasContext.current);
      const qrCodeData = decodeQRFromCanvas(imageData);
      if (!qrCodeData || qrCodeData.data === null || qrCodeData.binaryData.length === 0) {
        requestAnimationFrame(scanQRCode);
        return;
      }
      if (imgCanvasContext.current) {
        const scale = drawVideoToImgCanvas(videoRef.current, imgCanvasContext.current, videoViewWidth, videoViewHeight);
        drawRectToCanvas(imgCanvasContext.current, qrCodeData.location, scale);
      }
      setQrCode(qrCodeData.data);
      stopScanning();
    } catch (err) {
      setErrorMessages([...errorMessages, (err as Error).message]);
    }
  };
  const stopScanning = () => {
    if (!scanning) {
      return;
    }
    try {
      setScanning(false);
      tmpCanvasContext.current = null;
      imgCanvasContext.current = null;
      if (!videoRef.current) {
        return;
      }
      stopStream(videoRef.current!);
    } catch (err) {
      setErrorMessages([...errorMessages, (err as Error).message]);
    }
  };

  useEffect(() => {
    scanningRef.current = scanning;
    if (scanning) {
      requestAnimationFrame(scanQRCode);
    }
  }, [scanning]);
  useEffect(() => {
    return stopScanning;
  }, []);
  useEffect(() => {
      if (videoRef.current) {
        setVideoWidth(videoRef.current.videoWidth);
        setVideoHeight(videoRef.current.videoHeight);
      }
  }, [videoRef.current?.videoWidth, videoRef.current?.videoHeight]);

  return (
    <div>
      <video ref={videoRef} style={{ display: scanning ? 'block' : 'none' }} width={videoViewWidth} height={videoViewHeight} autoPlay />
      <canvas ref={imgCanvasRef} style={{ display: scanning ? 'none' : 'block' }} width={videoViewWidth} height={videoViewHeight} />
      <canvas ref={tmpCanvasRef} style={{ display: 'none' }} />
      <div>
        <p>QR Code: {qrCode}</p>
        { scanning ? <button onClick={stopScanning}>スキャン停止</button> : <button onClick={restartScanning}>スキャン開始</button> }
      </div>
      <div>
        <p>Video Size: {videoWidth} x {videoHeight}</p>
      </div>
      <div>
        <ul>
          {errorMessages.map((message, i) => <li key={i}>{message}</li>)}
        </ul>
      </div>
    </div>
  );
};
