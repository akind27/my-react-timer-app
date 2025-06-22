import { Routes, Route } from 'react-router-dom';
import TimerApp from './TimerApp';

function Router() {
  return (
    <Routes>
      <Route path="/" element={<TimerApp />} />
    </Routes>
  );
}

export default Router;