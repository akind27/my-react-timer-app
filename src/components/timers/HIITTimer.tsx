import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Pause, RotateCcw, Settings, Zap, Activity } from 'lucide-react';

type Phase = 'prepare' | 'work' | 'rest' | 'finished';

interface HIITProtocol {
  name: string;
  workTime: number;
  restTime: number;
  rounds: number;
  description: string;
}

const hiitProtocols: HIITProtocol[] = [
  { name: 'Classic Tabata', workTime: 20, restTime: 10, rounds: 8, description: '4 minutes of intense training' },
  { name: 'Sprint Intervals', workTime: 30, restTime: 30, rounds: 10, description: 'Balanced work-rest ratio' },
  { name: 'Power Intervals', workTime: 15, restTime: 45, rounds: 8, description: 'Short bursts, long recovery' },
  { name: 'Endurance HIIT', workTime: 45, restTime: 15, rounds: 12, description: 'Longer work periods' },
  { name: 'Quick Burner', workTime: 10, restTime: 20, rounds: 15, description: 'Quick, intense bursts' },
  { name: 'Custom', workTime: 30, restTime: 15, rounds: 8, description: 'Create your own protocol' }
];

function HIITTimer() {
  const [selectedProtocol, setSelectedProtocol] = useState<HIITProtocol>(hiitProtocols[0]);
  const [workTime, setWorkTime] = useState(selectedProtocol.workTime);
  const [restTime, setRestTime] = useState(selectedProtocol.restTime);
  const [rounds, setRounds] = useState(selectedProtocol.rounds);
  const [prepareTime, setPrepareTime] = useState(10);
  
  const [currentRound, setCurrentRound] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('prepare');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (selectedProtocol.name !== 'Custom') {
      setWorkTime(selectedProtocol.workTime);
      setRestTime(selectedProtocol.restTime);
      setRounds(selectedProtocol.rounds);
    }
  }, [selectedProtocol]);

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

  const handleProtocolChange = (protocolName: string) => {
    const protocol = hiitProtocols.find(p => p.name === protocolName) || hiitProtocols[0];
    setSelectedProtocol(protocol);
  };

  const getTotalWorkoutTime = () => {
    const totalTime = prepareTime + (workTime + restTime) * rounds - restTime; // No rest after last round
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'prepare': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'work': return 'text-red-600 bg-red-50 border-red-200';
      case 'rest': return 'text-green-600 bg-green-50 border-green-200';
      case 'finished': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'prepare': return 'GET READY';
      case 'work': return 'HIGH INTENSITY';
      case 'rest': return 'ACTIVE RECOVERY';
      case 'finished': return 'WORKOUT COMPLETE';
      default: return '';
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'work': return <Zap className="w-6 h-6" />;
      case 'rest': return <Activity className="w-6 h-6" />;
      default: return null;
    }
  };

  const getIntensityLevel = () => {
    if (workTime <= 15) return 'EXTREME';
    if (workTime <= 25) return 'HIGH';
    if (workTime <= 35) return 'MODERATE';
    return 'ENDURANCE';
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className={`shadow-xl transition-colors border-2 ${getPhaseColor()}`}>
        <CardContent className="p-8 text-center">
          {showSettings && currentPhase === 'prepare' && !isRunning ? (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">HIIT Protocol</h3>
              
              <div className="mb-6">
                <Label htmlFor="protocol" className="text-sm">Choose Protocol</Label>
                <Select value={selectedProtocol.name} onValueChange={handleProtocolChange}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hiitProtocols.map(protocol => (
                      <SelectItem key={protocol.name} value={protocol.name}>
                        {protocol.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedProtocol.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="workTime" className="text-sm">Work Time (sec)</Label>
                  <Input
                    id="workTime"
                    type="number"
                    min="5"
                    max="300"
                    value={workTime}
                    onChange={(e) => setWorkTime(Math.max(5, Math.min(300, parseInt(e.target.value) || 20)))}
                    className="text-center"
                    disabled={selectedProtocol.name !== 'Custom'}
                  />
                </div>
                <div>
                  <Label htmlFor="restTime" className="text-sm">Rest Time (sec)</Label>
                  <Input
                    id="restTime"
                    type="number"
                    min="5"
                    max="180"
                    value={restTime}
                    onChange={(e) => setRestTime(Math.max(5, Math.min(180, parseInt(e.target.value) || 10)))}
                    className="text-center"
                    disabled={selectedProtocol.name !== 'Custom'}
                  />
                </div>
                <div>
                  <Label htmlFor="rounds" className="text-sm">Rounds</Label>
                  <Input
                    id="rounds"
                    type="number"
                    min="1"
                    max="30"
                    value={rounds}
                    onChange={(e) => setRounds(Math.max(1, Math.min(30, parseInt(e.target.value) || 8)))}
                    className="text-center"
                    disabled={selectedProtocol.name !== 'Custom'}
                  />
                </div>
                <div>
                  <Label htmlFor="prepareTime" className="text-sm">Prepare (sec)</Label>
                  <Input
                    id="prepareTime"
                    type="number"
                    min="5"
                    max="60"
                    value={prepareTime}
                    onChange={(e) => setPrepareTime(Math.max(5, Math.min(60, parseInt(e.target.value) || 10)))}
                    className="text-center"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span>Total Workout Time:</span>
                  <span className="font-bold">{getTotalWorkoutTime()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Intensity Level:</span>
                  <span className={`font-bold ${
                    getIntensityLevel() === 'EXTREME' ? 'text-red-600' :
                    getIntensityLevel() === 'HIGH' ? 'text-orange-600' :
                    getIntensityLevel() === 'MODERATE' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {getIntensityLevel()}
                  </span>
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
              
              {currentPhase !== 'finished' && currentPhase !== 'prepare' && (
                <>
                  <div className="mb-6">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ${
                          currentPhase === 'work' ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${currentPhase === 'work' 
                            ? ((workTime - timeLeft) / workTime) * 100
                            : ((restTime - timeLeft) / restTime) * 100
                          }%`
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6 text-sm text-gray-600">
                    <div className="flex justify-center gap-6">
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{workTime}s</div>
                        <div>Work</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{restTime}s</div>
                        <div>Rest</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {currentRound > 0 && currentPhase !== 'finished' && (
                <div className="mb-6">
                  <div className="flex justify-center gap-1">
                    {Array.from({ length: rounds }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < currentRound - 1
                            ? 'bg-purple-500'
                            : i === currentRound - 1
                              ? currentPhase === 'work' 
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-green-500 animate-pulse'
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
                ? '🔥 HIIT workout crushed! Amazing work!' 
                : isRunning 
                  ? currentPhase === 'work' 
                    ? 'Push yourself! 💪' 
                    : currentPhase === 'rest' 
                      ? 'Keep moving, stay loose 🚶‍♂️'
                      : 'Get ready to dominate!'
                  : 'Ready to unleash the intensity'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HIITTimer;