import { useEffect, useRef, useState, useCallback } from 'react';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

/**
 * AI-powered background blur using MediaPipe SelfieSegmentation.
 * 
 * Pipeline:
 *   Raw Camera → MediaPipe Mask → Canvas Compositor → captureStream(30)
 * 
 * Layer 1: Background with gaussian-blur applied (configurable radius)
 * Layer 2: Sharp, un-blurred user (masked) placed on top
 * 
 * @param inputStream  Raw camera MediaStream
 * @param blurRadius   Blur intensity in pixels (0 = off, max 20)
 * @returns            Processed MediaStream with blurred background
 */
export function useBackgroundBlur(
  inputStream: MediaStream | null,
  blurRadius: number = 0
) {
  const [outputStream, setOutputStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Persistent refs to avoid re-allocation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  const animFrameRef = useRef<number>(0);
  const blurRadiusRef = useRef(blurRadius);
  const activeRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const outputStreamRef = useRef<MediaStream | null>(null);

  // Keep blur radius ref in sync without triggering effect re-runs
  useEffect(() => {
    blurRadiusRef.current = blurRadius;
  }, [blurRadius]);

  // Stable callback that draws each segmented frame
  const onSegmentationResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen || !activeRef.current) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const offCtx = offscreen.getContext('2d', { willReadFrequently: false });
    if (!ctx || !offCtx) return;

    const w = canvas.width;
    const h = canvas.height;
    const radius = blurRadiusRef.current;

    // --- Layer 1: Blurred background on offscreen canvas ---
    offCtx.clearRect(0, 0, w, h);
    if (radius > 0) {
      offCtx.filter = `blur(${radius}px)`;
    } else {
      offCtx.filter = 'none';
    }
    offCtx.drawImage(results.image, 0, 0, w, h);
    offCtx.filter = 'none';

    // --- Main canvas compositing ---
    ctx.clearRect(0, 0, w, h);

    // Step 1: Draw the segmentation mask (white = person, black = bg)
    ctx.save();
    ctx.drawImage(results.segmentationMask, 0, 0, w, h);

    // Step 2: source-in → only keep person pixels from the ORIGINAL (sharp) image
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, w, h);

    // Step 3: destination-over → draw the BLURRED background behind the person
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(offscreen, 0, 0, w, h);

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    // If blur is OFF (radius 0) or no input stream, pass through raw stream
    if (!inputStream || blurRadius <= 0) {
      // Clean up any running pipeline
      activeRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      setOutputStream(inputStream);
      setIsReady(true);
      return;
    }

    activeRef.current = true;

    // --- Create canvas elements (once) ---
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    if (!videoRef.current) {
      const v = document.createElement('video');
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      videoRef.current = v;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;

    // Match canvas dimensions to video track settings
    const videoTrack = inputStream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings();
    const trackWidth = settings?.width || 640;
    const trackHeight = settings?.height || 480;

    canvas.width = trackWidth;
    canvas.height = trackHeight;
    offscreen.width = trackWidth;
    offscreen.height = trackHeight;

    let isCancelled = false;

    // --- Initialize MediaPipe Segmenter (once) ---
    const initSegmenter = async () => {
      if (!segmentationRef.current) {
        const fallbackTimer = setTimeout(() => {
          if (!isCancelled && !segmentationRef.current) {
            console.warn('[BackgroundBlur] MediaPipe init timed out (5s). Falling back to raw stream.');
            setOutputStream(inputStream);
            setIsReady(true);
          }
        }, 5000);

        try {
          const segmenter = new SelfieSegmentation({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
          });

          segmenter.setOptions({
            modelSelection: 1, // Landscape model — better edge detection for hair/shoulders
            selfieMode: true,
          });

          segmenter.onResults((results) => {
            if (isCancelled) return;
            clearTimeout(fallbackTimer);
            onSegmentationResults(results);
          });

          segmentationRef.current = segmenter;
          console.log('[BackgroundBlur] MediaPipe SelfieSegmentation initialized.');
        } catch (err) {
          console.error('[BackgroundBlur] MediaPipe failed to load:', err);
          clearTimeout(fallbackTimer);
          setOutputStream(inputStream);
          setIsReady(true);
          return;
        }
      }

      // --- Bind video source ---
      video.srcObject = inputStream;
      video.width = trackWidth;
      video.height = trackHeight;

      try {
        await video.play();
      } catch (e) {
        console.warn('[BackgroundBlur] Video.play() rejected:', e);
      }

      // --- Processing loop at ~30fps ---
      const TARGET_INTERVAL = 1000 / 30; // 33.3ms per frame

      const processLoop = async (timestamp: number) => {
        if (isCancelled || !activeRef.current) return;

        // Throttle to 30fps
        const elapsed = timestamp - lastFrameTimeRef.current;
        if (elapsed >= TARGET_INTERVAL) {
          lastFrameTimeRef.current = timestamp - (elapsed % TARGET_INTERVAL);

          if (video.readyState >= 2 && segmentationRef.current) {
            try {
              await segmentationRef.current.send({ image: video });
            } catch (e) {
              // Silently skip frame on WASM hiccup
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(processLoop);
      };

      animFrameRef.current = requestAnimationFrame(processLoop);

      // --- Capture processed stream from canvas ---
      const processedStream = canvas.captureStream(30);

      // Preserve original audio tracks
      inputStream.getAudioTracks().forEach((track) => {
        processedStream.addTrack(track);
      });

      outputStreamRef.current = processedStream;
      setOutputStream(processedStream);
      setIsReady(true);
      console.log('[BackgroundBlur] Pipeline active. Blur radius:', blurRadiusRef.current, 'px');
    };

    initSegmenter();

    // --- Cleanup ---
    return () => {
      isCancelled = true;
      activeRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
    // Only re-run when stream changes or blur toggles on/off
    // Blur INTENSITY changes are handled via ref (no re-initialization needed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputStream, blurRadius > 0]);

  return { outputStream, isReady };
}
