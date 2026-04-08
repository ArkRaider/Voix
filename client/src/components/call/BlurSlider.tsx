import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlurSliderProps {
  blurEnabled: boolean;
  blurRadius: number;
  onToggleBlur: () => void;
  onBlurRadiusChange: (radius: number) => void;
}

export default function BlurSlider({
  blurEnabled,
  blurRadius,
  onToggleBlur,
  onBlurRadiusChange,
}: BlurSliderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={panelRef} className="relative flex-shrink-0">
      {/* Trigger Button — matches existing control bar icon style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative group p-1.5 md:p-2 rounded-full transition-all duration-300 active:scale-90 flex items-center justify-center ${
          blurEnabled
            ? 'text-emerald-400 bg-[#10b981]/20 opacity-90 hover:opacity-100'
            : 'text-white/60 hover:opacity-100 hover:bg-white/5'
        }`}
        title="Video Settings"
        id="video-settings-trigger"
      >
        <span className="material-symbols-outlined text-[18px] md:text-[20px] leading-none">
          blur_on
        </span>
        {/* Active indicator dot */}
        {blurEnabled && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
        )}
      </button>

      {/* Video Settings Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(4px)' }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 340,
              mass: 0.8,
            }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[80] w-[240px]"
            id="video-settings-popover"
          >
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-[11px] font-medium tracking-widest uppercase text-white/40">
                  Video Settings
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px] text-white/30">
                    close
                  </span>
                </button>
              </div>

              {/* Blur Toggle Row */}
              <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400/80">
                    blur_on
                  </span>
                  <span className="text-[13px] text-white/70 font-light">
                    Background Blur
                  </span>
                </div>
                <button
                  onClick={onToggleBlur}
                  className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
                    blurEnabled
                      ? 'bg-emerald-500/50 border border-emerald-400/40'
                      : 'bg-white/10 border border-white/10'
                  }`}
                  id="blur-toggle"
                >
                  <motion.div
                    animate={{
                      x: blurEnabled ? 16 : 2,
                    }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className={`absolute top-[3px] w-3.5 h-3.5 rounded-full transition-colors duration-300 ${
                      blurEnabled
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                        : 'bg-white/40'
                    }`}
                  />
                </button>
              </div>

              {/* Intensity Slider */}
              <AnimatePresence>
                {blurEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pt-2 pb-4">
                      {/* Labels */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-white/30 font-light">
                          Intensity
                        </span>
                        <span className="text-[11px] text-emerald-400/80 font-mono tabular-nums">
                          {blurRadius}px
                        </span>
                      </div>

                      {/* Custom Slider Track */}
                      <div className="relative w-full h-6 flex items-center group">
                        {/* Track Background */}
                        <div className="absolute left-0 right-0 h-[3px] rounded-full bg-white/8 overflow-hidden">
                          {/* Active Fill */}
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/80 rounded-full"
                            style={{ width: `${(blurRadius / 20) * 100}%` }}
                            layout
                            transition={{
                              type: 'spring',
                              damping: 30,
                              stiffness: 400,
                            }}
                          />
                        </div>

                        {/* Native Range Input (invisible, handles interaction) */}
                        <input
                          type="range"
                          id="blur-intensity-slider"
                          min={1}
                          max={20}
                          step={1}
                          value={blurRadius}
                          onChange={(e) =>
                            onBlurRadiusChange(Number(e.target.value))
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Thumb */}
                        <motion.div
                          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{
                            left: `calc(${(blurRadius / 20) * 100}% - 6px)`,
                          }}
                          layout
                          transition={{
                            type: 'spring',
                            damping: 30,
                            stiffness: 400,
                          }}
                        >
                          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] border-2 border-emerald-300/60 group-hover:scale-125 transition-transform" />
                        </motion.div>
                      </div>

                      {/* Preset Buttons */}
                      <div className="flex items-center justify-between mt-2.5 gap-1">
                        {[
                          { label: 'Subtle', value: 4 },
                          { label: 'Medium', value: 10 },
                          { label: 'Max', value: 20 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => onBlurRadiusChange(preset.value)}
                            className={`flex-1 text-[10px] py-1 rounded-lg transition-all duration-200 border ${
                              blurRadius === preset.value
                                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
                                : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer hint */}
              <div className="px-4 pb-3 pt-0">
                <p className="text-[9px] text-white/20 leading-tight font-light">
                  {blurEnabled
                    ? 'AI segmentation active — your face stays sharp while the background is blurred.'
                    : 'Enable to blur your background using AI-powered segmentation.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
