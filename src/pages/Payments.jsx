import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle, IndianRupee, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabaseClient'

const filters = ['All', 'Pending', 'Partial']

function Payments() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [filter, setFilter] = useState('All')

  const loadPayments = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          'id, visit_date, chief_complaint, treatment_cost, amount_paid, payment_status, patient_id, patients(full_name, phone)',
        )
        .in('payment_status', ['Pending', 'Partial'])
        .order('visit_date', { ascending: false })

      if (error) throw error

      setSessions(data || [])
    } catch (error) {
      showToast(error.message || 'Unable to load pending payments.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    Promise.resolve().then(loadPayments)
  }, [loadPayments])

  const filteredSessions = useMemo(() => {
    if (filter === 'All') return sessions
    return sessions.filter((session) => session.payment_status === filter)
  }, [filter, sessions])

  const totalDue = filteredSessions.reduce(
    (sum, session) =>
      sum + Number(session.treatment_cost || 0) - Number(session.amount_paid || 0),
    0,
  )

  const markAsPaid = async (sessionId) => {
    const session = sessions.find((item) => item.id === sessionId)
    if (!session) return

    setUpdatingId(sessionId)

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          amount_paid: Number(session.treatment_cost || 0),
          payment_status: 'Paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (error) throw error

      showToast('Marked as paid.', 'success')
      await loadPayments()
    } catch (error) {
      showToast(error.message || 'Failed to update payment.', 'error')
    } finally {
      setUpdatingId('')
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
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-400" />
          <p className="font-medium text-slate-500">All payments are cleared!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const due =
              Number(session.treatment_cost || 0) - Number(session.amount_paid || 0)

            return (
              <div
                key={session.id}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/patients/${session.patient_id}`)}
                  className="min-w-0 text-left"
                >
                  <p className="font-medium text-slate-800">
                    {session.patients?.full_name || 'Patient'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {session.patients?.phone || '-'} · {formatDate(session.visit_date)}
                  </p>
                  <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                    {session.chief_complaint || '-'}
                  </p>
                </button>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Due</p>
                    <p className="text-lg font-bold text-red-600">
                      ₹{due.toLocaleString('en-IN')}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        session.payment_status === 'Partial'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {session.payment_status}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => markAsPaid(session.id)}
                    disabled={updatingId === session.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IndianRupee className="h-4 w-4" />
                    )}
                    Mark Paid
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

function formatDate(dateValue) {
  if (!dateValue) return '-'

  return new Date(dateValue).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default Payments
