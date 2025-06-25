// src/components/timers/TabataTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

type Phase = 'prepare' | 'work' | 'rest' | 'finished';

function TabataTimer() {
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [prepareTime, setPrepareTime] = useState(10);

  const [currentRound, setCurrentRound] = useState(0); // 0 for prepare, then 1 to 'rounds'
  const [currentPhase, setCurrentPhase] = useState<Phase>('prepare');
  const [timeLeft, setTimeLeft] = useState(10); // Initialized to prepareTime
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

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


  // Effect to update timeLeft when settings change, but only if not running and settings are shown
  useEffect(() => {
    if (!isRunning && showSettings) {
      setTimeLeft(prepareTime); // When settings are shown, display prepare time
    }
  }, [prepareTime, isRunning, showSettings]);

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
      if (isRunning && timeLeft === 0 && currentPhase !== 'finished') {
          handlePhaseTransition(); // Ensure transition if timer hits 0
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
  }, [isRunning, timeLeft, currentPhase, currentRound, rounds, workTime, restTime, prepareTime, handlePhaseTransition, startAlarmLoop, stopAlarmLoop]); // Added all necessary dependencies


  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use global alarm for phase transitions

    if (currentPhase === 'prepare') {
      setCurrentPhase('work');
      setCurrentRound(1); // Start with Round 1
      setTimeLeft(workTime);
    } else if (currentPhase === 'work') {
      // If this was the last work round, finish
      if (currentRound >= rounds) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
      } else {
        // Otherwise, go to rest
        setCurrentPhase('rest');
        setTimeLeft(restTime);
      }
    } else if (currentPhase === 'rest') {
      // After rest, go to the next work round
      setCurrentPhase('work');
      setCurrentRound(prev => prev + 1);
      setTimeLeft(workTime);
    }
  }, [currentPhase, currentRound, rounds, workTime, restTime, playAlarm]);

  const handleStart = () => {
    if (currentPhase === 'finished' || (currentPhase === 'prepare' && !isRunning && timeLeft === 0)) {
        // If finished, or starting fresh from prepare with timeLeft at 0, reset and start
        setCurrentPhase('prepare');
        setCurrentRound(0); // Reset rounds
        setTimeLeft(prepareTime); // Set initial prepare time
        setIsRunning(true);
        setShowSettings(false);
    } else if (showSettings) {
        // If settings are currently visible, and we're clicking start for the first time
        // hide settings and start the timer with prepare time.
        setShowSettings(false);
        setIsRunning(true);
        setCurrentPhase('prepare');
        setTimeLeft(prepareTime);
    }
    else {
      // Otherwise, just toggle running state (pause/resume)
      setIsRunning(prev => !prev);
    }
  };


  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(prepareTime); // Reset to the initial prepareTime for consistency
    setShowSettings(true);
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'prepare': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'work': return 'text-green-600 bg-green-50 border-green-200';
      case 'rest': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'finished': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'prepare': return 'GET READY';
      case 'work': return 'WORK';
      case 'rest': return 'REST';
      case 'finished': return 'FINISHED';
      default: return '';
    }
  };

  // Function to calculate progress percentage for the progress bar
  const calculateProgress = () => {
    let totalTimeForPhase = 0;
    let elapsedTimeInPhase = 0;

    switch (currentPhase) {
      case 'prepare':
        totalTimeForPhase = prepareTime;
        elapsedTimeInPhase = prepareTime - timeLeft;
        break;
      case 'work':
        totalTimeForPhase = workTime;
        elapsedTimeInPhase = workTime - timeLeft;
        break;
      case 'rest':
        totalTimeForPhase = restTime;
        elapsedTimeInPhase = restTime - timeLeft;
        break;
      case 'finished':
        return 100; // Timer is finished, so progress is 100%
      default:
        return 0;
    }
    return totalTimeForPhase > 0 ? (elapsedTimeInPhase / totalTimeForPhase) * 100 : 0;
  };

  return (
    <>
      <Helmet>
        <title>Tabata Timer - High-Intensity Interval Training | Timer Central</title>
        <meta name="description" content="A simple online Tabata timer for your high-intensity interval training workouts. Customize work, rest, rounds, and prepare time."></meta>
      </Helmet>

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8"> {/* Added padding for better mobile view */}
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
          <CardContent className="p-8 text-center">
            {showSettings && currentPhase === 'prepare' && !isRunning ? ( // Only show settings if in prepare phase, not running
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Tabata Settings</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="workTime" className="text-sm">Work (seconds)</Label>
                    <Input
                      id="workTime"
                      type="number"
                      min="1"
                      value={workTime}
                      onChange={(e) => setWorkTime(Math.max(1, parseInt(e.target.value) || 20))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restTime" className="text-sm">Rest (seconds)</Label>
                    <Input
                      id="restTime"
                      type="number"
                      min="1"
                      value={restTime}
                      onChange={(e) => setRestTime(Math.max(1, parseInt(e.target.value) || 10))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rounds" className="text-sm">Rounds</Label>
                    <Input
                      id="rounds"
                      type="number"
                      min="1"
                      value={rounds}
                      onChange={(e) => setRounds(Math.max(1, parseInt(e.target.value) || 8))}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prepareTime" className="text-sm">Prepare (seconds)</Label>
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
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className={`text-2xl font-bold mb-2 px-4 py-2 rounded-lg ${getPhaseColor()}`}>
                    {getPhaseText()}
                  </div>
                  {currentPhase !== 'prepare' && currentPhase !== 'finished' && (
                    <div className="text-lg text-gray-600">
                      Round {currentRound} of {rounds}
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
                    {timeLeft.toString().padStart(2, '0')}
                  </div>
                  <div className="text-gray-500">seconds</div>
                </div>

                {currentPhase !== 'finished' && (
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          currentPhase === 'work' ? 'bg-green-500' :
                          currentPhase === 'rest' ? 'bg-orange-500' : 'bg-blue-500' // prepare color for progress bar
                        }`}
                        style={{
                          width: `${calculateProgress()}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-center gap-4">
              <Button
                onClick={handleStart}
                size="lg"
                // Disable if finished and settings not shown (meaning, can't start again from finished unless settings are open to reset)
                disabled={currentPhase === 'finished' && !showSettings && !isRunning}
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
              {!isRunning && !showSettings && (currentPhase !== 'finished' || showSettings)} {/* Show if not running AND settings are hidden, OR if it's finished but settings are shown */}
              {/* Refined condition for settings button visibility: Only show if NOT running AND settings are NOT visible. */}
              {/* Also ensure it doesn't show up if we're in 'finished' state and haven't pressed reset yet to bring back settings */}
              {!isRunning && !showSettings && (currentPhase !== 'finished' || (currentPhase === 'finished' && showSettings))}
              {currentPhase !== 'finished' && !isRunning && !showSettings && (
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
                  ? '🎉 Tabata workout complete!'
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

export default TabataTimer;