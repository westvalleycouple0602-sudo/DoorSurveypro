
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
// Adjust these imports to match your existing schema locations
import { quotes } from "./quotes";
import { users } from "./users";

export const quoteVersions = pgTable("quote_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
