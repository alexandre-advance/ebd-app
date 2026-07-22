import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import RoomDetails from './pages/RoomDetails';
import Reports from './pages/Reports';
import Church from './pages/Church';
import Students from './pages/Students';
import Users from './pages/Users';
import Churches from './pages/Churches';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/churches" element={<Churches />} />
            <Route path="/church" element={<Church />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:roomId" element={<RoomDetails />} />
            <Route path="/students" element={<Students />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
          </Route>

          {/* Fallback to landing */}
          <Route path="*" element={<Landing />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
