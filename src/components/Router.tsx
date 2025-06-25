// src/components/Router.tsx

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import your main application components
import TimerApp from './TimerApp.tsx'; // Assuming TimerApp is directly in src/components/

// Import all your timer components from the 'timers' subfolder
// The paths are corrected to specifically point to the .tsx file
import CountdownTimer from './timers/CountdownTimer.tsx';
import Stopwatch from './timers/Stopwatch.tsx';
import TabataTimer from './timers/TabataTimer.tsx';
import PomodoroTimer from './timers/PomodoroTimer.tsx';
import IntervalTimer from './timers/IntervalTimer.tsx';
import BoxingTimer from './timers/BoxingTimer.tsx';
import HIITTimer from './timers/HIITTimer.tsx';
import ChessTimer from './timers/ChessTimer.tsx';

// Import your newly added pages from the 'pages' folder
import AboutUs from './pages/AboutUs.tsx';
import ContactUs from './pages/ContactUs.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';
import TermsOfService from './pages/TermsOfService.tsx';

// Define the shape of the sound context
interface SoundContextType {
  selectedSound: string;
  setSelectedSound: (sound: string) => void;
  playAlarm: () => void;
  stopAlarm: () => void;
}

// Create the SoundContext with a default undefined value
const SoundContext = createContext<SoundContextType | undefined>(undefined);

// Custom hook to use the SoundContext
export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};

// SoundProvider component
const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Set default sound to match one of the files you actually have
  const [selectedSound, setSelectedSound] = useState<string>('Bell1.mp3');
  const audioRef = useRef<HTMLAudioElement | null>(null); // Use HTMLAudioElement

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = `/sounds/${selectedSound}`;
      audioRef.current.load(); // Load the new sound
      audioRef.current.loop = true; // Programmatically set loop to true for robustness
    }
  }, [selectedSound]);

  const playAlarm = () => {
    if (audioRef.current) {
      console.log(`playAlarm called. Selected Sound: ${selectedSound}. Audio src: ${audioRef.current.src}`);
      audioRef.current.play()
        .then(() => {
          console.log('Sound playback promise resolved successfully (initial play).');
        })
        .catch(error => {
          console.error('Error playing sound:', error);
          // This is where you might get an AutoplayError.
          // If the sound fails to play, it might be due to browser autoplay policies
          // that require a direct user gesture.
        });
    } else {
      console.warn('Audio element not ready to play sound.');
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Rewind to the beginning
      console.log('Sound stopped and reset.');
    }
  };

  // Function to play sound preview
  const playSoundPreview = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => console.log('Preview played.'))
        .catch(e => console.error('Error playing preview:', e));
    }
  };

  return (
    <SoundContext.Provider value={{ selectedSound, setSelectedSound, playAlarm, stopAlarm }}>
      {children}
      {/* Audio element for playback - hidden */}
      <audio ref={audioRef} preload="auto" loop /> {/* Also set loop in JSX */}
      {/* The sound selection UI is now rendered within the Route for the homepage, not here */}
    </SoundContext.Provider>
  );
};


// Main AppRouter component
const AppRouter: React.FC = () => {
  return (
    <Router>
      <SoundProvider> {/* Wrap your entire application with SoundProvider */}
        <div className="App">
          <header className="App-header" style={{ marginBottom: '20px' }}>
            <nav>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/stopwatch">Stopwatch</Link></li>
                <li><Link to="/countdown">Countdown</Link></li>
                <li><Link to="/tabata">Tabata</Link></li>
                <li><Link to="/pomodoro">Pomodoro</Link></li>
                <li><Link to="/interval">Interval</Link></li>
                <li><Link to="/boxing">Boxing</Link></li>
                <li><Link to="/hiit">HIIT</Link></li>
                <li><Link to="/chess">Chess</Link></li>
              </ul>
            </nav>
          </header>

          <main>
            <Routes>
              {/* Route for the Home page, including the sound selection UI */}
              <Route path="/" element={
                <>
                  <TimerApp /> {/* Your main landing page component with "Timer Central" title */}
                  {/* Sound selection UI, placed below the main app content */}
                  <SoundContext.Consumer>
                    {({ selectedSound, setSelectedSound, playAlarm }) => (
                      <div style={{ padding: '10px', borderTop: '1px solid #ccc', marginTop: '20px', textAlign: 'center' }}>
                        <label htmlFor="soundSelect">Select Alarm Sound: </label>
                        <select
                          id="soundSelect"
                          value={selectedSound}
                          onChange={(e) => setSelectedSound(e.target.value)}
                        >
                          {/* Options matching your actual sound files */}
                          <option value="Bell1.mp3">Bell 1</option>
                          <option value="Bellnotification.mp3">Bell Notification</option>
                          <option value="Creepybell.mp3">Creepy Bell</option>
                          <option value="Schoolbell.mp3">School Bell</option>
                        </select>
                        {/* Note: playSoundPreview needs to be accessed from SoundContext.Consumer or passed from SoundProvider */}
                        <button onClick={() => {
                            if (audioRef.current) {
                                audioRef.current.play()
                                    .then(() => console.log('Preview played.'))
                                    .catch(e => console.error('Error playing preview:', e));
                            }
                        }} style={{ marginLeft: '10px' }}>Preview Sound</button>
                      </div>
                    )}
                  </SoundContext.Consumer>
                </>
              } />

              {/* All other timer routes */}
              <Route path="/stopwatch" element={<Stopwatch />} />
              <Route path="/countdown" element={<CountdownTimer />} />
              <Route path="/tabata" element={<TabataTimer />} />
              <Route path="/pomodoro" element={<PomodoroTimer />} />
              <Route path="/interval" element={<IntervalTimer />} />
              <Route path="/boxing" element={<BoxingTimer />} />
              <Route path="/hiit" element={<HIITTimer />} />
              <Route path="/chess" element={<ChessTimer />} />

              {/* Routes for your new pages */}
              <Route path="/about-us" element={<AboutUs />} />
              <Route path="/contact-us" element={<ContactUs />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="*" element={<div>404 Not Found</div>} /> {/* Catch-all for undefined routes */}
            </Routes>
          </main>

          <footer style={{ marginTop: '15px', fontSize: '0.9em', color: '#666', textAlign: 'center' }}>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
              <li><Link to="/about-us">About Us</Link></li>
              <li><Link to="/contact-us">Contact Us</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
            </ul>
            &copy; {new Date().getFullYear()} Online Timers. All rights reserved.
          </footer>
        </div>
      </SoundProvider>
    </Router>
  );
};

export default AppRouter;