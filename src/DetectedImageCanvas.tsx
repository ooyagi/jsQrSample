import { useEffect, useRef } from "react";
import { QRCode } from "jsqr";

interface DetectedImageCanvasProps {
  show: boolean;
  videoViewWidth: number;
  videoViewHeight: number;
  imageData: ImageData | null;
  location: QRCode['location'] | null;
  onError: (error: Error) => void;
}
interface VideoDrawResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

async function drawImageDataToCanvas(imageData: ImageData, context: CanvasRenderingContext2D, videoViewWidth: number, videoViewHeight: number): Promise<VideoDrawResult> {
  const image = await createImageBitmap(imageData);
  const { width, height } = image;
  const scale = Math.min(videoViewWidth / width, videoViewHeight / height);
  const vidW = width * scale;
  const vidH = height * scale;
  const left = (videoViewWidth - vidW) / 2;
  const top = (videoViewHeight - vidH) / 2;

  console.log('drawImageDataToCanvas', { width, height, scale, vidW, vidH, left, top });

  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.drawImage(image, left, top, vidW, vidH);
  return { scale, offsetX: left, offsetY: top };
}
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

export const DetectedImageCanvas: React.FC<DetectedImageCanvasProps> = (props: DetectedImageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContext = useRef<CanvasRenderingContext2D | null>(null);
  const errorHandler = props.onError;

  const drawImage = async () => {
    if (!canvasContext.current || !props.imageData || !props.location) {
      return;
    }
    try {
      const drawResult = await drawImageDataToCanvas(props.imageData, canvasContext.current as CanvasRenderingContext2D, props.videoViewWidth, props.videoViewHeight);
      drawRectToCanvas(canvasContext.current, props.location, drawResult);
      errorHandler(new Error('[' +
        props.imageData.width.toString() + ', ' +
        props.imageData.height.toString() + ', ' +
        props.videoViewWidth.toString() + ', ' +
        props.videoViewHeight.toString() + '] [' +
        drawResult.scale.toString() + ', ' +
        drawResult.offsetX.toString() + ', ' +
        drawResult.offsetY.toString() + ']'
      ));
    } catch (err) {
      errorHandler(err as Error);
    }
  };

  useEffect(() => {
    canvasContext.current = canvasRef.current?.getContext('2d') ?? null;
  }, []);
  useEffect(() => {
    drawImage();
  }, [props.imageData]);

  return (
    <canvas ref={canvasRef} style={{ display: props.show ? 'block' : 'none' }} width={props.videoViewWidth} height={props.videoViewHeight} />
  );
}
