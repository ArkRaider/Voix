import { useState, useLayoutEffect, useEffect, useRef, useMemo } from 'react';
import { useAudioLevel } from '../../hooks/useAudioLevel';
import { useScreenshot } from '../../hooks/useScreenshot';
import { motion, AnimatePresence } from 'framer-motion';

// ── Sanctuary Theme Avatar Colors ──────────────────────────────────────────────
const SANCTUARY_COLORS = [
  { name: 'Soft Emerald',  base: '#34d399', dark: '#059669' },
  { name: 'Deep Rose',     base: '#f472b6', dark: '#be185d' },
  { name: 'Muted Gold',    base: '#fbbf24', dark: '#b45309' },
  { name: 'Lavender',      base: '#a78bfa', dark: '#6d28d9' },
  { name: 'Ocean Blue',    base: '#60a5fa', dark: '#1d4ed8' },
  { name: 'Warm Coral',    base: '#fb923c', dark: '#c2410c' },
  { name: 'Sage',          base: '#6ee7b7', dark: '#047857' },
  { name: 'Amethyst',      base: '#c084fc', dark: '#7e22ce' },
];

/**
 * Deterministic hash of a peerId string → index into SANCTUARY_COLORS.
 * Uses a simple djb2 hash — O(n) in string length, no allocation.
 */
