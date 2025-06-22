import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Settings, Clock, User } from 'lucide-react';

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lowTimeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (selectedTimeControl.name !== 'Custom') {
      setMinutes(selectedTimeControl.minutes);
      setIncrement(selectedTimeControl.increment);
      setPlayer1Time(selectedTimeControl.minutes * 60);
      setPlayer2Time(selectedTimeControl.minutes * 60);
    }
  }, [selectedTimeControl]);

  useEffect(() => {
    setPlayer1Time(minutes * 60);
    setPlayer2Time(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    // Create audio contexts
    audioRef.current = new Audio();
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGWi77eefTQwMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606eulVRQKRp/g8r5h';
    
    lowTimeAudioRef.current = new Audio();
    lowTimeAudioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEAAAD//2xdX3SYr6yQYTY1YKHQ26thHAY/mtvyw3IlBSyBzvLYiTcIGWi77eefTQwMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606eulVRQKRp/g8r5h';
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && activePlayer && !gameFinished) {
      intervalRef.current = setInterval(() => {
        if (activePlayer === 'player1') {
          setPlayer1Time(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              setGameFinished(true);
              setWinner('player2');
              setIsRunning(false);
              return 0;
            }
            if (newTime === 10 && soundEnabled) {
              playLowTimeSound();
            }
            return newTime;
          });
        } else {
          setPlayer2Time(prevTime => {
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              setGameFinished(true);
              setWinner('player1');
              setIsRunning(false);
              return 0;
            }
            if (newTime === 10 && soundEnabled) {
              playLowTimeSound();
            }
            return newTime;
          });
        }
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
  }, [isRunning, activePlayer, gameFinished, soundEnabled]);

  const playSound = () => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        console.log('Move sound');
      });
    }
  };

  const playLowTimeSound = () => {
    if (lowTimeAudioRef.current && soundEnabled) {
      lowTimeAudioRef.current.currentTime = 0;
      lowTimeAudioRef.current.play().catch(() => {
        console.log('Low time warning');
      });
    }
  };

  const handlePlayerMove = (player: Player) => {
    if (gameFinished) return;
    
    playSound();
    setMoveCount(prev => prev + 1);
    
    // Add increment time
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
    setShowSettings(false);
  };

  const handlePause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setActivePlayer(null);
    setPlayer1Time(minutes * 60);
    setPlayer2Time(minutes * 60);
    setGameFinished(false);
    setWinner(null);
    setMoveCount(0);
    setShowSettings(true);
  };

  const handleTimeControlChange = (controlName: string) => {
    const control = timeControls.find(tc => tc.name === controlName) || timeControls[0];
    setSelectedTimeControl(control);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    
    if (timeInSeconds < 60) {
      return `${seconds.toString().padStart(2, '0')}`;
    } else if (timeInSeconds < 3600) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
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

  const isLowTime = (time: number) => time <= 30;

  return (
    <div className="max-w-lg mx-auto">
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
                  onChange={(e) => setMinutes(Math.max(0.5, parseFloat(e.target.value) || 1))}
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
                  onChange={(e) => setIncrement(Math.max(0, parseInt(e.target.value) || 0))}
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
              <div className={`text-5xl font-mono font-bold mb-4 ${
                isLowTime(player2Time) ? 'text-red-600 animate-pulse' : 'text-gray-900'
              }`}>
                {formatTime(player2Time)}
              </div>
              
              <Button
                onClick={() => handlePlayerMove('player2')}
                disabled={gameFinished || activePlayer === 'player2'}
                size="lg"
                className={`w-full h-12 ${
                  activePlayer === 'player2' && isRunning 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {activePlayer === 'player2' && isRunning ? 'Your Turn' : 'Press After Move'}
              </Button>
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
                isLowTime(player1Time) ? 'text-red-600 animate-pulse' : 'text-gray-900'
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
  );
}

export default ChessTimer;