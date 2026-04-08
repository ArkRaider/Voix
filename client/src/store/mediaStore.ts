import { create } from 'zustand';

export interface RemoteParticipantState {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  audioLevel: number;
  stream: MediaStream | null;
}

interface MediaState {
  localStream: MediaStream | null;
  isLocalMuted: boolean;
  isLocalCameraOff: boolean;
  isLocalScreenSharing: boolean;
  localAudioLevel: number;
  
  remoteStates: Record<string, RemoteParticipantState>;
  
  setLocalStream: (stream: MediaStream | null) => void;
  toggleLocalMuted: () => void;
  toggleLocalCamera: () => void;
  setLocalScreenSharing: (isSharing: boolean) => void;
  setLocalAudioLevel: (level: number) => void;
  
  setRemoteStream: (peerId: string, stream: MediaStream) => void;
  updateRemoteState: (peerId: string, updates: Partial<RemoteParticipantState>) => void;
  setRemoteAudioLevel: (peerId: string, level: number) => void;
  removeRemoteState: (peerId: string) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  localStream: null,
  isLocalMuted: false,
  isLocalCameraOff: false,
  isLocalScreenSharing: false,
  localAudioLevel: 0,
  
  remoteStates: {},
  
  setLocalStream: (stream) => set({ localStream: stream }),
  toggleLocalMuted: () => set((state) => ({ isLocalMuted: !state.isLocalMuted })),
  toggleLocalCamera: () => set((state) => ({ isLocalCameraOff: !state.isLocalCameraOff })),
  setLocalScreenSharing: (isSharing) => set({ isLocalScreenSharing: isSharing }),
  setLocalAudioLevel: (level) => set({ localAudioLevel: level }),
  
  setRemoteStream: (peerId, stream) => set((state) => ({
    remoteStates: {
      ...state.remoteStates,
      [peerId]: {
        ...(state.remoteStates[peerId] || { isMuted: false, isCameraOff: false, isScreenSharing: false, audioLevel: 0 }),
        stream
      }
    }
  })),
  
  updateRemoteState: (peerId, updates) => set((state) => {
    const existing = state.remoteStates[peerId];
    if (!existing) return state;
    return {
      remoteStates: {
        ...state.remoteStates,
        [peerId]: { ...existing, ...updates }
      }
    };
  }),
  
  setRemoteAudioLevel: (peerId, level) => set((state) => {
    if (!state.remoteStates[peerId]) return state;
    return {
      remoteStates: {
        ...state.remoteStates,
        [peerId]: { ...state.remoteStates[peerId], audioLevel: level }
      }
    };
  }),
  
  removeRemoteState: (peerId) => set((state) => {
    const newStates = { ...state.remoteStates };
    delete newStates[peerId];
    return { remoteStates: newStates };
  })
}));
