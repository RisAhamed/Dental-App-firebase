import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from './firebase'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE_BYTES = 512000

/**
 * Validates a file for session upload.
 * @param {File} file
 * @returns {{ valid: boolean, message: string, error: string }}
 */
export function validateSessionFile(file) {
  if (!file) {
    return { valid: false, message: 'No file selected.', error: 'No file selected.' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    const errorMsg = `Unsupported file type: ${file.type}. Allowed: PDF, JPG, PNG.`
    return { valid: false, message: errorMsg, error: errorMsg }
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const errorMsg = `File too large (${sizeMB} MB). Maximum: 0.5 MB.`
    return { valid: false, message: errorMsg, error: errorMsg }
  }

  return { valid: true, message: '', error: '' }
}

/**
 * Uploads a file to Firebase Storage and creates a Firestore metadata document.
 * @param {File} file
 * @param {string} patientId
 * @param {string} sessionId
 * @returns {Promise<object>} The saved metadata including Firestore doc id
 */
export async function uploadSessionFile(file, patientId, sessionId) {
  const validation = validateSessionFile(file)
  if (!validation.valid) throw new Error(validation.message)

  const storagePath = `patients/${patientId}/sessions/${sessionId}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, storagePath)

  await uploadBytes(storageRef, file)
  const downloadUrl = await getDownloadURL(storageRef)

  const metadata = {
    session_id: sessionId,
    patient_id: patientId,
    file_name: file.name,
    file_type: file.type,
    file_size_bytes: file.size,
    storage_path: storagePath,
    download_url: downloadUrl,
    uploaded_at: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, 'session_files'), metadata)

  return { id: docRef.id, ...metadata, download_url: downloadUrl }
}

/**
 * Deletes a file from Storage and its Firestore metadata document.
 * @param {string} fileDocId - The Firestore document ID in session_files
 * @param {string} storagePath - The Storage path of the file
 */
export async function deleteSessionFile(fileDocId, storagePath) {
  const deleteStorage = (async () => {
    try {
      const storageRef = ref(storage, storagePath)
      await deleteObject(storageRef)
    } catch (err) {
      console.error('Error deleting file from storage:', err)
    }
  })()

  const deleteFirestore = (async () => {
    try {
      await deleteDoc(doc(db, 'session_files', fileDocId))
    } catch (err) {
      console.error('Error deleting metadata document from firestore:', err)
    }
  })()

  await Promise.all([deleteStorage, deleteFirestore])
}

/**
 * Formats file size in human-readable form.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}
