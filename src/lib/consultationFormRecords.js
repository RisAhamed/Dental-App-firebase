import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage, db } from './firebase'
import { collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sanitizeFileName(name) {
  return String(name || 'signature')
    .replace(/[\\/\[\]#?]/g, '_')
    .replace(/\s+/g, '_')
}

export async function uploadConsultationSignature(file, patientId, sessionId, formId) {
  const safeName = sanitizeFileName(file?.name)
  const storagePath = `patients/${patientId}/sessions/${sessionId}/consultation_forms/${formId}_${Date.now()}_${safeName}`
  const fileRef = ref(storage, storagePath)

  const doUpload = () => new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type || 'image/jpeg',
    })
    uploadTask.on('state_changed',
      // progress noop
      () => {},
      (err) => reject(err),
      async () => {
        try {
          const signature_url = await getDownloadURL(fileRef)
          resolve({ storage_path: storagePath, signature_url })
        } catch (err) {
          reject(err)
        }
      }
    )
  })

  const MAX_ATTEMPTS = 3
  let attempt = 0
  while (attempt < MAX_ATTEMPTS) {
    try {
      attempt += 1
      return await doUpload()
    } catch (err) {
      console.error(`Consultation signature upload attempt ${attempt} failed for ${file.name}:`, err)
      if (attempt >= MAX_ATTEMPTS) throw err
      await delay(300 * attempt)
    }
  }
}

export async function saveConsultationFormRecord({ sessionId, patientId, formId, formLabel, signatureUrl, storagePath }) {
  const payload = {
    session_id: sessionId,
    patient_id: patientId,
    form_type: formId,
    form_label: formLabel,
    signature_url: signatureUrl,
    storage_path: storagePath,
    acknowledged_at: serverTimestamp(),
  }

  const MAX_ATTEMPTS = 3
  let attempt = 0
  while (attempt < MAX_ATTEMPTS) {
    try {
      attempt += 1
      const docRef = await addDoc(collection(db, 'consultation_forms'), payload)
      return docRef.id
    } catch (err) {
      console.error(`Consultation form record save attempt ${attempt} failed for ${formId}:`, err)
      if (attempt >= MAX_ATTEMPTS) throw err
      await delay(250 * attempt)
    }
  }
}

export async function getConsultationFormsForSession(sessionId) {
  const q = query(collection(db, 'consultation_forms'), where('session_id', '==', sessionId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteConsultationFormRecord(recordId) {
  await deleteDoc(doc(db, 'consultation_forms', recordId))
}
