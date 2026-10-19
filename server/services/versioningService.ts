import { storage } from "../storage";
import type { IStorage } from "../storage";
import {
  type VersionedEntity,
  type EntityVersion,
  type RevisionMark,
  type InsertVersionedEntity,
  type InsertEntityVersion,
  type InsertRevisionMark,
  type VersionableEntityType,
  REVISION_CHANGE_TYPES,
} from "@shared/schema";
import { logger } from "../logger";

export interface DiffResult {
  path: string;
  changeType: "added" | "modified" | "removed";
  previousValue: any;
  newValue: any;
  displayHint: string;
  category: string;
}

export interface VersionComparisonResult {
  versionedEntityId: string;
  version1: EntityVersion;
  version2: EntityVersion;
  diffs: DiffResult[];
  summary: {
    added: number;
    modified: number;
    removed: number;
    totalChanges: number;
  };
}

export interface CreateVersionOptions {
  versionName?: string;
  changeSummary?: string;
  thumbnailUrl?: string;
}

export interface VersionWithMarks extends EntityVersion {
  revisionMarks: RevisionMark[];
}

const PRICING_KEYWORDS = [
  "price",
  "cost",
  "total",
  "subtotal",
  "markup",
  "discount",
  "tax",
  "amount",
  "rate",
  "fee",
];

const HARDWARE_KEYWORDS = [
  "hardware",
  "hinge",
  "lock",
  "closer",
  "panic",
  "lever",
  "knob",
  "cylinder",
  "strike",
  "threshold",
  "seal",
  "weatherstrip",
  "astragal",
];

const DIMENSION_KEYWORDS = [
  "width",
  "height",
  "depth",
  "thickness",
  "size",
  "measurement",
  "dimension",
  "scale",
  "length",
];

const POSITION_KEYWORDS = ["x", "y", "z", "position", "location", "coordinate", "offset"];

const CONNECTION_KEYWORDS = [
  "connection",
  "wire",
  "wiring",
  "cable",
  "circuit",
  "terminal",
  "source",
  "target",
  "from",
  "to",
];

export class VersioningService {
  private storage: IStorage;

  constructor(storageInstance: IStorage) {
    this.storage = storageInstance;
  }

  async initializeVersionedEntity(
    organizationId: string,
    projectId: string | null,
    entityType: VersionableEntityType,
    entityId: string
  ): Promise<VersionedEntity> {
    const existing = await this.storage.getVersionedEntityByEntityRef(
      entityType,
      entityId,
      organizationId
    );

    if (existing) {
      return existing;
    }

    const entity: InsertVersionedEntity = {
      organizationId,
      projectId: projectId ?? undefined,
      entityType,
      entityId,
    };

    return await this.storage.createVersionedEntity(entity);
  }

  async createVersion(
    organizationId: string,
    entityType: VersionableEntityType,
    entityId: string,
    snapshot: Record<string, any>,
    createdBy: string,
    options?: CreateVersionOptions
  ): Promise<EntityVersion> {
    const versionedEntity = await this.initializeVersionedEntity(
      organizationId,
      null,
      entityType,
      entityId
    );

    const latestVersion = await this.storage.getLatestVersion(versionedEntity.id);
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    let diffs: DiffResult[] = [];
    if (latestVersion && latestVersion.snapshot) {
      const previousSnapshot = latestVersion.snapshot as Record<string, any>;
      diffs = this.computeDiff(previousSnapshot, snapshot, entityType);
    }

    const diffMeta = {
      added: diffs.filter((d) => d.changeType === "added").length,
      modified: diffs.filter((d) => d.changeType === "modified").length,
      removed: diffs.filter((d) => d.changeType === "removed").length,
      totalChanges: diffs.length,
      categories: Array.from(new Set(diffs.map((d) => d.category))),
    };

    const versionData: InsertEntityVersion = {
      versionedEntityId: versionedEntity.id,
      versionNumber: nextVersionNumber,
      parentVersionId: latestVersion?.id,
      versionName: options?.versionName,
      changeSummary: options?.changeSummary || this.generateChangeSummary(diffs, entityType),
      snapshot,
      diffMeta,
      thumbnailUrl: options?.thumbnailUrl,
      createdBy,
    };

    const newVersion = await this.storage.createEntityVersion(versionData);

    if (diffs.length > 0) {
      const revisionMarks: InsertRevisionMark[] = diffs.map((diff) => ({
        entityVersionId: newVersion.id,
        path: diff.path,
        changeType: diff.changeType,
        previousValue: diff.previousValue,
        newValue: diff.newValue,
        displayHint: diff.displayHint,
        category: diff.category,
      }));

      await this.storage.createRevisionMarks(revisionMarks);
    }

    await this.storage.updateVersionedEntityCurrentVersion(versionedEntity.id, newVersion.id);

    logger.info("Version created", {
      entityType,
      entityId,
      versionNumber: nextVersionNumber,
      changesCount: diffs.length,
    });

    return newVersion;
  }

