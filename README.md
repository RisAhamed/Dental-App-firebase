# DentaRecord

DentaRecord is a dental clinic management app for chairside patient registration, doctors management, clinical session entry, file attachments, visit history, and global patient search.

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Supabase PostgreSQL
- Supabase Storage
- lucide-react icons
- date-fns

## Features

- Responsive sidebar layout for desktop, tablet, and mobile
- Patient registration with generated patient IDs in `DC-YYYY-####` format
- Patient list with debounced search by name, phone, and patient ID
- Patient detail page with demographics, emergency contact, medical history, and visit timeline
- Visit history filters for 3M, 6M, 1Y, 5Y, and All
- Doctor management with active/inactive status
- New session entry with visit info, clinical details, dental charting, doctor selection, billing, attachments, notes, and next visit date
- Edit session workflow with existing file management and delete session confirmation
- Global patient search with last visit summary
- Toast notifications, loading skeletons, and empty states
- Supabase Storage uploads for X-rays, reports, prescriptions, photos, and other files

## Supabase Setup

1. Create a Supabase project.

2. Open the Supabase Dashboard, then go to **SQL Editor**.

3. Open `schema.sql` from this repository, paste the full SQL into the SQL editor, and run it.

4. Because this app currently has no authentication, disable RLS for the app tables in **Table Editor** or run:

```sql
alter table doctors disable row level security;
alter table patients disable row level security;
alter table sessions disable row level security;
alter table session_doctors disable row level security;
alter table dental_chart_entries disable row level security;
alter table session_files disable row level security;
```

5. Create the Storage bucket:

- Go to **Storage**
- Create a bucket named exactly `patient-files`
- Set the bucket to **Public**
- Recommended max file size: `50 MB`
- Recommended allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

6. If Storage RLS blocks uploads, add policies for the public `patient-files` bucket:

```sql
create policy "Public patient file uploads"
on storage.objects
for insert
to anon
with check (bucket_id = 'patient-files');

create policy "Public patient file updates"
on storage.objects
for update
to anon
using (bucket_id = 'patient-files')
with check (bucket_id = 'patient-files');

create policy "Public patient file reads"
on storage.objects
for select
to anon
using (bucket_id = 'patient-files');

create policy "Public patient file deletes"
on storage.objects
for delete
to anon
using (bucket_id = 'patient-files');
```

For production with authentication, replace these public policies with authenticated, role-based policies before handling real patient data.

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

The app also supports `VITE_SUPABASE_PUBLISHABLE_KEY` as a fallback key name.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Deploy to Vercel

1. Push the project to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repository.
3. Set the framework preset to **Vite** if Vercel does not detect it automatically.
4. Add environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
```

5. Deploy.

## Branding

Clinic branding is configured in:

```text
src/lib/config.js
```

Update these values to rename the app:

```js
export const CLINIC_NAME = 'DentaRecord'
export const CLINIC_SUBTITLE = 'Dental Clinic Management'
```
