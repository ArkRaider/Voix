import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(roomId: string, localName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, MediaStream>>(new Map());
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const connectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const initMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const init = async () => {
      stream = await initMedia();

      // Connect to signaling server
      toast.loading('Connecting...', { id: 'webrtc-connection' });
      const socket = io(import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001');
      socketRef.current = socket;

      socket.on('connect', () => {
        toast.success('Connected', { id: 'webrtc-connection' });
        socket.emit('join-room', { 
          roomId, 
          userId: socket.id, 
          displayName: localName 
        });
      });
      
      socket.on('disconnect', () => {
        toast.error('Disconnected', { id: 'webrtc-connection' });
      });

      socket.on('room-peers', (existingPeers: Array<any>) => {
        existingPeers.forEach(peer => {
          createPeerConnection(peer.socketId, stream, true);
        });
      });

      socket.on('peer-joined', (peer: any) => {
        createPeerConnection(peer.socketId, stream, false);
      });

      socket.on('offer', async ({ from, offer }) => {
        const pc = connectionsRef.current.get(from) || createPeerConnection(from, stream, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      });

      socket.on('answer', async ({ from, answer }) => {
        const pc = connectionsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on('ice-candidate', async ({ from, candidate }) => {
        const pc = connectionsRef.current.get(from);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on('peer-left', ({ socketId }) => {
        const pc = connectionsRef.current.get(socketId);
        if (pc) {
          pc.close();
          connectionsRef.current.delete(socketId);
        }
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(socketId);
          return newPeers;
        });
      });
    };

    const createPeerConnection = (targetId: string, currentStream: MediaStream | null, isInitiator: boolean) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          pc.addTrack(track, currentStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.emit('ice-candidate', {
            to: targetId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.set(targetId, event.streams[0]);
          return newPeers;
        });
      };

      if (isInitiator) {
        pc.createOffer().then(offer => {
          return pc.setLocalDescription(offer);
        }).then(() => {
          socketRef.current?.emit('offer', {
            to: targetId,
            offer: pc.localDescription
          });
        });
      }

      connectionsRef.current.set(targetId, pc);
      return pc;
    };

    init();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      socketRef.current?.disconnect();
      connectionsRef.current.forEach(pc => pc.close());
    };
  }, [roomId, localName, initMedia]);

  const toggleScreenShare = useCallback(async () => {
    if (!localStream) return;

    if (isScreenSharing) {
      // Revert to camera
      await initMedia(); // re-acquire camera
      const cameraTrack = localStream.getVideoTracks()[0];
      connectionsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraTrack);
      });
      setIsScreenSharing(false);
    } else {
      // Switch to screen
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        connectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          toggleScreenShare(); // auto-revert if screen share stopped via browser UI
        };

        setLocalStream(screenStream);
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Failed to share screen', err);
        toast.error('Could not share screen');
      }
    }
  }, [isScreenSharing, localStream, initMedia]);

  return { localStream, peers, isScreenSharing, toggleScreenShare };
}
