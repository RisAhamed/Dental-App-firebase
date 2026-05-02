import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Syringe,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../hooks/useToast'

const initialForm = {
  visit_date: '',
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

const initialChartDraft = {
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

const fileTypeOptions = [
  { label: 'X-Ray', value: 'xray' },
  { label: 'Lab Report', value: 'report' },
  { label: 'Prescription', value: 'prescription' },
  { label: 'Photo', value: 'photo' },
  { label: 'Other', value: 'other' },
]

function EditSession() {
  const { id: sessionId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const filesRef = useRef([])

  const [patient, setPatient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [previousSessions, setPreviousSessions] = useState([])
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([])
  const [chartEntries, setChartEntries] = useState([])
  const [chartDraft, setChartDraft] = useState(initialChartDraft)
  const [editingChartId, setEditingChartId] = useState(null)
  const [existingFiles, setExistingFiles] = useState([])
  const [newFiles, setNewFiles] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [confirmingFileId, setConfirmingFileId] = useState(null)
  const [deletingFileId, setDeletingFileId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingSession, setDeletingSession] = useState(false)

  const patientId = patient?.id || ''

  const paymentStatus = useMemo(() => {
    const cost = Number(formData.treatment_cost || 0)
    const paid = Number(formData.amount_paid || 0)

    if (cost <= 0 && paid <= 0) return 'Pending'
    if (paid <= 0 && cost > 0) return 'Pending'
    if (paid > 0 && paid < cost) return 'Partial'
    return 'Paid'
  }, [formData.amount_paid, formData.treatment_cost])

  const fetchSessionData = useCallback(async () => {
    setLoading(true)

    if (!sessionId) {
      showToast('Missing session id in the URL.', 'error')
      setLoading(false)
      return
    }

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select(
          'id, patient_id, visit_date, visit_type, followup_of, chief_complaint, diagnosis, treatment_given, treatment_cost, amount_paid, payment_status, injection_given, injection_details, notes, next_visit_date',
        )
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionError) throw sessionError
      if (!session) throw new Error('Session not found.')

      const [
        { data: patientData, error: patientError },
        { data: chartData, error: chartError },
        { data: sessionDoctorData, error: sessionDoctorError },
        { data: fileData, error: fileError },
        { data: activeDoctorData, error: activeDoctorError },
        { data: previousSessionData, error: previousSessionError },
      ] = await Promise.all([
        supabase
          .from('patients')
          .select('id, full_name, patient_id')
          .eq('id', session.patient_id)
          .maybeSingle(),
        supabase
          .from('dental_chart_entries')
          .select('id, region, tooth_number, procedure_done, notes')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true }),
        supabase
          .from('session_doctors')
          .select('doctor_id, doctors(id, name, specialty)')
          .eq('session_id', sessionId),
        supabase
          .from('session_files')
          .select(
            'id, file_name, file_type, file_url, storage_path, description, file_size',
          )
          .eq('session_id', sessionId)
          .order('uploaded_at', { ascending: true }),
        supabase
          .from('doctors')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('sessions')
          .select('id, visit_date, chief_complaint')
          .eq('patient_id', session.patient_id)
          .neq('id', sessionId)
          .order('visit_date', { ascending: false }),
      ])

      if (patientError) throw patientError
      if (chartError) throw chartError
      if (sessionDoctorError) throw sessionDoctorError
      if (fileError) throw fileError
      if (activeDoctorError) throw activeDoctorError
      if (previousSessionError) throw previousSessionError

      const linkedDoctors = (sessionDoctorData || [])
        .map((row) => row.doctors)
        .filter(Boolean)
      const linkedDoctorIds = (sessionDoctorData || [])
        .map((row) => row.doctor_id)
        .filter(Boolean)
      console.log('selected doctors on load:', linkedDoctorIds)
      const activeDoctors = activeDoctorData || []
      const missingLinkedDoctors = linkedDoctors.filter(
        (doctor) => !activeDoctors.some((activeDoctor) => activeDoctor.id === doctor.id),
      )

      setPatient(patientData)
      setDoctors([...activeDoctors, ...missingLinkedDoctors])
      setPreviousSessions(previousSessionData || [])
      setSelectedDoctorIds(linkedDoctorIds)
      setChartEntries(
        (chartData || []).map((entry) => ({
          id: entry.id,
          region: entry.region,
          tooth_number: entry.tooth_number || '',
          procedure_done: entry.procedure_done || '',
          notes: entry.notes || '',
        })),
      )
      setExistingFiles(fileData || [])
      setFormData({
        visit_date: session.visit_date || '',
        visit_type: session.visit_type || 'New',
        followup_of: session.followup_of || '',
        chief_complaint: session.chief_complaint || '',
        diagnosis: session.diagnosis || '',
        treatment_given: session.treatment_given || '',
        injection_given: Boolean(session.injection_given),
        injection_details: session.injection_details || '',
        treatment_cost: session.treatment_cost ?? '',
        amount_paid: session.amount_paid ?? '',
        notes: session.notes || '',
        next_visit_date: session.next_visit_date || '',
      })
    } catch (fetchError) {
      showToast(fetchError.message || 'Unable to load session.', 'error')
    } finally {
      setLoading(false)
    }
  }, [sessionId, showToast])

  useEffect(() => {
    Promise.resolve().then(fetchSessionData)
  }, [fetchSessionData])

  useEffect(() => {
    filesRef.current = newFiles
  }, [newFiles])

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])

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
    setChartDraft((current) => ({ ...current, [name]: value }))
  }

  const addOrUpdateChartEntry = () => {
    if (!chartDraft.procedure_done.trim()) {
      showToast('Procedure Done is required.', 'warning')
      return
    }

    const nextEntry = {
      id: editingChartId || crypto.randomUUID(),
      region: chartDraft.region,
      tooth_number: chartDraft.tooth_number.trim(),
      procedure_done: chartDraft.procedure_done.trim(),
      notes: chartDraft.notes.trim(),
    }

    setChartEntries((current) =>
      editingChartId
        ? current.map((entry) => (entry.id === editingChartId ? nextEntry : entry))
        : [...current, nextEntry],
    )
    setChartDraft(initialChartDraft)
    setEditingChartId(null)
  }

  const editChartEntry = (entry) => {
    setEditingChartId(entry.id)
    setChartDraft({
      region: entry.region,
      tooth_number: entry.tooth_number || '',
      procedure_done: entry.procedure_done || '',
      notes: entry.notes || '',
    })
  }

  const removeChartEntry = (entryId) => {
    setChartEntries((current) => current.filter((entry) => entry.id !== entryId))
    if (editingChartId === entryId) {
      setChartDraft(initialChartDraft)
      setEditingChartId(null)
    }
  }

  const toggleDoctor = (doctorId) => {
    setSelectedDoctorIds((current) =>
      current.includes(doctorId)
        ? current.filter((id) => id !== doctorId)
        : [...current, doctorId],
    )
  }

  const handleFileSelect = (selectedFiles) => {
    const nextFiles = Array.from(selectedFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      file_type: guessFileType(file),
      description: '',
      progress: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }))

    setNewFiles((current) => [...current, ...nextFiles])
  }

  const updateNewFile = (fileId, patch) => {
    setNewFiles((current) =>
      current.map((item) => (item.id === fileId ? { ...item, ...patch } : item)),
    )
  }

  const removeNewFile = (fileId) => {
    setNewFiles((current) => {
      const fileToRemove = current.find((item) => item.id === fileId)
      if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl)
      return current.filter((item) => item.id !== fileId)
    })
  }

  const uploadNewFiles = async () => {
    const uploadedFiles = []

    if (newFiles.length > 0) {
      await ensurePatientFilesBucketIsPublic()
    }

    for (const item of newFiles) {
      updateNewFile(item.id, { progress: 20 })

      const filePath = `${patientId}/${formData.visit_date}/${Date.now()}_${sanitizeFileName(
        item.file.name,
      )}`

      updateNewFile(item.id, { progress: 55 })

      const { error } = await supabase.storage
        .from('patient-files')
        .upload(filePath, item.file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      updateNewFile(item.id, { progress: 85 })

      const { data: urlData } = supabase.storage
        .from('patient-files')
        .getPublicUrl(filePath)

      uploadedFiles.push({
        file_name: item.file.name,
        file_type: item.file_type,
        file_url: urlData.publicUrl,
        storage_path: `patient-files/${filePath}`,
        file_size: item.file.size,
        description: item.description.trim() || null,
      })

      updateNewFile(item.id, { progress: 100 })
    }

    return uploadedFiles
  }

  const deleteExistingFile = async (file) => {
    setDeletingFileId(file.id)

    const previousFiles = existingFiles
    setExistingFiles((current) => current.filter((item) => item.id !== file.id))

    try {
      const storagePath = normalizeStoragePath(file.storage_path)
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('patient-files')
          .remove([storagePath])

        if (storageError) throw storageError
      }

      const { error: deleteError } = await supabase
        .from('session_files')
        .delete()
        .eq('id', file.id)

      if (deleteError) throw deleteError

      setConfirmingFileId(null)
      showToast('File deleted successfully', 'success')
    } catch (deleteError) {
      setExistingFiles(previousFiles)
      showToast(deleteError.message || 'Unable to delete file.', 'error')
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleDeleteSession = async () => {
    setDeletingSession(true)

    try {
      const filePaths = existingFiles
        .map((file) => normalizeStoragePath(file.storage_path))
        .filter(Boolean)

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('patient-files')
          .remove(filePaths)

        if (storageError) throw storageError
      }

      const { error: filesDeleteError } = await supabase
        .from('session_files')
        .delete()
        .eq('session_id', sessionId)

      if (filesDeleteError) throw filesDeleteError

      const { error: chartDeleteError } = await supabase
        .from('dental_chart_entries')
        .delete()
        .eq('session_id', sessionId)

      if (chartDeleteError) throw chartDeleteError

      const { error: doctorsDeleteError } = await supabase
        .from('session_doctors')
        .delete()
        .eq('session_id', sessionId)

      if (doctorsDeleteError) throw doctorsDeleteError

      const { error: sessionDeleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (sessionDeleteError) throw sessionDeleteError

      showToast('Session deleted successfully', 'success')
      window.setTimeout(() => navigate(`/patients/${patientId}`), 700)
    } catch (deleteError) {
      showToast(deleteError.message || 'Unable to delete session.', 'error')
    } finally {
      setDeletingSession(false)
    }
  }

  const handleUpdate = async (event) => {
    event.preventDefault()

    if (!formData.chief_complaint.trim()) {
      showToast('Chief Complaint is required.', 'warning')
      return
    }

    setSaving(true)

    try {
      const sessionPayload = {
        visit_date: formData.visit_date,
        visit_type: formData.visit_type,
        followup_of:
          formData.visit_type === 'Follow-up' && formData.followup_of
            ? formData.followup_of
            : null,
        chief_complaint: formData.chief_complaint.trim(),
        diagnosis: formData.diagnosis.trim() || null,
        treatment_given: formData.treatment_given.trim() || null,
        injection_given: formData.injection_given,
        injection_details: formData.injection_given
          ? formData.injection_details.trim() || null
          : null,
        treatment_cost: Number(formData.treatment_cost || 0),
        amount_paid: Number(formData.amount_paid || 0),
        payment_status: paymentStatus,
        notes: formData.notes.trim() || null,
        next_visit_date: formData.next_visit_date || null,
        updated_at: new Date().toISOString(),
      }

      const { error: sessionUpdateError } = await supabase
        .from('sessions')
        .update(sessionPayload)
        .eq('id', sessionId)

      if (sessionUpdateError) throw sessionUpdateError

      const { error: chartDeleteError } = await supabase
        .from('dental_chart_entries')
        .delete()
        .eq('session_id', sessionId)

      if (chartDeleteError) throw chartDeleteError

      if (chartEntries.length > 0) {
        const entries = chartEntries.map((entry) => ({
          session_id: sessionId,
          patient_id: patientId,
          region: entry.region,
          tooth_number: entry.tooth_number || null,
          procedure_done: entry.procedure_done,
          notes: entry.notes || null,
        }))

        const { error: chartInsertError } = await supabase
          .from('dental_chart_entries')
          .insert(entries)

        if (chartInsertError) {
          console.error('Chart insert error:', chartInsertError)
          throw chartInsertError
        }
      }

      const { error: doctorsDeleteError } = await supabase
        .from('session_doctors')
        .delete()
        .eq('session_id', sessionId)

      if (doctorsDeleteError) throw doctorsDeleteError

      if (selectedDoctorIds.length > 0) {
        const { error: doctorsInsertError } = await supabase
          .from('session_doctors')
          .insert(
            selectedDoctorIds.map((doctorId) => ({
              session_id: sessionId,
              doctor_id: doctorId,
            })),
          )

        if (doctorsInsertError) throw doctorsInsertError
      }

      if (newFiles.length > 0) {
        try {
          const uploadedFiles = await uploadNewFiles()

          if (uploadedFiles.length > 0) {
            const { error: filesInsertError } = await supabase
              .from('session_files')
              .insert(
                uploadedFiles.map((file) => ({
                  ...file,
                  session_id: sessionId,
                  patient_id: patientId,
                })),
              )

            if (filesInsertError) throw filesInsertError
          }
        } catch (fileError) {
          console.error('File upload or metadata insert error:', fileError)
          showToast(
            'Session saved, but file upload failed. You can add files later by editing this session.',
            'warning',
          )
          return
        }
      }

      showToast('Session updated successfully', 'success')
      window.setTimeout(() => navigate(`/patients/${patientId}`), 700)
    } catch (updateError) {
      showToast(updateError.message || 'Unable to update session.', 'error')
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
    <form onSubmit={handleUpdate} className="space-y-6 pb-24">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
          Edit Session — {patient?.full_name || 'Patient'}
        </h2>
        <p className="text-sm text-slate-600">
          Update clinical details, charting, billing, doctors, and attachments.
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
          <Field
            label="Chief Complaint"
            name="chief_complaint"
            required
            className="lg:col-span-2"
          >
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
              value={chartDraft.region}
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
              value={chartDraft.tooth_number}
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
              value={chartDraft.procedure_done}
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
              value={chartDraft.notes}
              onChange={handleChartDraftChange}
              className={inputClassName}
              placeholder="Optional notes"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addOrUpdateChartEntry}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            {editingChartId ? 'Update Entry' : 'Add Entry'}
          </button>
          {editingChartId && (
            <button
              type="button"
              onClick={() => {
                setEditingChartId(null)
                setChartDraft(initialChartDraft)
              }}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {chartEntries.length > 0 && (
          <div className="mt-5 space-y-3">
            {chartEntries.map((entry) => (
              <div
                key={entry.id}
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editChartEntry(entry)}
                    className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeChartEntry(entry.id)}
                    className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
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
              const isSelected = selectedDoctorIds.includes(doctor.id)
              return (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => toggleDoctor(doctor.id)}
                  className={`rounded-full px-3 py-2 text-sm font-medium ring-1 transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isSelected
                      ? 'bg-teal-600 text-white ring-teal-600'
                      : 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {doctor.name}
                  {doctor.specialty && (
                    <span className={isSelected ? 'text-teal-50' : 'text-slate-500'}>
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
            <p className="text-sm font-medium text-slate-700">Payment Status</p>
            <span
              className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${paymentStatusClassName(
                paymentStatus,
              )}`}
            >
              {paymentStatus}
            </span>
          </div>
        </div>
      </Section>

      <Section title="Attachments">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            handleFileSelect(event.dataTransfer.files)
          }}
          className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
            isDragging
              ? 'border-teal-400 bg-teal-50'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <Upload className="h-8 w-8 text-slate-500" />
          <span className="mt-3 text-sm font-medium text-slate-800">
            Drop new files here or click to browse
          </span>
          <span className="mt-1 text-xs text-slate-500">
            X-rays, reports, prescriptions, photos, or PDFs
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFileSelect(event.target.files)
            event.target.value = ''
          }}
        />

        {existingFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-900">Existing files</h4>
            <div className="mt-3 space-y-3">
              {existingFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {file.file_name}
                        </p>
                        <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
                          {file.file_type}
                        </Badge>
                      </div>
                      {file.description && (
                        <p className="mt-1 text-xs text-slate-500">
                          {file.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </a>
                      {confirmingFileId === file.id ? (
                        <div className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs">
                          <span className="text-slate-600">Are you sure?</span>
                          <button
                            type="button"
                            onClick={() => deleteExistingFile(file)}
                            disabled={deletingFileId === file.id}
                            className="font-medium text-rose-700 disabled:opacity-60"
                          >
                            {deletingFileId === file.id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingFileId(null)}
                            className="font-medium text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingFileId(file.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete File
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {newFiles.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-semibold text-slate-900">New files</h4>
            {newFiles.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-24 w-24 rounded-md object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                      <FileText className="h-8 w-8" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.file.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewFile(item.id)}
                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Remove ${item.file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <Field label="File Type" name={`file_type_${item.id}`}>
                        <select
                          id={`file_type_${item.id}`}
                          value={item.file_type}
                          onChange={(event) =>
                            updateNewFile(item.id, { file_type: event.target.value })
                          }
                          className={inputClassName}
                        >
                          {fileTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Description" name={`file_description_${item.id}`}>
                        <input
                          id={`file_description_${item.id}`}
                          type="text"
                          value={item.description}
                          onChange={(event) =>
                            updateNewFile(item.id, { description: event.target.value })
                          }
                          className={inputClassName}
                          placeholder="Optional description"
                        />
                      </Field>
                    </div>
                    {item.progress > 0 && (
                      <div className="mt-4">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-600 transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload progress: {item.progress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      <div className="sticky bottom-0 z-20 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={saving || deletingSession}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-300 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              Delete Session
            </button>
            <button
              type="submit"
              disabled={saving || !patientId || deletingSession}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Update Session
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-normal text-slate-950">
                  Delete This Session?
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will permanently delete this session, all its dental chart
                  entries, and all attached files. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingSession}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={deletingSession}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingSession ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
          step="0.01"
          value={value}
          onChange={onChange}
          className={`${inputClassName} pl-8`}
          placeholder="0.00"
        />
      </div>
    </Field>
  )
}

function Badge({ className, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}
    >
      {children}
    </span>
  )
}

const inputClassName =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'

const textareaClassName =
  'mt-1 block w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return format(parseISO(dateValue), 'dd MMM yyyy')
}

function paymentStatusClassName(status) {
  if (status === 'Paid') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'Partial') return 'bg-orange-50 text-orange-700 ring-orange-200'
  return 'bg-yellow-50 text-yellow-700 ring-yellow-200'
}

function guessFileType(file) {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type === 'application/pdf') return 'report'
  return 'other'
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function normalizeStoragePath(storagePath) {
  if (!storagePath) return ''
  return storagePath.replace(/^patient-files\//, '')
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function ensurePatientFilesBucketIsPublic() {
  const { data, error } = await supabase.storage.getBucket('patient-files')

  if (error) {
    throw new Error(
      'Unable to verify the patient-files storage bucket. Confirm it exists and storage policies allow access.',
    )
  }

  if (!data?.public) {
    throw new Error('The patient-files storage bucket must exist and be public.')
  }
}

export default EditSession
