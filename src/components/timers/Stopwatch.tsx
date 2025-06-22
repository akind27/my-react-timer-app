// src/components/timers/Stopwatch.tsx
import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { Helmet } from 'react-helmet-async';

const Stopwatch = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<number | null>(null); // Use useRef to store interval ID

  useEffect(() => {
    if (isRunning) {
      // Start the interval
      timerRef.current = window.setInterval(() => {
        setTime((prevTime) => prevTime + 10); // Update every 10ms for centiseconds
      }, 10);
    } else if (timerRef.current) {
      // Clear the interval if not running or when component unmounts
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Cleanup function to clear interval when component unmounts or isRunning changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]); // Dependency array: re-run effect when isRunning changes

  const startStopwatch = () => setIsRunning(true);
  const stopStopwatch = () => setIsRunning(false);
  const resetStopwatch = () => {
    setTime(0);
    setIsRunning(false);
    if (timerRef.current) { // Ensure interval is cleared on reset too
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Helper function to format time for display (optional, but makes it look better)
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Helmet>
        <title>Online Stopwatch - Precise Time Tracking | Timer Central</title>
        <meta name="description" content="Use our free online stopwatch for accurate time measurement. Track laps, splits, and total time for sports, studies, or daily tasks."></meta>
      </Helmet>

      <div className="flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Stopwatch</h2>
        <p className="text-6xl font-mono mb-8 text-blue-600">{formatTime(time)}</p> {/* Use formatTime here */}
        <div className="flex space-x-4">
          <button
            onClick={startStopwatch}
            disabled={isRunning}
            className="px-6 py-3 rounded-lg text-white font-semibold transition-colors duration-200 bg-green-500 hover:bg-green-600"
          >
            Start
          </button>
          <button
            onClick={stopStopwatch}
            disabled={!isRunning}
            className="px-6 py-3 rounded-lg text-white font-semibold transition-colors duration-200 bg-red-500 hover:bg-red-600"
          >
            Stop
          </button>
          <button
            onClick={resetStopwatch}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );
};

export default Stopwatch;