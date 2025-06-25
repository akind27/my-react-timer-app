// src/components/timers/PomodoroTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings, Coffee, Clock } from 'lucide-react';

import { useSound } from '../Router'; // Keep this for phase transition sounds


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
  const finishedAlarmIntervalRef = useRef<NodeJS.Timeout | null>(null); // New ref for looping finished alarm

  // Get playAlarm and stopAlarm from the global SoundContext for phase transitions
  const { playAlarm } = useSound(); // Only need playAlarm from context for *transition* sounds

  // --- Dedicated HTMLAudioElement for the Looping "Finished" Alarm ---
  const finishedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize finished audio element once on component mount
  useEffect(() => {
    console.log("[PomodoroTimer Init Effect] Initializing finished audio element.");

    if (!finishedAudioRef.current) {
      finishedAudioRef.current = new Audio('/sounds/FinishedAlarm.mp3'); // A longer, looping alarm
      finishedAudioRef.current.volume = 0.7;
      finishedAudioRef.current.loop = true; // CRUCIAL for looping
      finishedAudioRef.current.preload = 'auto';
      finishedAudioRef.current.load();
    }

    // Component unmount cleanup: stop all sounds and clear intervals
    return () => {
      console.log("[PomodoroTimer Component Unmount Cleanup] Stopping all sounds and clearing intervals.");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Ensure the finished alarm is stopped and reset
      if (finishedAudioRef.current) {
        finishedAudioRef.current.pause();
        finishedAudioRef.current.currentTime = 0;
      }
      if (finishedAlarmIntervalRef.current) {
        clearInterval(finishedAlarmIntervalRef.current);
        finishedAlarmIntervalRef.current = null;
      }
      // No need to call stopAlarm() from context here, as it's not the looping sound.
    };
  }, []); // Runs once on mount, cleanup on unmount


  // --- Functions for Looping "Finished" Alarm ONLY ---
  const startFinishedLoop = useCallback(() => {
    if (finishedAudioRef.current) {
      // Only play if not already playing or has been stopped
      if (finishedAudioRef.current.paused || finishedAudioRef.current.ended) {
        finishedAudioRef.current.currentTime = 0; // Ensure it starts from beginning
        finishedAudioRef.current.play().catch(e => {
          console.error("PomodoroTimer Finished sound loop play failed (likely autoplay block):", e);
        });
        console.log("Starting finished loop sound.");
      }
    } else {
      console.log("PomodoroTimer Finished audio ref not ready.");
    }
  }, []);

  const stopFinishedLoop = useCallback(() => {
    console.log("PomodoroTimer Stopping finished loop sound.");
    if (finishedAlarmIntervalRef.current) {
      clearInterval(finishedAlarmIntervalRef.current);
      finishedAlarmIntervalRef.current = null;
    }
    if (finishedAudioRef.current) {
      finishedAudioRef.current.pause();
      finishedAudioRef.current.currentTime = 0;
    }
  }, []);

  // Initialize timeLeft when workTime changes (e.g., from settings) AND when not running and settings are shown
  // This ensures the displayed time updates correctly when settings are tweaked.
  useEffect(() => {
    if (!isRunning && showSettings) {
      setTimeLeft(workTime * 60);
    }
  }, [workTime, isRunning, showSettings]); // Only depends on these states


  // --- Phase Transition Logic (MOVED UP for correct access) ---
  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use global alarm for phase transitions (short, distinct sound)

    if (currentPhase === 'work') {
      setCompletedSessions(prev => prev + 1);
      // Determine next phase after a work session
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
      setCurrentSession(prev => prev % sessionsUntilLongBreak === 0 ? 1 : prev + 1);
    } else if (currentPhase === 'longBreak') {
      // After a long break, reset session count for the new cycle and start a new work phase
      setCurrentPhase('work');
      setCurrentSession(1); // Reset to session 1 of the new cycle
      setTimeLeft(workTime * 60);
    }
  }, [currentPhase, completedSessions, sessionsUntilLongBreak, longBreakTime, shortBreakTime, workTime, playAlarm]);


  // Main timer logic effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      // Ensure any previous interval is cleared before setting a new one
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) { // Check for 1 second remaining
            handlePhaseTransition(); // Call the transition
            return 0; // Ensure time goes to 0
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      // If timer is paused or stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // If timeLeft reaches 0 and timer was running, ensure phase transition happens immediately (edge case for manual pause just before 0)
      // This is now redundant because handlePhaseTransition() is called when prevTime <= 1
      // if (isRunning && timeLeft === 0 && currentPhase !== 'finished') { // Removed this as handlePhaseTransition handles it
      //   handlePhaseTransition();
      // }

      // ONLY manage the *looping finished alarm* when currentPhase is 'finished' AND not running
      if (!isRunning && currentPhase === 'finished') {
        console.log("[PomodoroTimer Main Effect] Timer stopped and phase is 'finished'. Starting finished alarm loop.");
        startFinishedLoop();
      } else {
        // Otherwise, ensure the finished alarm loop is stopped
        console.log("[PomodoroTimer Main Effect] Not in 'finished' phase or timer is running. Stopping finished alarm loop.");
        stopFinishedLoop();
      }
    }

    // Cleanup function: Clear interval and stop finished alarm loop when component unmounts or dependencies change
    return () => {
      console.log("[PomodoroTimer Main Effect Cleanup]");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopFinishedLoop(); // Always stop the looping alarm on cleanup
    };
  }, [isRunning, timeLeft, currentPhase, handlePhaseTransition, startFinishedLoop, stopFinishedLoop]); // Re-evaluate dependencies carefully


  const handleStart = () => {
    // If starting from a finished state, reset the timer first
    if (currentPhase === 'finished') {
      handleReset(); // This will set `isRunning` to false, so the next line will set it to true.
      setShowSettings(false); // Hide settings after reset and before starting
    }
    setIsRunning(prev => {
      if (prev) { // If it was running and we're pausing
        stopFinishedLoop(); // Stop the finished alarm if it was playing (e.g., user paused while "finished")
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
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentPhase('work');
    setCurrentSession(1);
    setCompletedSessions(0);
    setTimeLeft(workTime * 60); // Reset to the current workTime setting
    setShowSettings(true); // Always show settings on reset
    stopFinishedLoop(); // Crucial: Stop the looping finished alarm on reset
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
  // This needs to be based on `completedSessions`, which increments after each work phase.
  const sessionsIntoCurrentCycle = completedSessions % sessionsUntilLongBreak;
  const remainingSessionsForDisplay = sessionsUntilLongBreak - sessionsIntoCurrentCycle;


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
                      Completed: {completedSessions} {currentPhase === 'longBreak' ? '' : `• Next Long Break in ${remainingSessionsForDisplay}`}
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
                          i < sessionsIntoCurrentCycle
                            ? 'bg-red-500' // Completed session in current cycle
                            : i === sessionsIntoCurrentCycle && currentPhase === 'work' && isRunning
                              ? 'bg-red-300 animate-pulse' // Current work session
                              : 'bg-gray-300' // Future session
                        }`}
                      />
                    ))}
                  </div>
                  {currentPhase !== 'finished' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {currentPhase === 'work' ?
                        `${remainingSessionsForDisplay} sessions until long break` :
                        (currentPhase === 'longBreak' && sessionsIntoCurrentCycle === 0) ?
                        `Long break complete. Next cycle starts with session 1.` :
                        `Next work session: ${sessionsIntoCurrentCycle + 1}`
                      }
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
                {currentPhase === 'finished' ? 'Restart' : (isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />)}
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
            {/* Descriptive Text for Pomodoro Timer */}
            <div className="mt-8 text-center text-gray-700 max-w-prose mx-auto">
                <h3 className="text-xl font-semibold mb-2">Boost Your Productivity with the Pomodoro Timer</h3>
                <p className="mb-2">
                    The Pomodoro Technique is a time management method that uses a timer to break down work into intervals, traditionally 25 minutes in length, separated by short breaks. Our Pomodoro Timer helps you implement this technique efficiently, improving focus and preventing burnout.
                </p>
                <p>
                    Customize your work and break durations to suit your needs. After a set number of work sessions (pomodoros), you'll be prompted to take a longer break to refresh. This structured approach to work and rest can significantly enhance your productivity and help you maintain concentration over extended periods. Get started and conquer your tasks one pomodoro at a time!
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default PomodoroTimer;