import { useRef, useState, useCallback } from 'react';

export function useCallRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const toggleRecording = useCallback((stream: MediaStream | null) => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!stream) return;
      
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      try {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } catch (err) {
        // Fallback to default
        mediaRecorderRef.current = new MediaRecorder(stream);
      }

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        recordedChunks.current = [];
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `voix_recording_${new Date().getTime()}.webm`;
        a.click();
        
        setTimeout(() => {
           URL.revokeObjectURL(url);
           document.body.removeChild(a);
        }, 100);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  return { isRecording, toggleRecording };
}
