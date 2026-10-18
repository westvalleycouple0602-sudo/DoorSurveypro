import { promises as fs } from "node:fs";
import { objectStorageService } from "./objectStorage";

// Keep stored paths unchanged. Legacy local uploads and durable object keys
// are both valid capture references; an unavailable capture fails explicitly.
export async function readDualScanContent(capturePath: string): Promise<string> {
  if (capturePath.startsWith("/lidar-scans/")) {
    const file = await objectStorageService.getLidarScanFile(capturePath);
    const [content] = await file.download();
    return content.toString("utf8");
  }
  return fs.readFile(capturePath, "utf8");
}
