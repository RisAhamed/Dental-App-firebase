import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  Check,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { db } from '../lib/firebase'
import {
  uploadSessionFile,
  deleteSessionFile,
  validateSessionFile,
  formatFileSize,
} from '../lib/sessionFiles'
import { CONSULTATION_FORMS } from '../lib/consultationForms'
import {
  saveConsultationFormRecord,
  getConsultationFormsForSession,
  deleteConsultationFormRecord,
} from '../lib/consultationFormRecords'

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

  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [bloodSugar, setBloodSugar] = useState('')
  const [pulseRate, setPulseRate] = useState('')
  const [spo2, setSpo2] = useState('')

  const [sessionFiles, setSessionFiles] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [fileErrors, setFileErrors] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  // ── Consultation Forms state ──
  const [savedConsultationForms, setSavedConsultationForms] = useState([])
  const [pendingConsultationForms, setPendingConsultationForms] = useState([])
  const [consultationModalForm, setConsultationModalForm] = useState(null)
  const [modalHasRead, setModalHasRead] = useState(false)
  const [viewConsultationForm, setViewConsultationForm] = useState(null)
  const [deletingConsultationId, setDeletingConsultationId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Modal action handlers to prevent implicit form submits
  const handleModalCancel = (event) => {
    if (event && event.preventDefault) event.preventDefault()
    if (event && event.stopPropagation) event.stopPropagation()
    setConsultationModalForm(null)
  }

  const handleConfirmAttach = (event) => {
    if (event && event.preventDefault) event.preventDefault()
    if (event && event.stopPropagation) event.stopPropagation()

    if (!modalHasRead) return

    setPendingConsultationForms((prev) => [
      ...prev,
      {
        formId: consultationModalForm.id,
        formLabel: consultationModalForm.label,
      },
    ])
    setConsultationModalForm(null)
  }

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

        if (session.vitals) {
          setAge(session.vitals.age ? String(session.vitals.age) : '')
          setWeight(session.vitals.weight ? String(session.vitals.weight) : '')
          setBloodPressure(session.vitals.blood_pressure || '')
          setBloodSugar(session.vitals.blood_sugar ? String(session.vitals.blood_sugar) : '')
          setPulseRate(session.vitals.pulse_rate ? String(session.vitals.pulse_rate) : '')
          setSpo2(session.vitals.spo2 ? String(session.vitals.spo2) : '')
        }

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

        // Load existing session files
        const filesSnap = await getDocs(
          query(collection(db, 'session_files'), where('session_id', '==', sessionId)),
        )
        setSessionFiles(
          filesSnap.docs.map((fileDoc) => ({ id: fileDoc.id, ...fileDoc.data() })),
        )

        // Load existing consultation form records
        const consultationFormRecords = await getConsultationFormsForSession(sessionId)
        setSavedConsultationForms(consultationFormRecords)
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

  const handleFilesSelected = (event) => {
    const incomingFiles = Array.from(event.target.files || [])
    if (!incomingFiles.length) return

    const nextValid = []
    const nextErrors = []

    incomingFiles.forEach((file) => {
      // Check for duplicate in pendingFiles
      const isDuplicate = pendingFiles.some(
        (item) => item.name === file.name && item.size === file.size && item.type === file.type
      )
      if (isDuplicate) {
        nextErrors.push(`${file.name}: already added`)
        return
      }

      const result = validateSessionFile(file)
      if (result.valid) {
        nextValid.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
        })
      } else {
        nextErrors.push(`${file.name}: ${result.message}`)
      }
    })

    if (nextValid.length > 0) {
      setPendingFiles((prev) => [...prev, ...nextValid])
    }

    if (nextErrors.length > 0) {
      setFileErrors(nextErrors)
    } else {
      setFileErrors([])
    }

    event.target.value = ''
  }

  const removePendingFile = (fileId) => {
    setPendingFiles((prev) => prev.filter((item) => item.id !== fileId))
  }

  const handleUpdate = async () => {
    if (saving) return
    if (!chiefComplaint.trim()) {
      window.alert('Chief complaint is required')
      return
    }

    setSaving(true)
    const entriesToSave = [...chartEntries]
    const doctorsToSave = [...selectedDoctors]
    console.log('[EditSession] Update - chart entries:', entriesToSave.length)

    try {
      // 1. Fetch existing entries to delete
      const [oldCharts, oldDoctors] = await Promise.all([
        getDocs(
          query(collection(db, 'dental_chart_entries'), where('session_id', '==', sessionId)),
        ),
        getDocs(
          query(collection(db, 'session_doctors'), where('session_id', '==', sessionId)),
        ),
      ])

      // Guard: Firestore batch limits are 500 operations
      const totalOperations = 1 + oldCharts.size + entriesToSave.length + oldDoctors.size + doctorsToSave.length
      if (totalOperations > 450) {
        window.alert('Too many dental chart entries or doctors. Please reduce the entries to update.')
        return
      }

      const batch = writeBatch(db)

      // 2. Add session update to batch
      const sessionRef = doc(db, 'sessions', sessionId)
      batch.update(sessionRef, {
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
        vitals: {
          age: age ? parseInt(age) : null,
          weight: weight ? parseFloat(weight) : null,
          blood_pressure: bloodPressure.trim() || null,
          blood_sugar: bloodSugar ? parseFloat(bloodSugar) : null,
          pulse_rate: pulseRate ? parseInt(pulseRate) : null,
          spo2: spo2 ? parseInt(spo2) : null,
        },
        updated_at: serverTimestamp(),
      })

      // 3. Add deletions of old entries to batch
      oldCharts.docs.forEach((chartDoc) => batch.delete(chartDoc.ref))
      oldDoctors.docs.forEach((doctorDoc) => batch.delete(doctorDoc.ref))

      // 4. Add insertions of new entries to batch
      entriesToSave.forEach((entry) => {
        const entryRef = doc(collection(db, 'dental_chart_entries'))
        batch.set(entryRef, {
          session_id: sessionId,
          patient_id: patientId,
          region: entry.region,
          tooth_number: entry.tooth_number || null,
          procedure_done: entry.procedure_done,
          notes: entry.notes || null,
          created_at: serverTimestamp(),
        })
      })

      doctorsToSave.forEach((doctorId) => {
        const docRef = doc(collection(db, 'session_doctors'))
        batch.set(docRef, {
          session_id: sessionId,
          doctor_id: doctorId,
          created_at: serverTimestamp(),
        })
      })

      // 5. Commit atomic operation
      await batch.commit()
      console.log('[EditSession] Batch committed successfully')

      // Upload pending files if any are selected
      if (pendingFiles.length > 0) {
        try {
          setUploadingFile(true)
          const uploadResults = await Promise.allSettled(
            pendingFiles.map((item) => uploadSessionFile(item.file, patientId, sessionId))
          )

          const failedFiles = uploadResults
            .map((result, index) => ({ result, item: pendingFiles[index] }))
            .filter(({ result }) => result.status === 'rejected')
            .map(({ item, result }) => ({
              ...item,
              uploadError: result.reason?.message || 'Upload failed',
            }))

          if (failedFiles.length > 0) {
            setPendingFiles(failedFiles)
            setFileErrors(failedFiles.map((item) => `${item.name}: ${item.uploadError}`))
            showToast(
              'Session updated, but some document uploads failed. Click Update Session again to retry.',
              'warning',
            )
            return
          }

          setPendingFiles([])
          setFileErrors([])

          // Reload documents from Firestore
          const filesSnap = await getDocs(
            query(collection(db, 'session_files'), where('session_id', '==', sessionId)),
          )
          setSessionFiles(
            filesSnap.docs.map((fileDoc) => ({ id: fileDoc.id, ...fileDoc.data() })),
          )
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr)
          showToast(
            'Session updated, but document upload encountered an error. Click Update Session again to retry.',
            'warning',
          )
          return
        } finally {
          setUploadingFile(false)
        }
      }

      // Save new consultation form acknowledgements if any are attached
      if (pendingConsultationForms.length > 0) {
        try {
          let formsToUpload = [...pendingConsultationForms]
          const MAX_SYNC_ATTEMPTS = 3

          for (let syncAttempt = 1; syncAttempt <= MAX_SYNC_ATTEMPTS; syncAttempt += 1) {
            const results = await Promise.allSettled(
              formsToUpload.map(async (item) => {
                await saveConsultationFormRecord({
                  sessionId,
                  patientId,
                  formId: item.formId,
                  formLabel: item.formLabel,
                  signatureUrl: null,
                  storagePath: null,
                })
              }),
            )

            const failedForms = []
            const succeededForms = []

            results.forEach((result, index) => {
              if (result.status === 'fulfilled') {
                succeededForms.push(formsToUpload[index])
              } else {
                failedForms.push(formsToUpload[index])
              }
            })

            formsToUpload = failedForms

            if (formsToUpload.length === 0) {
              setPendingConsultationForms([])
              break
            }

            if (syncAttempt < MAX_SYNC_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, 400 * syncAttempt))
            }
          }

          if (formsToUpload.length > 0) {
            setPendingConsultationForms(formsToUpload)
            showToast(
              'Unable to sync some consultation acknowledgements to backend. Please check network and click Update Session once more.',
              'warning',
            )
            return
          }
        } catch (cfErr) {
          console.error('Consultation form upload error:', cfErr)
          showToast(
            'Consultation form sync failed unexpectedly. Please click Update Session once more.',
            'warning',
          )
          return
        }
      }

      showToast('Session updated successfully.', 'success')
      window.setTimeout(() => navigate(`/patients/${patientId}`), 700)
    } catch (error) {
      console.error('Update error:', error)
      showToast(error.message || 'Failed to update session.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this session permanently? This cannot be undone.')) {
      return
    }

    try {
      const [charts, doctors] = await Promise.all([
        getDocs(
          query(collection(db, 'dental_chart_entries'), where('session_id', '==', sessionId)),
        ),
        getDocs(query(collection(db, 'session_doctors'), where('session_id', '==', sessionId))),
      ])

      const batch = writeBatch(db)

      charts.docs.forEach((chartDoc) => batch.delete(chartDoc.ref))
      doctors.docs.forEach((doctorDoc) => batch.delete(doctorDoc.ref))
      batch.delete(doc(db, 'sessions', sessionId))

      await batch.commit()
      showToast('Session deleted!', 'success')
      navigate(`/patients/${patientId}`)
    } catch (error) {
      console.error('Delete error:', error)
      showToast(error.message || 'Failed to delete session.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 flex items-center justify-between bg-white border-b border-gray-200 px-4 sm:px-6 py-3 shrink-0">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="py-6 space-y-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl border bg-white p-4 shadow-sm">
                <div className="h-5 w-32 rounded bg-slate-100" />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="h-10 rounded bg-slate-50" />
                  <div className="h-10 rounded bg-slate-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50">
      {/* Sticky top bar - Sticks to the top of AppLayout's main scroll container */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <h1 className="text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">
            Edit Session — {patientName}
          </h1>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-red-400 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            disabled={saving}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            disabled={saving}
            className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Session'}
          </button>
        </div>
      </div>

      {/* Form content - Scrolls with AppLayout's primary scrollbar */}
      <div className="py-6 pb-16 space-y-4">
        <div className="mx-auto max-w-4xl space-y-4">
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
            <h2 className="mb-3 font-semibold">Vital Signs</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              <label className="text-sm text-gray-600">
                Age (years)
                <input
                  type="number" min="0" max="120"
                  placeholder="e.g. 35"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                Weight (kg)
                <input
                  type="number" min="0"
                  placeholder="e.g. 70"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                Blood Pressure
                <input
                  type="text"
                  placeholder="e.g. 120/80 mmHg"
                  value={bloodPressure}
                  onChange={e => setBloodPressure(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                Blood Sugar (mg/dL)
                <input
                  type="number" min="0"
                  placeholder="e.g. 110"
                  value={bloodSugar}
                  onChange={e => setBloodSugar(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                Pulse Rate (bpm)
                <input
                  type="number" min="0"
                  placeholder="e.g. 72"
                  value={pulseRate}
                  onChange={e => setPulseRate(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
              </label>
              <label className="text-sm text-gray-600">
                SPO2 (%)
                <input
                  type="number" min="0" max="100"
                  placeholder="e.g. 98"
                  value={spo2}
                  onChange={e => setSpo2(e.target.value)}
                  className="mt-1 w-full rounded border px-3 py-2"
                />
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
                type="text"
                value={chartForm.tooth_number}
                placeholder="e.g. 11, 36, 11 gamma (optional)"
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

          {/* ── Consultation Forms ─────────────────────────────────── */}
          <div className="mb-4 rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold">Consultation Forms</h2>
            <p className="mb-3 text-sm text-gray-600">
              Select consultation forms acknowledged by the patient.
            </p>
            <div className="flex flex-wrap gap-2">
              {CONSULTATION_FORMS.map((form) => {
                const isSaved = savedConsultationForms.some((s) => s.form_type === form.id)
                const isPending = pendingConsultationForms.some((p) => p.formId === form.id)
                const isAttached = isSaved || isPending
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => {
                      if (isAttached) return
                      setConsultationModalForm(form)
                      setModalHasRead(false)
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ring-1 transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isAttached
                        ? 'bg-teal-600 text-white ring-teal-600'
                        : 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isAttached && <Check className="h-3.5 w-3.5" />}
                    <FileText className="h-3.5 w-3.5" />
                    {form.label}
                  </button>
                )
              })}
            </div>

            {/* Saved (existing) consultation forms */}
            {savedConsultationForms.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Saved consultation forms ({savedConsultationForms.length})
                </p>
                {savedConsultationForms.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Check className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {record.form_label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const matchingForm = CONSULTATION_FORMS.find((f) => f.id === record.form_type)
                          setViewConsultationForm({ ...record, pdfFile: matchingForm?.file })
                        }}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                      <button
                        type="button"
                        disabled={deletingConsultationId === record.id}
                        onClick={async () => {
                          try {
                            setDeletingConsultationId(record.id)
                            await deleteConsultationFormRecord(record.id)
                            setSavedConsultationForms((prev) =>
                              prev.filter((r) => r.id !== record.id)
                            )
                            showToast('Consultation form removed.', 'success')
                          } catch (err) {
                            console.error('Delete consultation form error:', err)
                            showToast('Failed to delete consultation form.', 'error')
                          } finally {
                            setDeletingConsultationId(null)
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingConsultationId === record.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending (new) consultation forms */}
            {pendingConsultationForms.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  New consultation forms ({pendingConsultationForms.length})
                </p>
                {pendingConsultationForms.map((item) => (
                  <div
                    key={item.formId}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Check className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {item.formLabel}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingConsultationForms((prev) =>
                          prev.filter((p) => p.formId !== item.formId)
                        )
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Consultation Form Modal (Add New) ─────────────────── */}
          {consultationModalForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {consultationModalForm.label}
                  </h3>
                  <button
                    type="button"
                    onClick={handleModalCancel}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  <iframe
                    src={consultationModalForm.file}
                    style={{ width: '100%', height: '70vh', border: 'none' }}
                    title={consultationModalForm.label}
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalHasRead}
                      onChange={(e) => setModalHasRead(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      I confirm the patient has read and acknowledged this consultation form
                    </span>
                  </label>
                </div>
                <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 rounded-b-xl">
                  <button
                    type="button"
                    onClick={handleModalCancel}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!modalHasRead}
                    onClick={handleConfirmAttach}
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Confirm Acknowledgement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Read-Only View Modal ──────────────────────────────── */}
          {viewConsultationForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {viewConsultationForm.form_label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewConsultationForm(null)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  {viewConsultationForm.pdfFile && (
                    <iframe
                      src={viewConsultationForm.pdfFile}
                      style={{ width: '100%', height: '70vh', border: 'none' }}
                      title={viewConsultationForm.form_label}
                    />
                  )}
                  <p className="text-sm text-slate-600">Patient acknowledgement recorded for this consultation form.</p>
                </div>
                <div className="sticky bottom-0 flex items-center justify-end border-t border-slate-200 bg-white px-6 py-4 rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => setViewConsultationForm(null)}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {/* ── Documents Section ──────────────────────────────────── */}
          <div className="mb-6 rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold">Documents</h2>
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                <Paperclip className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-slate-400" />
                Allowed: PDF/JPG/PNG. Maximum file size: 0.5 MB per file. You can add multiple files.
              </p>

              {/* Upload control / File Picker */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFilesSelected}
                  className="flex-1 text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 file:transition hover:file:bg-slate-50"
                />
              </div>

              {fileErrors.length > 0 && (
                <div className="space-y-1">
                  {fileErrors.map((err, idx) => (
                    <p key={idx} className="text-xs text-red-600 font-medium">⚠️ {err}</p>
                  ))}
                </div>
              )}

              {/* Pending uploads list */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Pending uploads ({pendingFiles.length})
                  </p>
                  <div className="space-y-1.5">
                    {pendingFiles.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-teal-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-700">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {formatFileSize(item.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingFile(item.id)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploadingFile && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  Uploading documents…
                </div>
              )}

              {/* Existing files list */}
              {sessionFiles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Uploaded documents ({sessionFiles.length})
                  </p>
                  <div className="space-y-2">
                    {sessionFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {file.file_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(file.file_size_bytes)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => window.open(file.download_url, '_blank', 'noopener,noreferrer')}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </button>
                          {confirmDeleteId === file.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={deletingFileId === file.id}
                                onClick={async () => {
                                  try {
                                    setDeletingFileId(file.id)
                                    await deleteSessionFile(file.id, file.storage_path)
                                    setSessionFiles((prev) => prev.filter((f) => f.id !== file.id))
                                    showToast('File deleted', 'success')
                                  } catch (err) {
                                    console.error('Delete error:', err)
                                    showToast('Failed to delete file', 'error')
                                  } finally {
                                    setDeletingFileId(null)
                                    setConfirmDeleteId(null)
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {deletingFileId === file.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(file.id)}
                              className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
