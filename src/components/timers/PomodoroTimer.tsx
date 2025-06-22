import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings, Coffee, Clock } from 'lucide-react';

type Phase = 'work' | 'shortBreak' | 'longBreak' | 'finished';

function PomodoroTimer() {
  const [workTime, setWorkTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(4);
  
  const [currentSession, setCurrentSession] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<Phase>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setTimeLeft(workTime * 60);
  }, [workTime]);

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
    
    if (currentPhase === 'work') {
      setCompletedSessions(prev => prev + 1);
      const isLongBreak = currentSession % sessionsUntilLongBreak === 0;
      
      if (isLongBreak) {
        setCurrentPhase('longBreak');
        setTimeLeft(longBreakTime * 60);
      } else {
        setCurrentPhase('shortBreak');
        setTimeLeft(shortBreakTime * 60);
      }
    } else {
      setCurrentPhase('work');
      setCurrentSession(prev => prev + 1);
      setTimeLeft(workTime * 60);
    }
  };

  const handleStart = () => {
    setIsRunning(!isRunning);
    setShowSettings(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('work');
    setCurrentSession(1);
    setCompletedSessions(0);
    setTimeLeft(workTime * 60);
    setShowSettings(true);
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
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'work': return 'WORK TIME';
      case 'shortBreak': return 'SHORT BREAK';
      case 'longBreak': return 'LONG BREAK';
      default: return '';
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'work': return <Clock className="w-6 h-6" />;
      case 'shortBreak':
      case 'longBreak': return <Coffee className="w-6 h-6" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-md mx-auto">
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
                <div className="text-sm text-gray-600">
                  Session {currentSession} • {completedSessions} completed
                </div>
              </div>
              
              <div className="mb-8">
                <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-gray-500">MM:SS</div>
              </div>
              
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
              
              {/* Session indicators */}
              <div className="mb-6">
                <div className="flex justify-center gap-1">
                  {Array.from({ length: sessionsUntilLongBreak }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < (currentSession - 1) % sessionsUntilLongBreak
                          ? 'bg-red-500'
                          : i === (currentSession - 1) % sessionsUntilLongBreak && currentPhase === 'work'
                            ? 'bg-red-300 animate-pulse'
                            : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">Sessions until long break</div>
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
            
            {!showSettings && !isRunning && (
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
              {isRunning 
                ? currentPhase === 'work' 
                  ? 'Focus time! 🍅' 
                  : 'Break time! ☕'
                : 'Ready to start your Pomodoro session'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PomodoroTimer;