import { useRef, useState, useEffect, useCallback } from 'react';
import { QRCodeScanner, DetectedParams } from './QrCodeScanner';
import { DetectedImageCanvas } from './DetectedImageCanvas';
import { type QRCode } from 'jsqr';

export interface QrReaderProps {
  videoViewWidth: number;
  videoViewHeight: number;
}

export const QrReader: React.FC<QrReaderProps> = ({ videoViewWidth, videoViewHeight }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [imageData, setImageData] = useState<ImageData | null>(null); 
  const [location, setLocation] = useState<QRCode['location'] | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const scanningRef = useRef<boolean>(scanning);

  const restartScanning = useCallback(async () => {
    try {
      setQrCode(null);
      setScanning(true);
    } catch (err) {
      setErrorMessages([...errorMessages, (err as Error).message + (err as Error).stack]);
    }
  }, []);

  const readQrHandler = async (params: DetectedParams) => {
    if (!scanningRef.current) {
      return;
    }
    try {
      setQrCode(params.data);
      setImageData(params.lastImage);
      setLocation(params.location);
      stopScanning();
    } catch (err) {
      setErrorMessages([...errorMessages, (err as Error).message]);
    }
  };
  const stopScanning = () => {
    setScanning(false);
  };
  const errorHandler = (err: Error) => {
    setErrorMessages([...errorMessages, err.message]);
  };

  useEffect(() => {
    console.log('scanning [' + scanning + ']');
    scanningRef.current = scanning;
  }, [scanning]);
  useEffect(() => {
    return stopScanning;
  }, []);

  return (
    <div>
      {scanning ? <QRCodeScanner videoViewWidth={videoViewWidth} videoViewHeight={videoViewHeight} onDetected={readQrHandler} onError={errorHandler}></QRCodeScanner> : null }
      <DetectedImageCanvas show={!scanning} videoViewWidth={videoViewWidth} videoViewHeight={videoViewHeight} imageData={imageData} location={location} onError={errorHandler}></DetectedImageCanvas>
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
