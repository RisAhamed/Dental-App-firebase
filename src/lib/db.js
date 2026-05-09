import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

export const getCollection = (name) => collection(db, name)

export const getDocById = async (collectionName, id) => {
  const ref = doc(db, collectionName, id)
  const snap = await getDoc(ref)
  return snap.exists() ? normalizeDocument(snap.id, snap.data()) : null
}

export const addDocument = async (collectionName, data) => {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  return ref.id
}

export const addDocumentWithData = async (collectionName, data) => {
  const id = await addDocument(collectionName, data)
  return getDocById(collectionName, id)
}

export const addDocuments = async (collectionName, rows) => {
  if (!rows.length) return []

  const batch = writeBatch(db)
  const refs = rows.map(() => doc(collection(db, collectionName)))

  refs.forEach((ref, index) => {
    batch.set(ref, {
      ...rows[index],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
  })

  await batch.commit()
  return Promise.all(refs.map((ref) => getDocById(collectionName, ref.id)))
}

export const updateDocument = async (collectionName, id, data) => {
  const ref = doc(db, collectionName, id)
  await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
  return getDocById(collectionName, id)
}

export const deleteDocument = async (collectionName, id) => {
  await deleteDoc(doc(db, collectionName, id))
}

export const deleteWhere = async (collectionName, conditions = []) => {
  const rows = await queryDocuments(collectionName, conditions)
  if (!rows.length) return

  const batch = writeBatch(db)
  rows.forEach((row) => batch.delete(doc(db, collectionName, row.id)))
  await batch.commit()
}

export const queryDocuments = async (
  collectionName,
  conditions = [],
  orderField = null,
  limitCount = null,
  direction = 'desc',
) => {
  const constraints = conditions.map(([field, op, value]) => where(field, op, value))
  if (orderField) constraints.push(orderBy(orderField, direction))
  if (limitCount) constraints.push(limit(limitCount))

  const snap = await getDocs(query(collection(db, collectionName), ...constraints))
  return snap.docs.map((item) => normalizeDocument(item.id, item.data()))
}

export const getAllDocuments = async (collectionName, orderField = null, direction = 'desc') =>
  queryDocuments(collectionName, [], orderField, null, direction)

export const countDocuments = async (collectionName, conditions = []) => {
  const rows = await queryDocuments(collectionName, conditions)
  return rows.length
}

export const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return null
  if (timestamp?.toDate) return timestamp.toDate().toISOString()
  return timestamp
}

export const normalizeDocument = (id, data) => ({
  id,
  ...Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, formatFirestoreDate(value)]),
  ),
})
