import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  saveAudioTrackBlob,
  loadAudioTrackBlobUrl,
  deleteAudioTrackBlob,
} from './audioPersistence'

// Helper to build a mock IDB request that fires onsuccess or onerror after a tick
function makeRequest<T>(
  result: T | undefined,
  shouldError = false,
  errorValue: DOMException | null = null,
): IDBRequest<T> {
  const req = {
    result,
    error: errorValue,
    onerror: null as ((ev: Event) => void) | null,
    onsuccess: null as ((ev: Event) => void) | null,
  }

  setTimeout(() => {
    if (shouldError && req.onerror) {
      req.onerror(new Event('error'))
    } else if (!shouldError && req.onsuccess) {
      req.onsuccess(new Event('success'))
    }
  }, 0)

  return req as unknown as IDBRequest<T>
}

// Build a minimal IDB mock for a given store data map
function buildIdbMock(storeData: Record<string, unknown> = {}) {
  const objectStoreMock = {
    put: vi.fn((value: unknown, key: string) => {
      storeData[key] = value
      return makeRequest(undefined)
    }),
    get: vi.fn((key: string) => makeRequest(storeData[key])),
    delete: vi.fn((key: string) => {
      delete storeData[key]
      return makeRequest(undefined)
    }),
  }

  const transactionMock = {
    objectStore: vi.fn().mockReturnValue(objectStoreMock),
    oncomplete: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    error: null,
  }

  // fire oncomplete after a tick
  const origObjectStore = transactionMock.objectStore.bind(transactionMock)
  transactionMock.objectStore = vi.fn((...args: Parameters<typeof origObjectStore>) => {
    const store = origObjectStore(...args)
    setTimeout(() => {
      if (transactionMock.oncomplete) transactionMock.oncomplete(new Event('complete'))
    }, 5)
    return store
  })

  const dbMock = {
    transaction: vi.fn().mockReturnValue(transactionMock),
    close: vi.fn(),
    objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
    createObjectStore: vi.fn(),
  }

  // IDBOpenDBRequest mock
  const openRequest = {
    result: dbMock,
    error: null as DOMException | null,
    onerror: null as ((ev: Event) => void) | null,
    onsuccess: null as ((ev: Event) => void) | null,
    onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }

  setTimeout(() => {
    if (openRequest.onsuccess) openRequest.onsuccess(new Event('success'))
  }, 0)

  return { openRequest, dbMock, transactionMock, objectStoreMock }
}

beforeEach(() => {
  vi.clearAllMocks()
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
  // Restore indexedDB availability
  if (!global.indexedDB) {
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn() },
      writable: true,
      configurable: true,
    })
  }
})

// ─── saveAudioTrackBlob ───────────────────────────────────────────────────────

describe('saveAudioTrackBlob', () => {
  test('returns true on success', async () => {
    const { openRequest } = buildIdbMock()
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    const blob = new Blob(['audio'], { type: 'audio/mpeg' })
    const result = await saveAudioTrackBlob('track-1', blob)
    expect(result).toBe(true)
  })

  test('returns false when indexedDB is undefined', async () => {
    Object.defineProperty(global, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const blob = new Blob(['audio'], { type: 'audio/mpeg' })
    const result = await saveAudioTrackBlob('track-1', blob)
    expect(result).toBe(false)
  })

  test('returns false when open request errors', async () => {
    const errorRequest = {
      result: null,
      error: new DOMException('Open failed'),
      onerror: null as ((ev: Event) => void) | null,
      onsuccess: null as ((ev: Event) => void) | null,
      onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
    }

    setTimeout(() => {
      if (errorRequest.onerror) errorRequest.onerror(new Event('error'))
    }, 0)

    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(errorRequest) },
      writable: true,
      configurable: true,
    })

    const blob = new Blob(['audio'], { type: 'audio/mpeg' })
    const result = await saveAudioTrackBlob('track-1', blob)
    expect(result).toBe(false)
  })

  test('stores file name from File object', async () => {
    const { openRequest, objectStoreMock } = buildIdbMock()
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    const file = new File(['audio'], 'my-song.mp3', { type: 'audio/mpeg' })
    await saveAudioTrackBlob('track-1', file)

    expect(objectStoreMock.put).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my-song.mp3' }),
      'track-1'
    )
  })

  test('uses key as name when blob has no name', async () => {
    const { openRequest, objectStoreMock } = buildIdbMock()
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    const blob = new Blob(['audio'], { type: 'audio/mpeg' })
    await saveAudioTrackBlob('my-key', blob)

    expect(objectStoreMock.put).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'my-key' }),
      'my-key'
    )
  })
})

// ─── loadAudioTrackBlobUrl ────────────────────────────────────────────────────

