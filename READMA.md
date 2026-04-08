# Voix — Minimal Video Chat Application
### A complete build specification for an AI agent

---

## Vision & Philosophy

Voix is a privacy-first, peer-to-peer video calling application built on the principle that **the interface should disappear**. When you're in a call, nothing should compete for attention except the people you're talking to. No cluttered toolbars. No notification badges. No dark patterns pushing you to upgrade. Just a clean, calm, beautiful space for human connection.

**Design North Star:** Think early Linear, Vercel Dashboard, or Loom — monochromatic with surgical accent color use, generous negative space, micro-interactions that reward attention, and typography that feels considered. Not austere — *intentional*.

---

## Tech Stack (Non-Negotiable)

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast HMR, modern bundling |
| Styling | TailwindCSS v3 + CSS variables | Utility-first, easily themeable |
| State | Zustand | Lightweight, no boilerplate |
| Signaling | Node.js 20 + Socket.io 4 | Reliable WS with rooms |
| WebRTC | Native browser API (no wrappers) | Full control |
| Fonts | `Geist` (display) + `Geist Mono` (code/metadata) | Sharp, modern, non-generic |
| Icons | Lucide React | Clean, consistent |
| Animations | Framer Motion | Smooth, physics-based |
| Image Hosting | Cloudinary free tier OR base64 DataChannel | No backend dependency for MVP |
| STUN | `stun:stun.l.google.com:19302` (free) | Zero config for MVP |
| TURN | Metered.ca free tier | Handles NAT fallback |
| Emoji Picker | `emoji-mart` | Best-in-class, skinnable |
| Notifications | `sonner` | Minimal toast library |

---

## Color System & Design Tokens

Implement these as CSS custom properties in `src/styles/tokens.css`. **Do not use Tailwind color names directly in components — always go through tokens.**

```css
:root {
  /* Backgrounds — layered depth system */
  --bg-base:      #09090b;   /* true dark base */
  --bg-surface:   #111113;   /* cards, panels */
  --bg-overlay:   #18181b;   /* modals, popovers */
  --bg-subtle:    #27272a;   /* hover states */
  --bg-muted:     #3f3f46;   /* disabled, borders */

  /* Text */
  --text-primary:   #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary:  #71717a;
  --text-disabled:  #52525b;

  /* Accent — one color rules everything */
  --accent:         #6ee7b7;   /* emerald-300 — calm, not aggressive */
  --accent-dim:     #34d399;
  --accent-muted:   rgba(110, 231, 183, 0.12);
  --accent-border:  rgba(110, 231, 183, 0.25);

  /* Semantic */
  --red:    #f87171;
  --red-bg: rgba(248, 113, 113, 0.1);
  --amber:  #fbbf24;

  /* Borders */
  --border-subtle:  rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-strong:  rgba(255,255,255,0.18);

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg: 0 16px 48px rgba(0,0,0,0.7);

  /* Blur */
  --blur-sm: blur(8px);
  --blur-md: blur(16px);
  --blur-lg: blur(32px);

  /* Transitions */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 350ms;
}
```

**Typography rules:**
- Use `font-family: 'Geist', sans-serif` for all UI text
- Use `font-family: 'Geist Mono', monospace` for room codes, timestamps, byte counts
- Never go below `font-size: 12px`
- Letter-spacing: `-0.02em` on headings, `0` on body, `0.08em` on uppercase labels
- Line-height: `1.5` body, `1.2` headings

---

## Project Structure

