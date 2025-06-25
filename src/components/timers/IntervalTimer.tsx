// src/components/timers/IntervalTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';

import { useSound } from '../Router'; // Keep this for phase transition sounds

type Phase = 'work' | 'rest' | 'finished';

interface IntervalSet {
  workTime: number;
  restTime: number;
}

function IntervalTimer() {
  const [intervals, setIntervals] = useState<IntervalSet[]>([
    { workTime: 30, restTime: 15 } // Default initial interval
  ]);
  const [totalSets, setTotalSets] = useState(5);
  const [prepareTime, setPrepareTime] = useState(10);

  const [currentSet, setCurrentSet] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('work'); // Initial phase for internal logic
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isPreparing, setIsPreparing] = useState(true); // Tracks if we are in the initial 'prepare' phase

  // Refs for intervals, one for the main game timer, one for the game-over alarm loop
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get playAlarm from the global SoundContext for *phase transitions*
  const { playAlarm } = useSound();

  // --- Dedicated HTMLAudioElement for the Looping "Finished" Alarm ---
  const finishedAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishedAlarmIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval to re-trigger if autoplay blocked

  // Initialize finished audio element once on component mount
  useEffect(() => {
    console.log("[IntervalTimer Init Effect] Initializing finished audio element.");
    if (!finishedAudioRef.current) {
      finishedAudioRef.current = new Audio('/sounds/FinishedAlarm.mp3'); // Path to your looping sound
      finishedAudioRef.current.volume = 0.7;
      finishedAudioRef.current.loop = true; // CRUCIAL for looping
      finishedAudioRef.current.preload = 'auto';
      finishedAudioRef.current.load();
    }

    // Component unmount cleanup: stop all sounds and clear intervals
    return () => {
      console.log("[IntervalTimer Component Unmount Cleanup] Stopping all sounds and clearing intervals.");
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
    console.log("IntervalTimer: Attempting to start finished loop.");
    // Stop any existing alarm loop first
    if (finishedAlarmIntervalRef.current) {
      clearInterval(finishedAlarmIntervalRef.current);
      finishedAlarmIntervalRef.current = null;
    }

    if (finishedAudioRef.current) {
      // Only play if not already playing or has been stopped
      if (finishedAudioRef.current.paused || finishedAudioRef.current.ended) {
        finishedAudioRef.current.currentTime = 0; // Ensure it starts from beginning
        finishedAudioRef.current.play().catch(e => {
          console.error("IntervalTimer Finished sound loop play failed (likely autoplay block):", e);
        });
      }
      // Set an interval to re-trigger play if it stops (browser autoplay policy, or if user stops it manually)
      finishedAlarmIntervalRef.current = setInterval(() => {
        if (finishedAudioRef.current && (finishedAudioRef.current.paused || finishedAudioRef.current.ended)) {
          finishedAudioRef.current.currentTime = 0;
          finishedAudioRef.current.play().catch(e => {
            console.error("IntervalTimer Finished sound re-trigger failed:", e);
          });
        }
      }, 4000); // Re-trigger every 4 seconds (adjust as needed for your selected sound)
    }
  }, []);

  const stopFinishedLoop = useCallback(() => {
    console.log("IntervalTimer: Stopping finished loop sound.");
    if (finishedAlarmIntervalRef.current) {
      clearInterval(finishedAlarmIntervalRef.current);
      finishedAlarmIntervalRef.current = null;
    }
    if (finishedAudioRef.current) {
      finishedAudioRef.current.pause();
      finishedAudioRef.current.currentTime = 0;
    }
  }, []);

  // This effect ensures initial prepare time is set when entering settings or resetting
  useEffect(() => {
    // Only update timeLeft if not running and we are in settings or preparing
    // This prevents accidental reset of time if user tweaks settings while timer is running
    if (!isRunning && (showSettings || isPreparing)) {
      setTimeLeft(prepareTime);
    }
  }, [isPreparing, showSettings, prepareTime, isRunning]); // Added isRunning dependency for precision


  // --- Phase Transition Logic (MOVED UP for correct access) ---
  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use global alarm for phase transitions (short, distinct sound)

    if (isPreparing) {
      setIsPreparing(false);
      setCurrentSet(1); // Start with the first set
      setCurrentInterval(0); // Start with the first interval definition
      setCurrentPhase('work');
      setTimeLeft(intervals[0]?.workTime || 0); // Use optional chaining and fallback
    } else if (currentPhase === 'work') {
      setCurrentPhase('rest');
      setTimeLeft(intervals[currentInterval]?.restTime || 0); // Use optional chaining and fallback
    } else if (currentPhase === 'rest') {
      const nextIntervalIndex = (currentInterval + 1) % intervals.length;

      // Check if we've completed all intervals in the current set and are at the last set
      // This is the condition for finishing the entire workout
      if (nextIntervalIndex === 0 && currentSet >= totalSets) {
        setCurrentPhase('finished');
        setIsRunning(false); // Stop the main timer
        setTimeLeft(0); // Ensure time is 0 for finished state
        // The main useEffect will pick up currentPhase === 'finished' and !isRunning to start the alarm loop.
      } else {
        // Move to the next interval or next set
        setCurrentPhase('work');
        setCurrentInterval(nextIntervalIndex);
        setTimeLeft(intervals[nextIntervalIndex]?.workTime || 0); // Use optional chaining and fallback

        // Increment set only if we're looping back to the first interval definition
        if (nextIntervalIndex === 0) {
          setCurrentSet(prev => prev + 1);
        }
      }
    }
  }, [currentInterval, currentPhase, currentSet, intervals, totalSets, isPreparing, playAlarm]);


  // Main timer logic effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      // Clear any existing interval before setting a new one
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
      // If timer is paused or stopped (timeLeft is 0 or isRunning is false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // ONLY manage the *looping finished alarm* when currentPhase is 'finished' AND not running
      if (!isRunning && currentPhase === 'finished') {
        console.log("[IntervalTimer Main Effect] Timer stopped and phase is 'finished'. Starting finished alarm loop.");
        startFinishedLoop();
      } else {
        // Otherwise, ensure the finished alarm loop is stopped
        console.log("[IntervalTimer Main Effect] Not in 'finished' phase or timer is running. Stopping finished alarm loop.");
        stopFinishedLoop();
      }
    }

    // Cleanup function: Clear interval and stop finished alarm loop when component unmounts or dependencies change
    return () => {
      console.log("[IntervalTimer Main Effect Cleanup]");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopFinishedLoop(); // Always stop the looping alarm on cleanup
    };
  }, [isRunning, timeLeft, isPreparing, currentPhase, currentSet, totalSets, intervals, handlePhaseTransition, startFinishedLoop, stopFinishedLoop]); // Re-evaluate dependencies carefully


  const handleStart = () => {
    if (currentPhase === 'finished' && !isRunning) {
      // If finished and user clicks start, reset and then start.
      // handleReset will set isRunning to false, isPreparing to true.
      // The subsequent logic will correctly re-start from prepare.
      handleReset();
      // After reset, the state will be isPreparing=true, isRunning=false.
      // We need to explicitly set isRunning to true to start the timer after reset.
      setTimeout(() => setIsRunning(true), 0); // Small delay to allow state update
      setShowSettings(false); // Hide settings immediately on start
      return;
    }

    setIsRunning(prev => {
      const newState = !prev;
      if (!prev && showSettings) { // If was paused/settings shown, and now starting
        setShowSettings(false); // Hide settings
        setIsPreparing(true); // Ensure prepare phase starts
        setTimeLeft(prepareTime); // Set prepare time
      }
      if (prev && currentPhase === 'finished') { // If pausing a finished workout
        stopFinishedLoop();
      }
      return newState;
    });
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentPhase('work'); // This will be immediately overridden by isPreparing to 'prepare' visual
    setCurrentSet(0);
    setCurrentInterval(0);
    setTimeLeft(0); // This will be overridden by the prepare effect to 'prepareTime'
    setIsPreparing(true); // Go back to preparing state
    setShowSettings(true); // Show settings on reset
    // Reset intervals and total sets to initial defaults (important if settings were changed)
    setIntervals([{ workTime: 30, restTime: 15 }]);
    setTotalSets(5);
    setPrepareTime(10);
    stopFinishedLoop(); // Crucial: Stop the looping finished alarm on reset
  };

  const addInterval = () => {
    setIntervals([...intervals, { workTime: 30, restTime: 15 }]);
    // It's generally better not to implicitly call handleReset here.
    // The user will reset if they feel the need after changing settings.
    // if (showSettings === false) handleReset();
  };

  const removeInterval = (index: number) => {
    if (intervals.length > 1) {
      setIntervals(intervals.filter((_, i) => i !== index));
    }
    // if (showSettings === false) handleReset();
  };

  const updateInterval = (index: number, field: 'workTime' | 'restTime', value: number) => {
    const newIntervals = [...intervals];
    newIntervals[index][field] = Math.max(1, value); // Minimum 1 second
    setIntervals(newIntervals);
    // if (showSettings === false) handleReset();
  };

  const handleTotalSetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalSets(Math.max(1, parseInt(e.target.value) || 5));
    // if (showSettings === false) handleReset();
  };

  const handlePrepareTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrepareTime(Math.max(1, parseInt(e.target.value) || 10));
    // if (showSettings === false) handleReset();
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    if (isPreparing) return 'text-blue-600 bg-blue-50 border-blue-200';
    switch (currentPhase) {
      case 'work': return 'text-green-600 bg-green-50 border-green-200';
      case 'rest': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'finished': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseText = () => {
    if (isPreparing) return 'GET READY';
    switch (currentPhase) {
      case 'work': return 'WORK';
      case 'rest': return 'REST';
      case 'finished': return 'FINISHED';
      default: return '';
    }
  };

  const getCurrentIntervalData = useCallback(() => {
    // Ensure intervals[currentInterval] exists to prevent errors
    return intervals[currentInterval] || { workTime: 0, restTime: 0 };
  }, [intervals, currentInterval]);


  return (
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>Interval Timer - Custom Workout Intervals | Timer Central</title>
        <meta name="description" content="A versatile online interval timer to customize your workout sets. Set multiple work and rest intervals, total sets, and prepare time for circuit training."></meta>
      </Helmet>

      <div className="max-w-lg mx-auto p-4 md:p-6 lg:p-8"> {/* Added padding for better mobile view */}
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
          <CardContent className="p-8 text-center">
            {showSettings && isPreparing && !isRunning ? (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Interval Settings</h3>

                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="totalSets" className="text-sm">Total Sets</Label>
                      <Input
                        id="totalSets"
                        type="number"
                        min="1"
                        value={totalSets}
                        onChange={handleTotalSetsChange}
                        className="text-center"
                      />
                    </div>
                    <div>
                      <Label htmlFor="prepareTime" className="text-sm">Prepare Time (s)</Label>
                      <Input
                        id="prepareTime"
                        type="number"
                        min="1"
                        value={prepareTime}
                        onChange={handlePrepareTimeChange}
                        className="text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Intervals</h4>
                    <Button
                      onClick={addInterval}
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>

                  {intervals.map((interval, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium">Interval {index + 1}</span>
                        {intervals.length > 1 && (
                          <Button
                            onClick={() => removeInterval(index)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Work (s)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={interval.workTime}
                            onChange={(e) => updateInterval(index, 'workTime', parseInt(e.target.value) || 30)}
                            className="text-center text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rest (s)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={interval.restTime}
                            onChange={(e) => updateInterval(index, 'restTime', parseInt(e.target.value) || 15)}
                            className="text-center text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className={`text-2xl font-bold mb-2 px-4 py-2 rounded-lg ${getPhaseColor()}`}>
                    {getPhaseText()}
                  </div>
                  {!isPreparing && currentPhase !== 'finished' && (
                    <div className="text-lg text-gray-600">
                      Set {currentSet} of {totalSets} • Interval {currentInterval + 1}
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-gray-500">MM:SS</div>
                </div>

                {!isPreparing && currentPhase !== 'finished' && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          currentPhase === 'work' ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{
                          width: `${currentPhase === 'work'
                            ? ((getCurrentIntervalData().workTime - timeLeft) / getCurrentIntervalData().workTime) * 100
                            : ((getCurrentIntervalData().restTime - timeLeft) / getCurrentIntervalData().restTime) * 100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {!isPreparing && (
                  <div className="mb-6 text-sm text-gray-600">
                    <div className="flex justify-center gap-4">
                      <span>Work: {getCurrentIntervalData().workTime}s</span>
                      <span>Rest: {getCurrentIntervalData().restTime}s</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStart}
                size="lg"
                // The disabled condition needs to be adjusted. If finished, clicking "Start" should reset.
                // It's not disabled, but its action changes.
                // disabled={currentPhase === 'finished' && !isPreparing} // This made it unclickable when finished
                className={`w-16 h-16 rounded-full ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {/* Change button text if finished for clarity */}
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
                  ? '🎉 Interval training complete!'
                  : isRunning
                    ? `${getPhaseText().toLowerCase()}...`
                    : 'Ready to start'
                }
              </p>
            </div>
            {/* Descriptive Text for Interval Timer */}
            <div className="mt-8 text-center text-gray-700 max-w-prose mx-auto">
                <h3 className="text-xl font-semibold mb-2">Master Your Workouts with the Interval Timer</h3>
                <p className="mb-2">
                    The Interval Timer is your essential tool for structured high-intensity interval training (HIIT), circuit training, or any workout requiring precise timed segments. Set custom work and rest periods for multiple intervals, define the total number of sets, and include a preparation countdown to get you ready.
                </p>
                <p>
                    This versatile timer allows you to create dynamic workout routines, ensuring you maximize your effort during work phases and recover effectively during rest periods. Stay on track with clear visual and audio cues, helping you maintain focus and push through every set.
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default IntervalTimer;