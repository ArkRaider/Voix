import { useEffect, useState } from 'react';

export default function RoomHeader({ roomId, participantsCount }: { roomId: string, participantsCount: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-[60] h-[64px] flex justify-between items-center px-6 pointer-events-none">
      <div className="flex items-center gap-4 pointer-events-auto">
        <span className="text-[24px] font-bold text-white tracking-tighter drop-shadow-md">voix.</span>
        
        <button 
          onClick={() => {
            navigator.clipboard.writeText(roomId);
            import('sonner').then(({ toast }) => toast.success(`Copied room code: ${roomId}`));
          }}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors backdrop-blur-md border border-white/5"
        >
          <span className="font-mono text-sm text-white/90 tracking-widest">{roomId}</span>
          <span className="material-symbols-outlined text-[14px] text-white/50">content_copy</span>
        </button>
      </div>

      <div className="flex items-center gap-4 text-[15px] text-white drop-shadow-md font-medium pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>{participantsCount}</span>
        </div>
        <div className="font-mono">
          {formatTime(elapsed)}
        </div>
      </div>
    </header>
  );
}
