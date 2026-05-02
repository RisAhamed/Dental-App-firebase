import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Doctors from './pages/Doctors'
import Patients from './pages/Patients'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/patients" replace />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/doctors" element={<Doctors />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
