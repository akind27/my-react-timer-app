// src/components/timers/IntervalTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

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

  // Effect for main timer logic
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
  }, [isRunning, timeLeft, isPreparing, currentPhase, currentSet, totalSets, intervals, handlePhaseTransition, startAlarmLoop, stopAlarmLoop]); // Add all dependencies

  // This effect ensures initial prepare time is set when entering settings or resetting
  useEffect(() => {
    if (isPreparing && showSettings) {
      setTimeLeft(prepareTime);
    }
  }, [isPreparing, showSettings, prepareTime]);


  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use global alarm for phase transitions

    if (isPreparing) {
      setIsPreparing(false);
      setCurrentSet(1); // Start with the first set
      setCurrentInterval(0); // Start with the first interval definition
      setCurrentPhase('work');
      setTimeLeft(intervals[0].workTime);
    } else if (currentPhase === 'work') {
      setCurrentPhase('rest');
      setTimeLeft(intervals[currentInterval].restTime);
    } else if (currentPhase === 'rest') {
      const nextIntervalIndex = (currentInterval + 1) % intervals.length;

      // If we're at the last interval definition and it's the last set, finish
      if (currentSet >= totalSets && nextIntervalIndex === 0) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
        startAlarmLoop(); // Workout finished, start looping alarm
      } else {
        setCurrentPhase('work');
        setCurrentInterval(nextIntervalIndex);
        setTimeLeft(intervals[nextIntervalIndex].workTime);

        // Increment set only if we're looping back to the first interval definition
        if (nextIntervalIndex === 0) {
          setCurrentSet(prev => prev + 1);
        }
      }
    }
  }, [currentInterval, currentPhase, currentSet, intervals, totalSets, isPreparing, playAlarm, startAlarmLoop]);


  const handleStart = () => {
    if (currentPhase === 'finished' && !isRunning) { // If finished, allow restarting the workout
      handleReset(); // Reset the state to allow a fresh start
      return; // handleReset will trigger the prepare phase
    }

    if ((isPreparing || timeLeft === 0) && !isRunning) { // Start prepare or restart if timer finished
      setTimeLeft(prepareTime); // Ensure prepare time is set
      setIsRunning(true);
      setShowSettings(false);
      setIsPreparing(true); // Explicitly ensure prepare phase starts on first play
      stopAlarmLoop(); // Ensure alarm is off when starting
    } else { // If already running or paused (but not finished)
      setIsRunning(prev => !prev);
      if (isRunning) { // If it was running and is now paused
        stopAlarmLoop(); // Stop alarm if pausing a finished workout
      }
    }
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('work'); // Set to 'work' initially, will be overridden by isPreparing
    setCurrentSet(0);
    setCurrentInterval(0);
    setTimeLeft(0); // Set time left to 0, prepare effect will set it to prepareTime
    setIsPreparing(true); // Go back to preparing state
    setShowSettings(true); // Show settings on reset
    // Reset intervals and total sets to initial defaults
    setIntervals([{ workTime: 30, restTime: 15 }]);
    setTotalSets(5);
    setPrepareTime(10);
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
  };

  const addInterval = () => {
    setIntervals([...intervals, { workTime: 30, restTime: 15 }]);
    if (showSettings === false) handleReset(); // If in active timer, reset on add/remove interval
  };

  const removeInterval = (index: number) => {
    if (intervals.length > 1) {
      setIntervals(intervals.filter((_, i) => i !== index));
    }
    if (showSettings === false) handleReset(); // If in active timer, reset on add/remove interval
  };

  const updateInterval = (index: number, field: 'workTime' | 'restTime', value: number) => {
    const newIntervals = [...intervals];
    newIntervals[index][field] = Math.max(1, value); // Minimum 1 second
    setIntervals(newIntervals);
    if (showSettings === false) handleReset(); // If in active timer, reset on interval value change
  };

  const handleTotalSetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalSets(Math.max(1, parseInt(e.target.value) || 5));
    if (showSettings === false) handleReset(); // Reset if changing during active timer
  };

  const handlePrepareTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrepareTime(Math.max(1, parseInt(e.target.value) || 10));
    if (showSettings === false) handleReset(); // Reset if changing during active timer
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

  const getCurrentIntervalData = () => {
    return intervals[currentInterval] || { workTime: 0, restTime: 0 }; // Return current interval, or fallback
  };

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
                disabled={currentPhase === 'finished' && !isPreparing} // Disable if finished and not in prepare mode to restart
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default IntervalTimer;