import React, { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';

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
// CanvasからQRコードを解析
function decodeQRFromCanvas(imageData: ImageData | null): string | null {
  if (imageData) {
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    return qrCode ? qrCode.data : null;
  }
  return null;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

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
    if (!videoRef.current || !canvasRef.current) {
      return;
    }
    try {
      const imageData = drawVideoToCanvas(videoRef.current, canvasRef.current);
      const qrCodeData = decodeQRFromCanvas(imageData);
      if (!qrCodeData) {
        requestAnimationFrame(scanQRCode);
        return;
      }
      setQrCode(qrCodeData);
      setScanning(false);
      stopStream(videoRef.current);
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
    if (scanning) {
      requestAnimationFrame(scanQRCode);
    }
    return stopScanning;
  }, [scanning]);

  return (
    <div>
      <video ref={videoRef} style={{ display: scanning ? 'block' : 'none' }} width="320" height="240" autoPlay />
      <canvas ref={canvasRef} style={{ display: 'none' }} width="320" height="240" />
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
