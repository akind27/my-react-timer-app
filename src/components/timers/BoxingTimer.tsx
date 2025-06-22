// src/components/timers/BoxingTimer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async'; // <--- NEW IMPORT for Helmet
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings, Bell } from 'lucide-react';

type Phase = 'prepare' | 'round' | 'rest' | 'finished';

function BoxingTimer() {
  const [roundTime, setRoundTime] = useState(3 * 60); // 3 minutes in seconds
  const [restTime, setRestTime] = useState(60); // 1 minute in seconds
  const [totalRounds, setTotalRounds] = useState(12);
  const [prepareTime, setPrepareTime] = useState(10);
  const [warningTime, setWarningTime] = useState(10); // Warning before round ends

  const [currentRound, setCurrentRound] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('prepare');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio contexts
    audioRef.current = new Audio();
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGWi77eefTQwMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606eulVRQKRp/g8r5h';

    warningAudioRef.current = new Audio();
    warningAudioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGWi77eefTQwMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606eulVRQKRp/g8r5h';

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
          const newTime = prevTime - 1;

          // Check for warning signal
          if (currentPhase === 'round' && newTime === warningTime && newTime > 0) {
            setShowWarning(true);
            playWarningSound();
            setTimeout(() => setShowWarning(false), 2000);
          }

          if (newTime <= 0) {
            handlePhaseTransition();
            return 0;
          }
          return newTime;
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
  }, [isRunning, timeLeft, currentPhase, warningTime]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        console.log('Phase transition');
      });
    }
  };

  const playWarningSound = () => {
    if (warningAudioRef.current) {
      warningAudioRef.current.currentTime = 0;
      warningAudioRef.current.play().catch(() => {
        console.log('Warning signal');
      });
    }
  };

  const handlePhaseTransition = () => {
    playSound();

    if (currentPhase === 'prepare') {
      setCurrentPhase('round');
      setCurrentRound(1);
      setTimeLeft(roundTime);
    } else if (currentPhase === 'round') {
      if (currentRound >= totalRounds) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
      } else {
        setCurrentPhase('rest');
        setTimeLeft(restTime);
      }
    } else if (currentPhase === 'rest') {
      setCurrentPhase('round');
      setCurrentRound(prev => prev + 1);
      setTimeLeft(roundTime);
    }
  };

  const handleStart = () => {
    if (currentPhase === 'prepare' && !isRunning && timeLeft === 0) {
      setTimeLeft(prepareTime);
      setIsRunning(true);
      setShowSettings(false);
    } else if (currentPhase !== 'finished') {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(0);
    setShowWarning(false);
    setShowSettings(true);
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
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>Boxing Timer - Round-Based Training | Timer Central</title>
        <meta name="description" content="Use our online boxing timer for round-based training, martial arts, and HIIT workouts. Customizable rounds, rest periods, and prepare time."></meta>
        {/* You can add more meta tags here if needed for Boxing Timer */}
      </Helmet>

      <div className="max-w-md mx-auto">
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