import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings, Plus, Minus } from 'lucide-react';

type Phase = 'work' | 'rest' | 'finished';

interface IntervalSet {
  workTime: number;
  restTime: number;
}

function IntervalTimer() {
  const [intervals, setIntervals] = useState<IntervalSet[]>([
    { workTime: 30, restTime: 15 }
  ]);
  const [totalSets, setTotalSets] = useState(5);
  const [prepareTime, setPrepareTime] = useState(10);
  
  const [currentSet, setCurrentSet] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('work');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [isPreparing, setIsPreparing] = useState(true);
  
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
    
    if (isPreparing) {
      setIsPreparing(false);
      setCurrentPhase('work');
      setCurrentSet(1);
      setCurrentInterval(0);
      setTimeLeft(intervals[0].workTime);
    } else if (currentPhase === 'work') {
      setCurrentPhase('rest');
      setTimeLeft(intervals[currentInterval].restTime);
    } else if (currentPhase === 'rest') {
      if (currentSet >= totalSets) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
      } else {
        setCurrentPhase('work');
        setCurrentSet(prev => prev + 1);
        const nextInterval = (currentInterval + 1) % intervals.length;
        setCurrentInterval(nextInterval);
        setTimeLeft(intervals[nextInterval].workTime);
      }
    }
  };

  const handleStart = () => {
    if (isPreparing && !isRunning && timeLeft === 0) {
      setTimeLeft(prepareTime);
      setIsRunning(true);
      setShowSettings(false);
    } else if (currentPhase !== 'finished') {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('work');
    setCurrentSet(0);
    setCurrentInterval(0);
    setTimeLeft(0);
    setIsPreparing(true);
    setShowSettings(true);
  };

  const addInterval = () => {
    setIntervals([...intervals, { workTime: 30, restTime: 15 }]);
  };

  const removeInterval = (index: number) => {
    if (intervals.length > 1) {
      setIntervals(intervals.filter((_, i) => i !== index));
    }
  };

  const updateInterval = (index: number, field: 'workTime' | 'restTime', value: number) => {
    const newIntervals = [...intervals];
    newIntervals[index][field] = Math.max(1, value);
    setIntervals(newIntervals);
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

  const getCurrentInterval = () => {
    return intervals[currentInterval] || intervals[0];
  };

  return (
    <div className="max-w-lg mx-auto">
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
                      onChange={(e) => setTotalSets(Math.max(1, parseInt(e.target.value) || 5))}
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
                      onChange={(e) => setPrepareTime(Math.max(1, parseInt(e.target.value) || 10))}
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
                          ? ((getCurrentInterval().workTime - timeLeft) / getCurrentInterval().workTime) * 100
                          : ((getCurrentInterval().restTime - timeLeft) / getCurrentInterval().restTime) * 100
                        }%`
                      }}
                    />
                  </div>
                </div>
              )}
              
              {!isPreparing && (
                <div className="mb-6 text-sm text-gray-600">
                  <div className="flex justify-center gap-4">
                    <span>Work: {getCurrentInterval().workTime}s</span>
                    <span>Rest: {getCurrentInterval().restTime}s</span>
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
  );
}

export default IntervalTimer;