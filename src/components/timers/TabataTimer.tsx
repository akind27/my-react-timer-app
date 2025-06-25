// src/components/timers/TabataTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

type Phase = 'prepare' | 'work' | 'rest' | 'finished';

function TabataTimer() {
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [prepareTime, setPrepareTime] = useState(10);

  const [currentRound, setCurrentRound] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('prepare');
  const [timeLeft, setTimeLeft] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const finishedAlarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Direct HTMLAudioElement references ---
  const transitionAudioRef = useRef<HTMLAudioElement | null>(null);
  const finishedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements once on component mount
  useEffect(() => {
    console.log("[Init Effect] Initializing audio elements.");
    
    // Initialize transition sound
    if (!transitionAudioRef.current) {
        transitionAudioRef.current = new Audio('/sounds/Bell1.mp3'); 
        transitionAudioRef.current.volume = 0.7; 
        transitionAudioRef.current.preload = 'auto'; 
        transitionAudioRef.current.load();
    }

    // Initialize finished alarm sound
    if (!finishedAudioRef.current) {
        finishedAudioRef.current = new Audio('/sounds/Bell1.mp3'); 
        finishedAudioRef.current.volume = 0.7;
        finishedAudioRef.current.loop = true; 
        finishedAudioRef.current.preload = 'auto';
        finishedAudioRef.current.load();
    }

    // Component unmount cleanup
    return () => {
      console.log("[Component Unmount Cleanup] Stopping all sounds.");
      if (transitionAudioRef.current) {
        transitionAudioRef.current.pause();
        transitionAudioRef.current.currentTime = 0;
      }
      if (finishedAudioRef.current) {
        finishedAudioRef.current.pause();
        finishedAudioRef.current.currentTime = 0;
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (finishedAlarmIntervalRef.current) clearInterval(finishedAlarmIntervalRef.current);
    };
  }, []); // Runs once on mount, cleanup on unmount

  // Function to play a single transition sound
  const playTransitionSound = useCallback(() => {
    if (transitionAudioRef.current) {
      transitionAudioRef.current.pause(); // Stop current if any
      transitionAudioRef.current.currentTime = 0; // Rewind
      transitionAudioRef.current.play().catch(e => console.error("Transition sound play failed:", e));
      console.log("Playing transition sound.");
    } else {
        console.log("Transition audio ref not ready.");
    }
  }, []);

  // Function to start the finished looping sound
  const startFinishedLoop = useCallback(() => {
    if (finishedAudioRef.current) {
      finishedAudioRef.current.play().catch(e => {
        console.error("Finished sound loop play failed (likely autoplay block):", e);
      });
      console.log("Starting finished loop sound.");
    } else {
        console.log("Finished audio ref not ready.");
    }
  }, []);

  // NEW: Function to explicitly stop the finished looping sound
  const stopFinishedLoop = useCallback(() => {
    console.log("Stopping finished loop sound.");
    if (finishedAlarmIntervalRef.current) {
      clearInterval(finishedAlarmIntervalRef.current);
      finishedAlarmIntervalRef.current = null;
    }
    if (finishedAudioRef.current) {
      finishedAudioRef.current.pause();
      finishedAudioRef.current.currentTime = 0;
    }
  }, []);

  // Function to stop all sounds (both transition and finished loop)
  // This is primarily for user-initiated actions (start, pause, reset, settings)
  const stopAllSounds = useCallback(() => {
    console.log("Stopping all sounds (user action/general cleanup).");
    if (transitionAudioRef.current) {
      transitionAudioRef.current.pause();
      transitionAudioRef.current.currentTime = 0;
    }
    // Call the specific stop function for finished loop
    stopFinishedLoop(); 
  }, [stopFinishedLoop]);

  // --- Sound Management for "Finished" Looping Alarm ONLY ---
  useEffect(() => {
    console.log(`[Sound Effect - Finished Loop] Current Phase: ${currentPhase}, Is Running: ${isRunning}`);
    
    if (currentPhase === 'finished' && !isRunning) {
      console.log("[Sound Effect - Finished Loop] Activating finished alarm loop.");
      startFinishedLoop(); // Start the audio

      // Setup interval to keep it playing (browser safeguard)
      if (finishedAlarmIntervalRef.current) {
        clearInterval(finishedAlarmIntervalRef.current);
      }
      finishedAlarmIntervalRef.current = setInterval(() => {
        console.log("[Sound Effect - Finished Loop] Re-triggering finished alarm in loop (safety measure).");
        startFinishedLoop();
      }, 4000); 
    } else {
      // If we are no longer in the 'finished' phase (or are running again), stop the finished loop
      console.log("[Sound Effect - Finished Loop] Deactivating finished alarm loop (if active).");
      stopFinishedLoop(); // Use the dedicated stop function
    }
  }, [currentPhase, isRunning, startFinishedLoop, stopFinishedLoop]); // Dependencies

  // --- Phase Transition Logic ---
  const handlePhaseTransition = useCallback(() => {
    console.log(`[Phase Transition] Triggered. From: ${currentPhase}, Round: ${currentRound}`);

    // Play sound immediately when transition is *about* to happen
    playTransitionSound(); 

    setCurrentPhase(prevPhase => {
      let nextPhase: Phase = prevPhase;
      let nextTimeLeft: number = 0;
      let nextRound: number = currentRound;

      if (prevPhase === 'prepare') {
        nextPhase = 'work';
        nextRound = 1;
        nextTimeLeft = workTime;
      } else if (prevPhase === 'work') {
        if (currentRound >= rounds) {
          nextPhase = 'finished';
          setIsRunning(false); // Stop running when entire workout is finished
          nextTimeLeft = 0;
        } else {
          nextPhase = 'rest';
          nextTimeLeft = restTime;
        }
      } else if (prevPhase === 'rest') {
        nextPhase = 'work';
        nextRound = currentRound + 1;
        nextTimeLeft = workTime;
      }

      console.log(`[Phase Transition] New Phase: ${nextPhase}, Next Time: ${nextTimeLeft}, Next Round: ${nextRound}`);
      setCurrentRound(nextRound);
      setTimeLeft(nextTimeLeft);
      return nextPhase;
    });
  }, [workTime, restTime, rounds, currentRound, playTransitionSound, currentPhase]);


  // --- Main timer logic effect ---
  useEffect(() => {
    console.log(`[Timer Effect] Running: ${isRunning}, TimeLeft: ${timeLeft}, Phase: ${currentPhase}`);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isRunning && currentPhase !== 'finished') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          console.log(`[Timer Interval] Decrementing from: ${prevTime}`);
          if (prevTime <= 1) { 
            console.log("[Timer Interval] Time hit 1 or 0, triggering phase transition.");
            handlePhaseTransition(); 
            return 0; 
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      console.log("[Timer Effect Cleanup] Clearing interval.");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, currentPhase, handlePhaseTransition]); 


  // Effect to update timeLeft when settings change
  useEffect(() => {
    console.log(`[Settings Effect] Running: ${isRunning}, ShowSettings: ${showSettings}`);
    if (!isRunning && showSettings) {
      setTimeLeft(prepareTime);
      setCurrentPhase('prepare');
      setCurrentRound(0);
      stopAllSounds(); // Explicitly stop all sounds if settings are changed
    }
  }, [prepareTime, isRunning, showSettings, stopAllSounds]);


  // Handle input changes - always pause timer and stop all sound when settings are adjusted
  const handleSettingsChange = useCallback(() => {
    console.log("[Settings Change] Detected. Pausing timer and stopping sounds.");
    setIsRunning(false);
    setShowSettings(true); 
    stopAllSounds(); 
  }, [stopAllSounds]);


  const handleStart = () => {
    console.log(`[Handle Start] Before: IsRunning: ${isRunning}, Phase: ${currentPhase}, TimeLeft: ${timeLeft}, ShowSettings: ${showSettings}`);
    if (!isRunning) { 
      if (currentPhase === 'finished' || (showSettings && timeLeft === prepareTime && currentPhase === 'prepare')) {
        console.log("[Handle Start] Resetting for a new start.");
        setCurrentPhase('prepare');
        setCurrentRound(0);
        setTimeLeft(prepareTime);
      }
      setIsRunning(true);
      setShowSettings(false); 
      stopAllSounds(); // Ensure any existing sound is off when user starts/restarts
    } else { 
      console.log("[Handle Start] Pausing timer.");
      setIsRunning(false);
      stopAllSounds(); // Stop all sounds when pausing
    }
    console.log(`[Handle Start] After: IsRunning: ${isRunning}`);
  };

  const handleReset = () => {
    console.log("[Handle Reset] Resetting timer.");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(prepareTime); 
    setShowSettings(true); 
    stopAllSounds(); // Crucial: Stop all sounds on reset
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
        return 100;
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

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8">
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
          <CardContent className="p-8 text-center">
            {showSettings && !isRunning ? (
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
                      onChange={(e) => { setWorkTime(Math.max(1, parseInt(e.target.value) || 20)); handleSettingsChange(); }}
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
                      onChange={(e) => { setRestTime(Math.max(1, parseInt(e.target.value) || 10)); handleSettingsChange(); }}
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
                      onChange={(e) => { setRounds(Math.max(1, parseInt(e.target.value) || 8)); handleSettingsChange(); }}
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
                      onChange={(e) => { setPrepareTime(Math.max(1, parseInt(e.target.value) || 10)); handleSettingsChange(); }}
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
                          currentPhase === 'rest' ? 'bg-orange-500' : 'bg-blue-500'
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

            {/* TEMPORARY DEBUG BUTTON FOR SOUND */}
            <Button
              onClick={() => {
                console.log("TEST BUTTON: Clicked.");
                if (transitionAudioRef.current) {
                  transitionAudioRef.current.pause();
                  transitionAudioRef.current.currentTime = 0;
                  transitionAudioRef.current.play().catch(e => console.error("TEST BUTTON: Test sound play failed:", e));
                  console.log("TEST BUTTON: Playing direct sound.");
                } else {
                  console.log("TEST BUTTON: Audio ref not initialized.");
                }
              }}
              className="mt-4 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-md"
            >
              Test Sound Directly
            </Button>
            {/* END TEMPORARY DEBUG BUTTON */}

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

            <div className="mt-8 text-center text-gray-700 max-w-prose mx-auto">
                <h3 className="text-xl font-semibold mb-2">Maximize Your HIIT with Our Tabata Timer</h3>
                <p className="mb-2">
                    Our Tabata Timer is specifically designed for high-intensity interval training (HIIT) workouts. It guides you through the classic Tabata protocol: 20 seconds of intense work followed by 10 seconds of rest, repeated for 8 rounds. This method is incredibly effective for improving cardiovascular fitness and burning fat in a short amount of time.
                </p>
                <p>
                    You can easily customize your work, rest, and round durations to fit any HIIT routine, from strength training to cardio. The clear phase indicators and audible alarms ensure you stay on track, making your workouts more effective and structured. Get ready to push your limits and achieve your fitness goals with precision timing!
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default TabataTimer;