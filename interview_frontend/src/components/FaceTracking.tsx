import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as blazeface from '@tensorflow-models/blazeface';
import LoadingSpinner from './LoadingSpinner';
import { initializeModel, cleanupModel } from '../utils/modelLoader';

interface FaceTrackingProps {
  onFaceDetected: (isVisible: boolean) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

const FaceTracking: React.FC<FaceTrackingProps> = ({ onFaceDetected }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const lastDetectionRef = useRef<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // Log and set available video devices on mount
  useEffect(() => {
    (async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevices = devices
          .filter(d => d.kind === 'videoinput')
          .map(d => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`
          }));
        
        console.log('Available video devices:', vDevices);
        setVideoDevices(vDevices);
        
        if (vDevices.length === 0) {
          setError('No camera devices found. Please connect a camera and refresh.');
        } else {
          // Select first device by default
          setSelectedDevice(vDevices[0].deviceId);
        }
      } else {
        console.warn('enumerateDevices not supported');
      }
    })();
  }, []);

  const handleUserMedia = () => {
    setIsCameraReady(true);
    console.log('Camera access granted');
  };

  const handleUserMediaError = (error: string | DOMException) => {
    const errorMessage = error instanceof DOMException ? error.message : error;
    console.error('Camera access error:', errorMessage);
    setError('Could not access camera. Please check permissions and try again.');
    setIsLoading(false);
  };

  const detectFaces = useCallback(async (model: blazeface.BlazeFaceModel) => {
    if (!webcamRef.current?.video || !canvasRef.current || !model) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      // Get face predictions
      const predictions = await model.estimateFaces(video, false);

      // Clear canvas and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (predictions.length > 0) {
        // Draw rectangles around detected faces
        predictions.forEach((prediction: blazeface.NormalizedFace) => {
          const start = prediction.topLeft as [number, number];
          const end = prediction.bottomRight as [number, number];
          const size: [number, number] = [end[0] - start[0], end[1] - start[1]];

          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.strokeRect(start[0], start[1], size[0], size[1]);
        });

        lastDetectionRef.current = Date.now();
        onFaceDetected(true);
      } else {
        const timeSinceLastDetection = Date.now() - lastDetectionRef.current;
        if (timeSinceLastDetection > 3000) {
          onFaceDetected(false);
        }
      }

      // Continue detection loop
      requestRef.current = requestAnimationFrame(() => detectFaces(model));
    } catch (err) {
      console.error('Error in face detection:', err);
    }
  }, [onFaceDetected]);

  useEffect(() => {
    let isMounted = true;

    const initializeFaceDetection = async () => {
      if (!webcamRef.current?.video || !canvasRef.current || !isCameraReady) return;

      try {
        const model = await initializeModel();
        if (!isMounted) return;

        // Start detection loop
        detectFaces(model);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing face detection:', err);
        if (isMounted) {
          setError('Failed to initialize face detection. Please refresh the page.');
          setIsLoading(false);
        }
      }
    };

    if (isCameraReady) {
      initializeFaceDetection();
    }

    return () => {
      isMounted = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      cleanupModel();
    };
  }, [detectFaces, isCameraReady]);

  const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = event.target.value;
    setSelectedDevice(newDeviceId);
    // Reset camera state to reinitialize with new device
    setIsCameraReady(false);
    setIsLoading(true);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-sm p-4 rounded text-white">
        <p>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setIsLoading(true);
            setIsCameraReady(false);
            cleanupModel();
          }}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {videoDevices.length > 1 && (
        <div className="w-full max-w-[640px]">
          <label htmlFor="camera-select" className="sr-only">Select camera device</label>
          <select
            id="camera-select"
            value={selectedDevice}
            onChange={handleDeviceChange}
            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-label="Select camera device"
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div className="relative w-full max-w-[640px] aspect-video">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
            <LoadingSpinner />
            <p className="text-white ml-2">Initializing camera and face detection...</p>
          </div>
        )}
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            deviceId: selectedDevice || undefined
          }}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          className="absolute inset-0 w-full h-full"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
};

export default FaceTracking;