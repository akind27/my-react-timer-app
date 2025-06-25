// src/components/timers/CountdownTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '../ui/card'; // Adjusted path for Shadcn UI components
import { Button } from '../ui/button';     // Adjusted path
import { Input } from '../ui/input';       // Adjusted path
import { Label } from '../ui/label';       // Adjusted path
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

function CountdownTimer() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5); // Default to 5 minutes
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // Time in milliseconds
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  // Refs for intervals, one for the countdown timer, one for the looping alarm
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmLoopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get playAlarm and stopAlarm from the SoundContext
  const { playAlarm, stopAlarm } = useSound();

  // --- Utility to convert H/M/S to milliseconds ---
  const convertHMS_to_MS = useCallback((h: number, m: number, s: number) => {
    return (h * 3600 + m * 60 + s) * 1000;
  }, []);

  // --- Utility to convert milliseconds to H/M/S ---
  const convertMS_to_HMS = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  }, []);

  // --- Alarm Looping Control Functions ---
  const startAlarmLoop = useCallback(() => {
    // Stop any existing alarm loop first
    if (alarmLoopIntervalRef.current) {
      clearInterval(alarmLoopIntervalRef.current);
    }
    playAlarm(); // Play the alarm immediately

    // Set an interval to re-trigger playAlarm if it stops (browser autoplay policy)
    // Adjust this interval based on the typical length of your alarm sounds (e.g., 3-5 seconds)
    // 4 seconds is a common choice to ensure continuous play.
    alarmLoopIntervalRef.current = setInterval(() => {
      playAlarm(); // Keep trying to play the alarm
    }, 4000); // Re-trigger every 4 seconds
  }, [playAlarm]); // Dependency: playAlarm should be stable from SoundProvider

  const stopAlarmLoop = useCallback(() => {
    if (alarmLoopIntervalRef.current) {
      clearInterval(alarmLoopIntervalRef.current);
      alarmLoopIntervalRef.current = null;
    }
    stopAlarm(); // Call the SoundProvider's stopAlarm to pause/reset audio
  }, [stopAlarm]); // Dependency: stopAlarm should be stable from SoundProvider

  // --- Main Countdown Logic Effect ---
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1000) { // When less than or equal to 1 second remaining
            clearInterval(countdownIntervalRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            startAlarmLoop(); // Timer ended, start looping alarm
            return 0;
          }
          return prevTime - 1000;
        });
      }, 1000);
    } else {
      // Clear interval if not running or time has run out
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    // Cleanup function for the countdown interval
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isRunning, timeLeft, startAlarmLoop]); // Add startAlarmLoop to dependencies

  // --- Effect to update H/M/S for display from timeLeft ---
  useEffect(() => {
    const { h, m, s } = convertMS_to_HMS(timeLeft);
    // Only update if the values actually change to prevent infinite loops
    // This is important because setHours/setMinutes/setSeconds will trigger re-renders
    if (h !== hours) setHours(h);
    if (m !== minutes) setMinutes(m);
    if (s !== seconds) setSeconds(s);
  }, [timeLeft, convertMS_to_HMS]); // Depend on timeLeft and the conversion utility

  // --- Handlers ---
  const handleStart = () => {
    // If starting from 0 (or finished state), calculate initial timeLeft from inputs
    if (timeLeft === 0 || isFinished) {
      const totalMs = convertHMS_to_MS(hours, minutes, seconds);
      if (totalMs > 0) {
        setTimeLeft(totalMs);
        setIsRunning(true);
        setIsFinished(false); // Reset finished state
        setShowSettings(false);
        stopAlarmLoop(); // Ensure any previous alarm is stopped
      } else {
        console.warn("Cannot start timer with 00:00:00. Please set a time.");
      }
    } else {
      // If paused and time left, just resume/pause
      setIsRunning(!isRunning);
      // If pausing a finished timer, ensure alarm stops
      if (isRunning && isFinished) { // If it was running and finished (alarm active)
        stopAlarmLoop();
      }
    }
  };

  const handleReset = () => {
    clearInterval(countdownIntervalRef.current!); // Clear countdown interval
    setIsRunning(false);
    setTimeLeft(0);
    setIsFinished(false);
    setShowSettings(true);
    setHours(0); // Reset input fields to 0 or desired default
    setMinutes(5); // Default minutes
    setSeconds(0);
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
  };

  const handleSettingsToggle = () => {
    // Allow toggling settings only when the timer is not running and not finished
    // If finished, force show settings to allow new input
    if (!isRunning) {
      if (isFinished || timeLeft === 0) {
        setShowSettings(true);
      } else {
        setShowSettings(!showSettings);
      }
      stopAlarmLoop(); // Stop alarm if toggling settings
    }
  };

  // --- Input Change Handlers (Update H/M/S directly) ---
  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setHours(value);
    setIsRunning(false); // Pause timer on input change
    setIsFinished(false); // Not finished if changing time
    stopAlarmLoop(); // Stop alarm if user is adjusting time
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0)); // Cap minutes at 59
    setMinutes(value);
    setIsRunning(false);
    setIsFinished(false);
    stopAlarmLoop();
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0)); // Cap seconds at 59
    setSeconds(value);
    setIsRunning(false);
    setIsFinished(false);
    stopAlarmLoop();
  };


  // Determine the title based on timer state
  const getPageTitle = () => {
    if (isFinished) {
      return "Time's Up! - Countdown Timer | Timer Central";
    }
    if (isRunning) {
      const formattedTime = formatTime(timeLeft);
      return `${formattedTime} - Counting Down | Timer Central`;
    }
    return "Online Countdown Timer - Set & Go! | Timer Central";
  };

  // Helper function to format time (re-used from previous version)
  const formatTime = (timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content="A simple and intuitive online countdown timer. Set hours, minutes, and seconds for any task, workout, or cooking."></meta>
      </Helmet>

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8"> {/* Added padding for better mobile view */}
        <Card className={`shadow-xl transition-colors ${isFinished ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <CardContent className="p-8 text-center">
            {/* Show settings only when timer is not running or finished */}
            {showSettings || (!isRunning && timeLeft === 0) ? (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Set Timer</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="hours" className="text-sm">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      min="0"
                      max="23"
                      value={hours}
                      onChange={handleHoursChange}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="minutes" className="text-sm">Minutes</Label>
                    <Input
                      id="minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={handleMinutesChange}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seconds" className="text-sm">Seconds</Label>
                    <Input
                      id="seconds"
                      type="number"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={handleSecondsChange}
                      className="text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <div className={`text-6xl font-mono font-bold mb-2 ${isFinished ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-gray-500">
                  {isFinished ? 'Time\'s up!' : isRunning ? 'Counting down...' : timeLeft > 0 ? 'Paused' : 'Set your timer above'}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStart}
                size="lg"
                disabled={!isRunning && timeLeft === 0 && (hours === 0 && minutes === 0 && seconds === 0)}
                className={`w-16 h-16 rounded-full ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>

              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full"
              >
                <RotateCcw className="w-6 h-6" />
              </Button>

              {/* Show settings button only if not in settings view, not running, and there's time left or it's finished */}
              {!showSettings && !isRunning && (timeLeft > 0 || isFinished) && (
                <Button
                  onClick={handleSettingsToggle}
                  size="lg"
                  variant="outline"
                  className="w-16 h-16 rounded-full"
                >
                  <Settings className="w-6 h-6" />
                </Button>
              )}
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p>
                {isFinished
                  ? '🔔 Timer finished!'
                  : isRunning
                    ? 'Counting down...'
                    : timeLeft > 0
                      ? 'Paused'
                      : 'Set your time and press start'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default CountdownTimer;