import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Download } from 'lucide-react';
import { useWebRTCEngine } from '../../contexts/WebRTCContext';
import { toast } from 'sonner';
import AnoAI from '../ui/AnoAI';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAppRequested?: () => void;
}

export default function ChatPanel({ isOpen, onClose, onOpenAppRequested }: ChatPanelProps) {
  const engine = useWebRTCEngine();
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string, text?: string, file?: Blob, fileName?: string, fileUrl?: string, fileType?: string, isSelf?: boolean }>>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      window.history.pushState({ popup: 'chat' }, '');
      const handlePopState = (_e: PopStateEvent) => {
         onClose();
      };
      window.addEventListener('popstate', handlePopState);

      // Delay auto-focus slightly to allow Framer transition to resolve visually
      const timer = setTimeout(() => inputRef.current?.focus(), 350);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Helper: resolve peer display name from peerId
  const getPeerName = (peerId: string): string => {
    const peer = engine.remotePeers.get(peerId);
    return peer?.name || `Peer ${peerId.substring(0, 4)}`;
  };

  // Smart truncation: full text ≤60 chars, ellipsis beyond
  const smartTruncate = (text: string, limit = 60): string => {
    return text.length > limit ? text.substring(0, limit) + '…' : text;
  };

  // Receive files and messages
  useEffect(() => {
    const handleFile = ({ id, fileName, blob }: { id: string, fileName: string, blob: Blob }) => {
      const fileUrl = URL.createObjectURL(blob);
      const fileType = blob.type || (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/unknown' : fileName.match(/\.(mp4|mov|webm)$/i) ? 'video/unknown' : 'application/octet-stream');
      setMessages(prev => [...prev, { id, file: blob, fileName, fileUrl, fileType, isSelf: false }]);
      if (!isOpen && onOpenAppRequested) {
        // file_received doesn't carry `from`, so scan peers for best-effort name
        const peerEntries = Array.from(engine.remotePeers.entries());
        const senderName = peerEntries.length === 1
          ? peerEntries[0][1].name
          : `Peer ${id.substring(0, 4)}`;
        toast(senderName, { 
          description: smartTruncate(fileName),
          position: 'bottom-right',
          duration: 4000,
          style: { maxWidth: '300px', overflow: 'hidden' },
          action: { label: 'Open', onClick: onOpenAppRequested }
        });
      }
    };
    const handleText = ({ id, text, from }: { id: string, text: string, from: string }) => {
      setMessages(prev => [...prev, { id, text, isSelf: false }]);
      if (!isOpen && onOpenAppRequested) {
        const senderName = getPeerName(from);
        toast(senderName, {
          description: smartTruncate(text),
          position: 'bottom-right',
          duration: 4000,
          style: { maxWidth: '300px', overflow: 'hidden' },
          action: { label: 'Open', onClick: onOpenAppRequested }
        });
      }
    };

    engine.on('file_received', handleFile);
    engine.on('text_received', handleText);

    return () => {
      engine.off('file_received', handleFile as any);
      engine.off('text_received', handleText as any);
    };
  }, [engine]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
    // Reset so same file can be chosen again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedFile = async (file: File) => {
    setIsUploading(true);
    toast.loading(`Sending ${file.name}...`, { id: 'file-send' });
    try {
      // Create the preview URL once, upfront
      const fileUrl = URL.createObjectURL(file);
      const fileType = file.type;

      await engine.sendFile(file);
      setMessages(prev => [...prev, { id: Date.now().toString(), file, fileName: file.name, fileUrl, fileType, isSelf: true }]);
      toast.success(`Sent ${file.name}`, { id: 'file-send' });
    } catch (_e) {
      toast.error('File transfer failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    engine.sendMessage(inputText);
    setMessages(prev => [...prev, { id: Date.now().toString(), text: inputText, isSelf: true }]);
    setInputText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full md:w-[350px] z-[100] md:border-l border-white/[0.06] flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
        >
          <AnoAI className="absolute inset-0 z-[-1] pointer-events-none" />
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/20 backdrop-blur-lg">
            <h3 className="text-[14px] font-semibold tracking-wider text-white">ROOM CHAT</h3>
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  window.history.back(); // Pops the state which triggers onClose via popstate
                } else {
                  onClose();
                }
              }}
              className="text-text-disabled hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">{window.innerWidth < 768 ? 'keyboard_arrow_down' : 'close'}</span>
            </button>
          </div>

          {/* Messages Area - Drag and Drop Target */}
          <div 
            className={`flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide ${isDragOver ? 'bg-accent/10 border-2 border-dashed border-accent' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="text-center text-[12px] text-text-disabled my-4">
              Joined room
            </div>
            
            {messages.map(msg => {
              const url = msg.fileUrl || '';
              const isImg = msg.fileType?.startsWith('image/');
              const isVid = msg.fileType?.startsWith('video/');

              return (
                <div key={msg.id} className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                  <div className={`${msg.isSelf ? 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30 rounded-tr-sm' : 'bg-black/30 border-white/[0.08] text-text-primary rounded-tl-sm'} px-4 py-2.5 rounded-2xl text-[13px] inline-block border backdrop-blur-md max-w-[85%] break-words shadow-lg`}>
                    {msg.text && <span>{msg.text}</span>}
                    {msg.fileUrl && (
                      <div className="mt-2">
                        {isImg ? (
                          <div className="relative group rounded-2xl overflow-hidden">
                            <img 
                              src={url} 
                              alt="attachment" 
                              className="w-full max-h-[250px] object-cover cursor-pointer shadow-lg transition-transform hover:scale-[1.02] rounded-xl"
                              onLoad={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                              onClick={() => setFullscreenMedia({ url, type: 'image' })}
                            />
                            <a
                              href={url}
                              download={msg.fileName}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-[#10b981] opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/40 z-10"
                              title="Download"
                            >
                              <Download size={14} strokeWidth={2.5} />
                            </a>
                          </div>
                        ) : isVid ? (
                          <div className="relative group rounded-2xl overflow-hidden">
                            <video 
                              src={url} 
                              className="w-full max-h-[250px] object-cover cursor-pointer shadow-lg rounded-xl"
                              controls muted playsInline 
                              onLoadedData={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                              onClick={() => {
                                 setFullscreenMedia({ url, type: 'video' });
                              }}
                            />
                            <a
                              href={url}
                              download={msg.fileName}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-[#10b981] opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/40 z-10"
                              title="Download"
                            >
                              <Download size={14} strokeWidth={2.5} />
                            </a>
                          </div>
                        ) : (
                          <a href={url} download={msg.fileName} className="flex flex-col items-center gap-2 underline text-white/80 hover:text-white pb-2 pt-1 border border-white/10 rounded-lg p-3 bg-white/5">
                            <span className="material-symbols-outlined text-3xl opacity-80 animate-float">insert_drive_file</span>
                            <span className="text-xs break-all text-center leading-tight tracking-wide">Download {msg.fileName}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendText(); }}
            className="p-3 md:p-4 border-t border-white/[0.06] bg-black/20 backdrop-blur-lg pb-[calc(12px+env(safe-area-inset-bottom))]"
          >
            <div className="relative flex items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect}
                accept="image/*,video/*"
              />
              <button 
                type="button"
                onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
                disabled={isUploading}
                className="absolute left-3 z-10 p-1 rounded-full text-text-tertiary hover:text-white transition-colors flex items-center justify-center touch-manipulation pointer-events-auto cursor-pointer"
               >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin text-accent" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">attach_file</span>
                )}
              </button>
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Message..." 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendText()}
                className="w-full bg-black/30 backdrop-blur-md border border-white/[0.06] text-[13px] text-white rounded-full py-3.5 md:py-2.5 pl-10 pr-12 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 placeholder:text-white/30"
              />
              <button 
                onClick={handleSendText}
                className="absolute right-2 p-1.5 rounded-full text-accent hover:bg-accent/10 transition-colors flex items-center justify-center"
                disabled={!inputText.trim()}
              >
                 <Send size={18} strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Full Screen Media Modal */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
          onClick={() => setFullscreenMedia(null)}
        >
           <button 
             className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-xl backdrop-blur-md"
             onClick={() => setFullscreenMedia(null)}
           >
             <span className="material-symbols-outlined text-xl">close</span>
           </button>
           {fullscreenMedia.type === 'image' ? (
              <img src={fullscreenMedia.url} className="max-w-full max-h-full object-contain rounded-[8px]" />
           ) : (
              <video src={fullscreenMedia.url} className="max-w-full max-h-full object-contain rounded-[8px]" controls autoPlay playsInline />
           )}
        </div>
      )}
    </AnimatePresence>
  );
}
