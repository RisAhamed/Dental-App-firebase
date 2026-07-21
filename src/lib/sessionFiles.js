import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db, storage } from './firebase'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
// Maximum file size: 0.5 MB (512,000 bytes)
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

  if (file.size >= MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const errorMsg = `File too large (${sizeMB} MB). Maximum allowed is less than 0.5 MB.`
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

  // Helper to perform a single upload attempt using resumable upload
  const doUpload = () => new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file)
    uploadTask.on('state_changed',
      // progress observer (optional)
      () => {},
      (error) => reject(error),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(storageRef)
          resolve(downloadUrl)
        } catch (err) {
          reject(err)
        }
      }
    )
  })

  // Retry logic: attempt up to 3 times for transient network errors
  const MAX_ATTEMPTS = 3
  let attempt = 0
  let downloadUrl = null
  while (attempt < MAX_ATTEMPTS) {
    try {
      attempt += 1
      downloadUrl = await doUpload()
      break
    } catch (err) {
      console.error(`Upload attempt ${attempt} failed for ${file.name}:`, err)
      if (attempt >= MAX_ATTEMPTS) throw err
      // small backoff
      await new Promise((r) => setTimeout(r, 300 * attempt))
    }
  }

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