  computeDiff(
    previousSnapshot: Record<string, any> | null,
    currentSnapshot: Record<string, any>,
    entityType: VersionableEntityType
  ): DiffResult[] {
    if (!previousSnapshot) {
      return this.flattenObject(currentSnapshot, "", entityType).map((item) => ({
        path: item.path,
        changeType: "added" as const,
        previousValue: null,
        newValue: item.value,
        displayHint: "green",
        category: this.getCategoryFromPath(item.path, entityType),
      }));
    }

    const diffs: DiffResult[] = [];
    this.deepDiff(previousSnapshot, currentSnapshot, "", entityType, diffs);
    return diffs;
  }

  private deepDiff(
    obj1: any,
    obj2: any,
    path: string,
    entityType: VersionableEntityType,
    diffs: DiffResult[]
  ): void {
    if (obj1 === obj2) {
      return;
    }

    if (obj1 === null || obj1 === undefined) {
      if (obj2 !== null && obj2 !== undefined) {
        if (typeof obj2 === "object" && !Array.isArray(obj2)) {
          this.flattenObject(obj2, path, entityType).forEach((item) => {
            const category = this.getCategoryFromPath(item.path, entityType);
            diffs.push({
              path: item.path,
              changeType: "added",
              previousValue: null,
              newValue: item.value,
              displayHint: this.getDisplayHintFromChange("added", category),
              category,
            });
          });
        } else {
          const category = this.getCategoryFromPath(path, entityType);
          diffs.push({
            path,
            changeType: "added",
            previousValue: null,
            newValue: obj2,
            displayHint: this.getDisplayHintFromChange("added", category),
            category,
          });
        }
      }
      return;
    }

    if (obj2 === null || obj2 === undefined) {
      if (typeof obj1 === "object" && !Array.isArray(obj1)) {
        this.flattenObject(obj1, path, entityType).forEach((item) => {
          const category = this.getCategoryFromPath(item.path, entityType);
          diffs.push({
            path: item.path,
            changeType: "removed",
            previousValue: item.value,
            newValue: null,
            displayHint: this.getDisplayHintFromChange("removed", category),
            category,
          });
        });
      } else {
        const category = this.getCategoryFromPath(path, entityType);
        diffs.push({
          path,
          changeType: "removed",
          previousValue: obj1,
          newValue: null,
          displayHint: this.getDisplayHintFromChange("removed", category),
          category,
        });
      }
      return;
    }

    const type1 = Array.isArray(obj1) ? "array" : typeof obj1;
    const type2 = Array.isArray(obj2) ? "array" : typeof obj2;

    if (type1 !== type2) {
      const category = this.getCategoryFromPath(path, entityType);
      diffs.push({
        path,
        changeType: "modified",
        previousValue: obj1,
        newValue: obj2,
        displayHint: this.getDisplayHintFromChange("modified", category),
        category,
      });
      return;
    }

    if (type1 === "array") {
      this.diffArrays(obj1 as any[], obj2 as any[], path, entityType, diffs);
      return;
    }

    if (type1 === "object") {
      this.diffObjects(obj1, obj2, path, entityType, diffs);
      return;
    }

    if (obj1 !== obj2) {
      const category = this.getCategoryFromPath(path, entityType);
      diffs.push({
        path,
        changeType: "modified",
        previousValue: obj1,
        newValue: obj2,
        displayHint: this.getDisplayHintFromChange("modified", category),
        category,
      });
    }
  }

