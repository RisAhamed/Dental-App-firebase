import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/firebase'
import {
  collection, doc, getDoc, getDocs,
  updateDoc, serverTimestamp
} from 'firebase/firestore'
import { CheckCircle, IndianRupee } from 'lucide-react'
import { useToast } from '../hooks/useToast'

const filters = ['All', 'Pending', 'Partial']

function Payments() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  const load = async () => {
    setLoading(true)
    try {
      // Fetch ALL sessions — then filter client-side
      // (Firestore cannot do OR queries on the same field without two separate queries)
      const snap = await getDocs(collection(db, 'sessions'))
      const allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Filter only outstanding payments
      const outstandingSessions = allSessions.filter(s =>
        s.payment_status === 'Pending' || s.payment_status === 'Partial'
      )
      console.log('[Payments] Total sessions:', allSessions.length)
      console.log('[Payments] Outstanding sessions:', outstandingSessions.length)
      // Enrich each session with patient name and phone
      const enriched = await Promise.all(
        outstandingSessions.map(async (s) => {
          try {
            const patientSnap = await getDoc(doc(db, 'patients', s.patient_id))
            return {
              ...s,
              patient: patientSnap.exists() ? patientSnap.data() : { full_name: 'Unknown', phone: '' }
            }
          } catch {
            return { ...s, patient: { full_name: 'Unknown', phone: '' } }
          }
        })
      )
      // Sort by visit_date descending
      enriched.sort((a, b) => {
        const dateA = a.visit_date || ''
        const dateB = b.visit_date || ''
        return dateB > dateA ? 1 : -1
      })
      setSessions(enriched)
    } catch (err) {
      console.error('[Payments] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // "All" means all outstanding (Pending + Partial)
  // "Pending" means only Pending
  // "Partial" means only Partial
  const filtered = filter === 'All'
    ? sessions
    : sessions.filter(s => s.payment_status === filter)

  const totalDue = filtered.reduce((sum, s) => {
    const cost = parseFloat(s.treatment_cost) || 0
    const paid = parseFloat(s.amount_paid) || 0
    const due = cost - paid
    return sum + (due > 0 ? due : 0)
  }, 0)

  const markAsPaid = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        amount_paid: session.treatment_cost,
        payment_status: 'Paid',
        updated_at: serverTimestamp()
      })
      showToast('Marked as paid ✓', 'success')
      load() // reload the list — this session will disappear since it's now Paid
    } catch (err) {
      console.error('[Payments] Mark paid error:', err)
      showToast('Failed to update payment', 'error')
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-2 py-6 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-900">
            Pending Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Total outstanding:{' '}
            <span className="font-semibold text-red-600">
              ₹{totalDue.toLocaleString('en-IN')}
            </span>
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {filters.map((filterOption) => (
            <button
              key={filterOption}
              type="button"
              onClick={() => setFilter(filterOption)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                filter === filterOption
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filterOption}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium text-lg">All payments are cleared!</p>
          <p className="text-gray-400 text-sm mt-1">No {filter === 'All' ? 'outstanding' : filter.toLowerCase()} payments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const cost = parseFloat(s.treatment_cost) || 0
            const paid = parseFloat(s.amount_paid) || 0
            const due = Math.max(cost - paid, 0)
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="cursor-pointer flex-1" onClick={() => navigate(`/patients/${s.patient_id}`)}>
                  <p className="font-medium text-gray-800">{s.patient?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.patient?.phone} · {s.visit_date || '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{s.chief_complaint}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      Total: ₹{cost.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-gray-400">
                      Paid: ₹{paid.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4 ml-4">
                  <div>
                    <p className="text-xs text-gray-400">Due</p>
                    <p className="text-lg font-bold text-red-600">
                      ₹{due.toLocaleString('en-IN')}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.payment_status === 'Partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {s.payment_status}
                    </span>
                  </div>
                  <button
                    onClick={() => markAsPaid(s.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    <CheckCircle size={14} /> Mark Paid
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default Payments
