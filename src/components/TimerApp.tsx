import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Timer, Zap, Coffee, Dumbbell, Users, Target, Gamepad2 } from 'lucide-react';
import Stopwatch from './timers/Stopwatch';
import CountdownTimer from './timers/CountdownTimer';
import TabataTimer from './timers/TabataTimer';
import PomodoroTimer from './timers/PomodoroTimer';
import IntervalTimer from './timers/IntervalTimer';
import BoxingTimer from './timers/BoxingTimer';
import HIITTimer from './timers/HIITTimer';
import ChessTimer from './timers/ChessTimer';

type TimerType = 'stopwatch' | 'countdown' | 'tabata' | 'pomodoro' | 'interval' | 'boxing' | 'hiit' | 'chess' | null;

const timerOptions = [
  { id: 'stopwatch', name: 'Stopwatch', icon: Clock, description: 'Simple stopwatch with start, stop, and reset' },
  { id: 'countdown', name: 'Countdown Timer', icon: Timer, description: 'Set a countdown and get notified when time is up' },
  { id: 'tabata', name: 'Tabata Timer', icon: Zap, description: '20s work, 10s rest intervals for HIIT training' },
  { id: 'pomodoro', name: 'Pomodoro Timer', icon: Coffee, description: '25-minute work sessions with breaks' },
  { id: 'interval', name: 'Interval Timer', icon: Target, description: 'Custom work/rest intervals for training' },
  { id: 'boxing', name: 'Boxing Timer', icon: Dumbbell, description: 'Round-based timer for boxing and martial arts' },
  { id: 'hiit', name: 'HIIT Timer', icon: Zap, description: 'High-intensity interval training protocols' },
  { id: 'chess', name: 'Chess Timer', icon: Gamepad2, description: 'Two-player alternating timer for games' },
];

function TimerApp() {
  const [selectedTimer, setSelectedTimer] = useState<TimerType>(null);

  const renderTimer = () => {
    switch (selectedTimer) {
      case 'stopwatch':
        return <Stopwatch />;
      case 'countdown':
        return <CountdownTimer />;
      case 'tabata':
        return <TabataTimer />;
      case 'pomodoro':
        return <PomodoroTimer />;
      case 'interval':
        return <IntervalTimer />;
      case 'boxing':
        return <BoxingTimer />;
      case 'hiit':
        return <HIITTimer />;
      case 'chess':
        return <ChessTimer />;
      default:
        return null;
    }
  };

  if (selectedTimer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {timerOptions.find(t => t.id === selectedTimer)?.name}
            </h1>
            <Button 
              variant="outline" 
              onClick={() => setSelectedTimer(null)}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Back to Timers
            </Button>
          </div>
          {renderTimer()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Timer Central</h1>
          <p className="text-lg text-gray-600">Professional timing tools for every need</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {timerOptions.map((timer) => {
            const IconComponent = timer.icon;
            return (
              <Card 
                key={timer.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300"
                onClick={() => setSelectedTimer(timer.id as TimerType)}
              >
                <CardHeader className="text-center pb-3">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <IconComponent className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl text-gray-900">{timer.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center text-sm">{timer.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TimerApp;