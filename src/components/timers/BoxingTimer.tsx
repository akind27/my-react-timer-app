// src/components/timers/BoxingTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths as previously discussed
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings, Bell } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

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

  // Refs for intervals, one for the countdown timer, one for the looping alarm
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmLoopIntervalRef = useRef<NodeJS.Timeout | null>(null); // New ref for alarm loop

  // Get playAlarm and stopAlarm from the SoundContext
  const { playAlarm, stopAlarm } = useSound(); // Use the global sound context

  // --- Alarm Looping Control Functions (Similar to CountdownTimer) ---
  const startAlarmLoop = useCallback(() => {
    // Stop any existing alarm loop first
    if (alarmLoopIntervalRef.current) {
      clearInterval(alarmLoopIntervalRef.current);
    }
    playAlarm(); // Play the alarm immediately

    // Set an interval to re-trigger playAlarm if it stops (browser autoplay policy)
    // Adjust this interval based on the typical length of your alarm sounds (e.g., 3-5 seconds)
    alarmLoopIntervalRef.current = setInterval(() => {
      playAlarm(); // Keep trying to play the alarm
    }, 4000); // Re-trigger every 4 seconds
  }, [playAlarm]);

  const stopAlarmLoop = useCallback(() => {
    if (alarmLoopIntervalRef.current) {
      clearInterval(alarmLoopIntervalRef.current);
      alarmLoopIntervalRef.current = null;
    }
    stopAlarm(); // Call the SoundProvider's stopAlarm to pause/reset audio
  }, [stopAlarm]);

  // Main Effect for Boxing Timer Logic
  useEffect(() => {
    // This useEffect will drive the timer countdown and phase transitions
    if (isRunning && timeLeft > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          const newTime = prevTime - 1;

          // Check for warning signal (if in round and time hits warning threshold)
          if (currentPhase === 'round' && newTime === warningTime && newTime > 0) {
            setShowWarning(true);
            playAlarm(); // Use main alarm sound for warning
            setTimeout(() => setShowWarning(false), 2000); // Hide warning after 2 seconds
          }

          if (newTime <= 0) {
            // Time for current phase is up, handle transition
            handlePhaseTransition();
            return 0; // Set timeLeft to 0 for the completed phase
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      // If timer is paused and it's in a finished state, ensure alarm stops
      if (!isRunning && currentPhase === 'finished') {
        stopAlarmLoop();
      }
    }

    // Cleanup function: Clear countdown interval when component unmounts or deps change
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      // Ensure alarm loop is stopped if the timer component is unmounted
      stopAlarmLoop();
    };
  }, [isRunning, timeLeft, currentPhase, warningTime, playAlarm, handlePhaseTransition, stopAlarmLoop]); // Add dependencies

  // This useEffect will initiate the first phase's timeLeft when settings are applied or reset
  useEffect(() => {
    if (showSettings && currentPhase === 'prepare') {
      setTimeLeft(prepareTime); // Set initial prepare time when settings are visible
      setCurrentRound(0); // Reset round count when in settings
    }
  }, [showSettings, currentPhase, prepareTime]);


  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use main alarm sound for phase transitions

    if (currentPhase === 'prepare') {
      setCurrentPhase('round');
      setCurrentRound(1);
      setTimeLeft(roundTime);
    } else if (currentPhase === 'round') {
      if (currentRound >= totalRounds) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
        startAlarmLoop(); // Start looping alarm when entire fight is finished
      } else {
        setCurrentPhase('rest');
        setTimeLeft(restTime);
      }
    } else if (currentPhase === 'rest') {
      setCurrentPhase('round');
      setCurrentRound(prev => prev + 1);
      setTimeLeft(roundTime);
    }
  }, [currentRound, currentPhase, playAlarm, restTime, roundTime, totalRounds, startAlarmLoop]); // Add dependencies

  const handleStart = () => {
    if (currentPhase === 'finished' && !isRunning) { // If finished, allow restart from prepare
      handleReset(); // Reset before starting a new cycle
      return;
    }

    if (currentPhase === 'prepare' && !isRunning) { // Initial start from prepare phase
      setIsRunning(true);
      setShowSettings(false);
      // setTimeLeft will be set by the useEffect when currentPhase is prepare
    } else if (currentPhase !== 'finished') { // Pause/Resume for other phases
      setIsRunning(!isRunning);
      // If pausing a running timer that has finished, stop the alarm
      if (isRunning && currentPhase === 'finished') {
        stopAlarmLoop();
      }
    }
  };


  const handleReset = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(prepareTime); // Reset to initial prepare time
    setShowWarning(false);
    setShowSettings(true); // Show settings on reset
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
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

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8"> {/* Added padding for better mobile view */}
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
          <CardContent className="p-8 text-center">
            {showSettings && currentPhase === 'prepare' && !isRunning ? (
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
                disabled={currentPhase === 'finished'}
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default BoxingTimer;