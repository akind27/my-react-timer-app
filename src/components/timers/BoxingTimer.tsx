// src/components/timers/BoxingTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings, Bell } from 'lucide-react';

// REMOVE: import { useSound } from '../Router'; // No longer using global sound context for this timer

type Phase = 'prepare' | 'round' | 'rest' | 'finished';

function BoxingTimer() {
  const [roundTime, setRoundTime] = useState(3 * 60); // 3 minutes in seconds
  const [restTime, setRestTime] = useState(60); // 1 minute in seconds
  const [totalRounds, setTotalRounds] = useState(12);
  const [prepareTime, setPrepareTime] = useState(10);
  const [warningTime, setWarningTime] = useState(10); // Warning before round ends

  const [currentRound, setCurrentRound] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('prepare');
  const [timeLeft, setTimeLeft] = useState(0); // Time in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  // Refs for intervals
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishedAlarmIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for looping alarm

  // --- Direct HTMLAudioElement references ---
  const transitionAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements once on component mount
  useEffect(() => {
    console.log("[BoxingTimer Init Effect] Initializing audio elements.");

    // Initialize transition sound (e.g., for phase changes, warnings)
    if (!transitionAudioRef.current) {
        transitionAudioRef.current = new Audio('/sounds/Bell1.mp3'); // Use a distinct bell sound if available
        transitionAudioRef.current.volume = 0.7;
        transitionAudioRef.current.preload = 'auto';
        transitionAudioRef.current.load();
    }

    // Initialize finished alarm sound (for the end of the entire workout)
    if (!finishedAudioRef.current) {
        finishedAudioRef.current = new Audio('/sounds/FinishedAlarm.mp3'); // A longer, looping alarm
        finishedAudioRef.current.volume = 0.7;
        finishedAudioRef.current.loop = true; // Crucial for looping
        finishedAudioRef.current.preload = 'auto';
        finishedAudioRef.current.load();
    }

    // Component unmount cleanup: stop all sounds and clear intervals
    return () => {
      console.log("[BoxingTimer Component Unmount Cleanup] Stopping all sounds and clearing intervals.");
      if (transitionAudioRef.current) {
        transitionAudioRef.current.pause();
        transitionAudioRef.current.currentTime = 0;
      }
      if (finishedAudioRef.current) {
        finishedAudioRef.current.pause();
        finishedAudioRef.current.currentTime = 0;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (finishedAlarmIntervalRef.current) {
        clearInterval(finishedAlarmIntervalRef.current);
        finishedAlarmIntervalRef.current = null;
      }
    };
  }, []); // Runs once on mount, cleanup on unmount


  // Function to play a single transition sound (controlled only here)
  const playTransitionSound = useCallback(() => {
    if (transitionAudioRef.current) {
      transitionAudioRef.current.pause(); // Ensure it's stopped
      transitionAudioRef.current.currentTime = 0; // Rewind to start
      transitionAudioRef.current.play().catch(e => console.error("BoxingTimer Transition sound play failed:", e));
      console.log("Playing transition sound.");
    } else {
        console.log("BoxingTimer Transition audio ref not ready.");
    }
  }, []);

  // Functions specifically for the finished looping sound
  const startFinishedLoop = useCallback(() => {
    if (finishedAudioRef.current) {
      // Only play if not already playing or has been stopped
      if (finishedAudioRef.current.paused || finishedAudioRef.current.ended) {
        finishedAudioRef.current.currentTime = 0; // Ensure it starts from beginning
        finishedAudioRef.current.play().catch(e => {
          console.error("BoxingTimer Finished sound loop play failed (likely autoplay block):", e);
        });
        console.log("Starting finished loop sound.");
      }
    } else {
        console.log("BoxingTimer Finished audio ref not ready.");
    }
  }, []);

  const stopFinishedLoop = useCallback(() => {
    console.log("BoxingTimer Stopping finished loop sound.");
    if (finishedAlarmIntervalRef.current) {
      clearInterval(finishedAlarmIntervalRef.current);
      finishedAlarmIntervalRef.current = null;
    }
    if (finishedAudioRef.current) {
      finishedAudioRef.current.pause();
      finishedAudioRef.current.currentTime = 0;
    }
  }, []);

  // Function to stop all sounds - for user actions (play/pause/reset/settings)
  const stopAllSounds = useCallback(() => {
    console.log("BoxingTimer Stopping all sounds (user action/general cleanup).");
    if (transitionAudioRef.current) {
      transitionAudioRef.current.pause();
      transitionAudioRef.current.currentTime = 0;
    }
    stopFinishedLoop(); // Use the dedicated function for finished loop
  }, [stopFinishedLoop]);


  // --- Phase Transition Logic (MOVED UP) ---
  const handlePhaseTransition = useCallback(() => {
    console.log(`[BoxingTimer Phase Transition] Triggered. From: ${currentPhase}, Round: ${currentRound}`);

    // Play transition sound BEFORE updating state for the next phase.
    playTransitionSound();

    setCurrentPhase(prevPhase => {
      let nextPhase: Phase = prevPhase;
      let nextTimeLeft: number = 0;
      let nextRound: number = currentRound;

      if (prevPhase === 'prepare') {
        nextPhase = 'round';
        nextRound = 1;
        nextTimeLeft = roundTime;
      } else if (prevPhase === 'round') {
        if (currentRound >= totalRounds) {
          nextPhase = 'finished';
          setIsRunning(false); // Stop running when entire fight is finished
          nextTimeLeft = 0;
        } else {
          nextPhase = 'rest';
          nextTimeLeft = restTime;
        }
      } else if (prevPhase === 'rest') {
        nextPhase = 'round';
        nextRound = currentRound + 1;
        nextTimeLeft = roundTime;
      }

      // Hide warning flag on phase transition
      setShowWarning(false);

      setCurrentRound(nextRound);
      setTimeLeft(nextTimeLeft);
      return nextPhase;
    });
  }, [currentRound, currentPhase, playTransitionSound, restTime, roundTime, totalRounds]); // Removed startAlarmLoop from deps here

  // --- Sound Management for "Finished" Looping Alarm ONLY ---
  // This useEffect exclusively manages the finished alarm based on phase and running state.
  useEffect(() => {
    console.log(`[BoxingTimer Sound Effect - Finished Loop] Current Phase: ${currentPhase}, Is Running: ${isRunning}`);

    if (currentPhase === 'finished' && !isRunning) {
      console.log("[BoxingTimer Sound Effect - Finished Loop] Activating finished alarm loop.");
      startFinishedLoop(); // Start the audio

      // Setup interval to keep it playing (browser safeguard against autoplay issues)
      if (finishedAlarmIntervalRef.current) {
        clearInterval(finishedAlarmIntervalRef.current);
      }
      finishedAlarmIntervalRef.current = setInterval(() => {
        console.log("[BoxingTimer Sound Effect - Finished Loop] Re-triggering finished alarm in loop (safety measure).");
        startFinishedLoop(); // Re-trigger ensures persistence if browser stops it
      }, 4000);
    } else {
      // If no longer in 'finished' phase or if the timer starts running again, stop the finished loop.
      console.log("[BoxingTimer Sound Effect - Finished Loop] Deactivating finished alarm loop interval (if active).");
      stopFinishedLoop(); // Use the dedicated stop function
    }
  }, [currentPhase, isRunning, startFinishedLoop, stopFinishedLoop]);


  // Main Effect for Boxing Timer Logic
  useEffect(() => {
    // This useEffect will drive the timer countdown and phase transitions
    if (isRunning && timeLeft > 0) {
      // Clear any existing interval to prevent multiple intervals running
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          const newTime = prevTime - 1;

          // Check for warning signal (if in round and time hits warning threshold)
          if (currentPhase === 'round' && newTime === warningTime && newTime > 0) {
            setShowWarning(true);
            playTransitionSound(); // Use transition sound for warning
            // Automatically hide warning after a brief period
            setTimeout(() => setShowWarning(false), 2000);
          }

          if (newTime <= 0) {
            // Time for current phase is up, handle transition
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current); // Stop interval immediately
              countdownIntervalRef.current = null;
            }
            handlePhaseTransition(); // <-- This call is now fine because it's defined above
            return 0; // Set timeLeft to 0 for the completed phase
          }
          return newTime;
        });
      }, 1000);
    } else {
      // If timer is paused or stopped, ensure countdown interval is cleared
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    // Cleanup function: Clear countdown interval when component unmounts or deps change
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft, currentPhase, warningTime, playTransitionSound, handlePhaseTransition]); // Add all dependencies

  // This useEffect handles initial setup and state changes when settings change
  useEffect(() => {
    // When settings are shown, or if we just started/reset, set initial time and phase
    if (showSettings || (!isRunning && currentPhase === 'prepare' && timeLeft === 0)) {
        setTimeLeft(prepareTime);
        setCurrentRound(0);
        setCurrentPhase('prepare');
        setShowWarning(false);
        stopAllSounds(); // Ensure all sounds are off if settings are shown or reset is active
    }
  }, [showSettings, prepareTime, currentPhase, isRunning, timeLeft, stopAllSounds]);


  const handleStart = () => {
    // If currently finished, reset the timer to prepare phase and then start
    if (currentPhase === 'finished') {
      handleReset(); // This will set isRunning to false and show settings
      // Allow the next click to then start it
      setIsRunning(true); // Set it to true immediately after reset for the new start
      setShowSettings(false); // Hide settings immediately
      return;
    }

    setIsRunning(prev => !prev);
    setShowSettings(false); // Hide settings when starting or resuming

    // If we are about to pause (isRunning was true, now it will be false)
    if (isRunning) {
        stopAllSounds(); // Stop all sounds when pausing
    }
  };

  const handleReset = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(prepareTime); // Reset to initial prepare time
    setShowWarning(false);
    setShowSettings(true); // Show settings on reset
    stopAllSounds(); // Crucial: Stop all sounds on reset
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    if (showWarning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    switch (currentPhase) {
      case 'prepare': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'round': return 'text-red-600 bg-red-50 border-red-200';
      case 'rest': return 'text-green-600 bg-green-50 border-green-200';
      case 'finished': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseText = () => {
    if (showWarning) return '⚠️ WARNING';
    switch (currentPhase) {
      case 'prepare': return 'GET READY';
      case 'round': return 'ROUND';
      case 'rest': return 'REST';
      case 'finished': return 'FIGHT FINISHED';
      default: return '';
    }
  };

  return (
    <>
      <Helmet>
        <title>Boxing Timer - Round-Based Training | Timer Central</title>
        <meta name="description" content="Use our online boxing timer for round-based training, martial arts, and HIIT workouts. Customizable rounds, rest periods, and prepare time."></meta>
      </Helmet>

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8">
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
          <CardContent className="p-8 text-center">
            {(showSettings || (currentPhase === 'finished' && !isRunning)) ? (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Boxing Timer Settings</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="roundTime" className="text-sm">Round Time (min)</Label>
                    <Input
                      id="roundTime"
                      type="number"
                      min="1"
                      value={Math.floor(roundTime / 60)}
                      onChange={(e) => setRoundTime(Math.max(1, parseInt(e.target.value) || 3) * 60)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restTime" className="text-sm">Rest Time (sec)</Label>
                    <Input
                      id="restTime"
                      type="number"
                      min="1"
                      value={restTime}
                      onChange={(e) => setRestTime(Math.max(1, parseInt(e.target.value) || 60))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalRounds" className="text-sm">Total Rounds</Label>
                    <Input
                      id="totalRounds"
                      type="number"
                      min="1"
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(Math.max(1, parseInt(e.target.value) || 12))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prepareTime" className="text-sm">Prepare Time (sec)</Label>
                    <Input
                      id="prepareTime"
                      type="number"
                      min="1"
                      value={prepareTime}
                      onChange={(e) => setPrepareTime(Math.max(1, parseInt(e.target.value) || 10))}
                      className="text-center"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="warningTime" className="text-sm">Warning Time (sec before round ends)</Label>
                  <Input
                    id="warningTime"
                    type="number"
                    min="0"
                    max={Math.floor(roundTime / 2)}
                    value={warningTime}
                    onChange={(e) => setWarningTime(Math.max(0, Math.min(Math.floor(roundTime / 2), parseInt(e.target.value) || 10)))}
                    className="text-center mt-1"
                  />
                </div>
                {!isRunning && (
                  <Button onClick={() => setShowSettings(false)} className="mt-6">
                    Start Boxing Timer Setup
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className={`flex items-center justify-center gap-2 text-2xl font-bold mb-2 px-4 py-2 rounded-lg ${getPhaseColor()}`}>
                    {currentPhase === 'round' && <Bell className="w-6 h-6" />}
                    {getPhaseText()}
                  </div>
                  {currentPhase !== 'prepare' && currentPhase !== 'finished' && (
                    <div className="text-lg text-gray-600">
                      Round {currentRound} of {totalRounds}
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <div className={`text-6xl font-mono font-bold mb-2 ${showWarning ? 'text-yellow-600 animate-pulse' : 'text-gray-900'}`}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-gray-500">MM:SS</div>
                </div>

                {currentPhase !== 'finished' && currentPhase !== 'prepare' && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          currentPhase === 'round'
                            ? 'bg-red-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${currentPhase === 'round'
                            ? ((roundTime - timeLeft) / roundTime) * 100
                            : ((restTime - timeLeft) / restTime) * 100
                          }%`
                        }}
                      />
                    </div>
                    {currentPhase === 'round' && timeLeft <= warningTime && timeLeft > 0 && (
                      <div className="text-yellow-600 text-sm mt-2 animate-pulse">
                        ⚠️ {warningTime} second warning!
                      </div>
                    )}
                  </div>
                )}

                {currentRound > 0 && currentPhase !== 'finished' && (
                  <div className="mb-6">
                    <div className="flex justify-center gap-1">
                      {Array.from({ length: totalRounds }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-8 ${
                            i < currentRound - 1
                              ? 'bg-red-500'
                              : i === currentRound - 1 && currentPhase === 'round'
                                ? 'bg-red-300 animate-pulse'
                                : i === currentRound - 1 && currentPhase === 'rest'
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Round Progress</div>
                  </div>
                )}
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
                  ? '🥊 Fight complete! Great work!'
                  : showWarning
                    ? 'Get ready for the bell!'
                    : isRunning
                      ? currentPhase === 'round'
                        ? 'Fight! 🥊'
                        : currentPhase === 'rest'
                          ? 'Rest and recover 💧'
                          : 'Get ready...'
                        : 'Ready to fight'
                }
              </p>
            </div>

            {/* Descriptive Text for Boxing Timer */}
            <div className="mt-8 text-center text-gray-700 max-w-prose mx-auto">
                <h3 className="text-xl font-semibold mb-2">Master Your Rounds with Our Boxing Timer</h3>
                <p className="mb-2">
                    Our Boxing Timer is an essential tool for boxers, martial artists, and anyone engaging in round-based training. It provides clear audible cues for the start and end of each round, as well as a critical warning bell to signal the last few seconds of a round. This allows you to push your intensity and manage your energy effectively.
                </p>
                <p>
                    Customize your round durations, rest periods, and the total number of rounds to perfectly match your training regimen. Whether you're sparring, hitting the heavy bag, or doing shadow boxing, this timer ensures you maintain precise intervals, enhancing your endurance, speed, and discipline. Step into the ring with confidence, knowing your timing is perfect!
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default BoxingTimer;