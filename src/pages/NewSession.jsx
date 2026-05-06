import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle,
  ChevronDown,
  FileText,
  Loader2,
  Plus,
  Save,
  Syringe,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabaseClient'

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

const fileTypeOptions = [
  { label: 'X-Ray', value: 'xray' },
  { label: 'Lab Report', value: 'report' },
  { label: 'Prescription', value: 'prescription' },
  { label: 'Photo', value: 'photo' },
  { label: 'Other', value: 'other' },
]

const BUCKET_NAME = 'patient-files'

function NewSession() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const filesRef = useRef([])
  const chartEntriesRef = useRef([])
  const patientId = new URLSearchParams(location.search).get('patientId')

  const [patient, setPatient] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [previousSessions, setPreviousSessions] = useState([])
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([])
  const [chartEntries, setChartEntries] = useState([])
  const [chartForm, setChartForm] = useState(initialChartForm)
  const [files, setFiles] = useState([])
  const [formData, setFormData] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const paymentStatus = useMemo(() => {
    const cost = Number(formData.treatment_cost || 0)
    const paid = Number(formData.amount_paid || 0)

    if (cost <= 0 && paid <= 0) return 'Pending'
    if (paid <= 0 && cost > 0) return 'Pending'
    if (paid > 0 && paid < cost) return 'Partial'
    return 'Paid'
  }, [formData.amount_paid, formData.treatment_cost])

  const fetchInitialData = useCallback(async () => {
    setLoading(true)

    if (!patientId) {
      showToast('Missing patientId in the URL.', 'error')
      setLoading(false)
      return
    }

    try {
      const [
        { data: patientData, error: patientError },
        { data: doctorData, error: doctorError },
        { data: sessionData, error: sessionError },
      ] = await Promise.all([
        supabase
          .from('patients')
          .select('id, full_name, patient_id')
          .eq('id', patientId)
          .maybeSingle(),
        supabase
          .from('doctors')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('sessions')
          .select('id, visit_date, chief_complaint')
          .eq('patient_id', patientId)
          .order('visit_date', { ascending: false }),
      ])

      if (patientError) throw patientError
      if (doctorError) throw doctorError
      if (sessionError) throw sessionError

      setPatient(patientData)
      setDoctors(doctorData || [])
      setPreviousSessions(sessionData || [])
    } catch (fetchError) {
      showToast(fetchError.message || 'Unable to load session setup data.', 'error')
    } finally {
      setLoading(false)
    }
  }, [patientId, showToast])

  useEffect(() => {
    Promise.resolve().then(fetchInitialData)
  }, [fetchInitialData])

  useEffect(() => {
    async function logAvailableBuckets() {
      const { data: buckets } = await supabase.storage.listBuckets()
      console.log('Available buckets:', buckets)
    }

    Promise.resolve().then(logAvailableBuckets)
  }, [])

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    chartEntriesRef.current = chartEntries
    console.log('chartEntriesRef updated:', chartEntriesRef.current)
  }, [chartEntries])

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

  const handleFileSelect = (selectedFiles) => {
    const nextFiles = Array.from(selectedFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
      file_type: guessFileType(file),
      description: '',
      progress: 0,
      status: 'idle',
      errorMessage: '',
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    }))

    setFiles((current) => [...current, ...nextFiles])
  }

  const updateFile = (fileId, patch) => {
    setFiles((current) =>
      current.map((item) => (item.id === fileId ? { ...item, ...patch } : item)),
    )
  }

  const removeFile = (fileId) => {
    setFiles((current) => {
      const fileToRemove = current.find((item) => item.id === fileId)
      if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl)
      return current.filter((item) => item.id !== fileId)
    })
  }

  const uploadFiles = async () => {
    const uploadedFiles = []

    for (const item of files) {
      try {
        updateFile(item.id, {
          progress: 20,
          status: 'uploading',
          errorMessage: '',
        })

        const uploadedFile = await uploadFile(
          item.file,
          patientId,
          formData.visit_date,
        )

        uploadedFiles.push({
          name: item.file.name,
          fileType: item.file_type,
          url: uploadedFile.url,
          path: uploadedFile.path,
          size: item.file.size,
          description: item.description.trim() || null,
        })

        updateFile(item.id, { progress: 100, status: 'success' })
      } catch (fileError) {
        console.error('File upload error:', fileError)
        updateFile(item.id, {
          progress: 100,
          status: 'error',
          errorMessage: fileError.message || 'Upload failed',
        })
      }
    }

    return uploadedFiles
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
      const currentSelectedDoctors = [...selectedDoctorIds]
      console.log('[NewSession] Chart entries at save:', entriesToSave)
      console.log('[NewSession] Count:', entriesToSave.length)

      const sessionPayload = {
        patient_id: currentPatientId,
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
      }

      let chartSaveFailed = false

      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert(sessionPayload)
        .select('id')
        .single()

      if (sessionError) throw sessionError

      // Save dental chart entries
      if (entriesToSave.length > 0) {
        const chartRows = entriesToSave.map((entry) => ({
          session_id: newSession.id,
          patient_id: currentPatientId,
          region: entry.region,
          tooth_number: entry.tooth_number || null,
          procedure_done: entry.procedure_done,
          notes: entry.notes || null,
        }))

        console.log('[NewSession] Inserting chart rows:', chartRows)

        const { data: chartResult, error: chartError } = await supabase
          .from('dental_chart_entries')
          .insert(chartRows)
          .select()

        if (chartError) {
          chartSaveFailed = true
          console.error(
            '[NewSession] CHART INSERT FAILED:',
            chartError.message,
            chartError.details,
          )
          showToast(`Chart entries failed to save: ${chartError.message}`, 'warning')
        } else {
          console.log('[NewSession] CHART INSERT SUCCESS:', chartResult)
        }
      } else {
        console.log('No chart entries to save, skipping')
      }

      if (currentSelectedDoctors.length > 0) {
        const { error: doctorsInsertError } = await supabase
          .from('session_doctors')
          .insert(
            currentSelectedDoctors.map((doctorId) => ({
              session_id: newSession.id,
              doctor_id: doctorId,
            })),
          )

        if (doctorsInsertError) throw doctorsInsertError
      }

      if (files.length > 0) {
        try {
          const uploadedFiles = await uploadFiles()
          console.log('Uploaded files before metadata insert:', uploadedFiles)

          if (uploadedFiles.length > 0) {
            const filesToInsert = uploadedFiles.map((file) => ({
              session_id: newSession.id,
                  patient_id: currentPatientId,
              file_name: file.name,
              file_type: file.fileType || 'other',
              file_url: file.url,
              storage_path: file.path,
              file_size: file.size || null,
              description: file.description || null,
            }))

            console.log('Inserting file metadata:', filesToInsert)

            const { error: filesError } = await supabase
              .from('session_files')
              .insert(filesToInsert)

            if (filesError) {
              console.error('Files metadata insert error:', filesError)
              showToast(
                `Session saved but file metadata failed: ${filesError.message}`,
                'warning',
              )
              window.setTimeout(() => navigate(`/patients/${currentPatientId}`), 700)
              return
            }
          }

          if (uploadedFiles.length < files.length) {
            showToast(
              'Session saved, but one or more file uploads failed. You can add files later by editing this session.',
              'warning',
            )
            window.setTimeout(() => navigate(`/patients/${currentPatientId}`), 700)
            return
          }
        } catch (fileError) {
          console.error('File upload or metadata insert error:', fileError)
          showToast(
            'Session saved, but file upload failed. You can add files later by editing this session.',
            'warning',
          )
          window.setTimeout(() => navigate(`/patients/${currentPatientId}`), 700)
          return
        }
      }

      if (!chartSaveFailed) {
        showToast('Session saved successfully', 'success')
      }
      window.setTimeout(() => navigate(`/patients/${currentPatientId}`), 700)
    } catch (saveError) {
      showToast(saveError.message || 'Unable to save session.', 'error')
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
            Drop files here or click to browse
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

        {files.length > 0 && (
          <div className="mt-5 space-y-4">
            {files.map((item) => (
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
                        onClick={() => removeFile(item.id)}
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
                            updateFile(item.id, { file_type: event.target.value })
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
                            updateFile(item.id, { description: event.target.value })
                          }
                          className={inputClassName}
                          placeholder="Optional description"
                        />
                      </Field>
                    </div>
                    {item.progress > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.status === 'error'
                                  ? 'bg-rose-500'
                                  : 'bg-teal-600'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <UploadStatusIcon status={item.status} />
                        </div>
                        <p
                          className={`mt-1 text-xs ${
                            item.status === 'error'
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.status === 'error'
                            ? item.errorMessage
                            : `Upload progress: ${item.progress}%`}
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

function UploadStatusIcon({ status }) {
  if (status === 'uploading') {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-600" />
  }

  if (status === 'success') {
    return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
  }

  if (status === 'error') {
    return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
  }

  return null
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

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function uploadFile(file, patientId, visitDate) {
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${patientId}/${visitDate}/${timestamp}_${safeName}`
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, { cacheControl: '3600', upsert: true })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath)
  console.log('Generated public URL:', data.publicUrl)

  return { url: data.publicUrl, path: filePath }
}

export default NewSession
