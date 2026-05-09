import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  addDocuments,
  deleteDocument,
  deleteWhere,
  getAllDocuments,
  getDocById,
  queryDocuments,
  updateDocument,
} from '../lib/db'

const emptyChartForm = {
  region: 'Upper Jaw',
  tooth_number: '',
  procedure_done: '',
  notes: '',
}

function EditSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
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
  const [existingFiles, setExistingFiles] = useState([])

  useEffect(() => {
    const load = async () => {
      let session = null

      try {
        session = await getDocById('sessions', sessionId)
      } catch (sessionError) {
        console.error('Session load error:', sessionError)
      }

      if (!session) {
        setLoading(false)
        return
      }

      setPatientId(session.patient_id)
      setVisitDate(session.visit_date || '')
      setVisitType(session.visit_type || 'New')
      setChiefComplaint(session.chief_complaint || '')
      setDiagnosis(session.diagnosis || '')
      setTreatmentGiven(session.treatment_given || '')
      setInjectionGiven(Boolean(session.injection_given))
      setInjectionDetails(session.injection_details || '')
      setTreatmentCost(session.treatment_cost ?? '')
      setAmountPaid(session.amount_paid ?? '')
      setPaymentStatus(session.payment_status || 'Pending')
      setNotes(session.notes || '')
      setNextVisitDate(session.next_visit_date || '')

      const patient = await getDocById('patients', session.patient_id)
      setPatientName(patient?.full_name || '')

      const charts = await queryDocuments('dental_chart_entries', [
        ['session_id', '==', sessionId],
      ])

      console.log('Loaded chart entries:', charts)
      setChartEntries(charts.map((chart) => ({ ...chart, tempId: chart.id })))

      const doctors = await getAllDocuments('doctors', 'name', 'asc')
      setAllDoctors(doctors.filter((doctor) => doctor.is_active))

      const sessionDoctors = await queryDocuments('session_doctors', [
        ['session_id', '==', sessionId],
      ])
      setSelectedDoctors(sessionDoctors.map((doctor) => doctor.doctor_id))

      const files = await queryDocuments('session_files', [['session_id', '==', sessionId]])
      setExistingFiles(files || [])
      setLoading(false)
    }

    load()
  }, [sessionId])

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
      await updateDocument('sessions', sessionId, {
        visit_date: visitDate,
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        diagnosis,
        treatment_given: treatmentGiven,
        injection_given: injectionGiven,
        injection_details: injectionDetails,
        treatment_cost: Number.parseFloat(treatmentCost) || 0,
        amount_paid: Number.parseFloat(amountPaid) || 0,
        payment_status: paymentStatus,
        notes,
        next_visit_date: nextVisitDate || null,
      })

      await deleteWhere('dental_chart_entries', [['session_id', '==', sessionId]])

      if (entriesToSave.length > 0) {
        const rows = entriesToSave.map((entry) => ({
          session_id: sessionId,
          patient_id: patientId,
          region: entry.region,
          tooth_number: entry.tooth_number || null,
          procedure_done: entry.procedure_done,
          notes: entry.notes || null,
        }))

        const savedCharts = await addDocuments('dental_chart_entries', rows)
        console.log('[EditSession] Chart saved:', savedCharts.length, 'entries')
      }

      await deleteWhere('session_doctors', [['session_id', '==', sessionId]])

      if (doctorsToSave.length > 0) {
        await addDocuments(
          'session_doctors',
          doctorsToSave.map((doctorId) => ({
            session_id: sessionId,
            doctor_id: doctorId,
          })),
        )
      }

      window.alert('Session updated successfully!')
      navigate(`/patients/${patientId}`)
    } catch (error) {
      console.error('Update error:', error)
      window.alert('Failed to update session')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this session permanently? This cannot be undone.')) {
      return
    }

    await deleteWhere('dental_chart_entries', [['session_id', '==', sessionId]])
    await deleteWhere('session_doctors', [['session_id', '==', sessionId]])
    await deleteWhere('session_files', [['session_id', '==', sessionId]])
    await deleteDocument('sessions', sessionId)
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
              value={treatmentCost}
              onChange={(event) => setTreatmentCost(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Amount Paid ₹
            <input
              type="number"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm text-gray-600">
            Payment Status
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option>Pending</option>
              <option>Paid</option>
              <option>Partial</option>
            </select>
          </label>
        </div>
      </div>

      {existingFiles.length > 0 && (
        <div className="mb-4 rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Attached Files</h2>
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="mb-2 flex items-center justify-between rounded border px-3 py-2"
            >
              <span className="text-sm font-medium">{file.file_name}</span>
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:underline"
              >
                Open
              </a>
            </div>
          ))}
        </div>
      )}

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

export default EditSession
