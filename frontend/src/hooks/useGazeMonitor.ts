import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { processGaze } from '../lib/api';

interface GazeResult {
  gaze: string;
  yaw: number;
  pitch: number;
  suspicious: boolean;
}

export const useGazeMonitor = (
  sessionId: string,
  studentId: string,
  studentName: string,
  examId: string,
  instructorId: string,
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isActive: boolean
) => {
  const [violations, setViolations] = useState(0);
  const [currentZone, setCurrentZone] = useState('Center');
  const [isConnected, setIsConnected] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [rawAlerts, setRawAlerts] = useState(0);

  const checkGaze = async () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Capture Frame at higher resolution
    canvas.width = 640;
    canvas.height = 480;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const result: GazeResult = await processGaze(frame, sessionId, studentId, studentName, examId, instructorId);
      console.log(`[GazeMonitor] Response:`, result);
      setIsConnected(true);
      setCurrentZone(result.gaze);

      if (result.suspicious) {
        setRawAlerts(r => {
          const nextRaw = r + 1;
          const nextViolations = Math.floor(nextRaw / 4);
          
          setViolations(nextViolations);
          setShowWarning(true);
          
          if (nextViolations >= 5) {
            setShowModal(true);
          } else {
            const desc = result.gaze === 'multiple_faces' 
              ? "Multiple people detected in frame!" 
              : `Alert ${nextRaw}/4: Looking ${result.gaze} for too long.`;
              
            toast.error(nextRaw % 4 === 0 ? "Violation Logged!" : "Suspicious Activity Detected", {
              description: desc,
              duration: 4000
            });
          }
          return nextRaw;
        });
      } else {
        setShowWarning(false);
        if (result.gaze !== 'center' && result.gaze !== 'no_face' && result.gaze !== 'error') {
           toast.info(`Looking ${result.gaze.toUpperCase()}`, {
             description: "Please keep your eyes on the screen.",
             duration: 1000
           });
        }
      }
    } catch (error) {
      setIsConnected(false);
      console.error("[GazeMonitor] Error:", error);
    }
  };

  useEffect(() => {
    if (isActive && sessionId) {
      intervalRef.current = setInterval(checkGaze, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, sessionId]);

  return {
    violations,
    currentZone,
    isConnected,
    showWarning,
    showModal,
    resetModal: () => setShowModal(false)
  };
};
