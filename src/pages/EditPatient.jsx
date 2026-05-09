import { useEffect, useState } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import { db } from '../lib/firebase'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

const emptyForm = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  blood_group: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  allergies: '',
  medical_conditions: '',
  current_medications: '',
  previous_dental_history: '',
  notes: '',
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const inputClassName =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'

function EditPatient() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const snap = await getDoc(doc(db, 'patients', patientId))
        if (!snap.exists()) return

        const data = snap.data()

        setForm({
          full_name: data.full_name || '',
          date_of_birth: formatInputDate(data.date_of_birth || data.dob),
          gender: data.gender || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          blood_group: data.blood_group || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          allergies: data.allergies || '',
          medical_conditions: data.medical_conditions || '',
          current_medications: data.current_medications || '',
          previous_dental_history: data.previous_dental_history || '',
          notes: data.notes || '',
        })
      } catch (error) {
        showToast(error.message || 'Failed to load patient.', 'error')
      } finally {
        setLoading(false)
      }
    }

    Promise.resolve().then(load)
  }, [patientId, showToast])

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      showToast('Full name is required.', 'warning')
      return
    }

    if (!form.phone.trim()) {
      showToast('Phone number is required.', 'warning')
      return
    }

    setSaving(true)

    try {
      const payload = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || null,
        dob: form.date_of_birth || null,
        gender: form.gender || null,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        blood_group: form.blood_group || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        allergies: form.allergies.trim() || null,
        medical_conditions: form.medical_conditions.trim() || null,
        current_medications: form.current_medications.trim() || null,
        previous_dental_history: form.previous_dental_history.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: serverTimestamp(),
      }

      await updateDoc(doc(db, 'patients', patientId), payload)

      showToast('Patient updated successfully.', 'success')
      navigate(`/patients/${patientId}`)
    } catch (error) {
      showToast(error.message || 'Failed to update patient.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading patient...
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-32 text-slate-950 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-normal text-slate-900">
        Edit Patient
      </h1>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required className="sm:col-span-2">
            <input
              value={form.full_name}
              onChange={(event) => handleChange('full_name', event.target.value)}
              className={inputClassName}
              placeholder="Patient full name"
            />
          </Field>

          <Field label="Date of Birth">
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(event) => handleChange('date_of_birth', event.target.value)}
              className={inputClassName}
            />
          </Field>

          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(event) => handleChange('gender', event.target.value)}
              className={`${inputClassName} bg-white`}
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>

          <Field label="Phone" required>
            <input
              value={form.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              className={inputClassName}
              placeholder="+91 XXXXX XXXXX"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              className={inputClassName}
              placeholder="patient@email.com"
            />
          </Field>

          <Field label="Address" className="sm:col-span-2">
            <textarea
              value={form.address}
              onChange={(event) => handleChange('address', event.target.value)}
              className={inputClassName}
              rows="2"
            />
          </Field>

          <Field label="Blood Group">
            <select
              value={form.blood_group}
              onChange={(event) => handleChange('blood_group', event.target.value)}
              className={`${inputClassName} bg-white`}
            >
              <option value="">Select</option>
              {bloodGroups.map((bloodGroup) => (
                <option key={bloodGroup}>{bloodGroup}</option>
              ))}
            </select>
          </Field>

          <Field label="Emergency Contact Name">
            <input
              value={form.emergency_contact_name}
              onChange={(event) =>
                handleChange('emergency_contact_name', event.target.value)
              }
              className={inputClassName}
            />
          </Field>

          <Field label="Emergency Contact Phone" className="sm:col-span-2">
            <input
              value={form.emergency_contact_phone}
              onChange={(event) =>
                handleChange('emergency_contact_phone', event.target.value)
              }
              className={inputClassName}
            />
          </Field>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold tracking-normal text-slate-700">
          Medical History
        </h2>
        <div className="mt-4 space-y-4">
          <Field
            label={
              <>
                Known Allergies
                <span className="ml-2 text-xs font-medium text-red-500">
                  Important for treatment
                </span>
              </>
            }
          >
            <textarea
              value={form.allergies}
              onChange={(event) => handleChange('allergies', event.target.value)}
              className={inputClassName}
              rows="2"
              placeholder="e.g. Penicillin, Latex, Aspirin - or None"
            />
          </Field>

          <Field label="Medical Conditions / Systemic Diseases">
            <textarea
              value={form.medical_conditions}
              onChange={(event) =>
                handleChange('medical_conditions', event.target.value)
              }
              className={inputClassName}
              rows="2"
              placeholder="e.g. Diabetes Type 2, Hypertension, Heart disease - or None"
            />
          </Field>

          <Field label="Current Medications">
            <textarea
              value={form.current_medications}
              onChange={(event) =>
                handleChange('current_medications', event.target.value)
              }
              className={inputClassName}
              rows="2"
              placeholder="e.g. Metformin 500mg, Amlodipine 5mg - or None"
            />
          </Field>

          <Field label="Previous Dental History">
            <textarea
              value={form.previous_dental_history}
              onChange={(event) =>
                handleChange('previous_dental_history', event.target.value)
              }
              className={inputClassName}
              rows="2"
              placeholder="e.g. Root canal in 2020, dentures, orthodontic treatment"
            />
          </Field>

          <Field label="Internal Notes (Staff Only)">
            <textarea
              value={form.notes}
              onChange={(event) => handleChange('notes', event.target.value)}
              className={inputClassName}
              rows="2"
              placeholder="e.g. Patient is anxious, needs extra time"
            />
          </Field>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-4 sm:px-6 md:left-16 lg:left-60">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  )
}

function Field({ label, required = false, className = '', children }) {
  return (
    <label className={`block text-sm font-medium text-slate-600 ${className}`}>
      <span>
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      {children}
    </label>
  )
}

function formatInputDate(dateValue) {
  if (!dateValue) return ''
  const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

export default EditPatient
