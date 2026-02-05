import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthForm from './pages/Auth/Auth';
import Dashboard from './pages/Dashboard/Dashboard';
import IsLogin from './pages/Auth/IsLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<IsLogin />}>
          <Route path="/" element={<Dashboard />} />
        </Route>
        <Route path="/signup" element={<AuthForm type="signup" />} />
        <Route path="/login" element={<AuthForm type="login" />} />
      </Routes>
    </Router>
  );
}

export default App;
