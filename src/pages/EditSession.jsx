import { useParams } from 'react-router-dom'

function EditSession() {
  const { id } = useParams()

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-normal text-slate-950">
        Edit Session
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Coming Soon: Edit Session
      </p>
      {id && (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Session ID: <span className="font-medium">{id}</span>
        </p>
      )}
    </section>
  )
}

export default EditSession
