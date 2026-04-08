import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { WebRTCProvider } from './contexts/WebRTCContext';
import Landing from './pages/Landing';
import Room from './pages/Room';

function App() {
  return (
    <WebRTCProvider>
      <Toaster theme="dark" position="bottom-right" />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </Router>
    </WebRTCProvider>
  );
}

export default App;
