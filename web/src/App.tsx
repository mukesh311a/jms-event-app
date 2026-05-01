import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RegisterPage } from './pages/RegisterPage'
import { ThankYouPage } from './pages/ThankYouPage'
import { AdminPage } from './pages/AdminPage'

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/thank-you/:registrationId" element={<ThankYouPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </div>
  )
}

export default App