```
voix/
├── client/                          # React frontend
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── styles/
│   │   │   ├── tokens.css           # Design tokens (above)
│   │   │   └── global.css           # Reset + base styles
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Home / create-or-join
│   │   │   └── Room.jsx             # The call itself
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── Tooltip.jsx
│   │   │   │   ├── Avatar.jsx
│   │   │   │   └── Badge.jsx
│   │   │   ├── call/
│   │   │   │   ├── VideoGrid.jsx    # Adaptive video tile layout
│   │   │   │   ├── VideoTile.jsx    # Single participant tile
│   │   │   │   ├── Controls.jsx     # Bottom control bar
│   │   │   │   ├── ControlButton.jsx
│   │   │   │   └── SpeakingRing.jsx # Audio activity indicator
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.jsx    # Slide-in chat drawer
│   │   │   │   ├── ChatMessage.jsx
│   │   │   │   ├── ChatInput.jsx
│   │   │   │   └── EmojiReaction.jsx # Floating emoji reactions
│   │   │   └── layout/
│   │   │       ├── RoomHeader.jsx
│   │   │       └── ParticipantList.jsx
│   │   ├── hooks/
│   │   │   ├── useWebRTC.js         # Core WebRTC logic
│   │   │   ├── useSocket.js         # Socket.io connection
│   │   │   ├── useMedia.js          # Camera/mic management
│   │   │   ├── useScreenShare.js    # Screen share logic
│   │   │   ├── useChat.js           # Chat + DataChannel
│   │   │   └── useAudioLevel.js     # Speaking detection
│   │   └── store/
│   │       ├── roomStore.js         # Room state (Zustand)
│   │       ├── mediaStore.js        # Local media state
│   │       └── chatStore.js         # Chat messages
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── server/                          # Node.js signaling server
    ├── index.js                     # Entry point
    ├── rooms.js                     # Room management
    ├── package.json
    └── .env.example
```

---

## Page 1: Landing Page (`Landing.jsx`)

### Layout
Full-viewport dark page. Centered content column, max-width `420px`. Vertically centered with flex. Subtle background: a single radial gradient at the top center — `radial-gradient(ellipse 600px 400px at 50% -100px, rgba(110,231,183,0.07), transparent)`.

### Content (top to bottom)

1. **Wordmark** — "voix" in `Geist`, `font-size: 28px`, `font-weight: 500`, `letter-spacing: -0.04em`, color `var(--text-primary)`. A single `·` dot in `var(--accent)` after the wordmark.

2. **Tagline** — `"Clear calls. Nothing more."` — `font-size: 14px`, `color: var(--text-tertiary)`, `margin-top: 8px`.

3. **Divider gap** — `margin-top: 48px`.

4. **Create Room button** — Full-width. Background: `var(--accent)`. Text: `#09090b` (dark on light). `font-size: 14px`, `font-weight: 500`, `height: 44px`, `border-radius: var(--radius-md)`. On click: generate a random room ID (6-char alphanumeric, e.g. `xk3m9q`), navigate to `/room/xk3m9q`. Hover: slight brightness increase (`filter: brightness(1.08)`), `transition: 200ms`.

5. **Separator** — `margin: 16px 0`. A line with "or join existing" text in center. Line color `var(--border-subtle)`. Text `var(--text-tertiary)`, `font-size: 12px`.

6. **Join input row** — A text input + "Join" button side by side. Input: `placeholder="Room code"`, `font-family: 'Geist Mono'`, `font-size: 14px`, auto-uppercase transform, `letter-spacing: 0.04em`. Input background `var(--bg-surface)`, border `var(--border-default)`, height `44px`. "Join" button: outlined style, border `var(--border-default)`, background transparent, `color: var(--text-primary)`, `height: 44px`, `padding: 0 20px`.

7. **Name prompt (shown before navigation)** — When user clicks either button, show a small inline section (animated with Framer Motion `height` transition) asking for display name. `placeholder="Your name"`. Default: `"Anonymous"`. Name stored in `localStorage` and Zustand.

8. **Footer** — `position: absolute; bottom: 24px`. Text: "End-to-end encrypted · No account required" in `var(--text-disabled)`, `font-size: 12px`. A small `🔒` or lock SVG icon before it.

---

## Page 2: Room Page (`Room.jsx`)

This is the core experience. The page has **three zones:**

```
┌─────────────────────────────────────────────────┐
│  HEADER (48px tall, transparent with blur)      │
├─────────────────────────────────────────────────┤
│                                                 │
│                VIDEO GRID (flex-1)              │
│           (fills all available space)           │
│                                                 │
├─────────────────────────────────────────────────┤
│  CONTROLS (72px tall, floating above bottom)    │
└─────────────────────────────────────────────────┘
           (CHAT PANEL slides in from right)
```

### Zone 1: Room Header (`RoomHeader.jsx`)

