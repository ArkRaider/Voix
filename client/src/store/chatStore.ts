import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  senderId: string; // 'local' or socketId
  displayName: string;
  text?: string;
  type: 'text' | 'image' | 'system';
  timestamp: number;
  imageUrl?: string;
  fileName?: string;
  fileSize?: number;
}

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isChatOpen: boolean;
  
  addMessage: (msg: ChatMessage) => void;
  setChatOpen: (isOpen: boolean) => void;
  resetUnread: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unreadCount: 0,
  isChatOpen: false,
  
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
    unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1,
  })),
  
  setChatOpen: (isOpen) => set((state) => ({
    isChatOpen: isOpen,
    unreadCount: isOpen ? 0 : state.unreadCount,
  })),
  
  resetUnread: () => set({ unreadCount: 0 }),
  clearChat: () => set({ messages: [], unreadCount: 0, isChatOpen: false }),
}));
