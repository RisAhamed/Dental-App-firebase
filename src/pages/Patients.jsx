import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Search, User, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Skeleton from '../components/Skeleton'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  full_name: '',
  dob: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  blood_group: '',
  allergies: '',
  medical_history: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

const genderOptions = ['Male', 'Female', 'Other']
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const patientColumns =
  'id, patient_id, full_name, dob, gender, phone, email, address, blood_group, allergies, medical_history, emergency_contact_name, emergency_contact_phone, created_at'

function Patients() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const currentYear = useMemo(() => new Date().getFullYear(), [])

  const fetchPatients = useCallback(async (searchValue = '') => {
    setLoading(true)

    try {
      let query = supabase
        .from('patients')
        .select(patientColumns)
        .order('created_at', { ascending: false })

      const cleanedSearch = searchValue.trim().replace(/[,%]/g, '')

      if (cleanedSearch) {
        const pattern = `%${cleanedSearch}%`
        query = query.or(
          `full_name.ilike.${pattern},phone.ilike.${pattern},patient_id.ilike.${pattern}`,
        )
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setPatients(data || [])
    } catch (fetchError) {
      showToast(fetchError.message || 'Unable to load patients.', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    Promise.resolve().then(() => fetchPatients(debouncedSearch))
  }, [debouncedSearch, fetchPatients])

  const openAddModal = () => {
    setFormData(emptyForm)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setIsModalOpen(false)
    setFormData(emptyForm)
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const generatePatientId = async () => {
    const prefix = `DC-${currentYear}-`

    const { data, error: patientIdError } = await supabase
      .from('patients')
      .select('patient_id')
      .ilike('patient_id', `${prefix}%`)
      .order('patient_id', { ascending: false })
      .limit(1)

    if (patientIdError) throw patientIdError

    const lastPatientId = data?.[0]?.patient_id
    const lastSequence = Number.parseInt(lastPatientId?.split('-')[2] || '0', 10)
    const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1

    return `${prefix}${String(nextSequence).padStart(4, '0')}`
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formData.full_name.trim() || !formData.phone.trim()) {
      showToast('Full Name and Phone are required.', 'warning')
      return
    }

    setSaving(true)

    try {
      const patientId = await generatePatientId()
      const payload = {
        patient_id: patientId,
        full_name: formData.full_name.trim(),
        dob: formData.dob || null,
        gender: formData.gender || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        blood_group: formData.blood_group || null,
        allergies: formData.allergies.trim() || null,
        medical_history: formData.medical_history.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
      }

      const { data, error: insertError } = await supabase
        .from('patients')
        .insert(payload)
        .select(patientColumns)
        .single()

      if (insertError) throw insertError

      setPatients((current) => [data, ...current])
      closeModal()
      showToast('Patient added successfully.', 'success')
    } catch (saveError) {
      showToast(saveError.message || 'Unable to save patient.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const formatCreatedDate = (createdAt) => {
    if (!createdAt) return '-'

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(createdAt))
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
              Patients
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Register patients and open their clinical records.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Patient
          </button>
        </header>

        <section className="flex flex-col gap-3">
          <label htmlFor="patient-search" className="sr-only">
            Search patients
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="patient-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="Search by name, phone, or patient ID"
            />
          </div>
        </section>

        <section>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="mt-6 h-6 w-44" />
                  <Skeleton className="mt-4 h-4 w-32" />
                  <Skeleton className="mt-4 h-4 w-24" />
                </div>
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Users className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-medium text-slate-900">
                No patients registered yet
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Add First Patient
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="group rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
                      {patient.patient_id}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatCreatedDate(patient.created_at)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-normal text-slate-950">
                        {patient.full_name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">{patient.phone}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                    <span className="text-slate-500">Gender</span>
                    <span className="font-medium text-slate-700">
                      {patient.gender || '-'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                Add Patient
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md px-3 py-2 text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(92vh-73px)] overflow-y-auto px-6 py-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" name="full_name" required>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Riya Sharma"
                  />
                </Field>

                <Field label="DOB" name="dob">
                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  />
                </Field>

                <Field label="Gender" name="gender">
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Select gender</option>
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Phone" name="phone" required>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="+91 98765 43210"
                  />
                </Field>

                <Field label="Email" name="email">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="patient@example.com"
                  />
                </Field>

                <Field label="Blood Group" name="blood_group">
                  <select
                    id="blood_group"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Select blood group</option>
                    {bloodGroupOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Address" name="address" className="sm:col-span-2">
                  <textarea
                    id="address"
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Street, city, state"
                  />
                </Field>

                <Field label="Allergies" name="allergies">
                  <textarea
                    id="allergies"
                    name="allergies"
                    rows="3"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    className="mt-1 block w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Known allergies"
                  />
                </Field>

                <Field label="Medical History" name="medical_history">
                  <textarea
                    id="medical_history"
                    name="medical_history"
                    rows="3"
                    value={formData.medical_history}
                    onChange={handleInputChange}
                    className="mt-1 block w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Relevant medical history"
                  />
                </Field>

                <Field label="Emergency Contact Name" name="emergency_contact_name">
                  <input
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Contact name"
                  />
                </Field>

                <Field label="Emergency Contact Phone" name="emergency_contact_phone">
                  <input
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="+91 98765 43210"
                  />
                </Field>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
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

export default Patients
