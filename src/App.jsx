import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ToastProvider from './components/Toast'
import Doctors from './pages/Doctors'
import EditSession from './pages/EditSession'
import NewSession from './pages/NewSession'
import PatientDetail from './pages/PatientDetail'
import Patients from './pages/Patients'
import Search from './pages/Search'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/patients" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/search" element={<Search />} />
            <Route path="/sessions/new" element={<NewSession />} />
            <Route path="/sessions/edit/:id" element={<EditSession />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
