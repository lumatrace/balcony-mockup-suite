import type {
  LoadedProjectSnapshot,
  ProjectDocument,
  RuntimeMediaAsset,
  SavedProjectSummary,
  StoredMediaAssetRecord,
} from '../types'

const databaseName = 'balcony-bar-mockup'
const databaseVersion = 1
const projectStoreName = 'projects'
const mediaStoreName = 'media'
const draftProjectId = '__draft__'

type DatabaseStoreName = typeof projectStoreName | typeof mediaStoreName

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(projectStoreName)) {
        database.createObjectStore(projectStoreName, { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains(mediaStoreName)) {
        database.createObjectStore(mediaStoreName, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the mockup database.'))
  })
}

async function withTransaction<T>(
  mode: IDBTransactionMode,
  action: (
    stores: Record<DatabaseStoreName, IDBObjectStore>,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
  ) => void,
): Promise<T> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([projectStoreName, mediaStoreName], mode)
    const stores = {
      [projectStoreName]: transaction.objectStore(projectStoreName),
      [mediaStoreName]: transaction.objectStore(mediaStoreName),
    }

    transaction.oncomplete = () => database.close()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('A database transaction failed.'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('A database transaction was aborted.'))

    action(stores, resolve, reject)
  })
}

function toStoredMediaRecord(mediaAsset: RuntimeMediaAsset): StoredMediaAssetRecord {
  return {
    id: mediaAsset.id,
    filename: mediaAsset.filename,
    mimeType: mediaAsset.mimeType,
    kind: mediaAsset.kind,
    width: mediaAsset.width,
    height: mediaAsset.height,
    blob: mediaAsset.blob,
    validationStatus: mediaAsset.validationStatus,
  }
}

export async function listProjects(): Promise<SavedProjectSummary[]> {
  const projects = await withTransaction<ProjectDocument[]>('readonly', (stores, resolve, reject) => {
      const request = stores[projectStoreName].getAll()
      request.onsuccess = () => resolve(request.result as ProjectDocument[])
      request.onerror = () => reject(request.error)
    })

  return projects
    .filter((project) => !project.isDraft)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map((project) => ({
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
    }))
}

export async function saveProjectSnapshot(
  project: Omit<ProjectDocument, 'id' | 'isDraft'> & { id?: string },
  mediaAssets: RuntimeMediaAsset[],
  options: { draft: boolean; draftId?: string },
): Promise<string> {
  const projectId = options.draft ? options.draftId ?? draftProjectId : project.id ?? crypto.randomUUID()
  const record: ProjectDocument = {
    ...project,
    id: projectId,
    isDraft: options.draft,
  }

  await withTransaction<void>(
    'readwrite',
    (stores, resolve, reject) => {
      const mediaRecords = mediaAssets.map(toStoredMediaRecord)
      let pendingWrites = mediaRecords.length + 1

      const finishWrite = () => {
        pendingWrites -= 1

        if (pendingWrites === 0) {
          resolve()
        }
      }

      const projectRequest = stores[projectStoreName].put(record)
      projectRequest.onsuccess = finishWrite
      projectRequest.onerror = () => reject(projectRequest.error)

      if (mediaRecords.length === 0) {
        return
      }

      mediaRecords.forEach((mediaRecord) => {
        const mediaRequest = stores[mediaStoreName].put(mediaRecord)
        mediaRequest.onsuccess = finishWrite
        mediaRequest.onerror = () => reject(mediaRequest.error)
      })
    },
  )

  return projectId
}

export async function loadProjectSnapshot(projectId: string): Promise<LoadedProjectSnapshot | null> {
  return withTransaction<LoadedProjectSnapshot | null>('readonly', (stores, resolve, reject) => {
      const projectRequest = stores[projectStoreName].get(projectId)

      projectRequest.onerror = () => reject(projectRequest.error)
      projectRequest.onsuccess = () => {
        const project = projectRequest.result as ProjectDocument | undefined

        if (!project) {
          resolve(null)
          return
        }

        const mediaRequest = stores[mediaStoreName].getAll()
        mediaRequest.onerror = () => reject(mediaRequest.error)
        mediaRequest.onsuccess = () => {
          const allMedia = mediaRequest.result as StoredMediaAssetRecord[]
          const mediaRecords = allMedia.filter((record) => project.mediaAssetIds.includes(record.id))
          resolve({ project, mediaRecords })
        }
      }
    })
}

export function loadDraftProject() {
  return loadProjectSnapshot(draftProjectId)
}