`position: fixed; top: 0; left: 0; right: 0; z-index: 50; height: 48px`  
Background: `rgba(9, 9, 11, 0.7)`, `backdrop-filter: blur(12px)`.  
Border-bottom: `1px solid var(--border-subtle)`.

**Left side:**
- Wordmark "voix·" (same as landing, smaller: `font-size: 20px`)
- Room code badge: pill shape, `font-family: Geist Mono`, `font-size: 11px`, `background: var(--bg-surface)`, `border: 1px solid var(--border-default)`, `padding: 2px 10px`, `border-radius: var(--radius-full)`. On click: copy to clipboard, show a `sonner` toast "Room code copied".

**Right side:**
- Participant count: `"2 people"` in `var(--text-tertiary)`, `font-size: 13px`
- Duration timer: `MM:SS` format, `font-family: Geist Mono`, `font-size: 13px`, `color: var(--text-tertiary)`
- Settings icon button (gear icon, `20px`) — placeholder for future

---

### Zone 2: Video Grid (`VideoGrid.jsx`)

`padding: 64px 16px 88px 16px` (accounts for fixed header + controls)

**Adaptive layout logic** — implement via CSS Grid with JS class switching:

| Participants | Layout |
|---|---|
| 1 (only self) | Single tile, centered, `max-width: 480px`, `aspect-ratio: 16/9`, with a pulsing ring suggesting waiting |
| 2 | Two tiles side by side on desktop, stacked on mobile. Each `aspect-ratio: 16/9` |
| 3 | 2 on top, 1 centered below |
| 4 | 2×2 grid |
| 5–6 | 3×2 grid |
| 7+ | Scrollable grid, max 3 columns |

**Self-view pip (Picture-in-Picture):**
When there are 2+ remote participants, self-view shrinks to a pip overlay: `position: absolute`, bottom-right of video grid, `width: 180px`, `aspect-ratio: 16/9`, `border-radius: var(--radius-md)`, `border: 2px solid var(--border-strong)`, draggable within grid bounds.

### Video Tile (`VideoTile.jsx`)

Each tile:
- Background: `var(--bg-surface)` (shown when camera is off)
- `border-radius: var(--radius-lg)`
- `overflow: hidden`
- `border: 1px solid var(--border-subtle)`
- `transition: border-color 200ms` — border glows `var(--accent-border)` when participant is **speaking** (detected via Web Audio API `AnalyserNode`)

**Inside each tile (when camera ON):**
- `<video>` fills tile, `object-fit: cover`
- Bottom gradient overlay: `linear-gradient(transparent, rgba(0,0,0,0.7))` — only appears on hover or when speaking
- Name label: bottom-left, `font-size: 13px`, `color: white`, `padding: 8px 12px`
- Mute indicator: if mic muted, show a small red mic-off icon badge in bottom-right

**Inside each tile (when camera OFF):**
- Dark background
- Centered avatar circle: initials-based, `width: 72px`, `height: 72px`, `border-radius: 50%`, background derived from name hash (deterministic color from `var(--accent)` family)
- Name below avatar, `font-size: 14px`, `color: var(--text-secondary)`

**Speaking indicator (`SpeakingRing.jsx`):**
A subtle animated ring around the tile border. When `audioLevel > 0.02`:
```css
@keyframes speaking-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(110, 231, 183, 0.4); }
  50%       { box-shadow: 0 0 0 3px rgba(110, 231, 183, 0.2); }
}
```
Animation plays only when actively speaking. Stops immediately when silent.

---

### Zone 3: Controls Bar (`Controls.jsx`)

`position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%)`.  
`display: flex; align-items: center; gap: 8px`.  
`background: var(--bg-overlay)`.  
`border: 1px solid var(--border-default)`.  
`border-radius: var(--radius-full)`.  
`padding: 10px 16px`.  
`backdrop-filter: blur(16px)`.  
`box-shadow: var(--shadow-lg)`.

**Control buttons (left to right):**

