import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  Phone,
  Search as SearchIcon,
  SearchX,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Skeleton from '../components/Skeleton'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabaseClient'

const patientColumns =
  'id, patient_id, full_name, dob, gender, phone, blood_group, allergies'

function Search() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [lastVisits, setLastVisits] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    async function searchPatients() {
      const cleanedQuery = debouncedQuery.replace(/[,%]/g, '')

      if (cleanedQuery.length < 2) {
        setPatients([])
        setLastVisits({})
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const pattern = `%${cleanedQuery}%`
        const { data, error: searchError } = await supabase
          .from('patients')
          .select(patientColumns)
          .or(
            `full_name.ilike.${pattern},phone.ilike.${pattern},patient_id.ilike.${pattern}`,
          )
          .order('full_name', { ascending: true })

        if (searchError) throw searchError

        const patientRows = data || []
        setPatients(patientRows)

        if (patientRows.length === 0) {
          setLastVisits({})
          return
        }

        const patientIds = patientRows.map((patient) => patient.id)
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('id, patient_id, visit_date, chief_complaint')
          .in('patient_id', patientIds)
          .order('visit_date', { ascending: false })

        if (sessionError) throw sessionError

        setLastVisits(getLatestVisitByPatient(sessionData || []))
      } catch (searchError) {
        showToast(searchError.message || 'Unable to search patients.', 'error')
      } finally {
        setLoading(false)
      }
    }

    Promise.resolve().then(searchPatients)
  }, [debouncedQuery, showToast])

  const showDefaultState = debouncedQuery.length < 2 && !loading
  const showEmptyState = debouncedQuery.length >= 2 && !loading && patients.length === 0

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header>
        <h2 className="text-3xl font-semibold tracking-normal text-slate-950">
          Search Patients
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Find patients by name, phone number, or clinic patient ID.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="global-patient-search" className="sr-only">
          Search patients
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
          <input
            id="global-patient-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="block w-full rounded-lg border border-slate-300 bg-white py-4 pl-12 pr-4 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            placeholder="Search by name, phone, or Patient ID..."
            autoComplete="off"
          />
        </div>
        {query.trim().length === 1 && (
          <p className="mt-3 text-sm text-slate-500">
            Type at least 2 characters to search.
          </p>
        )}
      </section>

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="mt-5 h-7 w-56" />
              <Skeleton className="mt-3 h-4 w-36" />
              <Skeleton className="mt-5 h-4 w-44" />
              <Skeleton className="mt-5 h-12 w-full bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {showDefaultState && (
        <EmptyPanel
          icon={<SearchIcon className="h-10 w-10" />}
          title="Search by patient name, phone, or ID"
          text="Start typing at least 2 characters to find matching patients."
        />
      )}

      {showEmptyState && (
        <EmptyPanel
          icon={<SearchX className="h-10 w-10" />}
          title={`No patients found for '${debouncedQuery}'`}
          text="Try another name, phone number, or patient ID."
        />
      )}

      {!loading && patients.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          {patients.map((patient) => (
            <PatientResultCard
              key={patient.id}
              patient={patient}
              lastVisit={lastVisits[patient.id]}
              onView={() => navigate(`/patients/${patient.id}`)}
            />
          ))}
        </section>
      )}
    </main>
  )
}

function PatientResultCard({ patient, lastVisit, onView }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-200">
            {patient.patient_id}
          </span>
          <h3 className="mt-4 truncate text-xl font-semibold tracking-normal text-slate-950">
            {patient.full_name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {patient.gender || '-'} · {formatDate(patient.dob)}
          </p>
        </div>

        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          View Patient
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-slate-700">
          <Phone className="h-4 w-4 text-slate-400" />
          {patient.phone || '-'}
        </span>
        {patient.blood_group && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            {patient.blood_group}
          </span>
        )}
        {patient.allergies && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            {patient.allergies}
          </span>
        )}
      </div>

      <div className="mt-5 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {lastVisit ? (
          <>
            <span className="font-medium text-slate-800">Last visit:</span>{' '}
            {formatDate(lastVisit.visit_date)} — {truncate(lastVisit.chief_complaint, 72)}
          </>
        ) : (
          'No visits yet'
        )}
      </div>
    </article>
  )
}

function EmptyPanel({ icon, title, text }) {
  return (
    <section className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center text-slate-500 shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        {icon}
      </div>
      <h3 className="mt-5 text-base font-semibold tracking-normal text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </section>
  )
}

function getLatestVisitByPatient(sessions) {
  return sessions.reduce((latestByPatient, session) => {
    if (!latestByPatient[session.patient_id]) {
      latestByPatient[session.patient_id] = session
    }

    return latestByPatient
  }, {})
}

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return format(parseISO(dateValue), 'dd MMM yyyy')
}

function truncate(value, maxLength) {
  if (!value) return ''
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength).trim()}...`
}

export default Search
