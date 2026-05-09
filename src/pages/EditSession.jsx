import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useToast } from '../hooks/useToast'
import { db } from '../lib/firebase'

const emptyChartForm = {
  region: 'Upper Jaw',
  tooth_number: '',
  procedure_done: '',
  notes: '',
}

function EditSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [patientId, setPatientId] = useState(null)
  const [patientName, setPatientName] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [visitType, setVisitType] = useState('New')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentGiven, setTreatmentGiven] = useState('')
  const [injectionGiven, setInjectionGiven] = useState(false)
  const [injectionDetails, setInjectionDetails] = useState('')
  const [treatmentCost, setTreatmentCost] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('Pending')
  const [notes, setNotes] = useState('')
  const [nextVisitDate, setNextVisitDate] = useState('')
  const [chartEntries, setChartEntries] = useState([])
  const [chartForm, setChartForm] = useState(emptyChartForm)
  const [allDoctors, setAllDoctors] = useState([])
  const [selectedDoctors, setSelectedDoctors] = useState([])

  useEffect(() => {
    const loadAll = async () => {
      try {
        const sessionSnap = await getDoc(doc(db, 'sessions', sessionId))
        if (!sessionSnap.exists()) {
          console.error('Session not found:', sessionId)
          setLoading(false)
          return
        }

        const session = { id: sessionSnap.id, ...sessionSnap.data() }
        setPatientId(session.patient_id)
        setVisitDate(formatInputDate(session.visit_date))
        setVisitType(session.visit_type || 'New')
        setChiefComplaint(session.chief_complaint || '')
        setDiagnosis(session.diagnosis || '')
        setTreatmentGiven(session.treatment_given || '')
        setInjectionGiven(session.injection_given || false)
        setInjectionDetails(session.injection_details || '')
        setTreatmentCost(String(session.treatment_cost || ''))
        setAmountPaid(String(session.amount_paid || ''))
        setPaymentStatus(session.payment_status || 'Pending')
        setNotes(session.notes || '')
        setNextVisitDate(formatInputDate(session.next_visit_date))

        const patientSnap = await getDoc(doc(db, 'patients', session.patient_id))
        setPatientName(patientSnap.data()?.full_name || '')

        const [chartsSnap, doctorsSnap, allDoctorsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'dental_chart_entries'),
              where('session_id', '==', sessionId),
            ),
          ),
          getDocs(
            query(collection(db, 'session_doctors'), where('session_id', '==', sessionId)),
          ),
          getDocs(query(collection(db, 'doctors'), where('is_active', '==', true))),
        ])

        setChartEntries(
          chartsSnap.docs.map((chartDoc) => ({
            id: chartDoc.id,
            ...chartDoc.data(),
            tempId: chartDoc.id,
          })),
        )
        setSelectedDoctors(doctorsSnap.docs.map((doctorDoc) => doctorDoc.data().doctor_id))
        setAllDoctors(
          allDoctorsSnap.docs.map((doctorDoc) => ({
            id: doctorDoc.id,
            ...doctorDoc.data(),
          })),
        )
      } catch (loadError) {
        console.error('Session load error:', loadError)
        showToast(loadError.message || 'Unable to load session.', 'error')
      } finally {
        setLoading(false)
      }
    }

    Promise.resolve().then(loadAll)
  }, [sessionId, showToast])

  useEffect(() => {
    const cost = Number.parseFloat(treatmentCost) || 0
    const paid = Number.parseFloat(amountPaid) || 0

    let nextStatus = 'Partial'
    if (cost === 0) {
      nextStatus = 'Paid'
    } else if (paid <= 0) {
      nextStatus = 'Pending'
    } else if (paid >= cost) {
      nextStatus = 'Paid'
    }

    const timer = window.setTimeout(() => setPaymentStatus(nextStatus), 0)
    return () => window.clearTimeout(timer)
  }, [treatmentCost, amountPaid])

  const addChartEntry = () => {
    if (!chartForm.procedure_done.trim()) return

    const entry = {
      tempId: Date.now(),
      region: chartForm.region,
      tooth_number: chartForm.tooth_number.trim() || null,
      procedure_done: chartForm.procedure_done.trim(),
      notes: chartForm.notes.trim() || null,
    }

    setChartEntries((previousEntries) => [...previousEntries, entry])
    setChartForm(emptyChartForm)
  }

  const toggleDoctor = (doctorId) => {
    setSelectedDoctors((previousDoctors) =>
      previousDoctors.includes(doctorId)
        ? previousDoctors.filter((id) => id !== doctorId)
        : [...previousDoctors, doctorId],
    )
  }

  const handleUpdate = async () => {
    if (!chiefComplaint.trim()) {
      window.alert('Chief complaint is required')
      return
    }

    const entriesToSave = [...chartEntries]
    const doctorsToSave = [...selectedDoctors]
    console.log('[EditSession] Update - chart entries:', entriesToSave.length)

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        visit_date: visitDate,
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        diagnosis,
        treatment_given: treatmentGiven,
        injection_given: injectionGiven,
        injection_details: injectionDetails,
        treatment_cost: Math.round((Number.parseFloat(treatmentCost) || 0) * 100) / 100 || 0,
        amount_paid: Math.round((Number.parseFloat(amountPaid) || 0) * 100) / 100 || 0,
        payment_status: paymentStatus,
        notes,
        next_visit_date: nextVisitDate || null,
        updated_at: serverTimestamp(),
      })

      const oldCharts = await getDocs(
        query(collection(db, 'dental_chart_entries'), where('session_id', '==', sessionId)),
      )
      await Promise.all(oldCharts.docs.map((chartDoc) => deleteDoc(chartDoc.ref)))
      await Promise.all(
        entriesToSave.map((entry) =>
          addDoc(collection(db, 'dental_chart_entries'), {
            session_id: sessionId,
            patient_id: patientId,
            region: entry.region,
            tooth_number: entry.tooth_number || null,
            procedure_done: entry.procedure_done,
            notes: entry.notes || null,
            created_at: serverTimestamp(),
          }),
        ),
      )
      console.log('[EditSession] Chart saved:', entriesToSave.length, 'entries')

      const oldDoctors = await getDocs(
        query(collection(db, 'session_doctors'), where('session_id', '==', sessionId)),
      )
      await Promise.all(oldDoctors.docs.map((doctorDoc) => deleteDoc(doctorDoc.ref)))
      await Promise.all(
        doctorsToSave.map((doctorId) =>
          addDoc(collection(db, 'session_doctors'), {
            session_id: sessionId,
            doctor_id: doctorId,
            created_at: serverTimestamp(),
          }),
        ),
      )

      showToast('Session updated!', 'success')
      navigate(`/patients/${patientId}`)
    } catch (error) {
      console.error('Update error:', error)
      showToast(error.message || 'Failed to update session.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this session permanently? This cannot be undone.')) {
      return
    }

    const [charts, doctors] = await Promise.all([
      getDocs(
        query(collection(db, 'dental_chart_entries'), where('session_id', '==', sessionId)),
      ),
      getDocs(query(collection(db, 'session_doctors'), where('session_id', '==', sessionId))),
    ])

    await Promise.all([
      ...charts.docs.map((chartDoc) => deleteDoc(chartDoc.ref)),
      ...doctors.docs.map((doctorDoc) => deleteDoc(doctorDoc.ref)),
      deleteDoc(doc(db, 'sessions', sessionId)),
    ])
    navigate(`/patients/${patientId}`)
  }

  if (loading) {
    return <div className="p-8 text-center">Loading session...</div>
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Edit Session — {patientName}</h1>

      <div className="mb-4 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Visit Info</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-gray-600">
            Visit Date
            <input
              type="date"
              value={visitDate}
              onChange={(event) => setVisitDate(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Visit Type
            <select
              value={visitType}
              onChange={(event) => setVisitType(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option>New</option>
              <option>Follow-up</option>
              <option>Emergency</option>
              <option>Routine Checkup</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Clinical Notes</h2>
        <div className="space-y-3">
          <label className="block text-sm text-gray-600">
            Chief Complaint *
            <input
              value={chiefComplaint}
              onChange={(event) => setChiefComplaint(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Main reason for visit"
            />
          </label>
          <label className="block text-sm text-gray-600">
            Diagnosis
            <textarea
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              rows="2"
            />
          </label>
          <label className="block text-sm text-gray-600">
            Treatment Given
            <textarea
              value={treatmentGiven}
              onChange={(event) => setTreatmentGiven(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              rows="2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={injectionGiven}
              onChange={(event) => setInjectionGiven(event.target.checked)}
            />
            Injection Given
          </label>
          {injectionGiven && (
            <input
              value={injectionDetails}
              onChange={(event) => setInjectionDetails(event.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="Injection details"
            />
          )}
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Dental Chart</h2>
        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <select
            value={chartForm.region}
            onChange={(event) =>
              setChartForm((previous) => ({ ...previous, region: event.target.value }))
            }
            className="rounded border px-3 py-2"
          >
            <option>Upper Jaw</option>
            <option>Lower Jaw</option>
            <option>Upper Left</option>
            <option>Upper Right</option>
            <option>Lower Left</option>
            <option>Lower Right</option>
          </select>
          <input
            value={chartForm.tooth_number}
            placeholder="Tooth # (optional)"
            onChange={(event) =>
              setChartForm((previous) => ({
                ...previous,
                tooth_number: event.target.value,
              }))
            }
            className="rounded border px-3 py-2"
          />
          <input
            value={chartForm.procedure_done}
            placeholder="Procedure done *"
            onChange={(event) =>
              setChartForm((previous) => ({
                ...previous,
                procedure_done: event.target.value,
              }))
            }
            className="rounded border px-3 py-2"
          />
          <input
            value={chartForm.notes}
            placeholder="Notes (optional)"
            onChange={(event) =>
              setChartForm((previous) => ({ ...previous, notes: event.target.value }))
            }
            className="rounded border px-3 py-2"
          />
        </div>
        <button
          type="button"
          onClick={addChartEntry}
          className="mb-3 rounded bg-teal-600 px-4 py-2 text-sm text-white"
        >
          + Add Entry
        </button>
        {chartEntries.map((entry) => (
          <div
            key={entry.tempId}
            className="mb-1 flex items-center justify-between rounded bg-blue-50 px-3 py-2"
          >
            <span className="text-sm">
              {entry.region}
              {entry.tooth_number ? ` #${entry.tooth_number}` : ''}:{' '}
              {entry.procedure_done}
            </span>
            <button
              type="button"
              onClick={() =>
                setChartEntries((previousEntries) =>
                  previousEntries.filter((item) => item.tempId !== entry.tempId),
                )
              }
              className="ml-2 text-xs text-red-500"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Doctors</h2>
        <div className="flex flex-wrap gap-2">
          {allDoctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              onClick={() => toggleDoctor(doctor.id)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selectedDoctors.includes(doctor.id)
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {doctor.name} · {doctor.specialty}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Billing</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-gray-600">
            Treatment Cost ₹
            <input
              type="number"
              step="1"
              min="0"
              value={treatmentCost}
              onChange={(event) => setTreatmentCost(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Amount Paid ₹
            <input
              type="number"
              step="1"
              min="0"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <div>
            <label className="mb-1 block text-sm text-gray-500">Payment Status</label>
            <span
              className={`inline-block rounded-lg px-3 py-1.5 text-sm font-medium ${
                paymentStatus === 'Paid'
                  ? 'bg-green-100 text-green-700'
                  : paymentStatus === 'Partial'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-600'
              }`}
            >
              {paymentStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Additional Info</h2>
        <div className="space-y-3">
          <label className="block text-sm text-gray-600">
            Additional Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              rows="2"
            />
          </label>
          <label className="block text-sm text-gray-600">
            Next Visit Date
            <input
              type="date"
              value={nextVisitDate}
              onChange={(event) => setNextVisitDate(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded border px-4 py-2 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-red-400 px-4 py-2 text-red-600 hover:bg-red-50"
          >
            Delete Session
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className="rounded bg-teal-600 px-6 py-2 text-white hover:bg-teal-700"
          >
            Update Session
          </button>
        </div>
      </div>
    </div>
  )
}

function formatInputDate(dateValue) {
  if (!dateValue) return ''
  if (dateValue?.toDate) return dateValue.toDate().toISOString().split('T')[0]
  return String(dateValue).split('T')[0]
}

export default EditSession
