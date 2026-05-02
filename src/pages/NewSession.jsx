import { useSearchParams } from 'react-router-dom'

function NewSession() {
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patientId')

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
        New Session
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Session entry form — coming in Module 4.
      </p>
      {patientId && (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Patient ID: <span className="font-medium">{patientId}</span>
        </p>
      )}
    </section>
  )
}

export default NewSession