function hashPeerId(peerId: string): number {
  let hash = 5381;
  for (let i = 0; i < peerId.length; i++) {
    hash = ((hash << 5) + hash + peerId.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return hash % SANCTUARY_COLORS.length;
}

/** Returns the Sanctuary color pair for a given peerId (memoize at call-site). */
function getAvatarColor(peerId: string): { base: string; dark: string } {
  return SANCTUARY_COLORS[hashPeerId(peerId)];
}

interface VideoGridProps {
  localName: string;
  localStream: MediaStream | null;
  peers: Map<string, { stream: MediaStream, name: string }>;
  pinnedPeerId: string | null;
  onPin: (id: string | null) => void;
  isMobilePiP?: boolean;
  isGiadarkitRoom?: boolean;
  isLocalCameraOn?: boolean;
  peerCameraStates?: Map<string, boolean>;
}

export default function VideoGrid({ localName, localStream, peers = new Map(), pinnedPeerId, onPin, isMobilePiP, isGiadarkitRoom = false, isLocalCameraOn = true, peerCameraStates = new Map() }: VideoGridProps) {
  const { saveMemory } = useScreenshot();
  const [hiddenPeers, setHiddenPeers] = useState<Set<string>>(new Set());
  const constraintsRef = useRef(null);

  const handleHide = (id: string) => {
    setHiddenPeers(prev => new Set(prev).add(id));
  };

  const totalParticipants = peers.size + 1;
  const layoutMode = pinnedPeerId ? 'cinematic' : (totalParticipants === 1 ? 'spotlight' : 'grid');

  if (isMobilePiP) {
    return (
      <motion.div 
        layout
        className="fixed top-20 right-4 w-32 h-48 z-40 bg-surface rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
      >
        <VideoTile stream={localStream} name={`${localName} (You)`} muted={true} isLocal={true} isGiadarkitRoom={isGiadarkitRoom} forceCover isCameraOff={!isLocalCameraOn} peerId="local" />
      </motion.div>
    );
  }

  // --- Main Render Matrix ---
  let mainStageStream = null;
  let mainStageId = '';
  let mainStageName = '';
  let sidebarPeers: any[] = [];

  const isLocalVisible = !hiddenPeers.has('local');
  const visiblePeers = Array.from(peers?.entries() || []).filter(([id]) => !hiddenPeers.has(id));
  const activeParticipantsCount = (isLocalVisible ? 1 : 0) + visiblePeers.length;

  if (layoutMode === 'cinematic') {
    if (pinnedPeerId === 'local') {
      mainStageStream = localStream;
      mainStageName = localName + ' (You)';
      mainStageId = 'local';
    } else {
      const peerData = peers.get(pinnedPeerId!);
      mainStageStream = peerData?.stream || null;
      mainStageName = peerData?.name || `Peer ${pinnedPeerId!.substring(0, 4)}`;
      mainStageId = pinnedPeerId!;
    }
    
    // Everyone else goes to floating sidebar
    if (pinnedPeerId !== 'local' && isLocalVisible) sidebarPeers.push({ id: 'local', stream: localStream, name: localName + ' (You)', isLocal: true });
    visiblePeers.forEach(([id, data]) => {
      if (id !== pinnedPeerId) sidebarPeers.push({ id, stream: data.stream, name: data.name, isLocal: false });
    });
  }

  return (
    <>
      <div className={`flex-1 w-full flex gap-4 ${layoutMode === 'cinematic' ? '' : 'pb-[88px]'} relative`}>
        {layoutMode === 'grid' && (
          <motion.div layout className={`w-full h-full grid gap-4 p-4 ${activeParticipantsCount <= 2 ? 'grid-cols-1 md:grid-cols-2' : activeParticipantsCount <= 4 ? 'grid-cols-2 lg:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {isLocalVisible && <VideoWrapper id="local" stream={localStream} name={`${localName} (You)`} isLocal={true} onPin={() => onPin('local')} onHide={() => handleHide('local')} isPinned={false} isGiadarkitRoom={isGiadarkitRoom} isCameraOff={!isLocalCameraOn} peerId="local" />}
            {visiblePeers.map(([id, data]) => (
              <VideoWrapper key={id} id={id} stream={data.stream} name={data.name} isLocal={false} onPin={() => onPin(id)} onHide={() => handleHide(id)} isPinned={false} isGiadarkitRoom={isGiadarkitRoom} isCameraOff={peerCameraStates.get(id) === false} peerId={id} />
            ))}
          </motion.div>
        )}

        {layoutMode === 'spotlight' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-5xl aspect-video relative">
              <VideoWrapper id="local" stream={localStream} name={`${localName} (You)`} isLocal={true} onPin={() => onPin('local')} onHide={() => handleHide('local')} isPinned={false} isGiadarkitRoom={isGiadarkitRoom} isCameraOff={!isLocalCameraOn} peerId="local" />
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                 <div className="bg-black/40 backdrop-blur-md text-white/80 px-6 py-3 rounded-full font-medium">
                   Waiting for others to join...
                 </div>
              </div>
            </div>
          </div>
        )}

        {layoutMode === 'cinematic' && (
          <div ref={constraintsRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none p-4 md:p-6 lg:p-8">
            <motion.div layoutId={`video-${mainStageId}`} className="absolute inset-4 md:inset-6 lg:inset-8 overflow-hidden z-0 pointer-events-auto bg-black rounded-[40px] shadow-2xl">
               <VideoTile stream={mainStageStream} name={mainStageName} muted={mainStageId === 'local'} isLocal={mainStageId === 'local'} forceCover isGiadarkitRoom={isGiadarkitRoom} isCinematicMain isCameraOff={mainStageId === 'local' ? !isLocalCameraOn : peerCameraStates.get(mainStageId) === false} peerId={mainStageId} />
               <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full border border-white/5 text-white/60 text-[11px] font-light z-10 pointer-events-none">
                  {mainStageName}
               </div>
               <button onClick={() => onPin(null)} className="absolute top-6 right-6 bg-black/20 hover:bg-red-500/80 backdrop-blur-md p-2 rounded-full border border-white/5 text-[#10b981] hover:text-white transition-colors z-20 shadow-2xl pointer-events-auto">
                 <span className="material-symbols-outlined text-[16px]">close_fullscreen</span>
               </button>
            </motion.div>

            {sidebarPeers.map((p, i) => (
              <DraggablePiP 
                key={p.id} 
                p={p} 
                index={i} 
                onPin={onPin} 
                handleHide={handleHide} 
                isGiadarkitRoom={isGiadarkitRoom}
                constraintsRef={constraintsRef}
                isCameraOff={p.isLocal ? !isLocalCameraOn : peerCameraStates.get(p.id) === false}
              />
            ))}
          </div>
        )}

        {isGiadarkitRoom && (
          <div className="absolute top-[80vh] right-6 z-[80] pointer-events-auto">
            <button 
              onClick={saveMemory}
              className="flex items-center gap-2 bg-pink-500 hover:bg-pink-400 text-white px-5 py-3 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all transform hover:scale-105"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              <span className="text-[14px] font-medium tracking-wide">Save a Memory</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function DraggablePiP({ p, index, onPin, handleHide, isGiadarkitRoom, constraintsRef, isCameraOff }: any) {
  const [minimized, setMinimized] = useState(false);
  const [size, setSize] = useState({ width: 140 });
  const audioLevel = useAudioLevel(p.stream);
  const isSpeaking = audioLevel > 0.05;

  const handleResize = (e: any, info: any) => {
    e.stopPropagation();
    setSize(prev => {
      const newWidth = Math.max(150, Math.min(window.innerWidth * 0.4, prev.width - info.delta.x));
      return { width: newWidth };
    });
  };

  return (
    <motion.div
      layoutId={`video-${p.id}`}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.1}
      dragMomentum={false}
      className={`absolute z-50 pointer-events-auto ${minimized ? 'w-auto rounded-full' : 'aspect-video rounded-3xl'} shadow-2xl overflow-hidden flex flex-col`}
      style={{ right: 24, top: 140 + (index * 110), width: minimized ? 'auto' : size.width }}
    >
      {minimized ? (
        <div 
          onClick={() => setMinimized(false)}
          className={`flex items-center justify-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 cursor-pointer transition-colors border ${isSpeaking ? 'border-emerald-400 shadow-[0_0_15px_-3px_rgba(52,211,153,0.5)]' : 'border-white/5'}`}
        >
           <span className="text-white/80 text-[11px] font-light">{p.name}</span>
           {isSpeaking && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
        </div>
      ) : (
        <div className="w-full h-full relative group rounded-3xl overflow-hidden">
          <button 
            onClick={() => setMinimized(true)} 
            className="absolute top-2 left-2 z-30 p-1 text-[#10b981] hover:text-[#059669] transition opacity-0 group-hover:opacity-100 flex items-center justify-center"
            title="Minimize"
          >
            <span className="material-symbols-outlined text-[14px]">minimize</span>
          </button>
          
          {/* Resize Handle */}
          <motion.div
            onPan={handleResize}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-1 left-1 z-30 p-1 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            title="Drag to resize"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#10b981] opacity-60">
              <polyline points="21 15 21 21 15 21"></polyline>
              <polyline points="9 3 3 3 3 9"></polyline>
            </svg>
          </motion.div>

          <VideoWrapper id={p.id} stream={p.stream} name={p.name} isLocal={p.isLocal} onPin={() => onPin(p.id)} onHide={() => handleHide(p.id)} isPinned={true} isGiadarkitRoom={isGiadarkitRoom} forceCover isCameraOff={isCameraOff} peerId={p.id} />
        </div>
      )}
    </motion.div>
  );
}

// Sub-component defining the Framer overlay layout for Grid structures
function VideoWrapper({ id, stream, name, isLocal, onPin, onHide, isPinned, isGiadarkitRoom, forceCover, isCameraOff, peerId }: any) {
  const [showMenu, setShowMenu] = useState(false);
  const avatarColor = useMemo(() => getAvatarColor(peerId || id), [peerId, id]);

  return (
    <motion.div 
      layoutId={!isPinned ? `video-${id}` : undefined}
      layout={!isPinned}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} // Spring-like cinematic ease
      className={`relative w-full h-full bg-black/40 overflow-hidden group ${isPinned ? 'rounded-3xl' : 'rounded-3xl border border-white/5'}`}
    >
      <VideoTile stream={stream} name={name} muted={isLocal} isLocal={isLocal} isGiadarkitRoom={isGiadarkitRoom} forceCover={forceCover} isPiP={isPinned} isCameraOff={isCameraOff} peerId={peerId || id} />
      
      {/* HUD Info with Identity Dot */}
      <div className={`absolute left-3 px-2 py-0.5 bg-black/20 backdrop-blur-md rounded border border-white/5 text-white/60 text-[10px] tracking-wide font-light z-10 pointer-events-none flex items-center gap-1.5 ${isPinned ? 'bottom-2 left-6' : 'bottom-3'}`}>
        <span
          className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ backgroundColor: avatarColor.base, boxShadow: `0 0 6px ${avatarColor.base}60` }}
        />
        {name}
      </div>

      {/* Hover Controls Overlay */}
      <div className={`absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-auto flex-col`}>
        <button 
          onClick={onPin}
          className="text-[#10b981] hover:text-[#059669] transition-colors flex items-center justify-center p-1"
          title="Pin for me"
        >
          <span className="material-symbols-outlined text-[14px]">push_pin</span>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-[#10b981] hover:text-[#059669] transition-colors flex items-center justify-center p-1"
          >
            <span className="material-symbols-outlined text-[14px]">more_vert</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-40 bg-surface/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 z-50">
              <button 
                className="w-full text-left px-4 py-2 hover:bg-white/5 text-[13px] text-white flex items-center gap-2"
                onClick={() => { onPin(); setShowMenu(false); }}
              >
                <span className="material-symbols-outlined text-[16px]">aspect_ratio</span>
                Fit to frame
              </button>
              <button 
                className="w-full text-left px-4 py-2 hover:bg-white/5 text-[13px] text-red-400 flex items-center gap-2"
                onClick={() => { onHide(); setShowMenu(false); }}
              >
                <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                Hide from view
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function VideoTile({ stream, name, muted, isLocal, forceCover, isGiadarkitRoom, isCinematicMain, isPiP, isCameraOff = false, peerId = 'unknown' }: { stream: MediaStream | null, name?: string, muted: boolean, isLocal: boolean, forceCover?: boolean, isGiadarkitRoom?: boolean, isCinematicMain?: boolean, isPiP?: boolean, isCameraOff?: boolean; peerId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioLevel = useAudioLevel(stream);

  const isSpeaking = audioLevel > 0.05;

  const isScreenShare = stream ? stream.getVideoTracks().some(t => t.getSettings().displaySurface !== undefined || t.label.toLowerCase().includes('screen')) : false;

  const hasVideo = stream ? stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live') : false;

  // Unified visibility: show video ONLY when track is live AND camera is signaled ON
  const showVideo = hasVideo && !isCameraOff;

  // Effect 1: Bind srcObject when stream reference changes (initial mount / stream swap)
  useLayoutEffect(() => {
    if (videoRef.current) {
      if (stream) {
        console.log('[Attaching Stream to DOM]', stream.id, 'tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}`).join(', '));
        videoRef.current.srcObject = stream;
        videoRef.current.play()
          .then(() => console.log('[Video Playback Started]', stream.id))
          .catch(e => {
            console.warn('Video playback warning, retrying muted:', e);
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  // Effect 2: Re-bind and re-play when camera toggles (same stream object, but browser needs a kick)
  useEffect(() => {
    if (!videoRef.current || !stream) return;
    if (!isCameraOff) {
      // Camera just turned ON — force re-attach the stream and play
      console.log('[Camera ON — re-binding stream]', stream.id);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOff, stream]);

  const handleVideoError = (e: any) => {
    const err = e.target.error;
    console.error('Video Error:', err);
  };

  const speakingClass = isSpeaking ? (isGiadarkitRoom ? 'border-pink-400 shadow-[0_0_30px_-5px_rgba(244,114,182,0.4)] speaking-glow' : 'border-emerald-400 shadow-[0_0_30px_-5px_rgba(52,211,153,0.3)] speaking-glow') : 'border-transparent';
  let wrapperClasses = `absolute inset-0 w-full h-full transition-colors duration-300 bg-black overflow-hidden`;
  
  if (isCinematicMain) {
    wrapperClasses += ' ';
  } else if (isPiP) {
    wrapperClasses += ` rounded-3xl`;
  } else {
    wrapperClasses += ` rounded-3xl border-2 ${speakingClass} z-10`;
  }

  // Determine avatar size: large for pinned/cinematic, small for PiP/grid
  const isLargeAvatar = !!isCinematicMain;

  return (
    <div className={wrapperClasses}>
      {!stream && !name ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030303] z-20">
           <div className="w-8 h-8 rounded-full border-2 border-[#10b981] border-t-transparent animate-spin mb-3"></div>
           <span className="text-white/50 text-[11px] uppercase tracking-widest font-mono">Loading Media...</span>
        </div>
      ) : null}

      {/* Video element — always in DOM, never display:none (browsers pause hidden streams) */}
      <video  
        ref={videoRef} 
        className={`w-full h-full ${isCinematicMain ? '' : 'rounded-3xl'} ${isLocal && !isScreenShare ? '-scale-x-100' : ''} ${forceCover ? 'object-cover' : 'object-contain md:object-cover'} transition-opacity duration-300 ${showVideo ? 'opacity-100' : 'opacity-0'}`} 
        autoPlay 
        muted={muted}
        playsInline
        onError={handleVideoError}
      />

      {/* Avatar overlay — fades in when camera is off, fades out when camera is on */}
      <AnimatePresence>
        {(!showVideo) && name && (
          <CameraOffAvatar key="camera-off-avatar" name={name} isLarge={isLargeAvatar} isPiP={isPiP} peerId={peerId} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CameraOffAvatar({ name, isLarge = false, isPiP = false, peerId = 'unknown' }: { name: string; isLarge?: boolean; isPiP?: boolean; peerId?: string }) {
  const initial = name ? name.replace(/\(You\)/i, '').trim().charAt(0).toUpperCase() : '?';

  // Memoize so the hash doesn't re-run on every pulsing animation frame
  const color = useMemo(() => getAvatarColor(peerId), [peerId]);

  // Dynamic sizing: large for pinned/cinematic, small for PiP, medium for grid
  const sizeClass = isLarge
    ? 'w-[120px] h-[120px]'
    : isPiP
      ? 'w-12 h-12'
      : 'w-20 h-20 md:w-[100px] md:h-[100px]';

  const textClass = isLarge
    ? 'text-5xl md:text-6xl'
    : isPiP
      ? 'text-lg'
      : 'text-3xl md:text-5xl';

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden z-10"
      style={{ background: `linear-gradient(135deg, ${color.dark}30 0%, #0a0a0a 60%, ${color.dark}15 100%)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Noise filter background overlay for texture depth */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-screen" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />
      
      {/* Central avatar — layout prop for smooth size transitions */}
      <motion.div
        layout
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ 
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          layout: { type: 'spring', damping: 25, stiffness: 300 }
        }}
        className={`relative flex items-center justify-center ${sizeClass} rounded-full backdrop-blur-md`}
        style={{
          background: `linear-gradient(135deg, ${color.base}, ${color.dark})`,
          boxShadow: `0 0 40px ${color.base}4D, inset 0 1px 0 ${color.base}66`,
          border: `1px solid ${color.base}66`,
        }}
      >
        <span className={`text-white ${textClass} font-semibold tracking-wider drop-shadow-lg`}>
          {initial}
        </span>
      </motion.div>
    </motion.div>
  );
}
