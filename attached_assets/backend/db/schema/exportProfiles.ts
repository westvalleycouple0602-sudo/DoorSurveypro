
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
// Adjust these imports to match your existing schema locations
import { tenants } from "./tenants";
import { users } from "./users";

export const exportProfiles = pgTable("export_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

  name: text("name").notNull(),
  description: text("description"),

  scope: text("scope").notNull().default("both"),

  showLineItems: boolean("show_line_items").notNull().default(true),
  showLineItemPrices: boolean("show_line_item_prices").notNull().default(true),
  showLineItemQuantities: boolean("show_line_item_quantities").notNull().default(true),
  showLineItemTotals: boolean("show_line_item_totals").notNull().default(true),

  showSummaryTotals: boolean("show_summary_totals").notNull().default(true),
  groupItemsBy: text("group_items_by").notNull().default("none"),

  showMaterialBreakdown: boolean("show_material_breakdown").notNull().default(true),
  showLaborBreakdown: boolean("show_labor_breakdown").notNull().default(true),

  taxMode: text("tax_mode").notNull().default("include_tax"),
  showTaxRate: boolean("show_tax_rate").notNull().default(true),

  showInternalNotes: boolean("show_internal_notes").notNull().default(false),
  showCostBreakdown: boolean("show_cost_breakdown").notNull().default(true),
  showMarginOrMarkup: boolean("show_margin_or_markup").notNull().default(false),

  defaultAlternativeLabel: text("default_alternative_label"),
  isDefaultForTenant: boolean("is_default_for_tenant").notNull().default(false),

  templateType: text("template_type"),
  language: text("language").notNull().default("en"),
  exportBrandingId: uuid("export_branding_id"),

  includeImages: boolean("include_images").notNull().default(false),
  includeDoorIcons: boolean("include_door_icons").notNull().default(false),
  includeScanSnapshots: boolean("include_scan_snapshots").notNull().default(false),

  includeComplianceSummary: boolean("include_compliance_summary").notNull().default(false),
  includeInstallTimeline: boolean("include_install_timeline").notNull().default(false),
  includeCutSheetSection: boolean("include_cut_sheet_section").notNull().default(false),
  includeCostCharts: boolean("include_cost_charts").notNull().default(false),

  goodBetterBestMode: boolean("good_better_best_mode").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
