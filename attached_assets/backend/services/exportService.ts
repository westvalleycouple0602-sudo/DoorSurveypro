
import { db } from "../db/client";
import { exportProfiles } from "../db/schema/exportProfiles";
import { exportHistory } from "../db/schema/exportHistory";
import { quoteVersions } from "../db/schema/quoteVersions";
import { eq } from "drizzle-orm";

interface GenerateExportParams {
  tenantId: string;
  userId: string;
  quoteId: string;
  exportProfileId?: string | null;
  quoteVersionId?: string | null;
  format?: "pdf" | "html";
  templateType?: string | null;
  language?: string | null;
}

export async function generateQuoteExport(params: GenerateExportParams): Promise<{
  buffer: Buffer;
  filename: string;
  mimetype: string;
}> {
  const {
    tenantId,
    userId,
    quoteId,
    exportProfileId,
    quoteVersionId,
    format = "pdf",
    templateType,
    language = "en",
  } = params;

  let profile: any = null;
  if (exportProfileId) {
    const [row] = await db.select().from(exportProfiles).where(eq(exportProfiles.id, exportProfileId));
    profile = row ?? null;
  }

  let versionLabel: string | null = null;
  if (quoteVersionId) {
    const [version] = await db.select().from(quoteVersions).where(eq(quoteVersions.id, quoteVersionId));
    versionLabel = version?.label ?? null;
  }

  const content = [
    `DoorSurvey Pro Export`,
    `Tenant: ${tenantId}`,
    `Quote: ${quoteId}`,
    versionLabel ? `Version: ${versionLabel}` : null,
    profile ? `Profile: ${profile.name}` : null,
    templateType ? `Template: ${templateType}` : null,
    `Language: ${language}`,
    "",
    "Replace this section with real HTML/PDF rendering using profile settings, line items, compliance data, AR scans, etc."
  ]
    .filter(Boolean)
    .join("\n");

  const buffer = Buffer.from(content, "utf-8");
  const filename = `quote-${quoteId}-${Date.now()}.${format === "pdf" ? "pdf" : "txt"}`;
  const mimetype = format === "pdf" ? "application/pdf" : "text/plain";

  await db.insert(exportHistory).values({
    tenantId,
    userId,
    quoteId,
    quoteVersionId: quoteVersionId ?? null,
    exportProfileId: exportProfileId ?? null,
    format,
    templateType: templateType ?? null,
    language,
    deliveredVia: "download",
    targetEmail: null,
  });

  return { buffer, filename, mimetype };
}