  private diffArrays(
    arr1: any[],
    arr2: any[],
    path: string,
    entityType: VersionableEntityType,
    diffs: DiffResult[]
  ): void {
    const hasIdField = arr1.some((item) => item?.id) || arr2.some((item) => item?.id);

    if (hasIdField) {
      this.diffArraysById(arr1, arr2, path, entityType, diffs);
    } else {
      this.diffArraysByIndex(arr1, arr2, path, entityType, diffs);
    }
  }

  private diffArraysById(
    arr1: any[],
    arr2: any[],
    path: string,
    entityType: VersionableEntityType,
    diffs: DiffResult[]
  ): void {
    const map1 = new Map<string, any>();
    const map2 = new Map<string, any>();

    arr1.forEach((item, index) => {
      const key = item?.id || `_index_${index}`;
      map1.set(key, item);
    });

    arr2.forEach((item, index) => {
      const key = item?.id || `_index_${index}`;
      map2.set(key, item);
    });

    Array.from(map1.entries()).forEach(([id, item1]) => {
      const itemPath = `${path}[id=${id}]`;
      if (!map2.has(id)) {
        const category = this.getCategoryFromPath(itemPath, entityType);
        diffs.push({
          path: itemPath,
          changeType: "removed",
          previousValue: item1,
          newValue: null,
          displayHint: this.getDisplayHintFromChange("removed", category),
          category,
        });
      } else {
        this.deepDiff(item1, map2.get(id), itemPath, entityType, diffs);
      }
    });

    Array.from(map2.entries()).forEach(([id, item2]) => {
      if (!map1.has(id)) {
        const itemPath = `${path}[id=${id}]`;
        const category = this.getCategoryFromPath(itemPath, entityType);
        diffs.push({
          path: itemPath,
          changeType: "added",
          previousValue: null,
          newValue: item2,
          displayHint: this.getDisplayHintFromChange("added", category),
          category,
        });
      }
    });
  }

