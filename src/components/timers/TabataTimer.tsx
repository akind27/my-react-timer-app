// src/components/timers/TabataTimer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async'; // <--- NEW IMPORT for Helmet
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';

type Phase = 'prepare' | 'work' | 'rest' | 'finished';

function TabataTimer() {
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [prepareTime, setPrepareTime] = useState(10);

  const [currentRound, setCurrentRound] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('prepare');
  const [timeLeft, setTimeLeft] = useState(0); // Initialized to 0, will be set by handleStart/reset
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio context for phase transitions
    audioRef.current = new Audio();
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
      // If timeLeft reaches 0 while running, ensure phase transition happens
      if (isRunning && timeLeft === 0 && currentPhase !== 'finished') {
          handlePhaseTransition();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, currentPhase, currentRound, rounds, workTime, restTime, prepareTime]); // Added all dependencies for logic

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(error => {
        console.error('Error playing sound:', error);
      });
    }
  };

  const handlePhaseTransition = () => {
    playSound();

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
  };

  const handleStart = () => {
    if (currentPhase === 'finished' || (currentPhase === 'prepare' && timeLeft === 0)) {
      // If finished, or starting from fresh prepare state, initialize prepare time and start
      setTimeLeft(prepareTime);
      setCurrentPhase('prepare'); // Ensure phase is 'prepare' if starting fresh or restarting after finish
      setCurrentRound(0); // Reset rounds
      setIsRunning(true);
      setShowSettings(false);
    } else {
      // Otherwise, just toggle running state
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(0); // Reset time to 0, it will be set to prepareTime on next start
    setShowSettings(true);
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'prepare': return 'text-blue-600 bg-blue-50 border-blue-200'; // Added border color
      case 'work': return 'text-green-600 bg-green-50 border-green-200'; // Added border color
      case 'rest': return 'text-orange-600 bg-orange-50 border-orange-200'; // Added border color
      case 'finished': return 'text-purple-600 bg-purple-50 border-purple-200'; // Added border color
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
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>Tabata Timer - High-Intensity Interval Training | Timer Central</title>
        <meta name="description" content="A simple online Tabata timer for your high-intensity interval training workouts. Customize work, rest, rounds, and prepare time."></meta>
        {/* You can add more meta tags here if needed for Tabata Timer */}
      </Helmet>

      <div className="max-w-md mx-auto">
        <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}> {/* Added border-2 here */}
          <CardContent className="p-8 text-center">
            {showSettings && currentPhase === 'prepare' && !isRunning ? (
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
                disabled={currentPhase === 'finished' && !showSettings} // Disable if finished and settings not shown (meaning, can't start again from finished unless settings are open to reset)
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