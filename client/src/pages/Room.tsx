import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RoomHeader from '../components/layout/RoomHeader';
import Controls from '../components/call/Controls';
import VideoGrid from '../components/call/VideoGrid';
import ChatPanel from '../components/chat/ChatPanel';
import { useWebRTCEngine, useWebRTCStatus, useWebRTCPeers, useWebRTCStream, useWebRTCScreenshare, useWebRTCCameraStates, useWebRTCLocalCamera } from '../contexts/WebRTCContext';
import { useBackgroundBlur } from '../hooks/useBackgroundBlur';
import { useCallRecorder } from '../hooks/useCallRecorder';
import { toast } from 'sonner';
import ReactionLayer from '../components/call/ReactionLayer';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [forceShowUI, setForceShowUI] = useState(false);

  // Reset forceShowUI if unpinned
  useEffect(() => {
    if (!pinnedPeerId) setForceShowUI(false);
  }, [pinnedPeerId]);

  const isMobile = window.innerWidth < 768;
  const isHeaderHidden = isMobile && pinnedPeerId && !forceShowUI;
  const isGiadarkitRoom = roomId?.toLowerCase() === 'giadarkit';
  const [showSanctuaryBanner, setShowSanctuaryBanner] = useState(isGiadarkitRoom);

  // Easter Egg Sanctuary Privacy & Banner Timeout
  useEffect(() => {
    if (isGiadarkitRoom) {
      const originalLog = console.log;
      console.log = () => {};
      const timer = setTimeout(() => setShowSanctuaryBanner(false), 5000);
      return () => {
        console.log = originalLog;
        clearTimeout(timer);
      };
    }
  }, [isGiadarkitRoom]);

  // Fallback if no username exists
  const localName = localStorage.getItem('voix_name') || 'Anonymous';

  const engine = useWebRTCEngine();
  const status = useWebRTCStatus();
  const peers = useWebRTCPeers();
  const engineLocalStream = useWebRTCStream();
  const isScreenSharing = useWebRTCScreenshare();
  const peerCameraStates = useWebRTCCameraStates();
  const isLocalCameraOn = useWebRTCLocalCamera();

  // --- Background Blur State ---
  const [blurEnabled, setBlurEnabled] = useState(() => localStorage.getItem('voix_blur') === 'true');
  const [blurRadius, setBlurRadius] = useState(() => {
    const saved = localStorage.getItem('voix_blur_radius');
    return saved ? Number(saved) : 10;
  });

  // Persist blur preferences
  useEffect(() => {
    localStorage.setItem('voix_blur', blurEnabled.toString());
  }, [blurEnabled]);
  useEffect(() => {
    localStorage.setItem('voix_blur_radius', blurRadius.toString());
  }, [blurRadius]);

  // --- AI Background Blur Pipeline ---
  // Feed raw camera stream + blur radius into the segmentation hook.
  // When blur is off (radius 0), the hook passes through the raw stream unchanged.
  const { outputStream: blurredStream } = useBackgroundBlur(
    engineLocalStream,
    blurEnabled ? blurRadius : 0
  );

  // When the blurred stream changes, push it into the WebRTC engine
  // so peers receive the processed video with blurred background
  const prevBlurStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    if (blurredStream && blurredStream !== engineLocalStream && blurredStream !== prevBlurStreamRef.current) {
      prevBlurStreamRef.current = blurredStream;
      engine.updateLocalStream(blurredStream);
      console.log('[Room] Pushed blurred stream to WebRTC engine');
    } else if (!blurEnabled && engineLocalStream && prevBlurStreamRef.current) {
      // Blur was disabled — revert to raw camera stream
      prevBlurStreamRef.current = null;
      engine.updateLocalStream(engineLocalStream);
      console.log('[Room] Reverted to raw camera stream');
    }
  }, [blurredStream, blurEnabled, engineLocalStream, engine]);

  // The stream to display locally: use blurred if active, otherwise raw
  const displayStream = blurEnabled && blurredStream ? blurredStream : engineLocalStream;

  const { isRecording, toggleRecording } = useCallRecorder();
  const [renderError, setRenderError] = useState<string | null>(null);

  // Forced Mounting Logic
  useLayoutEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    
    const initFlow = async () => {
      try {
        let stream = engine.localMediaStream;
        if (!stream) {
          console.log('[Fallback Routing] Missing pre-flight stream, requesting raw user media directly...');
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(err => {
             console.error('Fatal Camera Reject:', err);
             toast.error('Fatal: Cannot read camera hardware.');
             return null;
          });
        }
        engine.joinRoom(roomId, localName, stream || undefined);
      } catch (err) {
        setRenderError('Fatal capture block: WebRTC Pipeline Failed.');
      }
    };
    initFlow();

    return () => {
      engine.disconnect();
    };
  }, [roomId, localName, navigate, engine]);

  // Sonner feedback logic
  useEffect(() => {
    if (status === 'connecting') toast.loading('Connecting...', { id: 'webrtc' });
    if (status === 'connected') toast.success('Connected', { id: 'webrtc' });
    if (status === 'ice-restarted') toast.success('ICE Connection Restored', { id: 'webrtc' });
    if (status === 'disconnected') {
      toast.dismiss('webrtc');
      toast.error('Disconnected');
    }
  }, [status]);

  const handleLeave = () => {
    if (window.confirm("Are you sure you want to leave the room?")) {
      navigate('/');
    }
  };

  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  useEffect(() => {
    // Intercept back-navigation logic
    window.history.pushState({ room: 'active' }, '');
    
    const handlePopState = () => {
       if (chatOpenRef.current) {
         // Chat panel manages its own history dummy state. Let it pop normally.
         return;
       }
       if (window.confirm("Are you sure you want to leave the room?")) {
          navigate('/');
       } else {
          // Restore the intercepted state
          window.history.pushState({ room: 'active' }, '');
       }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
       window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

    if (!engineLocalStream || renderError) {
      return (
        <div className="h-screen w-screen bg-[#030303] flex items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-4">
             <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-white/50 font-mono text-sm tracking-widest uppercase">
               {renderError ? `Error: ${renderError}` : 'Initializing Connection...'}
             </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-[#030303] text-on-surface font-sans overflow-hidden h-screen w-screen flex flex-col relative z-10">
        
        <AnimatePresence>
          {!isHeaderHidden && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={pinnedPeerId ? "absolute top-0 left-0 w-full z-40" : "flex-shrink-0 z-40"}
            >
              <RoomHeader 
                roomId={roomId || ''} 
                participantsCount={peers.size + 1} 
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <main 
          onClick={pinnedPeerId && isMobile ? () => setForceShowUI(!forceShowUI) : undefined}
          className={`flex-1 w-full flex relative transition-all duration-700 ease-in-out ${pinnedPeerId ? 'p-0 z-0' : 'pt-[64px] px-4'} ${chatOpen && isMobile ? 'pointer-events-none opacity-40 after:absolute after:inset-0 after:bg-black/80 after:backdrop-blur-md after:z-10 overflow-hidden' : ''} ${chatOpen && !isMobile ? 'md:pr-[350px]' : ''}`}
        >
          <ReactionLayer />
          <VideoGrid 
            localName={localName} 
            localStream={displayStream} 
            peers={peers} 
            pinnedPeerId={pinnedPeerId}
            onPin={setPinnedPeerId}
            isMobilePiP={isMobile && chatOpen}
            isGiadarkitRoom={isGiadarkitRoom}
            isLocalCameraOn={isLocalCameraOn}
            peerCameraStates={peerCameraStates}
          />
          
          <AnimatePresence>
            {showSanctuaryBanner && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 2 } }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <h1 className="text-3xl md:text-5xl text-pink-400 font-light tracking-widest drop-shadow-[0_0_20px_rgba(244,114,182,0.8)] text-center px-4 leading-tight">
                  Welcome to our sanctuary, Giada.
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {!(isMobile && chatOpen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.3 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="z-[50]"
            >
              <Controls 
                isChatOpen={chatOpen}
                onToggleChat={() => setChatOpen(!chatOpen)}
                onLeave={handleLeave}
                isScreenSharing={isScreenSharing}
                onToggleScreenShare={() => engine.toggleScreenShare()}
                blurEnabled={blurEnabled}
                onToggleBlur={() => setBlurEnabled(!blurEnabled)}
                blurRadius={blurRadius}
                onBlurRadiusChange={setBlurRadius}
                isRecording={isRecording}
                onToggleRecord={() => toggleRecording(engineLocalStream)}
                onEmojiSelect={(emoji: string) => engine.sendReaction(emoji)}
                onToggleMic={() => engine.toggleAudio()}
                onToggleVideo={() => engine.toggleVideo()}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ChatPanel 
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)} 
          onOpenAppRequested={() => setChatOpen(true)}
        />
      </div>
    );
}
