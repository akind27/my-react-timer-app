// src/components/timers/ChessTimer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
// Corrected Shadcn UI component paths to relative paths for consistency
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Play, Pause, RotateCcw, Settings, Clock, User } from 'lucide-react';

import { useSound } from '../Router'; // CORRECT IMPORT: Use the global sound context

type Player = 'player1' | 'player2';

interface TimeControl {
  name: string;
  minutes: number;
  increment: number;
  description: string;
}

const timeControls: TimeControl[] = [
  { name: 'Bullet', minutes: 1, increment: 0, description: '1+0 - Lightning fast' },
  { name: 'Bullet Plus', minutes: 1, increment: 1, description: '1+1 - Bullet with increment' },
  { name: 'Blitz', minutes: 3, increment: 0, description: '3+0 - Quick games' },
  { name: 'Blitz Plus', minutes: 3, increment: 2, description: '3+2 - Popular online' },
  { name: 'Rapid', minutes: 10, increment: 0, description: '10+0 - Rapid games' },
  { name: 'Rapid Plus', minutes: 15, increment: 10, description: '15+10 - Tournament style' },
  { name: 'Classical', minutes: 30, increment: 30, description: '30+30 - Classical time' },
  { name: 'Custom', minutes: 5, increment: 0, description: 'Set your own time' }
];