  private diffArraysByIndex(
    arr1: any[],
    arr2: any[],
    path: string,
    entityType: VersionableEntityType,
    diffs: DiffResult[]
  ): void {
    const maxLen = Math.max(arr1.length, arr2.length);

    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;

      if (i >= arr1.length) {
        const category = this.getCategoryFromPath(itemPath, entityType);
        diffs.push({
          path: itemPath,
          changeType: "added",
          previousValue: null,
          newValue: arr2[i],
          displayHint: this.getDisplayHintFromChange("added", category),
          category,
        });
      } else if (i >= arr2.length) {
        const category = this.getCategoryFromPath(itemPath, entityType);
        diffs.push({
          path: itemPath,
          changeType: "removed",
          previousValue: arr1[i],
          newValue: null,
          displayHint: this.getDisplayHintFromChange("removed", category),
          category,
        });
      } else {
        this.deepDiff(arr1[i], arr2[i], itemPath, entityType, diffs);
      }
    }
  }

  private diffObjects(
    obj1: Record<string, any>,
    obj2: Record<string, any>,
    path: string,
    entityType: VersionableEntityType,
    diffs: DiffResult[]
  ): void {
    const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));

    allKeys.forEach((key) => {
      const keyPath = path ? `${path}.${key}` : key;
      this.deepDiff(obj1[key], obj2[key], keyPath, entityType, diffs);
    });
  }

  private flattenObject(
    obj: any,
    path: string,
    entityType: VersionableEntityType
  ): Array<{ path: string; value: any }> {
    const results: Array<{ path: string; value: any }> = [];

    if (obj === null || obj === undefined) {
      return results;
    }

    if (typeof obj !== "object") {
      results.push({ path, value: obj });
      return results;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        if (typeof item === "object" && item !== null) {
          results.push(...this.flattenObject(item, itemPath, entityType));
        } else {
          results.push({ path: itemPath, value: item });
        }
      });
    } else {
      for (const [key, value] of Object.entries(obj)) {
        const keyPath = path ? `${path}.${key}` : key;
        if (typeof value === "object" && value !== null) {
          results.push(...this.flattenObject(value, keyPath, entityType));
        } else {
          results.push({ path: keyPath, value });
        }
      }
    }

    return results;
  }

  getCategoryFromPath(path: string, entityType: VersionableEntityType): string {
    const lowerPath = path.toLowerCase();

    if (entityType === "quote") {
      if (lowerPath.includes("lineitem") || lowerPath.includes("line_item")) {
        if (PRICING_KEYWORDS.some((k) => lowerPath.includes(k))) {
          return "pricing";
        }
        if (lowerPath.includes("quantity") || lowerPath.includes("qty")) {
          return "quantity";
        }
        return "line_items";
      }
      if (PRICING_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "pricing";
      }
      if (HARDWARE_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "hardware";
      }
      if (lowerPath.includes("term") || lowerPath.includes("condition")) {
        return "terms";
      }
      if (lowerPath.includes("customer") || lowerPath.includes("client")) {
        return "customer";
      }
    }

    if (entityType === "diagram") {
      if (lowerPath.includes("component")) {
        if (POSITION_KEYWORDS.some((k) => lowerPath.includes(k))) {
          return "position";
        }
        return "components";
      }
      if (CONNECTION_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "connection";
      }
      if (lowerPath.includes("annotation") || lowerPath.includes("label")) {
        return "annotations";
      }
      if (POSITION_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "position";
      }
    }

    if (entityType === "floor_plan") {
      if (lowerPath.includes("door") && lowerPath.includes("location")) {
        return "door_locations";
      }
      if (DIMENSION_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "dimensions";
      }
      if (lowerPath.includes("scale")) {
        return "scale";
      }
      if (POSITION_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "position";
      }
    }

    if (entityType === "opening") {
      if (DIMENSION_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "dimensions";
      }
      if (HARDWARE_KEYWORDS.some((k) => lowerPath.includes(k))) {
        return "hardware";
      }
      if (lowerPath.includes("frame")) {
        return "frame";
      }
      if (lowerPath.includes("door")) {
        return "door";
      }
    }

    if (PRICING_KEYWORDS.some((k) => lowerPath.includes(k))) {
      return "pricing";
    }
    if (HARDWARE_KEYWORDS.some((k) => lowerPath.includes(k))) {
      return "hardware";
    }
    if (DIMENSION_KEYWORDS.some((k) => lowerPath.includes(k))) {
      return "dimensions";
    }
    if (POSITION_KEYWORDS.some((k) => lowerPath.includes(k))) {
      return "position";
    }
    if (CONNECTION_KEYWORDS.some((k) => lowerPath.includes(k))) {
      return "connection";
    }
    if (
      lowerPath.includes("name") ||
      lowerPath.includes("note") ||
      lowerPath.includes("description") ||
      lowerPath.includes("comment")
    ) {
      return "metadata";
    }

    return "general";
  }

  getDisplayHintFromChange(
    changeType: "added" | "modified" | "removed",
    category: string
  ): string {
    switch (changeType) {
      case "added":
        return "green";
      case "removed":
        return "red";
      case "modified":
        if (category === "pricing") {
          return "amber";
        }
        if (category === "quantity") {
          return "amber";
        }
        if (category === "position") {
          return "amber";
        }
        return "amber";
      default:
        return "amber";
    }
  }

  private generateChangeSummary(diffs: DiffResult[], entityType: VersionableEntityType): string {
    if (diffs.length === 0) {
      return "No changes";
    }

    const added = diffs.filter((d) => d.changeType === "added").length;
    const modified = diffs.filter((d) => d.changeType === "modified").length;
    const removed = diffs.filter((d) => d.changeType === "removed").length;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (removed > 0) parts.push(`${removed} removed`);

    const categories = Array.from(new Set(diffs.map((d) => d.category)));
    const categoryStr = categories.slice(0, 3).join(", ");

    return `${parts.join(", ")} in ${categoryStr}${categories.length > 3 ? "..." : ""}`;
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<VersionComparisonResult> {
    const result = await this.storage.compareVersions(versionId1, versionId2);

    if (!result) {
      throw new Error("One or both versions not found");
    }

    const { version1, version2 } = result;

    if (version1.versionedEntityId !== version2.versionedEntityId) {
      throw new Error("Cannot compare versions from different entities");
    }

    const versionedEntity = await this.storage.getVersionedEntity(
      version1.versionedEntityId,
      ""
    );

    if (!versionedEntity) {
      throw new Error("Versioned entity not found");
    }

    const entityType = versionedEntity.entityType as VersionableEntityType;

    const [olderVersion, newerVersion] =
      version1.versionNumber < version2.versionNumber
        ? [version1, version2]
        : [version2, version1];

    const snapshot1 = olderVersion.snapshot as Record<string, any>;
    const snapshot2 = newerVersion.snapshot as Record<string, any>;

    const diffs = this.computeDiff(snapshot1, snapshot2, entityType);

    return {
      versionedEntityId: version1.versionedEntityId,
      version1: olderVersion,
      version2: newerVersion,
      diffs,
      summary: {
        added: diffs.filter((d) => d.changeType === "added").length,
        modified: diffs.filter((d) => d.changeType === "modified").length,
        removed: diffs.filter((d) => d.changeType === "removed").length,
        totalChanges: diffs.length,
      },
    };
  }

  async getVersionHistory(
    organizationId: string,
    entityType: VersionableEntityType,
    entityId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ versions: EntityVersion[]; total: number }> {
    const versionedEntity = await this.storage.getVersionedEntityByEntityRef(
      entityType,
      entityId,
      organizationId
    );

    if (!versionedEntity) {
      return { versions: [], total: 0 };
    }

    const versions = await this.storage.getVersionHistory(versionedEntity.id, limit, offset);

    return {
      versions,
      total: versions.length,
    };
  }

  async getVersion(versionId: string): Promise<VersionWithMarks | null> {
    const version = await this.storage.getEntityVersion(versionId);

    if (!version) {
      return null;
    }

    const revisionMarks = await this.storage.getRevisionMarks(versionId);

    return {
      ...version,
      revisionMarks,
    };
  }

  async restoreVersion(
    versionId: string,
    restoredBy: string,
    organizationId: string
  ): Promise<EntityVersion> {
    const versionToRestore = await this.storage.getEntityVersion(versionId);

    if (!versionToRestore) {
      throw new Error("Version not found");
    }

    const versionedEntity = await this.storage.getVersionedEntity(
      versionToRestore.versionedEntityId,
      organizationId
    );

    if (!versionedEntity) {
      throw new Error("Versioned entity not found");
    }

    const restoredVersion = await this.createVersion(
      versionedEntity.organizationId,
      versionedEntity.entityType as VersionableEntityType,
      versionedEntity.entityId,
      versionToRestore.snapshot as Record<string, any>,
      restoredBy,
      {
        versionName: `Restored from v${versionToRestore.versionNumber}`,
        changeSummary: `Restored from version ${versionToRestore.versionNumber}${versionToRestore.versionName ? ` (${versionToRestore.versionName})` : ""}`,
      }
    );

    logger.info("Version restored", {
      originalVersionId: versionId,
      newVersionId: restoredVersion.id,
      restoredBy,
    });

    return restoredVersion;
  }

  async getRevisionMarksByCategory(
    versionId: string,
    category: string
  ): Promise<RevisionMark[]> {
    return await this.storage.getRevisionMarksByCategory(versionId, category);
  }

  async deleteVersionHistory(
    organizationId: string,
    entityType: VersionableEntityType,
    entityId: string
  ): Promise<boolean> {
    const versionedEntity = await this.storage.getVersionedEntityByEntityRef(
      entityType,
      entityId,
      organizationId
    );

    if (!versionedEntity) {
      return false;
    }

    const versions = await this.storage.getVersionHistory(versionedEntity.id);
    for (const version of versions) {
      await this.storage.deleteRevisionMarks(version.id);
    }

    logger.info("Version history deleted", {
      entityType,
      entityId,
      versionsDeleted: versions.length,
    });

    return true;
  }
}

export const versioningService = new VersioningService(storage);
