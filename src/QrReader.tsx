import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';

// カメラへのアクセスを要求し、videoRefにストリームを設定
function setCameraStream(videoElement: HTMLVideoElement, facingMode: 'user' | 'environment' = 'environment'): Promise<void> {
  return navigator.mediaDevices.getUserMedia({ video: { facingMode } })
    .then((stream) => {
      videoElement.srcObject = stream;
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
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
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

  useEffect(() => {
    if (videoRef.current) {
      setCameraStream(videoRef.current);
    }

    // QRコードをスキャンする関数
    const scanQRCode = () => {
      if (!videoRef.current || !canvasRef.current) {
        return;
      }
      const imageData = drawVideoToCanvas(videoRef.current, canvasRef.current);
      const qrCodeData = decodeQRFromCanvas(imageData);
        
      if (qrCodeData) {
        setQrCode(qrCodeData);
        stopStream(videoRef.current);
      } else {
        requestAnimationFrame(scanQRCode);
      }
    };
    requestAnimationFrame(scanQRCode);

    return () => {
      stopStream(videoRef.current!);
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ display: 'block' }} width="320" height="240" autoPlay />
      <canvas ref={canvasRef} style={{ display: 'none' }} width="320" height="240" />
      {qrCode && <p>QR Code: {qrCode}</p>}
    </div>
  );
};
