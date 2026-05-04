const DB_NAME = 'annotarythm-assemblage-audio'
const DB_VERSION = 1
const STORE_NAME = 'audio-files'

interface StoredAudioFile {
  blob: Blob
  name: string
  type: string
  updatedAt: number
}

const hasIndexedDb = () => typeof indexedDB !== 'undefined'

const openAudioDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB indisponible'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })

const runStoreRequest = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const db = await openAudioDb()

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const request = operation(tx.objectStore(STORE_NAME))

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    tx.oncomplete = () => db.close()
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export const saveAudioTrackBlob = async (key: string, file: Blob & { name?: string; type?: string }) => {
  try {
    const stored: StoredAudioFile = {
      blob: file,
      name: file.name ?? key,
      type: file.type ?? 'audio/mpeg',
      updatedAt: Date.now(),
    }

    await runStoreRequest('readwrite', (store) => store.put(stored, key))
    return true
  } catch {
    return false
  }
}

export const loadAudioTrackBlobUrl = async (key: string) => {
  try {
    const stored = await runStoreRequest<StoredAudioFile | Blob | undefined>(
      'readonly',
      (store) => store.get(key),
    )
    if (!stored) return null

    const blob = stored instanceof Blob ? stored : stored.blob
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

export const deleteAudioTrackBlob = async (key: string) => {
  try {
    await runStoreRequest('readwrite', (store) => store.delete(key))
  } catch {
    // La suppression de la piste dans l'UI ne doit pas dépendre d'IndexedDB.
  }
}
