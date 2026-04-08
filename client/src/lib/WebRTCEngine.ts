import { io, Socket } from 'socket.io-client';
import { EventEmitter } from './EventEmitter';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

type WebRTCEvents = {
  status: [status: 'connecting' | 'connected' | 'disconnected' | 'ice-restarted'];
  localStream: [stream: MediaStream | null];
  peers: [peers: Map<string, { stream: MediaStream, name: string }>];
  screenshare: [isSharing: boolean];
  camera_state: [states: Map<string, boolean>];
  reaction: [data: { from: string; emoji: string }];
  file_receive_start: [metadata: { id: string; fileName: string; size: number }];
  file_receive_progress: [data: { id: string; progress: number }];
  file_received: [data: { id: string; fileName: string; blob: Blob }];
  text_received: [data: { id: string; text: string; from: string }];
};

// DataChannel Chunking types
type FileMetadata = { type: 'file-meta', id: string, name: string, size: number, totalChunks: number };
type FileFinish = { type: 'FINISH', id: string };

export class WebRTCEngine extends EventEmitter<WebRTCEvents> {
  private socket: Socket | null = null;
  private connections = new Map<string, RTCPeerConnection>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private peersMap = new Map<string, { stream: MediaStream, name: string }>();
  private peerNames = new Map<string, string>();
  private localName = '';
  
  private currentLocalStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;
  public isScreenSharing = false;
  
  private receiveBuffers = new Map<string, Uint8Array[]>();
  private fileMetadatas = new Map<string, FileMetadata>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private iceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private peerCameraStates = new Map<string, boolean>();
  public isCameraOn = true;

  private _status: 'connecting' | 'connected' | 'disconnected' | 'ice-restarted' = 'disconnected';

  constructor() {
    super();
  }

  public get status() { return this._status; }
  public get localMediaStream() { return this.currentLocalStream; }
  public get remotePeers() { return this.peersMap; }
  public get remoteCameraStates() { return this.peerCameraStates; }

  public async initializeMedia(): Promise<MediaStream | null> {
    try {
      console.log('[Step 1: Media Success] Requesting raw camera stream...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.currentLocalStream = stream;
      this.emit('localStream', this.currentLocalStream);
      return stream;
    } catch (err) {
      console.error('Camera blocked or hardware unavailable:', err);
      // Fallback safely if blocked
      import('sonner').then(({ toast }) => toast.error('Camera blocked. Please check your settings.'));
      return null;
    }
  }

  public async joinRoom(roomId: string, localName: string, activeStream?: MediaStream) {
    this.localName = localName;
    console.log(`[Engine Started] Joining room: ${roomId}`);
    if (activeStream && !this.currentLocalStream) {
      this.currentLocalStream = activeStream;
      this.emit('localStream', this.currentLocalStream);
    }
    
    if (this._status === 'connected' || this.socket?.connected) {
      console.log('Engine already connected. Bypassing socket initialization.');
      // ensure we still emit join event in case they traversed between rooms
      this.socket?.emit('join-room', { roomId, userId: this.socket.id, displayName: localName });
      return;
    }

    this._status = 'connecting';
    this.emit('status', this._status);

    const initTimeout = setTimeout(async () => {
       if (!this.currentLocalStream) {
         const { toast } = await import('sonner');
         toast.error('Camera access failed or timed out.');
       }
    }, 5000);

    const socketUrl = 'https://voix-backend-y0m9.onrender.com';
    console.log('Final Socket Target:', socketUrl);

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 45000
    });
    
    this.socket.on('connect', () => {
      clearTimeout(initTimeout);
      this._status = 'connected';
      this.emit('status', this._status);
      this.socket?.emit('join-room', { roomId, userId: this.socket.id, displayName: localName });
    });

    this.socket.on('disconnect', () => {
      this._status = 'disconnected';
      this.emit('status', this._status);
    });

