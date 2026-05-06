import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ToastProvider from './components/Toast'
import Dashboard from './pages/Dashboard'
import Doctors from './pages/Doctors'
import EditPatient from './pages/EditPatient'
import EditSession from './pages/EditSession'
import NewSession from './pages/NewSession'
import PatientDetail from './pages/PatientDetail'
import Patients from './pages/Patients'
import Payments from './pages/Payments'
import Search from './pages/Search'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/:patientId/edit" element={<EditPatient />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/search" element={<Search />} />
            <Route path="/sessions/new" element={<NewSession />} />
            <Route path="/sessions/edit/:sessionId" element={<EditSession />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
