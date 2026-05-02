import { useEffect, useState } from 'react'
import { Check, Edit2, Loader2, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const emptyForm = {
  name: '',
  specialty: '',
  qualification: '',
  phone: '',
  email: '',
}

function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  async function fetchDoctors() {
    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('doctors')
        .select('id, name, specialty, qualification, phone, email, is_active, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setDoctors(data || [])
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load doctors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(fetchDoctors)
  }, [])

  const openAddModal = () => {
    setEditingDoctor(null)
    setFormData(emptyForm)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (doctor) => {
    setEditingDoctor(doctor)
    setFormData({
      name: doctor.name || '',
      specialty: doctor.specialty || '',
      qualification: doctor.qualification || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
    })
    setError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return

    setIsModalOpen(false)
    setEditingDoctor(null)
    setFormData(emptyForm)
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.specialty.trim()) {
      setError('Full Name and Specialty are required.')
      return
    }

    const doctorPayload = {
      name: formData.name.trim(),
      specialty: formData.specialty.trim(),
      qualification: formData.qualification.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
    }

    setSaving(true)

    try {
      if (editingDoctor) {
        const { data, error: updateError } = await supabase
          .from('doctors')
          .update(doctorPayload)
          .eq('id', editingDoctor.id)
          .select('id, name, specialty, qualification, phone, email, is_active, created_at')
          .single()

        if (updateError) throw updateError

        setDoctors((current) =>
          current.map((doctor) => (doctor.id === editingDoctor.id ? data : doctor)),
        )
      } else {
        const { data, error: insertError } = await supabase
          .from('doctors')
          .insert(doctorPayload)
          .select('id, name, specialty, qualification, phone, email, is_active, created_at')
          .single()

        if (insertError) throw insertError

        setDoctors((current) => [data, ...current])
      }

      closeModal()
    } catch (saveError) {
      setError(saveError.message || 'Unable to save doctor.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (doctor) => {
    setError('')
    setTogglingId(doctor.id)

    try {
      const { error: updateError } = await supabase
        .from('doctors')
        .update({ is_active: !doctor.is_active })
        .eq('id', doctor.id)

      if (updateError) throw updateError

      await fetchDoctors()
    } catch (toggleError) {
      setError(toggleError.message || 'Unable to update doctor status.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
              Doctors
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage clinic doctors, specialties, and availability.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Doctor
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading doctors...</span>
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-medium text-slate-900">No doctors added yet</p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Add Doctor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-normal text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Specialty</th>
                    <th className="px-5 py-3">Qualification</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                        {doctor.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {doctor.specialty}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {doctor.qualification || '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {doctor.phone || '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {doctor.email || '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            doctor.is_active
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                          }`}
                        >
                          {doctor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(doctor)}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(doctor)}
                            disabled={togglingId === doctor.id}
                            className={`inline-flex min-w-24 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
                              doctor.is_active
                                ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-500'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-500'
                            }`}
                          >
                            {togglingId === doctor.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : doctor.is_active ? (
                              <X className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {doctor.is_active ? 'Inactive' : 'Active'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold tracking-normal text-slate-950">
                {editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Dr. Asha Mehta"
                />
              </div>

              <div>
                <label
                  htmlFor="specialty"
                  className="block text-sm font-medium text-slate-700"
                >
                  Specialty <span className="text-rose-600">*</span>
                </label>
                <input
                  id="specialty"
                  name="specialty"
                  type="text"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="Orthodontist"
                />
              </div>

              <div>
                <label
                  htmlFor="qualification"
                  className="block text-sm font-medium text-slate-700"
                >
                  Qualification
                </label>
                <input
                  id="qualification"
                  name="qualification"
                  type="text"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  placeholder="BDS, MDS"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="doctor@clinic.com"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
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
                    <Check className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default Doctors
