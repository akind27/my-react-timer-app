// src/components/timers/CountdownTimer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async'; // <--- NEW IMPORT for Helmet
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

function CountdownTimer() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio context for alert sound
    audioRef.current = new Audio();
    // Base64 encoded audio for a simple beep/alert sound
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGWi77eefTQwMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606eulVRQKRp/g8r5h';

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1000) { // Check for 1000ms (1 second) to account for interval timing
            setIsRunning(false);
            setIsFinished(true);
            // Play alert sound
            if (audioRef.current) {
              audioRef.current.play().catch(error => {
                // Catch potential errors like user gesture requirement for autoplay
                console.error('Error playing sound:', error);
              });
            }
            return 0;
          }
          return prevTime - 1000;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

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

  const handleStart = () => {
    // Only set initial time if the timer is at 0 and not finished
    if (timeLeft === 0 && !isFinished) {
      const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      if (totalMs > 0) {
        setTimeLeft(totalMs);
        setIsRunning(true);
        setIsFinished(false); // Ensure isFinished is false when starting a new timer
        setShowSettings(false);
      }
    } else if (!isFinished) {
      // If timer is not finished, toggle running state (play/pause)
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setIsFinished(false);
    setShowSettings(true);
    // Reset input fields to default if desired, or leave as last set
    // setHours(0);
    // setMinutes(5);
    // setSeconds(0);
  };

  const handleSettingsToggle = () => {
    // Allow toggling settings only when the timer is not running
    if (!isRunning) {
      setShowSettings(!showSettings);
    }
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

  return (
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>{getPageTitle()}</title>
        <meta name="description" content="A simple and intuitive online countdown timer. Set hours, minutes, and seconds for any task, workout, or cooking."></meta>
        {/* You can add more meta tags here if needed for Countdown Timer */}
      </Helmet>

      <div className="max-w-md mx-auto">
        <Card className={`shadow-xl transition-colors ${isFinished ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <CardContent className="p-8 text-center">
            {/* Show settings only when not running and timer is at 0 or finished */}
            {showSettings && !isRunning && timeLeft === 0 ? (
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
                      onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
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
                      onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
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
                      onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <div className={`text-6xl font-mono font-bold mb-2 ${isFinished ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-gray-500">
                  {isFinished ? 'Time\'s up!' : timeLeft > 0 ? (hours > 0 ? 'HH:MM:SS' : 'MM:SS') : 'Set your timer above'}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStart}
                size="lg"
                // Disable start button if all time inputs are 0 and timer isn't already running/paused with time left
                disabled={timeLeft === 0 && !isFinished && (hours === 0 && minutes === 0 && seconds === 0)}
                className={`w-16 h-16 rounded-full ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600' // Use green for both ready and finished states for start/resume
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