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
function drawVideoToCanvas(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
  const context = canvasElement.getContext('2d');
  if (context) {
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    return context.getImageData(0, 0, canvasElement.width, canvasElement.height);
  }
  return null;
}
// Canvasに矩形を描画
function drawRectToCanvas(canvasElement: HTMLCanvasElement, location: QRCode['location']) {
  const context = canvasElement.getContext('2d');
  if (context) {
    context.beginPath();
    context.moveTo(location.topLeftCorner.x, location.topLeftCorner.y);
    context.lineTo(location.topRightCorner.x, location.topRightCorner.y);
    context.lineTo(location.bottomRightCorner.x, location.bottomRightCorner.y);
    context.lineTo(location.bottomLeftCorner.x, location.bottomLeftCorner.y);
    context.lineTo(location.topLeftCorner.x, location.topLeftCorner.y);

    context.lineWidth = 5;
    context.strokeStyle = 'red';
    context.stroke();
  }
}
// CanvasからQRコードを解析
function decodeQRFromCanvas(imageData: ImageData | null): QRCode | null {
  return imageData ? jsQR(imageData.data, imageData.width, imageData.height) : null;
}
// ストリームを停止
const stopStream = (videoElement: HTMLVideoElement) => {
  if (videoElement?.srcObject) {
    const tracks = (videoElement.srcObject as MediaStream).getTracks();
    tracks.forEach(track => track.stop());
  }
};

export const QrReader: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tmpCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const scanningRef = useRef<boolean>(scanning);

  const restartScanning = useCallback(async () => {
    try {
      setQrCode(null);
      setScanning(true);
      if (videoRef.current) {
        await setCameraStream(videoRef.current);
      }
    } catch (err) {
      setErrorMessages([...errorMessages, (err as Error).message]);
    }
  }, []);
  const scanQRCode = () => {
    if (!videoRef.current || !tmpCanvasRef.current || !scanningRef.current) {
      return;
    }
    try {
      const imageData = drawVideoToCanvas(videoRef.current, tmpCanvasRef.current);
      const qrCodeData = decodeQRFromCanvas(imageData);
      if (!qrCodeData) {
        requestAnimationFrame(scanQRCode);
        return;
      }
      if (imgCanvasRef.current) {
        drawVideoToCanvas(videoRef.current, imgCanvasRef.current);
        drawRectToCanvas(imgCanvasRef.current, qrCodeData.location);
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

  return (
    <div>
      <video ref={videoRef} style={{ display: scanning ? 'block' : 'none' }} width="320" height="240" autoPlay />
      <canvas ref={imgCanvasRef} style={{ display: scanning ? 'none' : 'block' }} width="320" height="240" />
      <canvas ref={tmpCanvasRef} style={{ display: 'none' }} width="320" height="240" />
      <div>
        <p>QR Code: {qrCode}</p>
        { scanning ? <button onClick={stopScanning}>スキャン停止</button> : <button onClick={restartScanning}>スキャン開始</button> }
      </div>
      <div>
        <ul>
          {errorMessages.map((message, i) => <li key={i}>{message}</li>)}
        </ul>
      </div>
    </div>
  );
};
