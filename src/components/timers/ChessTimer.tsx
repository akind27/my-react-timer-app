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

// No sound imports needed as all sound functionality is removed

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
  const [activePlayer, setActivePlayer] = useState<Player | null>(null); // null means game not started, Player 1 to move
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [gameFinished, setGameFinished] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  // soundEnabled state removed as all sound functionality is removed

  // Ref for the main game timer interval
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // No alarm loop refs or sound functions needed as all sound functionality is removed

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
              setIsRunning(false); // Stop the timer
              return 0;
            }
            return newTime;
          });
        } else { // activePlayer === 'player2'
          setPlayer2Time(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              setGameFinished(true);
              setWinner('player1'); // Player 2 ran out of time, Player 1 wins
              setIsRunning(false); // Stop the timer
              return 0;
            }
            return newTime;
          });
        }
      }, 1000);
    } else {
      // Clear interval if timer is not running or game is finished
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    }

    // Cleanup function: Clear game interval when component unmounts
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    };
  }, [isRunning, activePlayer, gameFinished]); // Dependencies for useEffect

  // --- Handlers ---
  const handlePlayerMove = (player: Player) => {
    if (gameFinished) return; // Do nothing if game is finished

    // If game is just starting (activePlayer is null), set Player 1 as active
    if (activePlayer === null) {
      setActivePlayer('player1'); // Player 1 starts
    } else {
      // It's the current player's turn to make a move and pass the turn
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
    }

    setMoveCount(prev => prev + 1); // Increment move count after each player's press
    setIsRunning(true); // Start/resume the timer
    setShowSettings(false); // Hide settings once game starts
  };

  const handlePause = () => {
    setIsRunning(prev => !prev); // Toggle isRunning state
  };

  const handleReset = () => {
    // Clear the game interval if it's running
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    setIsRunning(false);
    setActivePlayer(null); // Reset to null, allowing Player 1 to start
    setPlayer1Time(minutes * 60); // Reset to initial time based on settings
    setPlayer2Time(minutes * 60); // Reset to initial time based on settings
    setGameFinished(false);
    setWinner(null);
    setMoveCount(0);
    setShowSettings(true); // Show settings on reset
  };

  const handleTimeControlChange = (controlName: string) => {
    const control = timeControls.find(tc => tc.name === controlName) || timeControls[0];
    setSelectedTimeControl(control);
    // When time control changes, reset the timer to apply new times
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
  };

  // Handler for custom minutes input
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0.5, parseFloat(e.target.value) || 1);
    setMinutes(value);
    // Also update selectedTimeControl to Custom if user manually changes time
    if (selectedTimeControl.name !== 'Custom') {
      setSelectedTimeControl({ name: 'Custom', minutes: value, increment: increment, description: 'Set your own time' });
    }
    // No need to call handleReset here, as changing time control or minutes
    // while on 'Custom' should update the display immediately without full reset.
    // However, if the game is in progress and minutes are changed, a reset might be desired.
    // For now, mirroring previous behavior:
    handleReset();
  };

  // Handler for custom increment input
  const handleIncrementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    setIncrement(value);
    // Also update selectedTimeControl to Custom if user manually changes increment
    if (selectedTimeControl.name !== 'Custom') {
      setSelectedTimeControl({ name: 'Custom', minutes: minutes, increment: value, description: 'Set your own time' });
    }
    // Mirroring previous behavior:
    handleReset();
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

              {/* Removed Sound Effects Switch */}
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
                  // Player 2's button is enabled only if it's Player 2's turn and the game is running and not finished
                  disabled={gameFinished || activePlayer !== 'player2' || !isRunning}
                  size="lg"
                  className={`w-full h-12 mb-4 text-white ${
                    activePlayer === 'player2' && isRunning && !gameFinished
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-600 cursor-not-allowed opacity-50' // Disabled style
                  }`}
                >
                  Press After Move
                </Button>

                <div className={`text-5xl font-mono font-bold mb-4 ${
                  player2Time <= 10 && isRunning && activePlayer === 'player2' ? 'text-red-600' : 'text-gray-900' // Highlight if time is low and it's their turn
                }`}>
                  {formatTime(player2Time)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <div className="flex justify-center gap-4">
            {(isRunning || activePlayer !== null) && !gameFinished && ( // Show pause/resume if game is running or has started
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

            {!showSettings && moveCount === 0 && ( // Only show settings button if not running and settings are hidden
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
                  // Player 1's button is enabled if it's their turn OR game hasn't started yet, and not finished
                  disabled={gameFinished || (activePlayer !== 'player1' && activePlayer !== null) || (activePlayer === null && isRunning)}
                  size="lg"
                  className={`w-full h-12 mb-4 text-white ${
                    ((activePlayer === 'player1' || activePlayer === null) && !gameFinished)
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-600 cursor-not-allowed opacity-50' // Disabled style
                  }`}
                >
                  {activePlayer === null && !isRunning && !gameFinished ? 'Start Game (White)' : 'Press After Move'}
                </Button>

                <div className={`text-5xl font-mono font-bold mb-4 ${
                  player1Time <= 10 && isRunning && activePlayer === 'player1' ? 'text-red-600' : 'text-gray-900' // Highlight if time is low and it's their turn
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
            <p>Click Player 1's button to start the game. After each player makes a move, they click their own button to stop their timer and start their opponent's.</p>
          </div>
        )}

        {/* Added descriptive text about Blitz games */}
        <div className="mt-8 text-center text-gray-700 max-w-prose mx-auto">
            <h3 className="text-xl font-semibold mb-2">Dive into Blitz Chess!</h3>
            <p className="mb-2">
                Blitz chess is a fast-paced variant of chess where each player is given a limited amount of time to make all their moves. Typically, this ranges from 3 to 5 minutes per player, sometimes with a small increment added per move.
            </p>
            <p>
                It's designed to test a player's quick thinking and intuition, making for exciting and dynamic games. Our Chess Timer is perfect for managing these thrilling time controls, ensuring fair play and intense competition.
            </p>
        </div>
      </div>
    </>
  );
}

export default ChessTimer;
