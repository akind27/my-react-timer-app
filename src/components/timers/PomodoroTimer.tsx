// src/components/timers/PomodoroTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings, Coffee, Clock } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

type Phase = 'work' | 'shortBreak' | 'longBreak' | 'finished';

function PomodoroTimer() {
  const [workTime, setWorkTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(4);

  const [currentSession, setCurrentSession] = useState(1); // Tracks session within current cycle (1 to sessionsUntilLongBreak)
  const [currentPhase, setCurrentPhase] = useState<Phase>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Initial time for work phase in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0); // Total completed work sessions across all cycles

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmLoopIntervalRef = useRef<NodeJS.Timeout | null>(null); // New ref for game-over alarm loop

  // Get playAlarm and stopAlarm from the global SoundContext
  const { playAlarm, stopAlarm } = useSound();


  // --- Alarm Looping Control Functions (Similar to other timers) ---
  const startAlarmLoop = useCallback(() => {
    // Stop any existing alarm loop first
    if (alarmLoopIntervalRef.current) {
      clearInterval(alarmLoopIntervalRef.current);
    }
    playAlarm(); // Play the alarm immediately

    // Set an interval to re-trigger playAlarm if it stops (browser autoplay policy)
    alarmLoopIntervalRef.current = setInterval(() => {
      playAlarm(); // Keep trying to play the alarm
    }, 4000); // Re-trigger every 4 seconds (adjust as needed for your selected sound)
  }, [playAlarm]);

  const stopAlarmLoop = useCallback(() => {
    if (alarmLoopIntervalRef.current) {
      clearInterval(alarmLoopIntervalRef.current);
      alarmLoopIntervalRef.current = null;
    }
    stopAlarm(); // Call the SoundProvider's stopAlarm to pause/reset audio
  }, [stopAlarm]);

  // Initialize timeLeft when workTime changes (e.g., from settings) AND when not running and settings are shown
  // This ensures the displayed time updates correctly when settings are tweaked.
  useEffect(() => {
    if (!isRunning && showSettings) {
      setTimeLeft(workTime * 60);
    }
  }, [workTime, isRunning, showSettings]); // Only depends on these states


  // Main timer logic effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) { // Check for 1 second remaining
            handlePhaseTransition();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // If timeLeft reaches 0 while running, ensure phase transition happens immediately (edge case)
      if (isRunning && timeLeft === 0) {
        handlePhaseTransition();
      }
      // If timer is stopped and it's in the finished phase, start looping alarm
      if (!isRunning && currentPhase === 'finished') {
        startAlarmLoop();
      } else {
        stopAlarmLoop(); // Otherwise, stop any alarm loop
      }
    }

    // Cleanup function: Clear interval and stop alarm loop when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopAlarmLoop();
    };
  }, [isRunning, timeLeft, currentPhase, currentSession, sessionsUntilLongBreak, workTime, shortBreakTime, longBreakTime, handlePhaseTransition, startAlarmLoop, stopAlarmLoop]); // Added all necessary dependencies


  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use global alarm for phase transitions

    if (currentPhase === 'work') {
      setCompletedSessions(prev => prev + 1);
      // Determine next phase after a work session
      // A long break occurs after 'sessionsUntilLongBreak' completed work sessions.
      // If completedSessions + 1 (the next one) is a multiple of sessionsUntilLongBreak, it's time for a long break.
      if ((completedSessions + 1) % sessionsUntilLongBreak === 0) {
        setCurrentPhase('longBreak');
        setTimeLeft(longBreakTime * 60);
      } else {
        setCurrentPhase('shortBreak');
        setTimeLeft(shortBreakTime * 60);
      }
    } else if (currentPhase === 'shortBreak') {
      setCurrentPhase('work');
      setTimeLeft(workTime * 60);
      // Increment session count only when transitioning from a break back to work
      // This is for display purposes: "Session X of Y"
      setCurrentSession(prev => prev % sessionsUntilLongBreak === 0 ? 1 : prev + 1);
    } else if (currentPhase === 'longBreak') {
      // After a long break, reset session count for the new cycle and start a new work phase
      setCurrentPhase('work');
      setCurrentSession(1); // Reset to session 1 of the new cycle
      setTimeLeft(workTime * 60);
    }
  }, [currentPhase, completedSessions, sessionsUntilLongBreak, longBreakTime, shortBreakTime, workTime, playAlarm]);


  const handleStart = () => {
    // If starting from a finished state, reset the timer first
    if (currentPhase === 'finished') {
      handleReset(); // This will set `isRunning` to false, so the next line will set it to true.
      setShowSettings(false); // Hide settings after reset and before starting
    }
    setIsRunning(prev => {
      if (prev) { // If it was running and we're pausing
        stopAlarmLoop();
      } else { // If it was paused and we're starting
        if (showSettings) { // If starting from settings, set initial time
          setTimeLeft(workTime * 60);
          setShowSettings(false);
        }
      }
      return !prev;
    });
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('work');
    setCurrentSession(1);
    setCompletedSessions(0);
    setTimeLeft(workTime * 60); // Reset to the current workTime setting
    setShowSettings(true); // Always show settings on reset
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'work': return 'text-red-600 bg-red-50 border-red-200';
      case 'shortBreak': return 'text-green-600 bg-green-50 border-green-200';
      case 'longBreak': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'finished': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'work': return 'WORK TIME';
      case 'shortBreak': return 'SHORT BREAK';
      case 'longBreak': return 'LONG BREAK';
      case 'finished': return 'POMODORO COMPLETE!';
      default: return '';
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'work': return <Clock className="w-6 h-6" />;
      case 'shortBreak':
      case 'longBreak': return <Coffee className="w-6 h-6" />;
      case 'finished': return <span className="text-2xl">🎉</span>;
      default: return null;
    }
  };

  // Calculate remaining sessions until the *next* long break
  // This needs to be based on `currentSession` within the cycle, not `completedSessions`
  const currentSessionInCycle = (completedSessions % sessionsUntilLongBreak) + 1; // 1-indexed session in current cycle
  const remainingSessionsForDisplay = sessionsUntilLongBreak - currentSessionInCycle + (currentPhase === 'work' ? 0 : 1); // If currently on break, count the current session as "done" for the next long break calc.

  return (
    <>
      <Helmet>
        <title>Pomodoro Timer - Boost Productivity | Timer Central</title>
        <meta name="description" content="A customizable Pomodoro Timer to enhance your focus and productivity. Set work, short break, and long break durations, and track your sessions."></meta>
      </Helmet>

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8"> {/* Added padding for better mobile view */}
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
          <CardContent className="p-8 text-center">
            {showSettings && !isRunning ? (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Pomodoro Settings</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="workTime" className="text-sm">Work (minutes)</Label>
                    <Input
                      id="workTime"
                      type="number"
                      min="1"
                      value={workTime}
                      onChange={(e) => setWorkTime(Math.max(1, parseInt(e.target.value) || 25))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shortBreakTime" className="text-sm">Short Break (min)</Label>
                    <Input
                      id="shortBreakTime"
                      type="number"
                      min="1"
                      value={shortBreakTime}
                      onChange={(e) => setShortBreakTime(Math.max(1, parseInt(e.target.value) || 5))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longBreakTime" className="text-sm">Long Break (min)</Label>
                    <Input
                      id="longBreakTime"
                      type="number"
                      min="1"
                      value={longBreakTime}
                      onChange={(e) => setLongBreakTime(Math.max(1, parseInt(e.target.value) || 15))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessions" className="text-sm">Sessions until Long Break</Label>
                    <Input
                      id="sessions"
                      type="number"
                      min="1"
                      value={sessionsUntilLongBreak}
                      onChange={(e) => setSessionsUntilLongBreak(Math.max(1, parseInt(e.target.value) || 4))}
                      className="text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className={`flex items-center justify-center gap-2 text-xl font-bold mb-2 px-4 py-2 rounded-lg ${getPhaseColor()}`}>
                    {getPhaseIcon()}
                    {getPhaseText()}
                  </div>
                  {currentPhase !== 'finished' && (
                    <div className="text-sm text-gray-600">
                      Completed: {completedSessions} • Next Long Break in {remainingSessionsForDisplay}
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-gray-500">MM:SS</div>
                </div>

                {currentPhase !== 'finished' && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          currentPhase === 'work' ? 'bg-red-500' :
                          currentPhase === 'shortBreak' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${currentPhase === 'work'
                            ? ((workTime * 60 - timeLeft) / (workTime * 60)) * 100
                            : currentPhase === 'shortBreak'
                              ? ((shortBreakTime * 60 - timeLeft) / (shortBreakTime * 60)) * 100
                              : ((longBreakTime * 60 - timeLeft) / (longBreakTime * 60)) * 100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Session indicators */}
                <div className="mb-6">
                  <div className="flex justify-center gap-1">
                    {Array.from({ length: sessionsUntilLongBreak }, (_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < completedSessions % sessionsUntilLongBreak
                            ? 'bg-red-500' // Completed session in current cycle
                            : i === (completedSessions % sessionsUntilLongBreak) && currentPhase === 'work' && isRunning
                              ? 'bg-red-300 animate-pulse' // Current work session
                              : 'bg-gray-300' // Future session
                        }`}
                      />
                    ))}
                  </div>
                  {currentPhase !== 'finished' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {currentPhase === 'work' ?
                        `${sessionsUntilLongBreak - (completedSessions % sessionsUntilLongBreak)} sessions until long break` :
                        (completedSessions % sessionsUntilLongBreak === 0 && currentPhase === 'longBreak') ?
                        `Long break completed. Next cycle starts with session 1.` :
                        `Next work session: ${currentSession}`}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStart}
                size="lg"
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

              {/* Show settings button only when not running and settings are currently hidden */}
              {!isRunning && !showSettings && (
                <Button
                  onClick={() => setShowSettings(true)}
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
                {currentPhase === 'finished'
                  ? '🎉 Pomodoro training complete!'
                  : isRunning
                    ? currentPhase === 'work'
                      ? 'Focus time! 🍅'
                      : 'Break time! ☕'
                    : 'Ready to start your Pomodoro session'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default PomodoroTimer;