1. **Mic toggle** — Muted: red background `var(--red-bg)`, icon `var(--red)`. Unmuted: default. Keyboard shortcut `M`.
2. **Camera toggle** — Same pattern. Keyboard shortcut `V`.
3. **Screen share** — When active: `var(--accent-muted)` background, `var(--accent)` icon with a pulsing dot indicator. Keyboard shortcut `S`.
4. **Divider** — `1px solid var(--border-subtle)`, `height: 24px`
5. **Chat toggle** — Badge with unread count when panel closed. On click: slides in chat panel. Keyboard shortcut `C`.
6. **Participants** — On click: slides in participant list panel.
7. **Emoji reaction** — On click: shows emoji quick-picker (6 preset emojis + open full picker option). Floating emojis animate up from sender's tile.
8. **Divider**
9. **End call** — `background: var(--red-bg)`, `color: var(--red)`, `border: 1px solid rgba(248,113,113,0.2)`. Slightly wider than other buttons. Text "Leave". On hover, background becomes solid `var(--red)`, text becomes white. `border-radius: var(--radius-full)`.

**`ControlButton.jsx`** — reusable component:
```
Props: icon, label (tooltip), active, danger, onClick, shortcut
Size: 40×40px default (pill for "Leave")
border-radius: 50% (circle)
background: var(--bg-subtle) default
hover: var(--border-default) border + slight scale(1.05)
active state: see above per button
Tooltip: appears on hover, above button, 
         shows label + keyboard shortcut badge
```

---

## Chat Panel (`ChatPanel.jsx`)

Slides in from the right side. Does NOT push video content — overlays it.

```
width: 320px (desktop) / 100vw (mobile)
height: calc(100vh - 48px)  /* below header */
top: 48px
right: 0
position: fixed
background: var(--bg-surface)
border-left: 1px solid var(--border-subtle)
```

Framer Motion: `initial={{ x: 320 }}` → `animate={{ x: 0 }}`, spring physics.

**Panel sections (top to bottom):**

1. **Panel header** — "Messages" title left, X close button right. `height: 52px`, `border-bottom: 1px solid var(--border-subtle)`, `padding: 0 16px`.

2. **Message list** — `flex: 1`, `overflow-y: auto`. Custom scrollbar: `width: 4px`, `background: var(--bg-subtle)`, `border-radius: 4px`. Scroll to bottom on new message.

3. **Chat input area** — pinned to bottom. Textarea (auto-expand, max 4 lines) + send button. Above textarea: emoji picker trigger button.

**`ChatMessage.jsx`** layout:

- **Text messages:** Avatar circle (initials, 28px) + name + timestamp on first message in a group. Subsequent messages from same sender within 60s: no avatar, just text (grouped). Message bubble: `background: var(--bg-overlay)`, `border-radius: 10px`, `padding: 8px 12px`, `font-size: 14px`, `max-width: 260px`. Own messages aligned right with `var(--accent-muted)` background.

- **Image messages:** Thumbnail shown inline, max `240px` wide, `border-radius: 8px`. Click to open lightbox overlay. Show filename + file size in `Geist Mono` below.

- **System messages** (joined, left): centered, `font-size: 12px`, `color: var(--text-disabled)`, no bubble.

**Emoji reactions** — when a user sends an emoji reaction (not a chat emoji, but the floating kind):
- The emoji floats up from the sender's video tile
- `position: absolute` over the tile
- Animates: `translateY(-120px)` + `opacity: 0` over `2.5s`, then removed from DOM
- Multiple reactions stack with slight x offset
- `font-size: 32px`

**Emoji picker** — uses `emoji-mart`. Override its styles to match dark theme: `background: var(--bg-overlay)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-lg)`. Positioned above the input area.

**Image sharing:**
- Attach button (paperclip icon) in chat input
- Supported: JPG, PNG, GIF, WEBP. Max size: 5MB
- Sent via WebRTC DataChannel in chunks (64KB chunks)
- Show upload progress bar below the message while sending
- Receive side: assemble chunks, create blob URL, display thumbnail
- Fallback for large files: show link text only

---

## WebRTC Implementation (`useWebRTC.js`)

This is the most critical file. Implement it carefully and completely.