function ChessTimer() {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl>(timeControls[2]);
  const [minutes, setMinutes] = useState(selectedTimeControl.minutes);
  const [increment, setIncrement] = useState(selectedTimeControl.increment);

  const [player1Time, setPlayer1Time] = useState(minutes * 60);
  const [player2Time, setPlayer2Time] = useState(minutes * 60);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [gameFinished, setGameFinished] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true); // Keep local sound toggle

  // Refs for intervals, one for the main game timer, one for the game-over alarm loop
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
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


  // Effect to update initial player times when time control or minutes change
  useEffect(() => {
    setPlayer1Time(minutes * 60);
    setPlayer2Time(minutes * 60);
  }, [minutes]);

  // Main game logic effect
  useEffect(() => {
    if (isRunning && activePlayer && !gameFinished) {
      gameIntervalRef.current = setInterval(() => {
        if (activePlayer === 'player1') {
          setPlayer1Time(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              setGameFinished(true);
              setWinner('player2'); // Player 1 ran out of time, Player 2 wins
              setIsRunning(false);
              startAlarmLoop(); // Game finished, start looping alarm
              return 0;
            }
            // Play low time warning if enabled and time is at 10 seconds or less
            if (newTime === 10 && soundEnabled) {
              playAlarm(); // Use global alarm for low time warning
            }
            return newTime;
          });
        } else { // activePlayer === 'player2'
          setPlayer2Time(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              setGameFinished(true);
              setWinner('player1'); // Player 2 ran out of time, Player 1 wins
              setIsRunning(false);
              startAlarmLoop(); // Game finished, start looping alarm
              return 0;
            }
            // Play low time warning if enabled and time is at 10 seconds or less
            if (newTime === 10 && soundEnabled) {
              playAlarm(); // Use global alarm for low time warning
            }
            return newTime;
          });
        }
      }, 1000);
    } else {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
      // If game is paused and finished, stop alarm loop
      if (!isRunning && gameFinished) {
        stopAlarmLoop();
      }
    }

    // Cleanup function: Clear game interval and stop alarm loop when component unmounts
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
      stopAlarmLoop();
    };
  }, [isRunning, activePlayer, gameFinished, soundEnabled, playAlarm, startAlarmLoop, stopAlarmLoop]); // Add dependencies

  // --- Handlers ---
  const handlePlayerMove = (player: Player) => {
    if (gameFinished) return;

    if (soundEnabled) {
      playAlarm(); // Use global alarm for move sound
    }
    setMoveCount(prev => prev + 1);

    // Add increment time to the player who just moved
    if (increment > 0) {
      if (player === 'player1') {
        setPlayer1Time(prev => prev + increment);
      } else {
        setPlayer2Time(prev => prev + increment);
      }
    }

    // Switch active player
    const nextPlayer = player === 'player1' ? 'player2' : 'player1';
    setActivePlayer(nextPlayer);
    setIsRunning(true);
    setShowSettings(false); // Hide settings once game starts
  };

  const handlePause = () => {
    setIsRunning(!isRunning);
    // If pausing a finished game, stop the alarm
    if (isRunning && gameFinished) {
      stopAlarmLoop();
    }
  };

  const handleReset = () => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
    setIsRunning(false);
    setActivePlayer(null);
    setPlayer1Time(minutes * 60); // Reset to initial time based on settings
    setPlayer2Time(minutes * 60); // Reset to initial time based on settings
    setGameFinished(false);
    setWinner(null);
    setMoveCount(0);
    setShowSettings(true); // Show settings on reset
    stopAlarmLoop(); // Crucial: Stop the alarm loop on reset
  };

  const handleTimeControlChange = (controlName: string) => {
    const control = timeControls.find(tc => tc.name === controlName) || timeControls[0];
    setSelectedTimeControl(control);
    // Reset timer when time control changes
    setIsRunning(false);
    setActivePlayer(null);
    setMinutes(control.minutes); // Update minutes and increment state from new control
    setIncrement(control.increment);
    setPlayer1Time(control.minutes * 60);
    setPlayer2Time(control.minutes * 60);
    setGameFinished(false);
    setWinner(null);
    setMoveCount(0);
    setShowSettings(true); // Show settings again
    stopAlarmLoop(); // Stop any alarm if settings are changed
  };

  // Handler for custom minutes input
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0.5, parseFloat(e.target.value) || 1);
    setMinutes(value);
    // Also update selectedTimeControl to Custom if user manually changes time
    if (selectedTimeControl.name !== 'Custom') {
      setSelectedTimeControl({ name: 'Custom', minutes: value, increment: increment, description: 'Set your own time' });
    }
    handleReset(); // Reset timer when custom minutes change
  };

  // Handler for custom increment input
  const handleIncrementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setIncrement(value);
    // Also update selectedTimeControl to Custom if user manually changes increment
    if (selectedTimeControl.name !== 'Custom') {
      setSelectedTimeControl({ name: 'Custom', minutes: minutes, increment: value, description: 'Set your own time' });
    }
    handleReset(); // Reset timer when custom increment changes
  };

  const formatTime = (timeInSeconds: number) => {
    const absTime = Math.abs(timeInSeconds); // Use absolute time for formatting
    const hours = Math.floor(absTime / 3600);
    const minutes = Math.floor((absTime % 3600) / 60);
    const seconds = absTime % 60;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    let timeString = '';
    if (hours > 0) {
      timeString = `${hours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
      timeString = `${formattedMinutes}:${formattedSeconds}`;
    }

    return timeInSeconds < 0 ? `-${timeString}` : timeString; // Add negative sign if time is negative
  };


  const getPlayerCardStyle = (player: Player) => {
    if (gameFinished) {
      if (winner === player) {
        return 'bg-green-50 border-green-500 border-2';
      } else {
        return 'bg-red-50 border-red-500 border-2';
      }
    } else if (activePlayer === player && isRunning) {
      return 'bg-blue-50 border-blue-500 border-2 shadow-lg';
    } else {
      return 'bg-white border-gray-200 border';
    }
  };

  const isLowTime = (time: number) => time <= 30; // 30 seconds threshold for low time warning

  return (
    <> {/* Use a React Fragment to wrap Helmet and your main div */}
      <Helmet>
        <title>Online Chess Clock & Timer - Blitz, Rapid, Classical | Timer Central</title>
        <meta name="description" content="Play chess with our online chess clock. Features customizable time controls (Blitz, Rapid, Classical), move increments, and sound effects."></meta>
      </Helmet>

      <div className="max-w-lg mx-auto p-4 md:p-6 lg:p-8"> {/* Added padding for better mobile view */}
        {showSettings && !isRunning && moveCount === 0 ? (
          <Card className="shadow-xl mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">Chess Timer Settings</h3>

              <div className="mb-6">
                <Label htmlFor="timeControl" className="text-sm">Time Control</Label>
                <Select value={selectedTimeControl.name} onValueChange={handleTimeControlChange}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeControls.map(control => (
                      <SelectItem key={control.name} value={control.name}>
                        {control.name} - {control.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="minutes" className="text-sm">Time (minutes)</Label>
                  <Input
                    id="minutes"
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={minutes}
                    onChange={handleMinutesChange}
                    className="text-center"
                    disabled={selectedTimeControl.name !== 'Custom'}
                  />
                </div>
                <div>
                  <Label htmlFor="increment" className="text-sm">Increment (seconds)</Label>
                  <Input
                    id="increment"
                    type="number"
                    min="0"
                    value={increment}
                    onChange={handleIncrementChange}
                    className="text-center"
                    disabled={selectedTimeControl.name !== 'Custom'}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="text-sm">Sound Effects</Label>
                <Switch
                  id="sound"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">
                {selectedTimeControl.name} ({minutes}+{increment})
              </span>
            </div>
            {moveCount > 0 && (
              <div className="text-sm text-gray-600">
                Moves: {Math.ceil(moveCount / 2)} • Ply: {moveCount}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Player 2 (Top) */}
          <Card className={`${getPlayerCardStyle('player2')} transition-all duration-200`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="font-semibold">Player 2 (Black)</span>
                </div>
                {winner === 'player2' && <span className="text-green-600 font-bold">WINNER!</span>}
                {winner === 'player1' && <span className="text-red-600 font-bold">TIME OUT</span>}
              </div>

              <div className="text-center">
                <Button
                  onClick={() => handlePlayerMove('player2')}
                  disabled={gameFinished || activePlayer === 'player2'}
                  size="lg"
                  className={`w-full h-12 mb-4 ${
                    activePlayer === 'player2' && isRunning
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {activePlayer === 'player2' && isRunning ? 'Your Turn' : 'Press After Move'}
                </Button>

                <div className={`text-5xl font-mono font-bold mb-4 ${
                  isLowTime(player2Time) && isRunning ? 'text-red-600 animate-pulse' : 'text-gray-900'
                }`}>
                  {formatTime(player2Time)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <div className="flex justify-center gap-4">
            {(isRunning || moveCount > 0) && !gameFinished && (
              <Button
                onClick={handlePause}
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? 'Pause' : 'Resume'}
              </Button>
            )}

            <Button
              onClick={handleReset}
              size="lg"
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>

            {!showSettings && moveCount === 0 && (
              <Button
                onClick={() => setShowSettings(true)}
                size="lg"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            )}
          </div>

          {/* Player 1 (Bottom) */}
          <Card className={`${getPlayerCardStyle('player1')} transition-all duration-200`}>
            <CardContent className="p-6">
              <div className="text-center">
                <Button
                  onClick={() => handlePlayerMove('player1')}
                  disabled={gameFinished || activePlayer === 'player1'}
                  size="lg"
                  className={`w-full h-12 mb-4 ${
                    activePlayer === 'player1' && isRunning
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {activePlayer === 'player1' && isRunning ? 'Your Turn' : 'Press After Move'}
                </Button>

                <div className={`text-5xl font-mono font-bold mb-4 ${
                  isLowTime(player1Time) && isRunning ? 'text-red-600 animate-pulse' : 'text-gray-900'
                }`}>
                  {formatTime(player1Time)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="font-semibold">Player 1 (White)</span>
                </div>
                {winner === 'player1' && <span className="text-green-600 font-bold">WINNER!</span>}
                {winner === 'player2' && <span className="text-red-600 font-bold">TIME OUT</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {gameFinished && (
          <div className="mt-6 text-center">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <h3 className="text-lg font-bold text-yellow-800">Game Over!</h3>
                <p className="text-yellow-700">
                  {winner === 'player1' ? 'Player 1 (White)' : 'Player 2 (Black)'} wins by time!
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {moveCount === 0 && !showSettings && (
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Click a player's button after they make their move to start their opponent's timer.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default ChessTimer;