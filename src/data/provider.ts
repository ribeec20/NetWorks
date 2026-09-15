import type { DataService } from './data-service'
import { IndexedDBService } from './indexeddb/indexeddb-service'
import { FirestoreService } from './firestore/firestore-service'

let instance: DataService | null = null

export function getDataService(): DataService {
  if (!instance) {
    instance = new IndexedDBService()
  }
  return instance
}

export function setFirestoreService(userId: string): DataService {
  instance = new FirestoreService(userId)
  return instance
}

export function resetDataService(): void {
  instance = null
}