### ICE Configuration

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add Metered TURN credentials via environment variables:
    {
      urls: 'turn:relay.metered.ca:80',
      username: process.env.VITE_TURN_USERNAME,
      credential: process.env.VITE_TURN_CREDENTIAL,
    },
  ],
  iceCandidatePoolSize: 10,
};
```

### Connection Flow (implement exactly in this order)

```
1. User enters room
2. Get local media (camera + mic)
3. Connect to signaling server via Socket.io
4. Emit 'join-room' with { roomId, userId, displayName }
5. Server responds with list of existing peers in room
6. For each existing peer:
   a. Create RTCPeerConnection
   b. Add local tracks to connection
   c. Create offer
   d. Set local description
   e. Send offer via signaling server to that peer
7. When receiving offer from new peer:
   a. Create RTCPeerConnection
   b. Add local tracks
   c. Set remote description with offer
   d. Create answer
   e. Set local description with answer
   f. Send answer back via signaling
8. Exchange ICE candidates via signaling as they're discovered
9. When connection is established:
   a. remote tracks appear via ontrack event
   b. Create DataChannel for chat + file transfer
```

### State per peer connection

```javascript
// Store in a Map: peerId → peerState
{
  connection: RTCPeerConnection,
  dataChannel: RTCDataChannel,
  stream: MediaStream,          // remote video/audio
  displayName: string,
  isMuted: boolean,
  isCameraOff: boolean,
  isScreenSharing: boolean,
  audioLevel: number,           // 0–1, updated 10x/sec
}
```

### DataChannel messages

All DataChannel messages are JSON with this shape:
```javascript
{ type: string, payload: any, senderId: string, timestamp: number }
```

Message types:
- `'chat-text'` — `payload: { text: string }`
- `'chat-image-chunk'` — `payload: { transferId, chunkIndex, totalChunks, data: base64 }`
- `'chat-image-meta'` — `payload: { transferId, filename, size, mimeType }`
- `'emoji-reaction'` — `payload: { emoji: string }`
- `'peer-state'` — `payload: { isMuted, isCameraOff, isScreenSharing }` — broadcast on any change
- `'chat-image-complete'` — `payload: { transferId }` — signals assembly done

### Screen sharing (`useScreenShare.js`)

```javascript
async function startScreenShare() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always', frameRate: 30 },
    audio: true,  // tab audio if available
  });

  // Replace video track in all peer connections
  for (const [peerId, peer] of peers) {
    const sender = peer.connection
      .getSenders()
      .find(s => s.track?.kind === 'video');
    await sender.replaceTrack(stream.getVideoTracks()[0]);
  }

  // Handle user stopping via browser UI
  stream.getVideoTracks()[0].onended = stopScreenShare;
}

async function stopScreenShare() {
  // Restore camera track to all connections
  const cameraTrack = localStream.getVideoTracks()[0];
  for (const [peerId, peer] of peers) {
    const sender = peer.connection
      .getSenders()
      .find(s => s.track?.kind === 'video');
    await sender.replaceTrack(cameraTrack);
  }
}
```

### Audio level detection (`useAudioLevel.js`)

```javascript
// For each remote stream + local stream:
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
const source = audioCtx.createMediaStreamSource(stream);
source.connect(analyser);

const dataArray = new Uint8Array(analyser.frequencyBinCount);

function getLevel() {
  analyser.getByteFrequencyData(dataArray);
  const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  return avg / 255;  // 0–1
}

// Poll at 100ms interval, update Zustand store
setInterval(() => {
  const level = getLevel();
  mediaStore.setAudioLevel(peerId, level);
}, 100);
```

---

## Signaling Server (`server/index.js`)

```javascript
// Complete implementation spec:

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173' }
});

// Room registry: Map<roomId, Map<socketId, { userId, displayName }>>
const rooms = new Map();

io.on('connection', (socket) => {

  socket.on('join-room', ({ roomId, userId, displayName }) => {
    socket.join(roomId);

    // Add to room registry
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    rooms.get(roomId).set(socket.id, { userId, displayName });

    // Tell the joiner who's already in the room
    const existing = [...rooms.get(roomId).entries()]
      .filter(([id]) => id !== socket.id)
      .map(([id, data]) => ({ socketId: id, ...data }));
    socket.emit('room-peers', existing);

    // Tell everyone else a new peer joined
    socket.to(roomId).emit('peer-joined', {
      socketId: socket.id, userId, displayName
    });
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        if (rooms.get(roomId).size === 0) rooms.delete(roomId);
        socket.to(roomId).emit('peer-left', { socketId: socket.id });
      }
    }
  });
});

