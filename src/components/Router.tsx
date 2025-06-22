// src/components/Router.tsx
import { Routes, Route, Link } from 'react-router-dom';

// Import your main TimerApp component (which will become your homepage)
import TimerApp from './TimerApp'; // This is your existing TimerApp.tsx

// Import all your individual timer components from their paths
// These paths match the imports you already have in your original TimerApp.tsx!
import Stopwatch from './timers/Stopwatch';
import CountdownTimer from './timers/CountdownTimer';
import TabataTimer from './timers/TabataTimer';
import PomodoroTimer from './timers/PomodoroTimer';
import IntervalTimer from './timers/IntervalTimer';
import BoxingTimer from './timers/BoxingTimer';
import HIITTimer from './timers/HIITTimer';
import ChessTimer from './timers/ChessTimer';

function Router() {
  return (
    <>
      {/* This is your global navigation bar */}
      <nav style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '20px' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          <li style={{ margin: '0 10px' }}><Link to="/">Home</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/stopwatch">Stopwatch</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/countdown">Countdown</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/tabata">Tabata</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/pomodoro">Pomodoro</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/interval">Interval</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/boxing">Boxing</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/hiit">HIIT</Link></li>
          <li style={{ margin: '0 10px' }}><Link to="/chess">Chess</Link></li>
          {/* Add a <Link> for any other timers you might have */}
        </ul>
      </nav>

      {/* This is where the magic happens: show different components for different URLs */}
      <Routes>
        {/* The main page (/) will show your list of timer cards */}
        <Route path="/" element={<TimerApp />} />

        {/* Individual routes for each timer */}
        <Route path="/stopwatch" element={<Stopwatch />} />
        <Route path="/countdown" element={<CountdownTimer />} />
        <Route path="/tabata" element={<TabataTimer />} />
        <Route path="/pomodoro" element={<PomodoroTimer />} />
        <Route path="/interval" element={<IntervalTimer />} />
        <Route path="/boxing" element={<BoxingTimer />} />
        <Route path="/hiit" element={<HIITTimer />} />
        <Route path="/chess" element={<ChessTimer />} />
        {/* Add a <Route> for EACH of your other timers here,
            pointing to the correct component from your imports above. */}

        {/* You might want a 404 page for unmatched routes later */}
        {/* <Route path="*" element={<div>404 - Page Not Found</div>} /> */}
      </Routes>
    </>
  );
}

export default Router;