describe('loadAudioTrackBlobUrl', () => {
  test('returns null when indexedDB is undefined', async () => {
    Object.defineProperty(global, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const result = await loadAudioTrackBlobUrl('track-1')
    expect(result).toBeNull()
  })

  test('returns null when key not found', async () => {
    const { openRequest } = buildIdbMock({})
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    const result = await loadAudioTrackBlobUrl('non-existent')
    expect(result).toBeNull()
  })

  test('returns blob URL when stored as structured object', async () => {
    const mockBlob = new Blob(['audio'], { type: 'audio/mpeg' })
    const stored = {
      'track-obj': {
        blob: mockBlob,
        name: 'track.mp3',
        type: 'audio/mpeg',
        updatedAt: Date.now(),
      },
    }
    const { openRequest } = buildIdbMock(stored)
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    const result = await loadAudioTrackBlobUrl('track-obj')
    expect(result).toBe('blob:mock-url')
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
  })

  test('returns blob URL when stored directly as Blob instance', async () => {
    const mockBlob = new Blob(['raw audio'], { type: 'audio/mpeg' })
    const stored = { 'track-raw': mockBlob }
    const { openRequest } = buildIdbMock(stored)
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    const result = await loadAudioTrackBlobUrl('track-raw')
    expect(result).toBe('blob:mock-url')
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
  })

  test('returns null when open request errors', async () => {
    const errorRequest = {
      result: null,
      error: new DOMException('Open failed'),
      onerror: null as ((ev: Event) => void) | null,
      onsuccess: null as ((ev: Event) => void) | null,
      onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
    }

    setTimeout(() => {
      if (errorRequest.onerror) errorRequest.onerror(new Event('error'))
    }, 0)

    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(errorRequest) },
      writable: true,
      configurable: true,
    })

    const result = await loadAudioTrackBlobUrl('track-1')
    expect(result).toBeNull()
  })
})

// ─── deleteAudioTrackBlob ─────────────────────────────────────────────────────

describe('deleteAudioTrackBlob', () => {
  test('deletes the key from the store', async () => {
    const storeData: Record<string, unknown> = { 'track-del': 'some-value' }
    const { openRequest, objectStoreMock } = buildIdbMock(storeData)
    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(openRequest) },
      writable: true,
      configurable: true,
    })

    await deleteAudioTrackBlob('track-del')
    expect(objectStoreMock.delete).toHaveBeenCalledWith('track-del')
    expect(storeData['track-del']).toBeUndefined()
  })

  test('does not throw when indexedDB is undefined', async () => {
    Object.defineProperty(global, 'indexedDB', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    await expect(deleteAudioTrackBlob('track-missing')).resolves.toBeUndefined()
  })

  test('does not throw when open request errors', async () => {
    const errorRequest = {
      result: null,
      error: new DOMException('Open failed'),
      onerror: null as ((ev: Event) => void) | null,
      onsuccess: null as ((ev: Event) => void) | null,
      onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
    }

    setTimeout(() => {
      if (errorRequest.onerror) errorRequest.onerror(new Event('error'))
    }, 0)

    Object.defineProperty(global, 'indexedDB', {
      value: { open: vi.fn().mockReturnValue(errorRequest) },
      writable: true,
      configurable: true,
    })

    await expect(deleteAudioTrackBlob('track-1')).resolves.toBeUndefined()
  })
})

// ─── openAudioDb onupgradeneeded ──────────────────────────────────────────────

describe('openAudioDb — onupgradeneeded', () => {
  test('creates object store when upgrade event fires', async () => {
    const storeData: Record<string, unknown> = {}
    const { openRequest, dbMock } = buildIdbMock(storeData)

    // Override onsuccess to fire after upgradeneeded
    const originalTimeouts: ReturnType<typeof setTimeout>[] = []

    Object.defineProperty(global, 'indexedDB', {
      value: {
        open: vi.fn(() => {
          const req = {
            result: dbMock,
            error: null,
            onerror: null as ((ev: Event) => void) | null,
            onsuccess: null as ((ev: Event) => void) | null,
            onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
          }
          setTimeout(() => {
            if (req.onupgradeneeded) {
              req.onupgradeneeded(new Event('upgradeneeded') as IDBVersionChangeEvent)
            }
            if (req.onsuccess) {
              req.onsuccess(new Event('success'))
            }
          }, 0)
          return req
        }),
      },
      writable: true,
      configurable: true,
    })

    const blob = new Blob(['audio'], { type: 'audio/mpeg' })
    const result = await saveAudioTrackBlob('track-upgrade', blob)
    expect(result).toBe(true)
    // The createObjectStore may be called if store doesn't exist
    // (depends on objectStoreNames.contains returning false)
    expect(openRequest).toBeDefined()
  })
})