httpServer.listen(process.env.PORT || 3001);
```

---

## Security Requirements

Implement all of these — they are not optional.

### 1. HTTPS everywhere
- Development: use `vite-plugin-mkcert` for local HTTPS (WebRTC requires it on many browsers)
- Production: enforce HTTPS via HSTS header

### 2. Room access
- Room IDs are 6-char random alphanumeric — hard to brute-force but not secret
- No auth required (by design) — rooms expire when empty
- Rate limiting on `join-room` events: max 10 joins per IP per minute (use `socket.io-rate-limiter`)

### 3. Input sanitization
- All chat messages: strip HTML before rendering, use `textContent` not `innerHTML`
- Display names: max 32 chars, strip special chars except spaces and basic punctuation
- Room codes: validate against `/^[a-z0-9]{6}$/` before joining

### 4. WebRTC security (built-in, but verify)
- DTLS-SRTP encrypts all media — this is automatic
- DataChannel traffic is also DTLS-encrypted — automatic
- Do NOT disable `dtlsSrtpKeyAgreement`

### 5. File transfer safety
- Validate MIME type client-side before sending
- Max file size: 5MB enforced before chunking
- On receive: validate assembled blob MIME type matches declared type
- Never `eval()` or execute received data

### 6. Content Security Policy headers (server)
```
Content-Security-Policy: 
  default-src 'self';
  media-src 'self' blob:;
  connect-src 'self' wss: https:;
  img-src 'self' blob: data:;
```

---

## Responsive Design Breakpoints

```css
/* Mobile first */
/* Base (< 640px): single column, controls smaller */
/* sm (640px+): two column video grid possible */
/* lg (1024px+): full desktop layout */
/* xl (1280px+): 3-column grid, larger tiles */
```

**Mobile-specific behaviors:**
- Chat panel: full-screen overlay (not side panel)
- Controls: slightly smaller buttons (`36×36px`), no tooltips
- Screen share: disabled (prompt user to use desktop)
- PIP self-view: smaller, `140px` wide
- Tap on video tile: show name overlay for 2 seconds

---

## Animations & Micro-interactions

Implement all with Framer Motion unless noted.

| Interaction | Animation |
|---|---|
| Page load (landing) | Staggered fade+slide up: logo → tagline → button → input (60ms delay each) |
| Joining room | Radial "portal" transition — landing fades out, room fades in with scale(0.96)→scale(1) |
| New participant joins | Tile expands into grid with spring scale animation |
| Participant leaves | Tile collapses, grid reflows smoothly |
| Chat panel open/close | Slide from right with spring, video grid doesn't move |
| Chat message arrives | Slide up from bottom of list |
| Emoji reaction | Float up, slight arc, fade out |
| Mute/unmute | Icon cross-fade, button background color transition |
| Speaking | Border glow (CSS only, no Framer) |
| Tooltip | Fade in after 500ms hover delay |
| Toast notifications (sonner) | Slide in from bottom-right |
| Copy room code | Brief scale(0.95) + success icon flash |
| End call | Fade out + collapse, navigate to landing |

---

## Error States

Handle all these gracefully with inline UI (not `alert()`):

| Error | Display |
|---|---|
| Camera/mic permission denied | Full-screen overlay: icon + "Camera access needed" + "Join without camera" button |
| No camera found | Proceed with audio only, show message in tile |
| Connection lost to peer | Show "Reconnecting…" shimmer on that participant's tile, attempt reconnect ×3 |
| Signaling server disconnected | Amber banner at top: "Connection interrupted — trying to reconnect" |
| Room full (if you add max capacity later) | Landing page error state |
| Invalid room code format | Inline input error: red border, "Room codes are 6 characters" |
| File too large | Inline error below attach button |
| DataChannel not ready | Queue messages, send when ready |

---

## Environment Variables

```bash
# client/.env
VITE_SIGNALING_URL=http://localhost:3001
VITE_TURN_USERNAME=your_metered_username
VITE_TURN_CREDENTIAL=your_metered_credential

