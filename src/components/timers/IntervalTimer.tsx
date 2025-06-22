// src/components/timers/IntervalTimer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async'; // <--- NEW IMPORT for Helmet
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react'; // Removed Settings as it's not used directly as an icon, but as part of showSettings logic

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
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSWFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGWi77eefTQwMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606eulVRQKRp/g8r5h';

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
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, isPreparing, currentPhase, currentSet, totalSets, intervals]); // Add all dependencies for logic

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

    if (isPreparing) {
      setIsPreparing(false);
      setCurrentPhase('work');
      setCurrentSet(1); // Start with the first set
      setCurrentInterval(0); // Start with the first interval definition
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
  };

  const handleStart = () => {
    if ((isPreparing || timeLeft === 0) && !isRunning) { // Start prepare or restart if timer finished
      setTimeLeft(prepareTime);
      setIsRunning(true);
      setShowSettings(false);
      if (currentPhase === 'finished') { // If restarting after finished, reset state
        setCurrentPhase('work'); // This will be immediately overridden by isPreparing to 'prepare'
        setCurrentSet(0);
        setCurrentInterval(0);
        setIsPreparing(true); // Ensure prepare phase starts
      }
    } else if (currentPhase !== 'finished') {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase('work'); // Reset to default phase, will be overridden by isPreparing
    setCurrentSet(0);
    setCurrentInterval(0);
    setTimeLeft(0);
    setIsPreparing(true);
    setShowSettings(true);
    // Reset intervals to a default if you want, or keep current custom settings
    // setIntervals([{ workTime: 30, restTime: 15 }]); // Uncomment if you want to reset interval structure
    // setTotalSets(5); // Uncomment if you want to reset total sets
    // setPrepareTime(10); // Uncomment if you want to reset prepare time
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
    newIntervals[index][field] = Math.max(1, value); // Minimum 1 second
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

  const getCurrentIntervalData = () => {
    return intervals[currentInterval] || intervals[0]; // Fallback to first if somehow out of bounds
  };

  return (
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>Interval Timer - Custom Workout Intervals | Timer Central</title>
        <meta name="description" content="A versatile online interval timer to customize your workout sets. Set multiple work and rest intervals, total sets, and prepare time for circuit training."></meta>
        {/* You can add more meta tags here if needed for Interval Timer */}
      </Helmet>

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