    this.socket.on('room-peers', (existingPeers: Array<any>) => {
      existingPeers.forEach(peer => {
        if (peer.displayName) this.peerNames.set(peer.socketId, peer.displayName);
        this.createPeerConnection(peer.socketId, true);
      });
    });

    this.socket.on('peer-joined', (peer: any) => {
      if (peer.displayName) this.peerNames.set(peer.socketId, peer.displayName);
      this.createPeerConnection(peer.socketId, false);
      this.socket?.emit('chat-fallback', { to: peer.socketId, payload: JSON.stringify({ type: 'NAME_SYNC', name: this.localName }) });
    });

    this.socket.on('offer', async ({ from, offer }) => {
      console.log('Received offer from', from);
      const pc = this.connections.get(from) || this.createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket?.emit('answer', { to: from, answer });
        this.drainCandidateQueue(from, pc);
      } catch (err) {
        console.error('Failed to handle offer from', from, err);
      }
    });

    this.socket.on('answer', async ({ from, answer }) => {
      console.log('Received answer from', from);
      const pc = this.connections.get(from);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          this.drainCandidateQueue(from, pc);
        } catch (err) {
          console.error('Failed to set remote description on answer', err);
        }
      }
    });

    this.socket.on('ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from', from, candidate);
      const pc = this.connections.get(from);
      if (pc) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch(err) {
            console.warn('ICE candidate parsing error', err);
          }
        } else {
          // Queue candidates if remote description isn't set yet
          let queue = this.pendingCandidates.get(from) || [];
          queue.push(candidate);
          this.pendingCandidates.set(from, queue);
        }
      }
    });

    this.socket.on('chat-fallback', ({ from, payload }) => {
      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'TEXT') {
           console.log(`[Message Received: ${parsed.text}] (via socket fallback)`);
           this.emit('text_received', { id: Math.random().toString(), text: parsed.text, from });
        } else if (parsed.type === 'REACTION') {
           this.emit('reaction', { from, emoji: parsed.emoji });
        } else if (parsed.type === 'NAME_SYNC') {
           this.peerNames.set(from, parsed.name);
           const p = this.peersMap.get(from);
           if (p) {
              this.peersMap.set(from, { stream: p.stream, name: parsed.name });
              this.emit('peers', this.peersMap);
           }
        } else if (parsed.type === 'CAMERA_STATE') {
           console.log(`[Camera State from ${from}] (fallback): ${parsed.enabled ? 'ON' : 'OFF'}`);
           this.peerCameraStates.set(from, parsed.enabled);
           this.emit('camera_state', new Map(this.peerCameraStates));
        }
      } catch (e) {
          console.error('Failed parsing fallback payload', e);
      }
    });

    this.socket.on('peer-left', ({ socketId }) => {
      this.cleanupPeer(socketId);
    });
  }

  private drainCandidateQueue(targetId: string, pc: RTCPeerConnection) {
    const queue = this.pendingCandidates.get(targetId);
    if (queue) {
      console.log(`Draining ${queue.length} buffered ICE candidates for ${targetId}`);
      queue.forEach(async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Failed to add locally queued ICE candidate', e);
        }
      });
      this.pendingCandidates.delete(targetId);
    }
  }

  private createPeerConnection(targetId: string, isInitiator: boolean) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.connections.set(targetId, pc);

    // Add local tracks
    if (this.currentLocalStream) {
      this.currentLocalStream.getTracks().forEach(track => {
        pc.addTrack(track, this.currentLocalStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Gathered local ICE candidate, sending to', targetId);
        this.socket?.emit('ice-candidate', { to: targetId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`ICE Connection State [${targetId}]:`, state);

      // --- 5-second ICE Timeout: restart if stuck in 'checking' ---
      if (state === 'checking' || state === 'new') {
        // Clear any existing timer for this peer
        const existingTimer = this.iceTimers.get(targetId);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
          if (pc.iceConnectionState === 'checking' || pc.iceConnectionState === 'new') {
            const peerLabel = this.peerNames.get(targetId) || targetId.substring(0, 6);
            console.warn(`[ICE Timeout] Connection to ${peerLabel} stuck in '${pc.iceConnectionState}' for 5s. Triggering ICE restart.`);
            pc.createOffer({ iceRestart: true })
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                this.socket?.emit('offer', { to: targetId, offer: pc.localDescription });
                this._status = 'ice-restarted';
                this.emit('status', this._status);
              })
              .catch(err => console.error('[ICE Restart Failed]', err));
          }
        }, 5000);
        this.iceTimers.set(targetId, timer);
      } else {
        // Clear timer if we moved past checking (connected, completed, failed, etc.)
        const timer = this.iceTimers.get(targetId);
        if (timer) {
          clearTimeout(timer);
          this.iceTimers.delete(targetId);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`WebRTC Connection State [${targetId}]:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        // ICE Restart resilient logic
        const peerLabel = this.peerNames.get(targetId) || targetId.substring(0, 6);
        console.warn(`ICE connection to ${peerLabel} failed. Triggering restart.`);
        if (isInitiator) {
          pc.createOffer({ iceRestart: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              this.socket?.emit('offer', { to: targetId, offer: pc.localDescription });
              this._status = 'ice-restarted';
              this.emit('status', this._status);
            });
        }
      }
    };

    pc.ontrack = (event) => {
      const incomingStream = event.streams[0];
      if (!incomingStream) {
        console.warn(`[ontrack] No stream in event from ${targetId}`);
        return;
      }
      const peerLabel = this.peerNames.get(targetId) || `Peer ${targetId.substring(0, 4)}`;
      console.log(`[Stream Received from: ${peerLabel}] streamId=${incomingStream.id}, tracks=${incomingStream.getTracks().map(t => `${t.kind}:${t.readyState}`).join(', ')}`);

      // Immediately assign the incoming stream to the peer state
      const newPeers = new Map(this.peersMap);
      newPeers.set(targetId, { stream: incomingStream, name: peerLabel });
      this.peersMap = newPeers;
      this.emit('peers', this.peersMap);

      // Listen for track additions on this stream (renegotiation scenarios)
      incomingStream.onaddtrack = (trackEvent) => {
        console.log(`[Track Added: ${peerLabel}] kind=${trackEvent.track.kind}`);
        const updatedPeers = new Map(this.peersMap);
        updatedPeers.set(targetId, { stream: incomingStream, name: peerLabel });
        this.peersMap = updatedPeers;
        this.emit('peers', this.peersMap);
      };
    };

    // Data Channel Logic
    if (isInitiator) {
      const dc = pc.createDataChannel('chat');
      this.setupDataChannel(targetId, dc);
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(targetId, event.channel);
      };
    }

    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          this.socket?.emit('offer', { to: targetId, offer: pc.localDescription });
        });
    }

    return pc;
  }

  private setupDataChannel(targetId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(targetId, dc);

    const fallbackTimer = setTimeout(() => {
      if (dc.readyState !== 'open') {
         console.warn(`DataChannel to ${targetId} failed to open within 10s. Initiating Socket.io fallback mode.`);
      }
    }, 10000);

    dc.onopen = () => {
      console.log('[DataChannel Open]');
      clearTimeout(fallbackTimer);
      dc.send(JSON.stringify({ type: 'NAME_SYNC', name: this.localName }));
    };

    dc.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'REACTION') {
          this.emit('reaction', { from: targetId, emoji: parsed.emoji });
        } else if (parsed.type === 'file-meta') {
          this.fileMetadatas.set(parsed.id, parsed);
          this.receiveBuffers.set(parsed.id, []);
          this.emit('file_receive_start', { id: parsed.id, fileName: parsed.name, size: parsed.size });
        } else if (parsed.type === 'FINISH') {
          const meta = this.fileMetadatas.get(parsed.id);
          const chunks = this.receiveBuffers.get(parsed.id);
          if (meta && chunks) {
            const blob = new Blob(chunks as unknown as BlobPart[]);
            this.emit('file_received', { id: parsed.id, fileName: meta.name, blob });
          }
          this.fileMetadatas.delete(parsed.id);
          this.receiveBuffers.delete(parsed.id);
        } else if (parsed.type === 'TEXT') {
          console.log(`[Message Received: ${parsed.text}]`);
          this.emit('text_received', { id: Math.random().toString(), text: parsed.text, from: targetId });
        } else if (parsed.type === 'NAME_SYNC') {
           this.peerNames.set(targetId, parsed.name);
           const p = this.peersMap.get(targetId);
           if (p) {
              this.peersMap.set(targetId, { stream: p.stream, name: parsed.name });
              this.emit('peers', this.peersMap);
           }
        } else if (parsed.type === 'CAMERA_STATE') {
           console.log(`[Camera State from ${targetId}]: ${parsed.enabled ? 'ON' : 'OFF'}`);
           this.peerCameraStates.set(targetId, parsed.enabled);
           this.emit('camera_state', new Map(this.peerCameraStates));
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Direct ArrayBuffer chunk. 
        // We need a mechanism to know which file this belongs to if multiple files are parallel.
        // For simplicity, we assume robust single file chunk streams.
        // But since we can't easily parse ID from raw ArrayBuffer without dataview encoding, 
        // A better approach is converting chunk to base64 OR sending text JSON with base64 for small files
        // OR prepending a 36-byte string ID to the ArrayBuffer.
        
        // Simple ArrayBuffer implementation: extract first 36 bytes as ID, rest as data
        const idBuffer = new Uint8Array(event.data, 0, 36);
        const dataBuffer = new Uint8Array(event.data, 36);
        const textDecoder = new TextDecoder();
        const fileId = textDecoder.decode(idBuffer);
        
        const chunks = this.receiveBuffers.get(fileId);
        if (chunks) {
          chunks.push(dataBuffer);
          const meta = this.fileMetadatas.get(fileId);
          if (meta) {
            this.emit('file_receive_progress', { id: fileId, progress: chunks.length / meta.totalChunks });
          }
        }
      }
    };
  }

  private cleanupPeer(targetId: string) {
    // Clear any pending ICE timer
    const iceTimer = this.iceTimers.get(targetId);
    if (iceTimer) {
      clearTimeout(iceTimer);
      this.iceTimers.delete(targetId);
    }

    const pc = this.connections.get(targetId);
    if (pc) pc.close();
    this.connections.delete(targetId);
    this.dataChannels.delete(targetId);
    
    const newPeers = new Map(this.peersMap);
    newPeers.delete(targetId);
    this.peersMap = newPeers;
    this.peerNames.delete(targetId);
    this.emit('peers', this.peersMap);
  }

  // API EXPOSURE 
  
  public updateLocalStream(newStream: MediaStream) {
    this.currentLocalStream = newStream;
    this.emit('localStream', this.currentLocalStream);
    
    // Replace tracks on all connections
    const videoTrack = newStream.getVideoTracks()[0];
    const audioTrack = newStream.getAudioTracks()[0];

    this.connections.forEach(pc => {
      const senders = pc.getSenders();
      if (videoTrack) {
        const vSender = senders.find(s => s.track?.kind === 'video');
        if (vSender) vSender.replaceTrack(videoTrack).catch(console.error);
      }
      if (audioTrack) {
        const aSender = senders.find(s => s.track?.kind === 'audio');
        if (aSender) aSender.replaceTrack(audioTrack).catch(console.error);
      }
    });
  }

  public sendReaction(emoji: string) {
    // 1. Trigger LOCAL animation immediately so sender sees it
    this.emit('reaction', { from: 'local', emoji });

    // 2. Broadcast to all peers via DataChannel + socket fallback
    const payload = JSON.stringify({ type: 'REACTION', emoji });
    this.dataChannels.forEach((dc, targetId) => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      } else {
        this.socket?.emit('chat-fallback', { to: targetId, payload });
      }
    });
    // Fallback for peers with no DataChannel yet
    if (this.connections.size > 0 && this.dataChannels.size === 0) {
      this.connections.forEach((_pc, targetId) => {
        this.socket?.emit('chat-fallback', { to: targetId, payload });
      });
    }
  }

  public sendMessage(text: string) {
    const payload = JSON.stringify({ type: 'TEXT', text });
    console.log(`[Message Sent: ${text}]`);
    
    if (this.connections.size > 0 && this.dataChannels.size === 0) {
      // Direct Fallback if DataChannels explicitly empty but connections exist
      this.connections.forEach((_pc, targetId) => {
         this.socket?.emit('chat-fallback', { to: targetId, payload });
      });
      return;
    }

    this.dataChannels.forEach((dc, targetId) => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      } else {
        this.socket?.emit('chat-fallback', { to: targetId, payload });
      }
    });
  }

  public async sendFile(file: File) {
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // Simple 26 char id + padding to 36
    const fileId = id.padEnd(36, ' '); 
    
    const CHUNK_SIZE = 16 * 1024; // 16 KB strict WebRTC payload constraint
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    const metadata: FileMetadata = { type: 'file-meta', id: fileId, name: file.name, size: file.size, totalChunks };
    const metaString = JSON.stringify(metadata);

    const finishString = JSON.stringify({ type: 'FINISH', id: fileId } as FileFinish);

    this.dataChannels.forEach(dc => {
      if (dc.readyState === 'open') dc.send(metaString);
    });

    const buffer = await file.arrayBuffer();
    const encoder = new TextEncoder();
    const idBuffer = encoder.encode(fileId); // 36 bytes

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
      const chunkData = new Uint8Array(buffer, start, end - start);
      
      const payload = new Uint8Array(36 + chunkData.byteLength);
      payload.set(idBuffer, 0);
      payload.set(chunkData, 36);

      this.dataChannels.forEach(dc => {
        if (dc.readyState === 'open') dc.send(payload.buffer);
      });
      
      // Small delay prevents datachannel overflow on large files
      await new Promise(r => setTimeout(r, 10)); 
    }

    this.dataChannels.forEach(dc => {
      if (dc.readyState === 'open') dc.send(finishString);
    });
  }

  public async toggleScreenShare() {
    if (!this.currentLocalStream) return false;

    if (this.isScreenSharing) {
      // Revert to original camera track
      if (this.originalVideoTrack) {
        this.replaceActiveVideoTrack(this.originalVideoTrack);
        this.originalVideoTrack = null;
      }
      this.isScreenSharing = false;
      this.emit('screenshare', false);
      return false;
    } else {
      // Check for screen capture support (missing in most mobile Safari/Chrome browsers)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        import('sonner').then(({ toast }) => {
          toast.error('Screen sharing is not supported on this mobile browser.');
        });
        return false;
      }

      try {
        // Use captureController if available for modern popup targeting
        const captureController = 'CaptureController' in window ? new (window as any).CaptureController() : undefined;
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          controller: captureController
        } as any);
        const screenTrack = displayStream.getVideoTracks()[0];
        
        // Save original camera track
        this.originalVideoTrack = this.currentLocalStream.getVideoTracks()[0];
        
        // Listen to native browser "Stop sharing" button
        screenTrack.onended = () => {
          this.toggleScreenShare();
        };

        this.replaceActiveVideoTrack(screenTrack);
        this.isScreenSharing = true;
        this.emit('screenshare', true);
        return true;
      } catch (err) {
        console.error('Failed to get display media', err);
        return false;
      }
    }
  }

  private replaceActiveVideoTrack(newTrack: MediaStreamTrack) {
    if (!this.currentLocalStream) return;
    
    // Replace track natively in the local stream so VideoGrid renders it
    const oldTrack = this.currentLocalStream.getVideoTracks()[0];
    if (oldTrack) {
      this.currentLocalStream.removeTrack(oldTrack);
    }
    this.currentLocalStream.addTrack(newTrack);

    // Swap the tracks on all active WebRTC Connections
    this.connections.forEach(pc => {
      const senders = pc.getSenders();
      const vSender = senders.find(s => s.track?.kind === 'video');
      if (vSender) vSender.replaceTrack(newTrack).catch(console.error);
    });
  }

  public toggleAudio(): boolean {
    if (!this.currentLocalStream) return false;
    const track = this.currentLocalStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      // Emit so React re-renders (e.g. mic icon state)
      this.emit('localStream', this.currentLocalStream);
      return track.enabled;
    }
    return false;
  }

  public async toggleVideo(): Promise<boolean> {
    if (!this.currentLocalStream) return false;
    const track = this.currentLocalStream.getVideoTracks()[0];
    
    if (!track) return false;

    // Turning camera OFF
    if (track.enabled) {
      track.enabled = false;
      this.isCameraOn = false;
      console.log('[toggleVideo] Camera OFF');
      this.emit('localStream', this.currentLocalStream);
      this._broadcastCameraState();
      return false;
    }

    // Turning camera ON — check if the track is still alive
    if (track.readyState === 'ended') {
      // Track was killed (browser suspended it, or OS took over camera)
      // Must re-acquire a fresh video track
      console.warn('[toggleVideo] Track is ended — re-acquiring via getUserMedia');
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const freshTrack = freshStream.getVideoTracks()[0];

        // Swap into the local stream
        this.currentLocalStream.removeTrack(track);
        this.currentLocalStream.addTrack(freshTrack);

        // Replace on all peer connections
        this.connections.forEach(pc => {
          const senders = pc.getSenders();
          const vSender = senders.find(s => s.track?.kind === 'video' || s.track === track);
          if (vSender) vSender.replaceTrack(freshTrack).catch(console.error);
        });

        this.isCameraOn = true;
        console.log('[toggleVideo] Camera ON (fresh track)');
        this.emit('localStream', this.currentLocalStream);
        this._broadcastCameraState();
        return true;
      } catch (err) {
        console.error('[toggleVideo] Failed to re-acquire camera:', err);
        return false;
      }
    }

    // Track is alive — just re-enable it
    track.enabled = true;
    this.isCameraOn = true;
    console.log('[toggleVideo] Camera ON');
    this.emit('localStream', this.currentLocalStream);
    this._broadcastCameraState();
    return true;
  }

  private _broadcastCameraState() {
    const payload = JSON.stringify({ type: 'CAMERA_STATE', enabled: this.isCameraOn });
    this.dataChannels.forEach((dc, targetId) => {
      if (dc.readyState === 'open') {
        dc.send(payload);
      } else {
        this.socket?.emit('chat-fallback', { to: targetId, payload });
      }
    });
    if (this.connections.size > 0 && this.dataChannels.size === 0) {
      this.connections.forEach((_pc, targetId) => {
        this.socket?.emit('chat-fallback', { to: targetId, payload });
      });
    }
  }

  public disconnect() {
    // Stop all tracks — turns off webcam hardware light
    this.currentLocalStream?.getTracks().forEach(t => t.stop());
    this.currentLocalStream = null;

    // Clear ICE timers to prevent memory leaks
    this.iceTimers.forEach(timer => clearTimeout(timer));
    this.iceTimers.clear();

    this.socket?.disconnect();
    this.connections.forEach(pc => pc.close());
    this.connections.clear();
    this.dataChannels.clear();
    this.peersMap.clear();
    this.peerNames.clear();
    this.peerCameraStates.clear();
    this.isCameraOn = true;

    // Emit null so UI resets
    this.emit('localStream', null);
    this.emit('peers', new Map());
    this.emit('camera_state', new Map());
  }
}

export const instance = new WebRTCEngine();

if (typeof window !== 'undefined') {
  (window as any).voix_engine = instance;
}
