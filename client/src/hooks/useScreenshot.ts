import { useCallback } from 'react';
import { toast } from 'sonner';

export function useScreenshot() {
  const saveMemory = useCallback(() => {
    try {
      const videos = Array.from(document.querySelectorAll('video'));
      if (videos.length === 0) {
        toast.error('No video streams found to capture.');
        return;
      }

      // Calculate bounding box for all rendering videos
      const width = videos.reduce((acc, v) => acc + v.videoWidth, 0);
      const height = Math.max(...videos.map(v => v.videoHeight));

      if (width === 0 || height === 0) {
        toast.error('Video streams are not ready yet.');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let currentX = 0;
      videos.forEach((video) => {
        // Draw each video side-by-side
        ctx.drawImage(video, currentX, 0, video.videoWidth, video.videoHeight);
        currentX += video.videoWidth;
      });

      // Overlay Voix Sanctuary watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '30px Inter, sans-serif';
      ctx.fillText('voix. sanctuary', 40, height - 40);

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `voix_memory_${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success('Memory saved!', { id: 'memory-save', icon: '📸' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to capture memory.');
    }
  }, []);

  return { saveMemory };
}
