import { useEffect, useState } from 'react';

export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setLevel(0);
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    
    let source: MediaStreamAudioSourceNode | null = null;
    
    try {
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch (err) {
      console.warn("Could not create audio source from stream", err);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let intervalId: number;

    const getLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = sum / dataArray.length;
      return avg / 255; // Normalized to 0-1
    };

    intervalId = window.setInterval(() => {
      setLevel(getLevel());
    }, 100);

    return () => {
      clearInterval(intervalId);
      if (source) {
        source.disconnect();
      }
      audioCtx.close().catch(() => {});
    };
  }, [stream]);

  return level;
}
