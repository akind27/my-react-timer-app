import React, { useState, useEffect, useRef } from 'react';
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
  const [timeLeft, setTimeLeft] = useState(0);
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
          if (prevTime <= 1) {
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
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        console.log('Phase transition');
      });
    }
  };

  const handlePhaseTransition = () => {
    playSound();
    
    if (currentPhase === 'prepare') {
      setCurrentPhase('work');
      setCurrentRound(1);
      setTimeLeft(workTime);
    } else if (currentPhase === 'work') {
      if (currentRound >= rounds) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
      } else {
        setCurrentPhase('rest');
        setTimeLeft(restTime);
      }
    } else if (currentPhase === 'rest') {
      setCurrentPhase('work');
      setCurrentRound(prev => prev + 1);
      setTimeLeft(workTime);
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
    setShowSettings(true);
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'prepare': return 'text-blue-600 bg-blue-50';
      case 'work': return 'text-green-600 bg-green-50';
      case 'rest': return 'text-orange-600 bg-orange-50';
      case 'finished': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
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

  return (
    <div className="max-w-md mx-auto">
      <Card className={`shadow-xl transition-colors ${getPhaseColor()}`}>
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
                        currentPhase === 'rest' ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${currentPhase === 'prepare' 
                          ? ((prepareTime - timeLeft) / prepareTime) * 100
                          : currentPhase === 'work' 
                            ? ((workTime - timeLeft) / workTime) * 100
                            : ((restTime - timeLeft) / restTime) * 100
                        }%`
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
  );
}

export default TabataTimer;