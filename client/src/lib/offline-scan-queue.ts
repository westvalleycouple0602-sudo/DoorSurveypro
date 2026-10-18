import type { OfflineScanEntry, OpeningScanRecord } from "../../../shared/scan-types";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "DoorSurveyOfflineScans";
const DB_VERSION = 1;
const STORE_NAME = "scanQueue";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

export class OfflineScanQueue {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (!isBrowser) {
      console.warn("IndexedDB not available in this environment, offline queue disabled");
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db: IDBPDatabase) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("synced", "synced");
            store.createIndex("timestamp", "timestamp");
            store.createIndex("openingId", "openingId");
          }
        },
      });
    })();

    return this.initPromise;
  }

  async addScan(
    scanRecord: OpeningScanRecord,
    projectId: string,
    openingId: string
  ): Promise<string> {
    if (!isBrowser) {
      console.warn("IndexedDB not available in this environment, scan not queued");
      return "offline-disabled";
    }

    if (!this.db) {
      await this.initialize();
      if (!this.db) {
        console.warn("Database not initialized, scan not queued");
        return "offline-disabled";
      }
    }

    const entry: OfflineScanEntry = {
      id: crypto.randomUUID(),
      scanRecord,
      projectId,
      openingId,
      timestamp: Date.now(),
      synced: false,
    };

    await this.db.add(STORE_NAME, entry);
    return entry.id;
  }

  async getPendingScans(): Promise<OfflineScanEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const allScans = await this.db.getAll(STORE_NAME) as OfflineScanEntry[];
    return allScans.filter((scan) => !scan.synced);
  }

  async getScansByOpening(openingId: string): Promise<OfflineScanEntry[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const index = this.db.transaction(STORE_NAME).store.index("openingId");
    return await index.getAll(openingId);
  }

  async markSynced(scanId: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const entry = await this.db.get(STORE_NAME, scanId);
    if (entry) {
      entry.synced = true;
      await this.db.put(STORE_NAME, entry);
    }
  }

  async removeScan(scanId: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    await this.db.delete(STORE_NAME, scanId);
  }

  async clearSyncedScans(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const allScans = await this.db.getAll(STORE_NAME) as OfflineScanEntry[];
    const syncedScans = allScans.filter((scan) => scan.synced);
    const tx = this.db.transaction(STORE_NAME, "readwrite");
    
    for (const scan of syncedScans) {
      await tx.store.delete(scan.id);
    }
    
    await tx.done;
  }

  async getScanCount(): Promise<{ total: number; pending: number; synced: number }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const allScans = await this.db.getAll(STORE_NAME) as OfflineScanEntry[];
    const pendingScans = allScans.filter((s: OfflineScanEntry) => !s.synced);
    const syncedScans = allScans.filter((s: OfflineScanEntry) => s.synced);

    return {
      total: allScans.length,
      pending: pendingScans.length,
      synced: syncedScans.length,
    };
  }
}

export const offlineScanQueue = new OfflineScanQueue();

export async function syncPendingScans(
  onScan: (entry: OfflineScanEntry) => Promise<void>
): Promise<{ success: number; failed: number }> {
  await offlineScanQueue.initialize();
  
  const pending = await offlineScanQueue.getPendingScans();
  let success = 0;
  let failed = 0;

  for (const entry of pending) {
    try {
      await onScan(entry);
      await offlineScanQueue.markSynced(entry.id);
      success++;
    } catch (error) {
      console.error(`Failed to sync scan ${entry.id}:`, error);
      failed++;
    }
  }

  await offlineScanQueue.clearSyncedScans();

  return { success, failed };
}

export function useOfflineSync() {
  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  const saveScanOffline = async (
    scanRecord: OpeningScanRecord,
    projectId: string,
    openingId: string
  ): Promise<string> => {
    await offlineScanQueue.initialize();
    return await offlineScanQueue.addScan(scanRecord, projectId, openingId);
  };

  const syncWhenOnline = async (
    onScan: (entry: OfflineScanEntry) => Promise<void>
  ): Promise<{ success: number; failed: number }> => {
    if (!isOnline) {
      return { success: 0, failed: 0 };
    }

    return await syncPendingScans(onScan);
  };

  return {
    isOnline,
    saveScanOffline,
    syncWhenOnline,
  };
}
