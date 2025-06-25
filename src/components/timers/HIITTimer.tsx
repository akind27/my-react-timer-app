// src/components/timers/HIITTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Play, Pause, RotateCcw, Settings, Zap, Activity } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

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

  // Refs for intervals, one for the main game timer, one for the game-over alarm loop
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


  // Effect to update initial settings when time control changes
  useEffect(() => {
    if (selectedProtocol.name !== 'Custom') {
      setWorkTime(selectedProtocol.workTime);
      setRestTime(selectedProtocol.restTime);
      setRounds(selectedProtocol.rounds);
    }
    // Also reset the timer when protocol changes
    handleReset();
  }, [selectedProtocol]); // Added handleReset to dependency array

  // Main game logic effect
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
  }, [isRunning, timeLeft, currentPhase, workTime, restTime, rounds, handlePhaseTransition, startAlarmLoop, stopAlarmLoop]); // Add all dependencies for logic


  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // Use global alarm for phase transitions

    if (currentPhase === 'prepare') {
      setCurrentPhase('work');
      setCurrentRound(1);
      setTimeLeft(workTime);
    } else if (currentPhase === 'work') {
      if (currentRound >= rounds) {
        setCurrentPhase('finished');
        setIsRunning(false);
        setTimeLeft(0);
        startAlarmLoop(); // Game finished, start looping alarm
      } else {
        setCurrentPhase('rest');
        setTimeLeft(restTime);
      }
    } else if (currentPhase === 'rest') {
      setCurrentPhase('work');
      setCurrentRound(prev => prev + 1);
      setTimeLeft(workTime);
    }
  }, [currentPhase, currentRound, rounds, workTime, restTime, playAlarm, startAlarmLoop]); // Add useCallback dependencies


  const handleStart = () => {
    if (currentPhase === 'prepare' && !isRunning && timeLeft === 0) {
      setTimeLeft(prepareTime);
      setIsRunning(true);
      setShowSettings(false);
      stopAlarmLoop(); // Ensure alarm is off when starting
    } else if (currentPhase !== 'finished') {
      setIsRunning(prev => !prev);
      if (isRunning) { // If it was running and is now paused
        stopAlarmLoop();
      } else { // If it was paused and is now starting/resuming
        // No sound here, sound is handled by phase transitions
      }
    }
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(0);
    setShowSettings(true);
    // Reset work/rest/rounds to selected protocol's initial values
    setWorkTime(selectedProtocol.workTime);
    setRestTime(selectedProtocol.restTime);
    setRounds(selectedProtocol.rounds);
    setPrepareTime(10); // Reset prepare time to default
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
  };

  const handleProtocolChange = (protocolName: string) => {
    const protocol = hiitProtocols.find(p => p.name === protocolName) || hiitProtocols[0];
    setSelectedProtocol(protocol);
    // State will be reset by the useEffect that watches selectedProtocol
  };

  // Handlers for custom time inputs to update protocol to 'Custom'
  const handleWorkTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(5, Math.min(300, parseInt(e.target.value) || 20));
    setWorkTime(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom', workTime: value });
    }
  };

  const handleRestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(5, Math.min(180, parseInt(e.target.value) || 10));
    setRestTime(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom', restTime: value });
    }
  };

  const handleRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(30, parseInt(e.target.value) || 8));
    setRounds(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom', rounds: value });
    }
  };

  const handlePrepareTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(5, Math.min(60, parseInt(e.target.value) || 10));
    setPrepareTime(value);
    if (selectedProtocol.name !== 'Custom') {
      // If user changes prepare time, it's also a custom setup (though not strictly part of protocol obj)
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom' });
    }
  };


  const getTotalWorkoutTime = () => {
    // Total time = prepare + (work * rounds) + (rest * (rounds - 1))
    // If only 1 round, restTime is not added
    const totalTimeInSeconds = prepareTime + (workTime * rounds) + (rounds > 1 ? restTime * (rounds - 1) : 0);
    const minutes = Math.floor(totalTimeInSeconds / 60);
    const seconds = totalTimeInSeconds % 60;
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
    // Calculate effective work-to-rest ratio for rounds
    const totalWorkInRounds = workTime * rounds;
    const totalRestInRounds = restTime * (rounds > 1 ? rounds - 1 : 0);
    const totalActiveTime = totalWorkInRounds + totalRestInRounds;

    if (totalActiveTime === 0) return 'N/A'; // Avoid division by zero

    const workRatio = totalWorkInRounds / totalActiveTime;

    // Define thresholds based on work time and work ratio
    if (workTime <= 20 && workRatio >= 0.6) return 'EXTREME'; // Very short work, high ratio (e.g., Tabata)
    if (workTime <= 30 && workRatio >= 0.5) return 'HIGH';    // Shorter work, balanced ratio
    if (workTime <= 45 && workRatio >= 0.4) return 'MODERATE'; // Moderate work, moderate ratio
    return 'ENDURANCE'; // Longer work, or lower work ratio
  };

  return (
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>HIIT Timer - High-Intensity Interval Training | Timer Central</title>
        <meta name="description" content="Free online HIIT timer for high-intensity interval training workouts. Customize work, rest, rounds, and prepare times for Tabata, sprint, and endurance intervals."></meta>
      </Helmet>

      <div className="max-w-md mx-auto p-4 md:p-6 lg:p-8">
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
                      onChange={handleWorkTimeChange}
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
                      onChange={handleRestTimeChange}
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
                      onChange={handleRoundsChange}
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
                      onChange={handlePrepareTimeChange}
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
                              ? 'bg-purple-500' // Completed rounds
                              : i === currentRound - 1
                                ? currentPhase === 'work'
                                  ? 'bg-red-500 animate-pulse' // Current work round
                                  : 'bg-green-500 animate-pulse' // Current rest round
                                : 'bg-gray-300' // Future rounds
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

              {!showSettings && currentPhase === 'prepare' && (
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
    </>
  );
}

export default HIITTimer;