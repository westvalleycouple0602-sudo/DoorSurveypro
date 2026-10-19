
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { quotes } from "./quotes";
import { quoteVersions } from "./quoteVersions";
import { exportProfiles } from "./exportProfiles";

export const exportHistory = pgTable("export_history", {
  id: uuid("id").defaultRandom().primaryKey(),

  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),

  quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
  quoteVersionId: uuid("quote_version_id").references(() => quoteVersions.id, { onDelete: "set null" }),
  exportProfileId: uuid("export_profile_id").references(() => exportProfiles.id, { onDelete: "set null" }),

  format: text("format").notNull(),
  templateType: text("template_type"),
  language: text("language"),

  deliveredVia: text("delivered_via"),
  targetEmail: text("target_email"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
