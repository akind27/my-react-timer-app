// src/components/TimerApp.tsx
import React from 'react';
import { Link } from 'react-router-dom'; // <--- We need Link now!
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// No need for Button, Clock, Timer, etc. imports from lucide-react if only showing cards here
// No need for individual timer imports (Stopwatch, CountdownTimer, etc.) as they are handled in Router.tsx now

// You still need these icon imports for the cards themselves
import { Clock, Timer, Zap, Coffee, Dumbbell, Users, Target, Gamepad2 } from 'lucide-react';

// This part remains the same, it defines your timers for the cards
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
  // **REMOVE** const [selectedTimer, setSelectedTimer] = useState<TimerType>(null);
  // **REMOVE** const renderTimer = () => { ... } switch statement
  // **REMOVE** if (selectedTimer) { ... } block

  // This is the only part that will remain and be returned: the grid of cards
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
              // *** CHANGE HERE: Use <Link> instead of onClick and style it ***
              <Link
                key={timer.id}
                to={`/${timer.id}`} // The new URL for this timer (e.g., /stopwatch)
                style={{ textDecoration: 'none', color: 'inherit' }} // Remove underline and keep color
              >
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300"
                  // **REMOVE** onClick={() => setSelectedTimer(timer.id as TimerType)}
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
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TimerApp;