# server/.env
PORT=3001
CLIENT_URL=http://localhost:5173
```

---

## Package.json Files

### `client/package.json`
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "framer-motion": "^11.2.0",
    "socket.io-client": "^4.7.5",
    "zustand": "^4.5.2",
    "lucide-react": "^0.400.0",
    "emoji-mart": "^5.6.0",
    "@emoji-mart/react": "^1.1.1",
    "@emoji-mart/data": "^1.2.1",
    "sonner": "^1.5.0",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "vite": "^5.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "vite-plugin-mkcert": "^1.17.5"
  }
}
```

### `server/package.json`
```json
{
  "dependencies": {
    "express": "^4.19.0",
    "socket.io": "^4.7.5",
    "dotenv": "^16.4.0"
  }
}
```

---

## Vite Config

```javascript
// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    https: true,
    port: 5173,
  }
})
```

---

## Tailwind Config

```javascript
// client/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Geist', 'sans-serif'],
        mono:  ['Geist Mono', 'monospace'],
      },
      colors: {
        accent: '#6ee7b7',
      },
      animation: {
        'speaking': 'speaking-pulse 1s ease-in-out infinite',
      },
    },
  },
}
```

---

## Google Fonts / Font Loading

Add to `client/index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Build & Run Instructions

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Development (run both simultaneously)
# Terminal 1:
cd server && node index.js

# Terminal 2:
cd client && npm run dev

# Production build
cd client && npm run build
# Output in client/dist — serve with any static host (Vercel, Netlify, etc.)
# Deploy server to Railway, Render, or Fly.io
```

---

## Implementation Order for AI Agent

Follow this exact sequence to avoid circular dependency issues:

1. **Scaffold** — Create directory structure, install all packages, set up Vite + Tailwind + tokens.css
2. **Signaling server** — `server/index.js` fully working
3. **Socket hook** — `useSocket.js` connecting to server
4. **Landing page** — Full UI, room creation/join logic, name input
5. **Media hook** — `useMedia.js` — camera, mic access, device enumeration
6. **WebRTC hook** — `useWebRTC.js` — core P2P connection logic
7. **Video grid** — `VideoGrid.jsx` + `VideoTile.jsx` — render remote streams
8. **Controls bar** — `Controls.jsx` — mute, camera, end call (working)
9. **Screen share** — `useScreenShare.js` + Controls button
10. **Audio levels** — `useAudioLevel.js` + `SpeakingRing.jsx`
11. **Chat panel** — `ChatPanel.jsx` + `ChatMessage.jsx` + `ChatInput.jsx` — text only first
12. **Emoji picker** — integrate emoji-mart into chat input
13. **Emoji reactions** — floating reaction animations
14. **Image sharing** — DataChannel chunked transfer + display
15. **Participant list panel** — slide-in list with audio level indicators
16. **Error handling** — all error states from the list above
17. **Animations** — Framer Motion transitions throughout
18. **Mobile responsive** — breakpoint adjustments
19. **Security hardening** — input sanitization, rate limiting, CSP
20. **Final polish** — Test all edge cases: 1 person, 2 people, 4 people, disconnection, reconnection

---

## Definition of Done

The app is complete when ALL of the following work without bugs:

- [ ] Create room with random code, name prompt, navigate to room
- [ ] Join room by entering code, see all participants
- [ ] Local camera + mic working on join
- [ ] Remote video + audio visible and synchronized
- [ ] Mute/unmute mic — all participants see updated state
- [ ] Camera on/off — all participants see updated state
- [ ] Screen share — remote participants see screen, indicator shown
- [ ] Speaking ring animates on voice activity (local + remote)
- [ ] Chat panel opens/closes with animation
- [ ] Text messages send and receive in real time
- [ ] Emoji picker opens, emoji inserts into input
- [ ] Floating emoji reactions appear on sender's tile
- [ ] Image attach, send, progress bar, remote display
- [ ] Room code copy to clipboard works
- [ ] Leave call, navigate back to landing
- [ ] Works with 2 simultaneous users (test with two browser tabs)
- [ ] Works on mobile Chrome/Safari (video, chat — screen share optional)
- [ ] No console errors in normal usage
- [ ] Camera permission denied → graceful UI, not crash

---

*Built with WebRTC · Socket.io · React — No tracking. No ads. No account.*