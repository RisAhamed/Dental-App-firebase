# Firestore Collections

Firestore creates collections and documents on first write. This app writes the
following top-level collections:

- `doctors`
- `patients`
- `sessions`
- `session_doctors`
- `dental_chart_entries`
- `session_files`

The app stores relationship IDs explicitly, for example `sessions.patient_id`,
`session_doctors.session_id`, `session_doctors.doctor_id`, and
`dental_chart_entries.session_id`.
