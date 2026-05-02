import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Paperclip,
  Pencil,
  Syringe,
  User,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const visitTypeStyles = {
  New: 'bg-blue-50 text-blue-700 ring-blue-200',
  'Follow-up': 'bg-purple-50 text-purple-700 ring-purple-200',
  Emergency: 'bg-rose-50 text-rose-700 ring-rose-200',
  'Routine Checkup': 'bg-slate-100 text-slate-700 ring-slate-200',
}

const paymentStyles = {
  Pending: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  Partial: 'bg-orange-50 text-orange-700 ring-orange-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

function SessionCard({ session, followupSession, onEdit }) {
  const navigate = useNavigate()
  const [showTreatment, setShowTreatment] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const files = session.files || []
  const chartEntries = session.chartEntries || []
  const doctors = session.doctors || []
  const hasLongTreatment = (session.treatment_given || '').length > 140
  const isEdited = isDifferentDateTime(session.created_at, session.updated_at)

  const handleEdit = () => {
    if (onEdit) {
      onEdit(session.id)
      return
    }

    navigate(`/sessions/edit/${session.id}`)
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              {formatDate(session.visit_date)}
            </span>
            <Badge
              className={
                visitTypeStyles[session.visit_type] ||
                'bg-slate-100 text-slate-700 ring-slate-200'
              }
            >
              {session.visit_type}
            </Badge>
            {session.injection_given && (
              <Badge className="bg-cyan-50 text-cyan-700 ring-cyan-200">
                <Syringe className="h-3 w-3" />
                Injection
              </Badge>
            )}
          </div>

          {session.followup_of && (
            <p className="mt-2 text-sm text-slate-500">
              Follow-up of{' '}
              <span className="font-medium text-purple-700">
                {followupSession ? formatDate(followupSession.visit_date) : 'previous visit'}
              </span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleEdit}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold tracking-normal text-slate-950">
            {session.chief_complaint}
          </h3>
          {session.diagnosis && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Diagnosis:</span>{' '}
              {session.diagnosis}
            </p>
          )}
        </div>

        {session.treatment_given && (
          <div>
            <p
              className={`text-sm leading-6 text-slate-600 ${
                showTreatment ? '' : 'line-clamp-2'
              }`}
            >
              <span className="font-medium text-slate-800">Treatment:</span>{' '}
              {session.treatment_given}
            </p>
            {hasLongTreatment && (
              <button
                type="button"
                onClick={() => setShowTreatment((current) => !current)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                {showTreatment ? 'Show less' : 'Show more'}
                {showTreatment ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        )}

        {doctors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {doctors.map((doctor) => (
              <span
                key={doctor.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                  <User className="h-3.5 w-3.5" />
                </span>
                {doctor.name}
                {doctor.specialty && (
                  <span className="font-normal text-slate-500">· {doctor.specialty}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {chartEntries.length > 0 && (
          <div className="rounded-md bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
              <FileText className="h-4 w-4 text-slate-500" />
              Dental chart
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              {chartEntries.map((entry) => (
                <li key={entry.id}>
                  <span className="font-medium text-slate-800">{entry.region}:</span>{' '}
                  {entry.procedure_done}
                  {entry.tooth_number ? ` on tooth ${entry.tooth_number}` : ''}
                  {entry.notes ? ` - ${entry.notes}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <span>Treatment Cost ₹{formatMoney(session.treatment_cost)}</span>
          <span className="hidden h-4 w-px bg-slate-200 sm:block" />
          <span>Paid ₹{formatMoney(session.amount_paid)}</span>
          <Badge
            className={
              paymentStyles[session.payment_status] ||
              'bg-slate-100 text-slate-700 ring-slate-200'
            }
          >
            {session.payment_status}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setShowFiles((current) => !current)}
            disabled={files.length === 0}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Paperclip className="h-4 w-4" />
            {files.length} {files.length === 1 ? 'file' : 'files'}
            {files.length > 0 &&
              (showFiles ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              ))}
          </button>

          {session.next_visit_date && (
            <p className="text-sm font-medium text-teal-700">
              Next appointment: {formatDate(session.next_visit_date)}
            </p>
          )}
        </div>

        {showFiles && files.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <ul className="space-y-3">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex flex-col gap-2 rounded-md bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{file.file_name}</p>
                    {file.description && (
                      <p className="mt-1 text-xs text-slate-500">{file.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
                      {file.file_type}
                    </Badge>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-teal-700 hover:text-teal-800"
                    >
                      Open
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isEdited && (
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Last updated: {formatDate(session.updated_at)}
          </p>
        )}
      </div>
    </article>
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

function formatDate(dateValue) {
  if (!dateValue) return '-'
  return format(parseISO(dateValue), 'dd MMM yyyy')
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })
}

function isDifferentDateTime(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return false
  return new Date(createdAt).getTime() !== new Date(updatedAt).getTime()
}

export default SessionCard
