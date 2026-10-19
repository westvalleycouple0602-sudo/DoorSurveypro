
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const exportBranding = pgTable("export_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),

  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  accentColor: text("accent_color"),

  headerText: text("header_text"),
  footerText: text("footer_text"),
  watermarkText: text("watermark_text"),

  isDefaultForTenant: boolean("is_default_for_tenant").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
