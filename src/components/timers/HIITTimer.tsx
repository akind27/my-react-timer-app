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

  // Refs for intervals, one for the main game timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get playAlarm from the global SoundContext for *phase transitions*
  const { playAlarm } = useSound(); // This should be designed to play a single sound once per call.

  // --- Dedicated HTMLAudioElement for the "Finished" Alarm (now plays once) ---
  const finishedAudioRef = useRef<HTMLAudioElement | null>(null);
  // The retry interval ref is no longer strictly needed for a non-looping sound,
  // but we'll keep it for robustness against initial autoplay blocks if needed.
  const finishedAlarmRetryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize finished audio element once on component mount
  useEffect(() => {
    if (!finishedAudioRef.current) {
      // Changed to 'click.mp3' for finished sound as requested, and removed loop
      finishedAudioRef.current = new Audio('/sounds/click.mp3'); // Path to your click sound
      finishedAudioRef.current.volume = 0.7;
      finishedAudioRef.current.loop = false; // IMPORTANT: Now plays ONLY ONCE
      finishedAudioRef.current.preload = 'auto';
    }

    // Component unmount cleanup: stop all sounds and clear intervals
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Ensure the finished alarm is stopped and reset
      if (finishedAudioRef.current) {
        finishedAudioRef.current.pause();
        finishedAudioRef.current.currentTime = 0;
      }
      if (finishedAlarmRetryIntervalRef.current) {
        clearInterval(finishedAlarmRetryIntervalRef.current);
        finishedAlarmRetryIntervalRef.current = null;
      }
    };
  }, []); // Runs once on mount, cleanup on unmount


  // --- Functions for "Finished" Alarm (now plays once) ---
  const startFinishedAlarm = useCallback(() => {
    // Clear any existing retry interval first (if any was set)
    if (finishedAlarmRetryIntervalRef.current) {
      clearInterval(finishedAlarmRetryIntervalRef.current);
      finishedAlarmRetryIntervalRef.current = null;
    }

    if (finishedAudioRef.current) {
      // If it's already playing, stop and reset it before playing again
      if (!finishedAudioRef.current.paused) {
          finishedAudioRef.current.pause();
      }
      finishedAudioRef.current.currentTime = 0; // Ensure it starts from beginning

      finishedAudioRef.current.play().catch(e => {
        // If play fails (e.g., autoplay block), set up a retry interval.
        // This interval will *only* try to play if the audio is paused/ended.
        if (!finishedAlarmRetryIntervalRef.current) { // Prevent setting multiple intervals
          finishedAlarmRetryIntervalRef.current = setInterval(() => {
            if (finishedAudioRef.current && (finishedAudioRef.current.paused || finishedAudioRef.current.ended)) {
              finishedAudioRef.current.currentTime = 0;
              finishedAudioRef.current.play().catch(retryError => {});
            } else {
              // If it starts playing, clear the retry interval, as it only plays once now.
              if (finishedAlarmRetryIntervalRef.current) {
                clearInterval(finishedAlarmRetryIntervalRef.current);
                finishedAlarmRetryIntervalRef.current = null;
              }
            }
          }, 3000); // Check every 3 seconds
        }
      });
    }
  }, []);

  const stopFinishedAlarm = useCallback(() => {
    // Always clear the retry interval first
    if (finishedAlarmRetryIntervalRef.current) {
      clearInterval(finishedAlarmRetryIntervalRef.current);
      finishedAlarmRetryIntervalRef.current = null;
    }
    // Then pause and reset the audio
    if (finishedAudioRef.current) {
      finishedAudioRef.current.pause();
      finishedAudioRef.current.currentTime = 0; // Reset playback position
    }
  }, []);

  // --- Phase Transition Logic ---
  const handlePhaseTransition = useCallback(() => {
    playAlarm(); // This plays the short, single-shot alarm from useSound.

    if (currentPhase === 'prepare') {
      setCurrentPhase('work');
      setCurrentRound(1);
      setTimeLeft(workTime);
    } else if (currentPhase === 'work') {
      if (currentRound >= rounds) {
        setCurrentPhase('finished');
        setIsRunning(false); // Stop the main timer
        setTimeLeft(0);
        // The main useEffect will pick up currentPhase === 'finished' and !isRunning to trigger finished alarm.
      } else {
        setCurrentPhase('rest');
        setTimeLeft(restTime);
      }
    } else if (currentPhase === 'rest') {
      setCurrentPhase('work');
      setCurrentRound(prev => prev + 1);
      setTimeLeft(workTime);
    }
  }, [currentPhase, currentRound, rounds, workTime, restTime, playAlarm]);


  // Effect to update initial settings when protocol changes
  useEffect(() => {
    if (selectedProtocol.name !== 'Custom') {
      setWorkTime(selectedProtocol.workTime);
      setRestTime(selectedProtocol.restTime);
      setRounds(selectedProtocol.rounds);
    }
    handleReset();
  }, [selectedProtocol]);


  // Main timer logic effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopFinishedAlarm(); // Ensure finished alarm is off if timer starts/resumes

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
        intervalRef.current = null;
      }

      if (!isRunning && currentPhase === 'finished') {
        startFinishedAlarm(); // This plays the single-shot finished alarm
      } else {
        stopFinishedAlarm(); // Stop finished alarm if not in finished state or running
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopFinishedAlarm();
    };
  }, [isRunning, timeLeft, currentPhase, workTime, restTime, rounds, handlePhaseTransition, startFinishedAlarm, stopFinishedAlarm]);


  const handleStart = () => {
    if (currentPhase === 'finished' && !isRunning) {
      handleReset();
      setTimeout(() => {
        setTimeLeft(prepareTime);
        setIsRunning(true);
        setShowSettings(false);
      }, 0);
      return;
    }

    if (currentPhase === 'prepare' && !isRunning && timeLeft === 0) {
      setTimeLeft(prepareTime);
      setIsRunning(true);
      setShowSettings(false);
      stopFinishedAlarm(); // Ensure finished alarm is off when starting a new timer
    } else {
      setIsRunning(prev => !prev);
    }
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setCurrentPhase('prepare');
    setCurrentRound(0);
    setTimeLeft(0);
    setShowSettings(true);
    setWorkTime(selectedProtocol.workTime);
    setRestTime(selectedProtocol.restTime);
    setRounds(selectedProtocol.rounds);
    setPrepareTime(10);
    stopFinishedAlarm(); // Crucial: Stop the alarm on reset
  };

  const handleProtocolChange = (protocolName: string) => {
    const protocol = hiitProtocols.find(p => p.name === protocolName) || hiitProtocols[0];
    setSelectedProtocol(protocol);
  };

  const handleWorkTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(5, Math.min(300, parseInt(e.target.value) || 20));
    setWorkTime(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom' });
    }
  };

  const handleRestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(5, Math.min(180, parseInt(e.target.value) || 10));
    setRestTime(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom' });
    }
  };

  const handleRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(30, parseInt(e.target.value) || 8));
    setRounds(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol({ ...selectedProtocol, name: 'Custom' });
    }
  };

  const handlePrepareTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(5, Math.min(60, parseInt(e.target.value) || 10));
    setPrepareTime(value);
    if (selectedProtocol.name !== 'Custom') {
      setSelectedProtocol(prev => ({ ...prev, name: 'Custom' }));
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalWorkoutTime = () => {
    const totalTimeInSeconds = prepareTime + (workTime * rounds) + (rounds > 1 ? restTime * (rounds - 1) : 0);
    return formatTime(totalTimeInSeconds);
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
    const totalWorkInRounds = workTime * rounds;
    const totalRestInRounds = restTime * (rounds > 1 ? rounds - 1 : 0);
    const totalActiveTime = totalWorkInRounds + totalRestInRounds;

    if (totalActiveTime === 0) return 'N/A';

    const workRatio = totalWorkInRounds / totalActiveTime;

    if (workTime <= 20 && workRatio >= 0.6) return 'EXTREME';
    if (workTime <= 30 && workRatio >= 0.5) return 'HIGH';
    if (workTime <= 45 && workRatio >= 0.4) return 'MODERATE';
    return 'ENDURANCE';
  };

  return (
    <>
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
                className={`w-16 h-16 rounded-full ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {currentPhase === 'finished' ? 'Restart' : (isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />)}
              </Button>

              <Button
                onClick={handleReset}
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full"
              >
                <RotateCcw className="w-6 h-6" />
              </Button>

              {!isRunning && showSettings === false && (
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
            <div className="mt-8 text-center text-gray-700 max-w-prose mx-auto">
                <h3 className="text-xl font-semibold mb-2">Unleash Your Potential with the HIIT Timer</h3>
                <p className="mb-2">
                    The HIIT (High-Intensity Interval Training) Timer is your dedicated partner for maximizing calorie burn and boosting endurance. Choose from popular protocols like Tabata or create your custom routine by setting work duration, rest duration, and the number of rounds.
                </p>
                <p>
                    Whether you're a seasoned athlete or just starting your fitness journey, this timer provides clear audio and visual cues to guide you through each intense work period and essential recovery phase. Push your limits and achieve your fitness goals with focused, efficient workouts.
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default HIITTimer;
