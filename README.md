# DentaRecord

DentaRecord is a dental clinic management app for chairside patient registration, doctors management, clinical session entry, file attachments, visit history, and global patient search.

## Tech Stack

- React + Vite
- Tailwind CSS
- React Router
- Firebase Firestore
- Firebase Storage
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
- Firebase Storage uploads for X-rays, reports, prescriptions, photos, and other files

## Firebase Setup

1. Create a Firebase project named `dental-clinic-app`.

2. Add a web app named `dental-clinic-web`.

3. Enable **Firestore Database** in test mode.

4. Enable **Storage** in test mode.

5. Firestore collections are created automatically when the app writes data. The app uses these collections:

- `doctors`
- `patients`
- `sessions`
- `session_doctors`
- `dental_chart_entries`
- `session_files`

For production with authentication, replace test-mode rules with authenticated, role-based rules before handling real patient data.

## Environment Variables

Create `.env` in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

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
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
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
