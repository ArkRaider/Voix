import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroGeometric } from '../components/ui/shape-landing-hero';
import { toast } from 'sonner';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator } from '../components/ui/interfaces-breadcrumb';
import { Checkbox } from '../components/ui/checkbox';
import { useWebRTCEngine } from '../contexts/WebRTCContext';
import { useRoomStore } from '../store/roomStore';

export default function Landing() {
  const navigate = useNavigate();
  const setDisplayName = useRoomStore((state) => state.setDisplayName);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(localStorage.getItem('voix_name') || '');
  const [roomCode, setRoomCode] = useState('');
  const [lastRoom] = useState(localStorage.getItem('voix_last_room') || '');
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [showHearts, setShowHearts] = useState(false);
  const engineContext = useWebRTCEngine();

  const isNameValid = name.trim().length > 0;

  const executePreFlight = async (roomIdToJoin: string) => {
    setIsWarmingUp(true);
    toast.loading('Warming up camera...', { id: 'preflight' });
    
    const stream = await engineContext.initializeMedia();
    toast.dismiss('preflight');
    setIsWarmingUp(false);
    
    if (stream) {
      localStorage.setItem('voix_name', name);
      localStorage.setItem('voix_last_room', roomIdToJoin);
      setDisplayName(name);
      navigate(`/room/${roomIdToJoin}`);
    }
  };

  const handleStep1Confirm = () => {
    if (!isNameValid) return;
    localStorage.setItem('voix_name', name);
    setDisplayName(name);
    setStep(2);
  };

  const generateRoomId = () => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    if (isWarmingUp) return;
    executePreFlight(generateRoomId());
  };

  const handleJoinRoom = () => {
    if (!roomCode || isWarmingUp) return;
    if (roomCode.toLowerCase() === 'giadarkit') {
      setShowHearts(true);
      setTimeout(() => executePreFlight('giadarkit'), 2200);
    } else {
      executePreFlight(roomCode);
    }
  };

  return (
    <HeroGeometric>
      <main className="w-full max-w-[400px] mx-auto px-6 flex flex-col items-center text-center space-y-10 relative z-20 pt-10">
        
        {/* Brand Section */}
        <div className="space-y-2">
          <h1 className="text-[28px] font-medium tracking-[-0.04em] text-white flex items-center justify-center">
            voix<span className="text-emerald-400">·</span>
          </h1>
          <p className="text-[14px] text-white/50 font-normal tracking-tight">
            Clear calls. Nothing more.
          </p>
        </div>

        {/* Two-Step Action Flow */}
        <div className="pt-20 flex flex-col items-center justify-center w-full relative h-[150px]">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full absolute flex flex-col items-center justify-center"
              >
                <Breadcrumb className="w-full">
                  <BreadcrumbList className="font-mono space-x-2 text-sm flex-nowrap shrink-0 overflow-hidden items-center justify-center">
                    <BreadcrumbItem>
                      <span className="text-white/40 tracking-widest uppercase text-xs shrink-0 cursor-default">Name</span>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-white/20 shrink-0" />
                    <BreadcrumbItem className="shrink min-w-[50px] max-w-[140px]">
                      <input 
                        type="text" 
                        value={name}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && isNameValid) handleStep1Confirm();
                        }}
                        className="bg-transparent border-b border-white/20 outline-none text-white text-center w-full pb-1 transition-all focus:border-white/60 caret-[#10b981] overflow-hidden text-ellipsis whitespace-nowrap"
                      />
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-white/20 shrink-0" />
                    <BreadcrumbItem className="shrink-0">
                      <button 
                        onClick={handleStep1Confirm}
                        disabled={!isNameValid}
                        className={`transition-all duration-300 uppercase tracking-widest text-[11px] font-medium ${
                          isNameValid 
                            ? 'text-[#10b981] drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                            : 'text-white/40 cursor-not-allowed hover:text-white/60'
                        }`}
                      >
                        Okay
                      </button>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full absolute flex flex-col items-center justify-center space-y-6"
              >
                {/* Back Button */}
                <button 
                  onClick={() => setStep(1)}
                  className="absolute -top-12 left-0 text-white/30 hover:text-white/70 transition-colors text-xs flex items-center gap-1"
                >
                  <span>&larr;</span> Back
                </button>

                {/* Option A: Create */}
                <div 
                  className="flex items-center justify-center gap-3 cursor-pointer group"
                  onClick={handleCreateRoom}
                >
                  <Checkbox checked={false} />
                  <span className="text-white/80 group-hover:text-white tracking-widest font-normal uppercase text-sm transition-colors">
                    Create Room
                  </span>
                </div>

                {/* Divider */}
                <div className="w-full flex items-center justify-center gap-3 opacity-40">
                  <div className="h-[1px] w-12 bg-white/20"></div>
                  <span className="text-[9px] uppercase tracking-widest cursor-default">Join Existing</span>
                  <div className="h-[1px] w-12 bg-white/20"></div>
                </div>

                {/* Option B: Join */}
                <div className="flex flex-col items-center justify-center gap-1 w-full relative">
                  <div className="flex items-center justify-center gap-3">
                    <input 
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                      onKeyDown={(e) => { if (e.key === 'Enter' && roomCode) handleJoinRoom() }}
                      className="w-[120px] h-[36px] bg-white/5 border border-white/10 text-white font-mono text-[14px] tracking-[0.08em] px-3 rounded-[6px] focus:ring-1 focus:ring-[#10b981]/50 outline-none placeholder:text-white/20 transition-all text-center" 
                      placeholder="Room Code" 
                      autoFocus
                    />
                    <button 
                      onClick={handleJoinRoom}
                      disabled={!roomCode}
                      className={`h-[36px] px-4 text-[11px] uppercase tracking-widest font-medium rounded-[6px] transition-all bg-transparent ${
                        roomCode ? 'text-[#10b981] drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'text-white/30 cursor-not-allowed'
                      }`}
                    >
                      Join
                    </button>
                  </div>
                  
                  {lastRoom && (
                    <button 
                      onClick={() => setRoomCode(lastRoom)}
                      className="absolute top-[48px] text-[10px] text-white/20 hover:text-white/50 tracking-widest font-mono transition-colors"
                    >
                      {lastRoom}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Easter Egg Overlay */}
      {showHearts && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 45 }).map((_, i) => (
            <motion.div
               key={i}
               initial={{ y: '110vh', x: `${Math.random() * 100}vw`, opacity: 0, scale: Math.random() * 0.6 + 0.4 }}
               animate={{ y: '-20vh', opacity: [0, 1, 1, 0] }}
               transition={{ duration: Math.random() * 2.5 + 1.5, ease: 'easeOut', delay: Math.random() * 0.5 }}
               className="absolute text-5xl drop-shadow-[0_0_20px_rgba(244,114,182,0.8)]"
            >
              {['❤️', '💖', '✨', '💕'][Math.floor(Math.random() * 4)]}
            </motion.div>
          ))}
        </div>
      )}
    </HeroGeometric>
  );
}
