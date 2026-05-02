-- ============================================================
-- DENTAL CLINIC SaaS — SUPABASE DATABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  qualification TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  gender TEXT CHECK (gender IN ('Male','Female','Other')),
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  blood_group TEXT,
  allergies TEXT,
  medical_history TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SESSIONS TABLE (each clinic visit)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type TEXT NOT NULL DEFAULT 'New' CHECK (visit_type IN ('New','Follow-up','Emergency','Routine Checkup')),
  followup_of UUID REFERENCES sessions(id) ON DELETE SET NULL,
  chief_complaint TEXT NOT NULL,
  diagnosis TEXT,
  treatment_given TEXT,
  treatment_cost NUMERIC(10,2) DEFAULT 0,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending','Partial','Paid')),
  injection_given BOOLEAN DEFAULT false,
  injection_details TEXT,
  notes TEXT,
  next_visit_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SESSION ↔ DOCTORS (many-to-many)
CREATE TABLE IF NOT EXISTS session_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE
);

-- DENTAL CHART ENTRIES (region/tooth-level treatment per session)
CREATE TABLE IF NOT EXISTS dental_chart_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  tooth_number TEXT,
  procedure_done TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SESSION FILES (X-rays, reports, photos, prescriptions)
CREATE TABLE IF NOT EXISTS session_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('xray','report','prescription','photo','other')),
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_visit_date ON sessions(visit_date);
CREATE INDEX IF NOT EXISTS idx_sessions_patient_date ON sessions(patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_dental_chart_session ON dental_chart_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_dental_chart_patient ON dental_chart_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_files_session ON session_files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_patient ON session_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_session_doctors_session ON session_doctors(session_id);
CREATE INDEX IF NOT EXISTS idx_session_doctors_doctor ON session_doctors(doctor_id);

-- STORAGE BUCKET (run separately in Supabase Dashboard > Storage)
-- 1. Create bucket: patient-files
-- 2. Set Public: ON
-- 3. Max file size: 50MB
-- 4. Allowed types: image/jpeg, image/png, image/webp, application/pdf
