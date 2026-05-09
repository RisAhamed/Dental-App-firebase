import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import SessionCard from '../components/SessionCard'
import { useToast } from '../hooks/useToast'
import { db } from '../lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore'

const filterOptions = [
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'All', value: 'All' },
]

function PatientDetail() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [patient, setPatient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [followupSessions, setFollowupSessions] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [showMedicalHistory, setShowMedicalHistory] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        const patientSnap = await getDoc(doc(db, 'patients', patientId))

        if (!patientSnap.exists()) {
          console.error('Patient not found:', patientId)
          setPatient(null)
          setSessions([])
          setFollowupSessions({})
          setLoading(false)
          return
        }

        const patientData = normalizeFirestoreData({
          id: patientSnap.id,
          ...patientSnap.data(),
        })
        setPatient(patientData)

        const sessionsSnap = await getDocs(
          query(
            collection(db, 'sessions'),
            where('patient_id', '==', patientId),
            orderBy('visit_date', 'desc'),
          ),
        )
        const sessionsRaw = sessionsSnap.docs.map((sessionDoc) =>
          normalizeFirestoreData({
            id: sessionDoc.id,
            ...sessionDoc.data(),
          }),
        )

        const sessionsWithDetails = await Promise.all(
          sessionsRaw.map(async (session) => {
            const [chartsSnap, doctorsSnap, filesSnap] = await Promise.all([
              getDocs(
                query(
                  collection(db, 'dental_chart_entries'),
                  where('session_id', '==', session.id),
                ),
              ),
              getDocs(
                query(
                  collection(db, 'session_doctors'),
                  where('session_id', '==', session.id),
                ),
              ),
              getDocs(
                query(
                  collection(db, 'session_files'),
                  where('session_id', '==', session.id),
                ),
              ),
            ])

            const chartEntries = chartsSnap.docs.map((chartDoc) =>
              normalizeFirestoreData({
                id: chartDoc.id,
                ...chartDoc.data(),
              }),
            )
            const files = filesSnap.docs.map((fileDoc) =>
              normalizeFirestoreData({
                id: fileDoc.id,
                ...fileDoc.data(),
              }),
            )
            const doctorDetails = await Promise.all(
              doctorsSnap.docs.map(async (doctorDoc) => {
                const docData = doctorDoc.data()
                const doctorSnap = await getDoc(doc(db, 'doctors', docData.doctor_id))
                return doctorSnap.exists()
                  ? normalizeFirestoreData({ id: doctorSnap.id, ...doctorSnap.data() })
                  : null
              }),
            )

            return {
              ...session,
              chartEntries,
              doctors: doctorDetails.filter(Boolean),
              files,
            }
          }),
        )

        setSessions(sessionsWithDetails)
        setFollowupSessions(await buildFollowupSessions(sessionsWithDetails))
      } catch (err) {
        console.error('PatientDetail load error:', err)
        showToast(err.message || 'Unable to load patient details.', 'error')
      } finally {
        setLoading(false)
      }
    }

    if (patientId) Promise.resolve().then(load)
  }, [patientId, showToast])

  const getFilteredSessions = () => {
    if (activeFilter === 'All') return sessions

    const months = { '3M': 3, '6M': 6, '1Y': 12, '5Y': 60 }[activeFilter]
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - months)

    return sessions.filter((session) => toDate(session.visit_date) >= cutoff)
  }

  const filteredSessions = getFilteredSessions()

  const handleAddSession = () => {
    navigate(`/sessions/new/${patientId}`)
  }

  const handleEditSession = (sessionId) => {
    navigate(`/sessions/edit/${sessionId}`)
  }

  const displayMedicalHistory =
    !patient?.medical_history || showMedicalHistory
      ? patient?.medical_history
      : `${patient.medical_history.slice(0, 140)}${
          patient.medical_history.length > 140 ? '...' : ''
        }`
  const hasMedicalHistoryDetails =
    patient?.allergies ||
    patient?.medical_conditions ||
    patient?.current_medications ||
    patient?.previous_dental_history ||
    patient?.notes

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-400">Loading patient...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-red-400">Patient not found.</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate('/patients')}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
                    {patient.full_name}
                  </h1>
                  <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
                    {patient.patient_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${patient.id}/edit`)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Patient
                  </button>
                </div>

                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Gender" value={patient.gender || '-'} />
                  <InfoItem
                    label="DOB"
                    value={formatDate(patient.date_of_birth || patient.dob)}
                  />
                  <InfoItem label="Phone" value={patient.phone || '-'} />
                  <InfoItem label="Email" value={patient.email || '-'} />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddSession}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add New Session
              </button>
            </div>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Blood Group
                </p>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                  {patient.blood_group || '-'}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Allergies
                </p>
                {patient.allergies ? (
                  <span className="mt-2 inline-flex rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                    {patient.allergies}
                  </span>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">None recorded</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Medical History
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {displayMedicalHistory || 'None recorded'}
                </p>
                {patient.medical_history && patient.medical_history.length > 140 && (
                  <button
                    type="button"
                    onClick={() => setShowMedicalHistory((current) => !current)}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    {showMedicalHistory ? 'Show less' : 'Show more'}
                    {showMedicalHistory ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Emergency contact:</span>{' '}
              {patient.emergency_contact_name || '-'}
              {patient.emergency_contact_phone
                ? ` · ${patient.emergency_contact_phone}`
                : ''}
            </div>

            {hasMedicalHistoryDetails && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="mb-3 text-sm font-semibold tracking-normal text-slate-600">
                  Medical History
                </h3>
                <div className="space-y-2">
                  {patient.allergies && (
                    <MedicalHistoryRow
                      label="Allergies"
                      value={patient.allergies}
                      className="bg-red-100 text-red-700"
                    />
                  )}
                  {patient.medical_conditions && (
                    <MedicalHistoryRow
                      label="Conditions"
                      value={patient.medical_conditions}
                      className="bg-yellow-100 text-yellow-700"
                    />
                  )}
                  {patient.current_medications && (
                    <MedicalHistoryRow
                      label="Medications"
                      value={patient.current_medications}
                      className="bg-blue-100 text-blue-700"
                    />
                  )}
                  {patient.previous_dental_history && (
                    <MedicalHistoryRow
                      label="Dental History"
                      value={patient.previous_dental_history}
                      className="bg-gray-100 text-gray-600"
                    />
                  )}
                  {patient.notes && (
                    <MedicalHistoryRow
                      label="Notes"
                      value={patient.notes}
                      className="bg-purple-100 text-purple-700"
                    />
                  )}
                </div>
              </div>
            )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                Visit History
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {filteredSessions.length} visits
              </span>
            </div>

            <div className="inline-flex w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveFilter(option.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    activeFilter === option.value
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-medium text-slate-900">
                No visits recorded yet.
              </p>
              <button
                type="button"
                onClick={handleAddSession}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                Add First Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  followupSession={followupSessions[session.followup_of]}
                  onEdit={handleEditSession}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

function MedicalHistoryRow({ label, value, className }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${className}`}
      >
        {label}
      </span>
      <span className="text-sm leading-6 text-slate-700">{value}</span>
    </div>
  )
}

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return format(toDate(dateValue), 'dd MMM yyyy')
}

function toDate(dateValue) {
  if (!dateValue) return new Date(0)
  if (dateValue?.toDate) return dateValue.toDate()
  return new Date(dateValue)
}

function normalizeFirestoreData(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value?.toDate ? value.toDate().toISOString() : value,
    ]),
  )
}

async function buildFollowupSessions(sessionRows) {
  const visibleIds = new Set(sessionRows.map((session) => session.id))
  const followupIds = [
    ...new Set(
      sessionRows
        .map((session) => session.followup_of)
        .filter((followupId) => followupId && !visibleIds.has(followupId)),
    ),
  ]

  const visibleFollowups = sessionRows.reduce((accumulator, session) => {
    accumulator[session.id] = session
    return accumulator
  }, {})

  if (followupIds.length === 0) return visibleFollowups

  const followups = await Promise.all(
    followupIds.map(async (followupId) => {
      const followupSnap = await getDoc(doc(db, 'sessions', followupId))
      return followupSnap.exists()
        ? { id: followupSnap.id, ...followupSnap.data() }
        : null
    }),
  )

  return {
    ...visibleFollowups,
    ...followups.filter(Boolean).reduce((accumulator, session) => {
      accumulator[session.id] = session
      return accumulator
    }, {}),
  }
}

export default PatientDetail
