import { useRef, useState, useCallback } from 'react';

export function useCallRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const toggleRecording = useCallback((localStream: MediaStream | null, remotePeers: Map<string, { stream: MediaStream }> = new Map()) => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!localStream) return;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;

      // Add local audio
      if (localStream.getAudioTracks().length > 0) {
        const localSource = audioContext.createMediaStreamSource(localStream);
        localSource.connect(destination);
        hasAudio = true;
      }

      // Add remote audio
      remotePeers.forEach(({ stream }) => {
        if (stream.getAudioTracks().length > 0) {
          const remoteSource = audioContext.createMediaStreamSource(stream);
          remoteSource.connect(destination);
          hasAudio = true;
        }
      });

      // Combine video from local with mixed audio
      const combinedStream = new MediaStream();
      
      // Keep local video track
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) combinedStream.addTrack(videoTrack);
      
      // Add mixed audio track
      if (hasAudio) {
        const mixedAudioTrack = destination.stream.getAudioTracks()[0];
        if (mixedAudioTrack) combinedStream.addTrack(mixedAudioTrack);
      } else if (localStream.getAudioTracks()[0]) {
        // Fallback to local audio if mixing failed but local exists
        combinedStream.addTrack(localStream.getAudioTracks()[0]);
      }

      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      try {
        mediaRecorderRef.current = new MediaRecorder(combinedStream, options);
      } catch (err) {
        mediaRecorderRef.current = new MediaRecorder(combinedStream);
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
           audioContext.close();
        }, 100);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording]);

  return { isRecording, toggleRecording };
}

