import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { logger } from "./logger";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor(message?: string) {
    super(message || "Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageConfigError";
    Object.setPrototypeOf(this, ObjectStorageConfigError.prototype);
  }
}

export interface LidarScanMetadata {
  originalFilename: string;
  contentType: string;
  size: number;
  checksum: string;
  scanFormat: "ply" | "obj" | "json";
  uploadedAt: string;
}

export interface UploadResult {
  storageKey: string;
  metadata: LidarScanMetadata;
  signedUrl: string;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
  contentType,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
  contentType?: string;
}): Promise<string> {
  const request: Record<string, unknown> = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  
  if (contentType && method === "PUT") {
    request.content_type = contentType;
  }
  
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `error: ${errorText}, make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

function getContentType(scanFormat: "ply" | "obj" | "json"): string {
  switch (scanFormat) {
    case "ply":
      return "application/x-ply";
    case "obj":
      return "text/plain";
    case "json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

function calculateChecksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export class ObjectStorageService {
  constructor() {}

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageConfigError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /your-bucket-name)."
      );
    }
    return dir;
  }

  isConfigured(): boolean {
    return !!process.env.PRIVATE_OBJECT_DIR;
  }

  generateLidarScanStorageKey(
    orgId: string,
    scanId: string,
    filename: string
  ): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `/lidar-scans/${orgId}/${scanId}/${sanitizedFilename}`;
  }

  async uploadLidarScan(
    buffer: Buffer,
    orgId: string,
    scanId: string,
    originalFilename: string,
    scanFormat: "ply" | "obj" | "json"
  ): Promise<UploadResult> {
    const privateDir = this.getPrivateObjectDir();
    const storageKey = this.generateLidarScanStorageKey(orgId, scanId, originalFilename);
    const fullPath = `${privateDir}${storageKey}`;
    
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const contentType = getContentType(scanFormat);
    const checksum = calculateChecksum(buffer);

    logger.info("Uploading LiDAR scan to object storage", {
      orgId,
      scanId,
      storageKey,
      size: buffer.length,
      contentType,
    });

    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
      contentType,
    });

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "x-goog-meta-checksum": checksum,
        "x-goog-meta-original-filename": encodeURIComponent(originalFilename),
        "x-goog-meta-scan-format": scanFormat,
      },
      body: buffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => "Unknown error");
      throw new Error(`Failed to upload LiDAR scan: ${uploadResponse.status} - ${errorText}`);
    }

    const metadata: LidarScanMetadata = {
      originalFilename,
      contentType,
      size: buffer.length,
      checksum,
      scanFormat,
      uploadedAt: new Date().toISOString(),
    };

    const downloadUrl = await this.getLidarScanUrl(storageKey);

    logger.info("LiDAR scan uploaded successfully", {
      orgId,
      scanId,
      storageKey,
      checksum,
    });

    return {
      storageKey,
      metadata,
      signedUrl: downloadUrl,
    };
  }

  async getLidarScanUrl(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const privateDir = this.getPrivateObjectDir();
    const fullPath = `${privateDir}${storageKey}`;
    
    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  async deleteLidarScan(storageKey: string): Promise<boolean> {
    const privateDir = this.getPrivateObjectDir();
    const fullPath = `${privateDir}${storageKey}`;
    
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    try {
      const [exists] = await file.exists();
      if (!exists) {
        logger.warn("LiDAR scan not found for deletion", { storageKey });
        return false;
      }

      await file.delete();
      logger.info("LiDAR scan deleted successfully", { storageKey });
      return true;
    } catch (error) {
      logger.error("Failed to delete LiDAR scan", { storageKey, error });
      throw error;
    }
  }

  async getLidarScanFile(storageKey: string): Promise<File> {
    const privateDir = this.getPrivateObjectDir();
    const fullPath = `${privateDir}${storageKey}`;
    
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError(`LiDAR scan not found: ${storageKey}`);
    }

    return file;
  }

  async downloadLidarScan(storageKey: string, res: Response): Promise<void> {
    try {
      const file = await this.getLidarScanFile(storageKey);
      const [metadata] = await file.getMetadata();

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size?.toString() || "",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `attachment; filename="${metadata.metadata?.["original-filename"] || "scan"}"`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        logger.error("Stream error while downloading LiDAR scan", { storageKey, error: err });
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      logger.error("Error downloading LiDAR scan", { storageKey, error });
      if (error instanceof ObjectNotFoundError) {
        if (!res.headersSent) {
          res.status(404).json({ error: "Scan not found" });
        }
      } else if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async validateChecksum(storageKey: string, expectedChecksum: string): Promise<boolean> {
    try {
      const file = await this.getLidarScanFile(storageKey);
      const [metadata] = await file.getMetadata();
      const storedChecksum = metadata.metadata?.checksum;
      
      if (storedChecksum === expectedChecksum) {
        return true;
      }

      logger.warn("Checksum mismatch for LiDAR scan", {
        storageKey,
        expected: expectedChecksum,
        stored: storedChecksum,
      });
      return false;
    } catch (error) {
      logger.error("Error validating checksum", { storageKey, error });
      return false;
    }
  }

  async getUploadUrl(
    orgId: string,
    scanId: string,
    filename: string,
    scanFormat: "ply" | "obj" | "json"
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    const privateDir = this.getPrivateObjectDir();
    const storageKey = this.generateLidarScanStorageKey(orgId, scanId, filename);
    const fullPath = `${privateDir}${storageKey}`;
    
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const contentType = getContentType(scanFormat);

    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
      contentType,
    });

    return { uploadUrl, storageKey };
  }
}

export const objectStorageService = new ObjectStorageService();
