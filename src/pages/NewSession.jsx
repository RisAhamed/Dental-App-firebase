import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import {
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Syringe,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import { db } from '../lib/firebase'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

const today = format(new Date(), 'yyyy-MM-dd')

const initialForm = {
  visit_date: today,
  visit_type: 'New',
  followup_of: '',
  chief_complaint: '',
  diagnosis: '',
  treatment_given: '',
  injection_given: false,
  injection_details: '',
  treatment_cost: '',
  amount_paid: '',
  notes: '',
  next_visit_date: '',
}

const initialChartForm = {
  region: 'Upper Jaw',
  tooth_number: '',
  procedure_done: '',
  notes: '',
}

const visitTypes = [
  { label: 'New Problem', value: 'New' },
  { label: 'Follow-up', value: 'Follow-up' },
  { label: 'Emergency', value: 'Emergency' },
  { label: 'Routine Checkup', value: 'Routine Checkup' },
]

const regionOptions = [
  'Upper Jaw',
  'Lower Jaw',
  'Left Cheek',
  'Right Cheek',
  'Palate',
  'Gums',
  'Tongue',
  'Other',
]

function NewSession() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const { showToast } = useToast()
  const chartEntriesRef = useRef([])

  const [patient, setPatient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [previousSessions, setPreviousSessions] = useState([])
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([])
  const [chartEntries, setChartEntries] = useState([])
  const [chartForm, setChartForm] = useState(initialChartForm)
  const [formData, setFormData] = useState(initialForm)
  const [paymentStatus, setPaymentStatus] = useState('Pending')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cost = Number.parseFloat(formData.treatment_cost) || 0
    const paid = Number.parseFloat(formData.amount_paid) || 0

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
  }, [formData.amount_paid, formData.treatment_cost])

  useEffect(() => {
    const loadPatient = async () => {
      if (!patientId) {
        showToast('Missing patientId in the URL.', 'error')
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const snap = await getDoc(doc(db, 'patients', patientId))

        if (snap.exists()) {
          setPatient({ id: snap.id, ...snap.data() })
        } else {
          setPatient(null)
          console.error('No patient found for ID:', patientId)
        }
      } catch (error) {
        console.error('Patient load error:', error)
        showToast(error.message || 'Unable to load patient.', 'error')
      } finally {
        setLoading(false)
      }
    }

    Promise.resolve().then(loadPatient)
  }, [patientId, showToast])

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'doctors'), where('is_active', '==', true)),
        )
        setDoctors(snap.docs.map((doctorDoc) => ({ id: doctorDoc.id, ...doctorDoc.data() })))
      } catch (error) {
        console.error('Doctors load error:', error)
        showToast(error.message || 'Unable to load doctors.', 'error')
      }
    }

    Promise.resolve().then(loadDoctors)
  }, [showToast])

  useEffect(() => {
    const loadPreviousSessions = async () => {
      if (!patientId) return

      try {
        const snap = await getDocs(
          query(collection(db, 'sessions'), where('patient_id', '==', patientId)),
        )
        const rows = snap.docs.map((sessionDoc) => ({
          id: sessionDoc.id,
          ...sessionDoc.data(),
        }))
        setPreviousSessions(
          rows.sort((a, b) => toDate(b.visit_date).getTime() - toDate(a.visit_date).getTime()),
        )
      } catch (error) {
        console.error('Previous sessions load error:', error)
        showToast(error.message || 'Unable to load previous sessions.', 'error')
      }
    }

    Promise.resolve().then(loadPreviousSessions)
  }, [patientId, showToast])

  useEffect(() => {
    chartEntriesRef.current = chartEntries
    console.log('chartEntriesRef updated:', chartEntriesRef.current)
  }, [chartEntries])

  const handleFormChange = (event) => {
    const { name, type, checked, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'visit_type' && value !== 'Follow-up' ? { followup_of: '' } : {}),
    }))
  }

  const handleChartDraftChange = (event) => {
    const { name, value } = event.target
    setChartForm((current) => ({ ...current, [name]: value }))
  }

  const addChartEntry = () => {
    if (!chartForm.procedure_done.trim()) {
      showToast('Procedure Done is required to add an entry.', 'warning')
      return
    }

    const entry = {
      tempId: Date.now(),
      region: chartForm.region,
      tooth_number: chartForm.tooth_number.trim() || null,
      procedure_done: chartForm.procedure_done.trim(),
      notes: chartForm.notes.trim() || null,
    }

    setChartEntries((current) => {
      const updated = [...current, entry]
      console.log('Chart entries after add:', updated)
      chartEntriesRef.current = updated
      return updated
    })
    setChartForm(initialChartForm)
  }

  const removeChartEntry = (tempId) => {
    setChartEntries((current) => {
      const updated = current.filter((entry) => entry.tempId !== tempId)
      chartEntriesRef.current = updated
      return updated
    })
  }

  const toggleDoctor = (doctorId) => {
    setSelectedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((id) => id !== doctorId)
        : [...current, doctorId],
    )
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (!formData.chief_complaint.trim()) {
      showToast('Chief Complaint is required.', 'warning')
      return
    }

    setSaving(true)

    try {
      const currentPatientId = patientId
      const entriesToSave = [...chartEntries]
      const doctorsToSave = [...selectedDoctorIds]
      console.log('[NewSession] Chart entries at save:', entriesToSave)
      console.log('[NewSession] Count:', entriesToSave.length)

      const sessionRef = await addDoc(collection(db, 'sessions'), {
        patient_id: currentPatientId,
        visit_date: formData.visit_date,
        visit_type: formData.visit_type,
        followup_of:
          formData.visit_type === 'Follow-up' && formData.followup_of
            ? formData.followup_of
            : null,
        chief_complaint: formData.chief_complaint.trim(),
        diagnosis: formData.diagnosis.trim(),
        treatment_given: formData.treatment_given.trim(),
        injection_given: formData.injection_given,
        injection_details: formData.injection_given
          ? formData.injection_details.trim()
          : '',
        treatment_cost:
          Math.round((Number.parseFloat(formData.treatment_cost) || 0) * 100) / 100 || 0,
        amount_paid:
          Math.round((Number.parseFloat(formData.amount_paid) || 0) * 100) / 100 || 0,
        payment_status: paymentStatus,
        notes: formData.notes.trim(),
        next_visit_date: formData.next_visit_date || null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      const newSessionId = sessionRef.id
      console.log('Session created:', newSessionId)

      if (entriesToSave.length > 0) {
        await Promise.all(
          entriesToSave.map((entry) =>
            addDoc(collection(db, 'dental_chart_entries'), {
              session_id: newSessionId,
              patient_id: currentPatientId,
              region: entry.region,
              tooth_number: entry.tooth_number || null,
              procedure_done: entry.procedure_done,
              notes: entry.notes || null,
              created_at: serverTimestamp(),
            }),
          ),
        )
        console.log('[NewSession] CHART INSERT SUCCESS:', entriesToSave.length)
      }

      if (doctorsToSave.length > 0) {
        await Promise.all(
          doctorsToSave.map((doctorId) =>
            addDoc(collection(db, 'session_doctors'), {
              session_id: newSessionId,
              doctor_id: doctorId,
              created_at: serverTimestamp(),
            }),
          ),
        )
      }

      showToast('Session saved!', 'success')
      window.setTimeout(() => navigate(`/patients/${currentPatientId}`), 700)
    } catch (saveError) {
      console.error('Save error:', saveError)
      showToast(`Failed to save: ${saveError.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-6 h-10 rounded bg-slate-100" />
            <div className="mt-4 h-10 w-2/3 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-24">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
          New Session
        </h2>
        <p className="text-sm text-slate-600">
          Record clinical details, charting, billing, doctors, and attachments.
        </p>
      </div>

      <Section title="Visit Info">
        <div className="grid gap-4 lg:grid-cols-2">
          <ReadOnlyField
            label="Patient"
            value={
              patient
                ? `${patient.full_name} (${patient.patient_id})`
                : 'Patient not found'
            }
          />
          <Field label="Visit Date" name="visit_date">
            <input
              id="visit_date"
              name="visit_date"
              type="date"
              value={formData.visit_date}
              onChange={handleFormChange}
              className={inputClassName}
            />
          </Field>
          <Field label="Visit Type" name="visit_type">
            <div className="relative">
              <select
                id="visit_type"
                name="visit_type"
                value={formData.visit_type}
                onChange={handleFormChange}
                className={`${inputClassName} appearance-none pr-10`}
              >
                {visitTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </Field>
          {formData.visit_type === 'Follow-up' && (
            <Field label="Follow-up of which visit?" name="followup_of">
              <select
                id="followup_of"
                name="followup_of"
                value={formData.followup_of}
                onChange={handleFormChange}
                className={inputClassName}
              >
                <option value="">Select previous visit</option>
                {previousSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {formatDate(session.visit_date)} — {session.chief_complaint}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </Section>

      <Section title="Clinical Details">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Chief Complaint" name="chief_complaint" required className="lg:col-span-2">
            <textarea
              id="chief_complaint"
              name="chief_complaint"
              rows="3"
              value={formData.chief_complaint}
              onChange={handleFormChange}
              className={textareaClassName}
              placeholder="Patient's main problem today"
            />
          </Field>
          <Field label="Diagnosis" name="diagnosis">
            <textarea
              id="diagnosis"
              name="diagnosis"
              rows="3"
              value={formData.diagnosis}
              onChange={handleFormChange}
              className={textareaClassName}
              placeholder="Doctor's diagnosis"
            />
          </Field>
          <Field label="Treatment Given" name="treatment_given">
            <textarea
              id="treatment_given"
              name="treatment_given"
              rows="3"
              value={formData.treatment_given}
              onChange={handleFormChange}
              className={textareaClassName}
              placeholder="Procedures and treatments performed today"
            />
          </Field>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-800">
                Injection Given?
              </span>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                {formData.injection_given ? 'YES' : 'NO'}
              </span>
              <input
                type="checkbox"
                name="injection_given"
                checked={formData.injection_given}
                onChange={handleFormChange}
                className="sr-only"
              />
              <span
                className={`flex h-6 w-11 items-center rounded-full p-1 transition ${
                  formData.injection_given ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition ${
                    formData.injection_given ? 'translate-x-5' : ''
                  }`}
                />
              </span>
            </label>
          </div>
          {formData.injection_given && (
            <Field
              label="Injection Details"
              name="injection_details"
              className="mt-4"
            >
              <input
                id="injection_details"
                name="injection_details"
                type="text"
                value={formData.injection_details}
                onChange={handleFormChange}
                className={inputClassName}
                placeholder="Injection type, location, dosage"
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Dental Chart Entries">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Region" name="region">
            <select
              id="region"
              name="region"
              value={chartForm.region}
              onChange={handleChartDraftChange}
              className={inputClassName}
            >
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tooth Number" name="tooth_number">
            <input
              id="tooth_number"
              name="tooth_number"
              type="text"
              value={chartForm.tooth_number}
              onChange={handleChartDraftChange}
              className={inputClassName}
              placeholder="e.g. 11, 36 (FDI notation)"
            />
          </Field>
          <Field label="Procedure Done" name="procedure_done" required>
            <input
              id="procedure_done"
              name="procedure_done"
              type="text"
              value={chartForm.procedure_done}
              onChange={handleChartDraftChange}
              className={inputClassName}
              placeholder="e.g. Root Canal, Extraction, Filling"
            />
          </Field>
          <Field label="Notes" name="chart_notes">
            <input
              id="chart_notes"
              name="notes"
              type="text"
              value={chartForm.notes}
              onChange={handleChartDraftChange}
              className={inputClassName}
              placeholder="Optional notes"
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={addChartEntry}
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>

        {chartEntries.length > 0 && (
          <div className="mt-5 space-y-3">
            {chartEntries.map((entry) => (
              <div
                key={entry.tempId}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
                    {entry.region}
                  </span>
                  {entry.tooth_number && (
                    <span className="font-medium">Tooth {entry.tooth_number}</span>
                  )}
                  <span>{entry.procedure_done}</span>
                  {entry.notes && <span className="text-slate-500">- {entry.notes}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => removeChartEntry(entry.tempId)}
                  className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Doctors Involved">
        <p className="mb-4 text-sm text-slate-600">
          Select all doctors involved in this visit
        </p>
        {doctors.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No active doctors found. Please mark a doctor as Active in the Doctors page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {doctors.map((doctor) => {
              const selected = selectedDoctorIds.includes(doctor.id)
              return (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => toggleDoctor(doctor.id)}
                  className={`rounded-full px-3 py-2 text-sm font-medium ring-1 transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    selected
                      ? 'bg-teal-600 text-white ring-teal-600'
                      : 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {doctor.name}
                  {doctor.specialty && (
                    <span className={selected ? 'text-teal-50' : 'text-slate-500'}>
                      {' '}
                      · {doctor.specialty}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Billing">
        <div className="grid gap-4 lg:grid-cols-3">
          <CurrencyField
            label="Treatment Cost"
            name="treatment_cost"
            value={formData.treatment_cost}
            onChange={handleFormChange}
          />
          <CurrencyField
            label="Amount Paid"
            name="amount_paid"
            value={formData.amount_paid}
            onChange={handleFormChange}
          />
          <div>
            <label className="mb-1 block text-sm text-gray-500">Payment Status</label>
            <span
              className={`inline-block rounded-lg px-3 py-1.5 text-sm font-medium ${paymentStatusClassName(
                paymentStatus,
              )}`}
            >
              {paymentStatus}
            </span>
          </div>
        </div>
      </Section>

      <Section title="Additional Notes & Next Visit">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Additional Notes" name="notes">
            <textarea
              id="notes"
              name="notes"
              rows="4"
              value={formData.notes}
              onChange={handleFormChange}
              className={textareaClassName}
              placeholder="Optional additional notes"
            />
          </Field>
          <Field label="Next Visit Date" name="next_visit_date">
            <input
              id="next_visit_date"
              name="next_visit_date"
              type="date"
              value={formData.next_visit_date}
              onChange={handleFormChange}
              className={inputClassName}
            />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-lg backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 md:w-auto"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <button
              type="submit"
              disabled={saving || !patientId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Session
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h3 className="mb-5 text-lg font-semibold tracking-normal text-slate-950">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Field({ label, name, required = false, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <p className="block text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
        {value}
      </div>
    </div>
  )
}

function CurrencyField({ label, name, value, onChange }) {
  return (
    <Field label={label} name={name}>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
          ₹
        </span>
        <input
          id={name}
          name={name}
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={onChange}
          className={`${inputClassName} pl-8`}
          placeholder="0.00"
        />
      </div>
    </Field>
  )
}

const inputClassName =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'

const textareaClassName =
  'mt-1 block w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return format(toDate(dateValue), 'dd MMM yyyy')
}

function toDate(dateValue) {
  if (!dateValue) return new Date(0)
  if (dateValue?.toDate) return dateValue.toDate()
  return new Date(dateValue)
}

function paymentStatusClassName(status) {
  if (status === 'Paid') return 'bg-green-100 text-green-700'
  if (status === 'Partial') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-600'
}

export default NewSession
