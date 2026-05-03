import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO, subMonths, subYears } from 'date-fns'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Skeleton from '../components/Skeleton'
import SessionCard from '../components/SessionCard'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabaseClient'

const patientColumns =
  'id, patient_id, full_name, dob, gender, phone, email, address, blood_group, allergies, medical_history, emergency_contact_name, emergency_contact_phone'

const sessionColumns =
  'id, patient_id, visit_date, visit_type, followup_of, chief_complaint, diagnosis, treatment_given, treatment_cost, amount_paid, payment_status, injection_given, injection_details, notes, next_visit_date, created_at, updated_at'

const filterOptions = [
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'All', value: 'All' },
]

function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [patient, setPatient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [followupSessions, setFollowupSessions] = useState({})
  const [patientLoading, setPatientLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [showMedicalHistory, setShowMedicalHistory] = useState(false)

  const filterStartDate = useMemo(() => {
    const today = new Date()

    if (activeFilter === '3M') return subMonths(today, 3)
    if (activeFilter === '6M') return subMonths(today, 6)
    if (activeFilter === '1Y') return subYears(today, 1)
    if (activeFilter === '5Y') return subYears(today, 5)

    return null
  }, [activeFilter])

  const fetchPatient = useCallback(async () => {
    setPatientLoading(true)

    try {
      const { data, error: patientError } = await supabase
        .from('patients')
        .select(patientColumns)
        .eq('id', id)
        .maybeSingle()

      if (patientError) throw patientError

      setPatient(data)
    } catch (patientError) {
      showToast(patientError.message || 'Unable to load patient details.', 'error')
    } finally {
      setPatientLoading(false)
    }
  }, [id, showToast])

  const fetchFollowupSessions = useCallback(async (sessionRows) => {
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

    if (followupIds.length === 0) {
      setFollowupSessions(visibleFollowups)
      return
    }

    const { data, error: followupError } = await supabase
      .from('sessions')
      .select('id, visit_date')
      .in('id', followupIds)

    if (followupError) throw followupError

    setFollowupSessions({
      ...visibleFollowups,
      ...(data || []).reduce((accumulator, session) => {
        accumulator[session.id] = session
        return accumulator
      }, {}),
    })
  }, [])

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true)

    try {
      let query = supabase
        .from('sessions')
        .select(sessionColumns)
        .eq('patient_id', id)
        .order('visit_date', { ascending: false })

      if (filterStartDate) {
        query = query.gte('visit_date', format(filterStartDate, 'yyyy-MM-dd'))
      }

      const { data: sessionRows, error: sessionsError } = await query

      if (sessionsError) throw sessionsError

      const sessionIds = (sessionRows || []).map((session) => session.id)

      if (sessionIds.length === 0) {
        setSessions([])
        setFollowupSessions({})
        return
      }

      const [
        { data: doctorRows, error: doctorsError },
        { data: chartRows, error: chartError },
        { data: fileRows, error: filesError },
      ] = await Promise.all([
        supabase
          .from('session_doctors')
          .select('session_id, doctors(id, name, specialty)')
          .in('session_id', sessionIds),
        supabase
          .from('dental_chart_entries')
          .select('id, session_id, region, tooth_number, procedure_done, notes')
          .in('session_id', sessionIds),
        supabase
          .from('session_files')
          .select('id, session_id, file_name, file_type, file_url, description')
          .in('session_id', sessionIds),
      ])

      if (doctorsError) throw doctorsError
      if (chartError) throw chartError
      if (filesError) throw filesError

      const doctorsBySession = groupDoctorsBySession(doctorRows || [])
      const chartBySession = groupRowsBySession(chartRows || [])
      const filesBySession = groupRowsBySession(fileRows || [])

      const enrichedSessions = (sessionRows || []).map((session) => ({
        ...session,
        doctors: doctorsBySession[session.id] || [],
        chartEntries: chartBySession[session.id] || [],
        files: filesBySession[session.id] || [],
      }))

      setSessions(enrichedSessions)
      await fetchFollowupSessions(enrichedSessions)
    } catch (sessionsError) {
      showToast(sessionsError.message || 'Unable to load visit history.', 'error')
    } finally {
      setSessionsLoading(false)
    }
  }, [fetchFollowupSessions, filterStartDate, id, showToast])

  useEffect(() => {
    Promise.resolve().then(fetchPatient)
  }, [fetchPatient])

  useEffect(() => {
    Promise.resolve().then(fetchSessions)
  }, [fetchSessions])

  const handleAddSession = () => {
    navigate(`/sessions/new?patientId=${id}`)
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

        {patientLoading ? (
          <PatientHeaderSkeleton />
        ) : patient ? (
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
                </div>

                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem label="Gender" value={patient.gender || '-'} />
                  <InfoItem label="DOB" value={formatDate(patient.dob)} />
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
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            Patient not found.
          </section>
        )}

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
                Visit History
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                {sessions.length} visits
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

          {sessionsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <SessionSkeleton key={index} />
              ))}
            </div>
          ) : sessions.length === 0 ? (
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
              {sessions.map((session) => (
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

function PatientHeaderSkeleton() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-16 bg-gray-100" />
    </section>
  )
}

function SessionSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex justify-between gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="mt-6 h-6 w-3/5" />
      <Skeleton className="mt-4 h-4 w-full bg-gray-100" />
      <Skeleton className="mt-3 h-4 w-5/6 bg-gray-100" />
      <Skeleton className="mt-6 h-12 bg-gray-100" />
    </div>
  )
}

function groupRowsBySession(rows) {
  return rows.reduce((accumulator, row) => {
    if (!accumulator[row.session_id]) accumulator[row.session_id] = []
    accumulator[row.session_id].push(row)
    return accumulator
  }, {})
}

function groupDoctorsBySession(rows) {
  return rows.reduce((accumulator, row) => {
    if (!row.doctors) return accumulator
    if (!accumulator[row.session_id]) accumulator[row.session_id] = []
    accumulator[row.session_id].push(row.doctors)
    return accumulator
  }, {})
}

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return format(parseISO(dateValue), 'dd MMM yyyy')
}

export default PatientDetail
