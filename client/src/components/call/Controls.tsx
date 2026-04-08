import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import BlurSlider from './BlurSlider';

interface ControlsProps {
  onToggleChat: () => void;
  onLeave: () => void;
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  blurEnabled: boolean;
  onToggleBlur: () => void;
  blurRadius: number;
  onBlurRadiusChange: (radius: number) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  onEmojiSelect: (emoji: string) => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  isChatOpen?: boolean;
}

export default function Controls({ 
  onToggleChat, 
  onLeave, 
  isScreenSharing, 
  onToggleScreenShare,
  blurEnabled,
  onToggleBlur,
  blurRadius,
  onBlurRadiusChange,
  isRecording,
  onToggleRecord,
  onEmojiSelect,
  onToggleMic,
  onToggleVideo,
  isChatOpen
}: ControlsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleMic = () => { onToggleMic(); setIsMicOn(prev => !prev); };
  const handleToggleVideo = () => { onToggleVideo(); setIsVideoOn(prev => !prev); };
  
  const handleToggleScreenShare = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      toast.error('Mobile Screen Share is restricted by your browser. Try Desktop.');
      return;
    }
    onToggleScreenShare();
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[50] w-[90%] md:w-max max-w-[calc(100vw-32px)] flex flex-col items-center gap-2 pointer-events-none"
      style={{ bottom: `calc(clamp(10px, 2vh, 20px) + env(safe-area-inset-bottom, 0px))` }}
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex flex-col items-center gap-4 w-full pointer-events-none"
          >
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="pointer-events-auto flex items-center justify-center gap-1 md:gap-2 bg-black/40 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-2xl z-[70] w-fit mx-auto max-w-full flex-wrap"
                >
                   {['👍', '🔥', '😂', '🎉', '❤️', '👀'].map(emoji => (
                     <button 
                       key={emoji}
                       onClick={(e) => { 
                         e.stopPropagation();
                         onEmojiSelect(emoji); 
                       }}
                       onTouchStart={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         onEmojiSelect(emoji);
                       }}
                       className="p-1 hover:bg-white/10 rounded-full text-[18px] sm:text-[22px] leading-none transition-transform hover:scale-125 hover:-translate-y-1 active:scale-95 touch-manipulation"
                     >
                       {emoji}
                     </button>
                   ))}
                </motion.div>
              )}
            </AnimatePresence>

            <nav className="pointer-events-auto border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-full px-1.5 md:px-3 py-1 flex justify-center items-center gap-0.5 md:gap-[2px] bg-black/20 backdrop-blur-lg w-full">
              {/* Mic Button */}
              <button 
                onClick={handleToggleMic}
                className={`flex-shrink-0 relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center ${
                  !isMicOn 
                    ? 'text-red-500 opacity-80 hover:opacity-100 hover:bg-white/5' 
                    : 'text-emerald-400 bg-[#10b981]/20 opacity-90 hover:opacity-100'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">{isMicOn ? 'mic' : 'mic_off'}</span>
              </button>

              {/* Camera Button */}
              <button 
                onClick={handleToggleVideo}
                className={`flex-shrink-0 relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center ${
                  !isVideoOn 
                    ? 'text-red-500 opacity-80 hover:opacity-100 hover:bg-white/5' 
                    : 'text-emerald-400 bg-[#10b981]/20 opacity-90 hover:opacity-100'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">{isVideoOn ? 'videocam' : 'videocam_off'}</span>
              </button>

              {/* Blur Slider (replaces old toggle) */}
              <BlurSlider
                blurEnabled={blurEnabled}
                blurRadius={blurRadius}
                onToggleBlur={onToggleBlur}
                onBlurRadiusChange={onBlurRadiusChange}
              />

              <div className="hidden md:block w-[1px] h-4 bg-white/10 mx-1 md:mx-2"></div>

              {/* Emoji Reactions */}
              <div className="relative flex-shrink-0">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEmojiPicker(prev => !prev);
                  }}
                  className={`relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center touch-manipulation ${
                    showEmojiPicker 
                      ? 'text-emerald-400 bg-[#10b981]/20 opacity-90 hover:opacity-100' 
                      : 'text-white/60 hover:opacity-100 hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">add_reaction</span>
                </button>
              </div>

              {/* Record Button */}
              <button 
                onClick={onToggleRecord}
                className={`flex-shrink-0 relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center ${
                  isRecording 
                    ? 'text-red-500 bg-red-500/20 opacity-90 hover:opacity-100' 
                    : 'text-white/60 hover:opacity-100 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">radio_button_checked</span>
                {isRecording && <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>}
              </button>

              <div className="hidden md:block w-[1px] h-4 bg-white/10 mx-1 md:mx-2"></div>

            {/* Screen Share Button */}
            <button 
              onClick={handleToggleScreenShare}
              className={`flex-shrink-0 relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center ${
                isScreenSharing 
                  ? 'text-emerald-400 bg-[#10b981]/20 opacity-90 hover:opacity-100' 
                  : 'text-white/60 hover:opacity-100 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">present_to_all</span>
            </button>

            {/* Chat Button */}
            <button 
              onClick={onToggleChat}
              className={`flex-shrink-0 relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center ${
                isChatOpen 
                  ? 'text-emerald-400 bg-[#10b981]/20 opacity-90 hover:opacity-100' 
                  : 'text-white/60 hover:opacity-100 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">chat</span>
            </button>

            <div className="hidden md:block w-[1px] h-4 bg-white/10 mx-1 md:mx-2"></div>

            {/* Leave Button */}
            <button 
              onClick={onLeave}
              className="flex-shrink-0 group hover:bg-red-500/20 transition-all duration-300 active:scale-95 p-1.5 md:p-2 rounded-full flex items-center justify-center opacity-80 hover:opacity-100"
            >
              <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none text-red-500">call_end</span>
            </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dash-to-Chevron Handle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="pointer-events-auto py-3 px-8 rounded-full flex items-center justify-center group"
        aria-label="Toggle Controls"
      >
        <svg
          width="40"
          height="10"
          viewBox="0 0 40 10"
          fill="none"
          className="overflow-visible opacity-40 group-hover:opacity-80 transition-opacity duration-300"
        >
          {/* Left arm */}
          <motion.line
            x1={Number(4) || 0}
            y1={Number(5) || 0}
            x2={Number(20) || 0}
            y2={Number(isExpanded ? 2 : 5) || 0}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{
              y2: Number(isExpanded ? 2 : 5) || 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          {/* Right arm */}
          <motion.line
            x1={Number(20) || 0}
            y1={Number(isExpanded ? 2 : 5) || 0}
            x2={Number(36) || 0}
            y2={Number(5) || 0}
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{
              y1: Number(isExpanded ? 2 : 5) || 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </svg>
      </button>
    </div>
  );
}
