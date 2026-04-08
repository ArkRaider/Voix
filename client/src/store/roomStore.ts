import { create } from 'zustand';

export interface Peer {
  id: string; // Socket ID
  userId: string;
  displayName: string;
}

interface RoomState {
  roomId: string | null;
  userId: string | null;
  displayName: string;
  peers: Peer[];
  
  setRoomId: (id: string | null) => void;
  setDisplayName: (name: string) => void;
  setUserId: (id: string) => void;
  
  addPeer: (peer: Peer) => void;
  removePeer: (socketId: string) => void;
  setPeers: (peers: Peer[]) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  userId: null,
  displayName: 'Anonymous',
  peers: [],
  
  setRoomId: (id) => set({ roomId: id }),
  setDisplayName: (name) => set({ displayName: name }),
  setUserId: (id) => set({ userId: id }),
  
  addPeer: (peer) => set((state) => ({ 
    peers: state.peers.some(p => p.id === peer.id) 
      ? state.peers 
      : [...state.peers, peer] 
  })),
  removePeer: (socketId) => set((state) => ({ 
    peers: state.peers.filter(p => p.id !== socketId) 
  })),
  setPeers: (peers) => set({ peers }),
  clearRoom: () => set({ roomId: null, peers: [] }),
}));
