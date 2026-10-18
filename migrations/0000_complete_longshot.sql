CREATE TABLE "access_control_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"component_type" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"display_name" text NOT NULL,
	"description" text,
	"icon_type" text,
	"width" integer DEFAULT 80,
	"height" integer DEFAULT 60,
	"color" text,
	"voltage" text,
	"current_draw" text,
	"wire_type" text,
	"terminals" jsonb,
	"notes" text,
	"is_system_default" text DEFAULT 'no',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_corrections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar,
	"correction_type" text NOT NULL,
	"original_data" jsonb NOT NULL,
	"corrected_data" jsonb NOT NULL,
	"context" text,
	"insights" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"user_id" varchar,
	"scan_id" varchar,
	"project_id" varchar,
	"page" text,
	"platform" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"screenshot_url" text,
	"logs_excerpt" text,
	"assigned_to" varchar,
	"notes" text,
	"user_agent" text,
	"browser_info" jsonb,
	"extra" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "bundle_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" varchar NOT NULL,
	"item_type" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"description" text NOT NULL,
	"quantity" text DEFAULT '1',
	"location" text,
	"condition" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"category" text NOT NULL,
	"manufacturer" text,
	"model" text NOT NULL,
	"specifications" text,
	"notes" text,
	"requires_quote" text DEFAULT 'yes',
	"default_manufacturer_contact_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_order_id" varchar NOT NULL,
	"item_type" text NOT NULL,
	"action" text NOT NULL,
	"opening_id" varchar,
	"hardware_item_id" varchar,
	"original_data" jsonb,
	"new_data" jsonb,
	"description" text NOT NULL,
	"cost_before" real DEFAULT 0,
	"cost_after" real DEFAULT 0,
	"cost_delta" real DEFAULT 0,
	"line_number" serial NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"change_order_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"customer_approval_status" text DEFAULT 'pending',
	"customer_approved_at" timestamp,
	"customer_approved_by" text,
	"customer_approval_notes" text,
	"original_cost" real DEFAULT 0,
	"new_cost" real DEFAULT 0,
	"cost_delta" real DEFAULT 0,
	"payment_status" text DEFAULT 'unpaid',
	"payment_intent_id" text,
	"payment_amount" real,
	"payment_currency" text DEFAULT 'usd',
	"paid_at" timestamp,
	"payment_notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "compliance_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"code_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"conditions" jsonb NOT NULL,
	"building_types" text[],
	"door_types" text[],
	"active" text DEFAULT 'yes' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_violations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"rule_id" varchar NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "customer_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"location_name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"country" text DEFAULT 'USA',
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"hubspot_company_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_product_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"product_type" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"catalog_item_id" varchar,
	"quantity" text,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"usage_count" real DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"type" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"preferred_manufacturers" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_annotations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagram_id" varchar NOT NULL,
	"x_position" integer NOT NULL,
	"y_position" integer NOT NULL,
	"annotation_type" text NOT NULL,
	"text" text NOT NULL,
	"responsible_party" text,
	"font_size" integer DEFAULT 14,
	"font_weight" text DEFAULT 'normal',
	"text_color" text DEFAULT '#1f2937',
	"background_color" text,
	"border_color" text,
	"width" integer,
	"height" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagram_id" varchar NOT NULL,
	"component_id" varchar,
	"x_position" integer NOT NULL,
	"y_position" integer NOT NULL,
	"display_name" text,
	"custom_notes" text,
	"rotation" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagram_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagram_id" varchar NOT NULL,
	"from_component_id" varchar NOT NULL,
	"to_component_id" varchar NOT NULL,
	"from_terminal" text,
	"to_terminal" text,
	"wire_type" text,
	"wire_gauge" text,
	"wire_color" text,
	"voltage" text,
	"line_style" text DEFAULT 'solid',
	"line_color" text DEFAULT '#374151',
	"line_width" integer DEFAULT 2,
	"path_points" jsonb,
	"label" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disclaimer_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disclaimer_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"is_required" text DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disclaimers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"is_active" text DEFAULT 'yes',
	"sort_order" real DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "door_frame_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"applies_to" text NOT NULL,
	"market" text NOT NULL,
	"attribute_group" text NOT NULL,
	"attribute_name" text NOT NULL,
	"value" text NOT NULL,
	"value_code" text NOT NULL,
	"description" text,
	"compatibility" text,
	"standards_codes" text,
	"cost_impact" text,
	"lead_time_impact" text,
	"is_default" text DEFAULT 'no',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "door_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"floor_plan_id" varchar NOT NULL,
	"x_position" integer NOT NULL,
	"y_position" integer NOT NULL,
	"rotation" real,
	"swing_direction" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "door_openings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"opening_number" text NOT NULL,
	"location" text NOT NULL,
	"room_number" text,
	"room_name" text,
	"building" text,
	"floor" text,
	"zone" text,
	"door_type" text,
	"door_material" text,
	"door_width" text,
	"door_height" text,
	"door_thickness" text,
	"door_core_type" text,
	"door_pressure_rating" text,
	"door_stc_rating" text,
	"door_lead_lined" text DEFAULT 'no',
	"integrated_hardware" text DEFAULT 'no',
	"impact_door" text DEFAULT 'no',
	"barn_door_sliding" text DEFAULT 'no',
	"frame_type" text,
	"frame_material" text,
	"frame_width" text,
	"frame_depth" text,
	"lock_type" text,
	"hinge_type" text,
	"hinge_count" text,
	"closer_type" text,
	"exit_device" text,
	"door_fire_rating" text,
	"frame_fire_rating" text,
	"hardware_fire_rated" text DEFAULT 'no',
	"fire_rating_notes" text,
	"raceways_required" text DEFAULT 'no',
	"raceways_present" text DEFAULT 'no',
	"raceways_notes" text,
	"gasketing_required" text DEFAULT 'no',
	"intumescent_seals" text DEFAULT 'no',
	"smoke_seals" text DEFAULT 'no',
	"perimeter_seals" text DEFAULT 'no',
	"meeting_stile_seals" text DEFAULT 'no',
	"astragal_type" text,
	"threshold_seal" text DEFAULT 'no',
	"automatic_drop_seals" text DEFAULT 'no',
	"gasketing_notes" text,
	"sidelite_left" text DEFAULT 'no',
	"sidelite_left_width" text,
	"sidelite_right" text DEFAULT 'no',
	"sidelite_right_width" text,
	"sidelite_glass_type" text,
	"transom_present" text DEFAULT 'no',
	"transom_height" text,
	"transom_width" text,
	"transom_glass_type" text,
	"door_elevation" text,
	"lite_kit_type" text,
	"lite_kit_id" integer,
	"door_finish_type" text,
	"wood_veneer_species" text,
	"wood_veneer_cut" text,
	"wood_stain_color" text,
	"wood_stain_manufacturer" text,
	"wood_finish_sheen" text,
	"hpdl_laminate_pattern" text,
	"hpdl_laminate_color" text,
	"hpdl_laminate_manufacturer" text,
	"hpdl_laminate_grade" text,
	"metal_finish_type" text,
	"metal_primer_type" text,
	"anodized_finish" text,
	"powder_coat_color" text,
	"powder_coat_manufacturer" text,
	"powder_coat_finish" text,
	"vision_lite_present" text DEFAULT 'no',
	"vision_lite_width" text,
	"vision_lite_height" text,
	"vision_lite_location" text,
	"vision_lite_glass_type" text,
	"vision_lite_thickness" text,
	"vision_lite_fire_rating" text,
	"vision_lite_stc_rating" text,
	"vision_lite_vandal_resistant" text DEFAULT 'no',
	"vision_lite_fire_resistant" text DEFAULT 'no',
	"vision_lite_cutout_width" text,
	"vision_lite_cutout_height" text,
	"vision_lite_calculated_glass_width" text,
	"vision_lite_calculated_glass_height" text,
	"sidelite_thickness" text,
	"sidelite_fire_rating" text,
	"sidelite_stc_rating" text,
	"sidelite_vandal_resistant" text DEFAULT 'no',
	"sidelite_fire_resistant" text DEFAULT 'no',
	"sidelite_cutout_width" text,
	"sidelite_cutout_height" text,
	"sidelite_calculated_glass_width" text,
	"sidelite_calculated_glass_height" text,
	"sidelite_spandrel_glazing" text DEFAULT 'no',
	"sidelite_solid_panel" text DEFAULT 'no',
	"sidelite_left_calculated_height" text,
	"sidelite_right_calculated_height" text,
	"transom_thickness" text,
	"transom_fire_rating" text,
	"transom_stc_rating" text,
	"transom_vandal_resistant" text DEFAULT 'no',
	"transom_fire_resistant" text DEFAULT 'no',
	"transom_cutout_width" text,
	"transom_cutout_height" text,
	"transom_calculated_glass_width" text,
	"transom_calculated_glass_height" text,
	"transom_spandrel_glazing" text DEFAULT 'no',
	"transom_solid_panel" text DEFAULT 'no',
	"door_cutout_width" text,
	"door_cutout_height" text,
	"door_glass_type" text,
	"door_calculated_glass_width" text,
	"door_calculated_glass_height" text,
	"vision_lite_spandrel_glazing" text DEFAULT 'no',
	"vision_lite_solid_panel" text DEFAULT 'no',
	"glass_manufacturer" text,
	"glass_notes" text,
	"glazing_installation_type" text,
	"glazing_method" text,
	"butyl_tape_required" text DEFAULT 'no',
	"butyl_tape_type" text,
	"glazing_tape_sealant" text,
	"glazing_gaskets" text,
	"glazing_stops" text,
	"glazing_beads" text,
	"setting_blocks" text,
	"glazing_notes" text,
	"automation_required" text,
	"automation_type" text,
	"power_requirements" text[],
	"power_available" text DEFAULT 'no',
	"electrified_hardware" text DEFAULT 'no',
	"access_control_required" text,
	"access_control_type" text,
	"reuse_door" text DEFAULT 'no',
	"reuse_frame" text DEFAULT 'no',
	"reuse_hardware" text DEFAULT 'no',
	"installation_narrative" text,
	"component_notes" text,
	"wiring_notes" text,
	"field_issues" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "door_reference" (
	"id" serial PRIMARY KEY NOT NULL,
	"illustration" text,
	"category" text,
	"subcategory" text,
	"door_type" text,
	"material" text,
	"finish" text,
	"configuration" text,
	"operation" text,
	"frame_type" text,
	"hardware" text,
	"glass_type" text,
	"automation_ready" text,
	"common_use" text,
	"notes" text,
	"image_reference" text,
	"duty_level" text,
	"core_type" text,
	"anchor_type" text,
	"gauge_door" text,
	"gauge_frame" text,
	"hardware_prep_type" text,
	"reinforcement_spec" text,
	"finish_standard" text,
	"fire_label" text,
	"tolerance_guide" text,
	"wall_type___anchor_compatibility" text,
	"thermal_rating" text,
	"construction_type_hmma_810" text,
	"edge_profile" text,
	"meeting_edge___astragal" text,
	"vision_lite_type" text,
	"louver_type" text,
	"hinge_type" text,
	"closer_type" text,
	"lock_type" text,
	"exit_device_type" text,
	"std_lock_cl_in" real,
	"std_pull_deadlock_cl_in" real,
	"hospital_latch_cl_in" real,
	"standard_clearances" text
);
--> statement-breakpoint
CREATE TABLE "door_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"door_type" text,
	"door_material" text,
	"door_width" text,
	"door_height" text,
	"door_thickness" text,
	"frame_type" text,
	"frame_material" text,
	"frame_width" text,
	"frame_depth" text,
	"lock_type" text,
	"hinge_type" text,
	"hinge_count" text,
	"closer_type" text,
	"exit_device" text,
	"sidelite_left" text,
	"sidelite_left_width" text,
	"sidelite_right" text,
	"sidelite_right_width" text,
	"sidelite_glass_type" text,
	"transom_present" text,
	"transom_height" text,
	"transom_width" text,
	"transom_glass_type" text,
	"vision_lite_present" text,
	"vision_lite_width" text,
	"vision_lite_height" text,
	"vision_lite_location" text,
	"vision_lite_glass_type" text,
	"automation_required" text,
	"automation_type" text,
	"access_control_required" text,
	"access_control_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edge_lite_types_hmma_810" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text,
	"examples_or_notes" text
);
--> statement-breakpoint
CREATE TABLE "external_service_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar,
	"service" text NOT NULL,
	"connector_id" text,
	"settings" jsonb,
	"is_enabled" text DEFAULT 'yes' NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"building" text,
	"floor" text,
	"image_data" text,
	"image_mime_type" text,
	"image_file_name" text,
	"scale_ratio" real,
	"scale_notes" text,
	"image_width" integer,
	"image_height" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gasketing_catalog" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manufacturer" text NOT NULL,
	"part_number" text NOT NULL,
	"category" text NOT NULL,
	"product_name" text NOT NULL,
	"description" text,
	"material" text,
	"fire_rating" text,
	"smoke_rating" text,
	"sound_rating" text,
	"application" text,
	"door_type" text,
	"dimensions" text,
	"finish" text,
	"list_price" real,
	"notes" text,
	"is_active" text DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glass_fire_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"glass_type" text NOT NULL,
	"width_in" real NOT NULL,
	"height_in" real NOT NULL,
	"price_usd" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "glass_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"glass_name" text NOT NULL,
	"thickness_in" text NOT NULL,
	"fire_rating" text NOT NULL,
	"max_area_sq_in_for_60_90_min" real,
	"max_area_sq_in_for_20_45_min" real,
	"safety_standard" text,
	"stc_rating" text,
	"gasketing" text,
	"ul10c" text,
	"notes" text,
	"preset_hospital" text DEFAULT 'no',
	"preset_office" text DEFAULT 'no',
	"preset_hotel" text DEFAULT 'no',
	CONSTRAINT "glass_types_glass_name_unique" UNIQUE("glass_name")
);
--> statement-breakpoint
CREATE TABLE "hardware_bundles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_cross_reference" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type" text NOT NULL,
	"description" text,
	"trimco_part" text,
	"rock_part" text,
	"abh_part" text NOT NULL,
	"abh_drawing" text,
	"other_manufacturer_part" text,
	"other_manufacturer_name" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"item_type" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"description" text NOT NULL,
	"quantity" text DEFAULT '1',
	"location" text,
	"condition" text,
	"notes" text,
	"is_custom" text DEFAULT 'no',
	"custom_manufacturer_id" varchar,
	"key_blank" text,
	"bitting_code" text,
	"pinning" text,
	"key_symbol" text,
	"master_key_system_id" varchar,
	"lock_set_id" varchar,
	"construction_key_qty" integer,
	"permanent_key_qty" integer,
	"keying_remarks" text,
	"cylinder_type" text,
	"cylinder_brand" text,
	"finish" text,
	"finish_description" text,
	"list_price" real,
	"discount_percent" real,
	"supplier_name" text,
	"supplier_part_number" text,
	"lead_time_days" integer,
	"labor_hours" real,
	"installation_sequence" integer,
	"prep_requirements" text,
	"special_tools" text,
	"installation_notes" text,
	"warranty_years" integer,
	"warranty_notes" text,
	"hardware_set" text,
	"hs_code" text,
	"country_of_origin" text,
	"tariff_rate_percent" real,
	"anti_dumping_percent" real,
	"other_duties_percent" real,
	"ship_from_country" text,
	"ship_from_postal" text,
	"ship_to_country" text,
	"ship_to_postal" text,
	"incoterm" text,
	"base_freight_cost" real,
	"fuel_surcharge_percent" real,
	"accessorials_cost" real,
	"insurance_cost" real,
	"customs_brokerage_cost" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_location_cheat" (
	"id" serial PRIMARY KEY NOT NULL,
	"item" text,
	"recommended_centerline_in" text
);
--> statement-breakpoint
CREATE TABLE "hardware_scans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar,
	"opening_id" varchar,
	"scanned_by" varchar NOT NULL,
	"scan_type" text DEFAULT 'label_scan' NOT NULL,
	"image_url" text NOT NULL,
	"image_filename" text NOT NULL,
	"decoded_tokens" jsonb,
	"extracted_fields" jsonb,
	"normalized_fields" jsonb,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"company_name" text,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"job_title" text,
	"source" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"lead_score" integer DEFAULT 0,
	"estimated_value" real,
	"estimated_close_date" timestamp,
	"company_size" text,
	"industry" text,
	"interested_in" text,
	"notes" text,
	"last_contacted_at" timestamp,
	"assigned_to" varchar,
	"converted_to_customer_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lidar_scans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"opening_id" varchar NOT NULL,
	"uploader_id" varchar NOT NULL,
	"original_filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"scan_format" text NOT NULL,
	"capture_method" text NOT NULL,
	"capture_notes" text,
	"device_info" text,
	"raw_metadata" jsonb,
	"processed_metrics" jsonb,
	"confidence_scores" jsonb,
	"compliance_findings" jsonb,
	"processing_status" text DEFAULT 'uploaded' NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "linked_external_resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar,
	"service" text NOT NULL,
	"resource_type" text NOT NULL,
	"external_id" text NOT NULL,
	"external_url" text,
	"title" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lite_kits" (
	"id" serial PRIMARY KEY NOT NULL,
	"kit_model" text NOT NULL,
	"kit_type" text NOT NULL,
	"door_materials" text NOT NULL,
	"std_door_thickness_in" real DEFAULT 1.75 NOT NULL,
	"variable_thickness" text,
	"positive_pressure_ul10c" text DEFAULT 'no',
	"max_fire_rating_metal_door" text,
	"max_fire_rating_wood_door" text,
	"smoke_s_label_capable" text DEFAULT 'no',
	"ada_bottom_edge_max_in" real DEFAULT 43,
	"std_glazing_tape" text,
	"intumescent_tape" text,
	"stc_option" text DEFAULT 'no',
	"notes_use_case" text,
	"preset_hospital" text DEFAULT 'no',
	"preset_hotel" text DEFAULT 'no',
	"default_finish" text,
	"finish_note" text,
	"adder_mullion_bar_each" real DEFAULT 0,
	"adder_torx_screws_upto_24x24" real DEFAULT 0,
	"adder_torx_screws_over_24x24" real DEFAULT 0,
	"adder_lead_lining_per_perimeter_in" real DEFAULT 0,
	"adder_stc_per_sqft" real DEFAULT 0,
	"notes" text,
	CONSTRAINT "lite_kits_kit_model_unique" UNIQUE("kit_model")
);
--> statement-breakpoint
CREATE TABLE "lock_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar,
	"master_key_system_id" varchar,
	"set_name" text NOT NULL,
	"keying_level" text,
	"key_symbol" text,
	"bitting_code" text,
	"pinning" text,
	"quantity" integer DEFAULT 1,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacturer_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"manufacturer_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"role" text,
	"email" text NOT NULL,
	"phone" text,
	"regions" text[],
	"notes" text,
	"is_primary" text DEFAULT 'no',
	"metadata" jsonb,
	"last_edited_by" varchar,
	"last_edited_by_org" varchar,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manufacturer_literature" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"contact_id" varchar NOT NULL,
	"document_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"product_catalog_item_id" varchar,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" text
);
--> statement-breakpoint
CREATE TABLE "manufacturer_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"catalog_item_id" varchar,
	"product_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget" real,
	"leads_generated" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"revenue" real DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "master_key_systems" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"system_name" text NOT NULL,
	"description" text,
	"grand_master_key" text,
	"master_keys" jsonb,
	"manufacturer" text,
	"key_blank_type" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"role" varchar DEFAULT 'technician' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opening_gasketing" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"gasketing_id" varchar NOT NULL,
	"quantity" real DEFAULT 1 NOT NULL,
	"location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_validation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"applies_to" text NOT NULL,
	"severity" text NOT NULL,
	"when_conditions" jsonb,
	"requirements" jsonb,
	"message" text NOT NULL,
	"references" text[],
	"is_active" text DEFAULT 'yes',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "option_validation_rules_rule_id_unique" UNIQUE("rule_id")
);
--> statement-breakpoint
CREATE TABLE "options_lookup" (
	"id" serial PRIMARY KEY NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar,
	"subscription_tier" varchar DEFAULT 'free' NOT NULL,
	"subscription_status" varchar DEFAULT 'active' NOT NULL,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"trial_ends_at" timestamp,
	"current_period_end" timestamp,
	"project_limit" integer DEFAULT 3,
	"user_limit" integer DEFAULT 1,
	"logo_url" text,
	"signature_name" text,
	"signature_title" text,
	"signature_phone" text,
	"signature_email" text,
	"branding_color" varchar,
	"hubspot_api_key" text,
	"hubspot_enabled" text DEFAULT 'no',
	"is_demo" text DEFAULT 'no',
	"is_master_account" text DEFAULT 'no',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "partner_code_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"partner_id" text NOT NULL,
	"internal_code" text NOT NULL,
	"partner_code" text NOT NULL,
	"code_type" text NOT NULL,
	"description" text,
	"conversion_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_vendors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"partner_id" text NOT NULL,
	"partner_name" text NOT NULL,
	"partner_type" text NOT NULL,
	"api_endpoint" text,
	"api_key" text,
	"api_settings" jsonb,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "partner_vendors_partner_id_unique" UNIQUE("partner_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"photo_type" text DEFAULT 'general' NOT NULL,
	"annotations" jsonb,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pivot_patch_hardware" (
	"id" serial PRIMARY KEY NOT NULL,
	"manufacturer" text NOT NULL,
	"part_number" text NOT NULL,
	"role" text NOT NULL,
	"glass_thickness_mm" text[],
	"offset_mm" real,
	"max_height_mm" real,
	"max_weight_kg" real,
	"finish" text[],
	"compatible_parts" text[],
	"notes" text,
	"source" text,
	CONSTRAINT "pivot_patch_hardware_part_number_unique" UNIQUE("part_number")
);
--> statement-breakpoint
CREATE TABLE "price_comparison_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"cache_key" text NOT NULL,
	"partner_id" text NOT NULL,
	"request_data" jsonb NOT NULL,
	"response_data" jsonb NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_costs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"pm_hours" real DEFAULT 0,
	"pm_hourly_rate" real DEFAULT 0,
	"engineering_hours" real DEFAULT 0,
	"engineering_hourly_rate" real DEFAULT 0,
	"survey_hours" real DEFAULT 0,
	"survey_hourly_rate" real DEFAULT 0,
	"overhead_cost" real DEFAULT 0,
	"travel_time" real DEFAULT 0,
	"travel_rate" real DEFAULT 0,
	"initial_visit_cost" real DEFAULT 0,
	"expedited_cost" real DEFAULT 0,
	"subcontractor_cost" real DEFAULT 0,
	"margin_percent" real DEFAULT 0,
	"discount_percent" real DEFAULT 0,
	"surcharge_percent" real DEFAULT 0,
	"material_fuel_charge" real DEFAULT 0,
	"handling_fee" real DEFAULT 0,
	"programming_testing_labeling_fee" real DEFAULT 0,
	"fire_prevention_inspection_fee" real DEFAULT 0,
	"fire_relabeling_inspection_fee" real DEFAULT 0,
	"disposal_fee" real DEFAULT 0,
	"consumable_allowance" real DEFAULT 0,
	"consumable_notes" text,
	"estimated_installation_hours" real DEFAULT 0,
	"hardware_material_cost" real DEFAULT 0,
	"hardware_waste_cost" real DEFAULT 0,
	"freight_base_cost" real DEFAULT 0,
	"freight_fuel_surcharge" real DEFAULT 0,
	"freight_expedited" real DEFAULT 0,
	"freight_lift_gate" real DEFAULT 0,
	"shipping_distance" real DEFAULT 0,
	"total_project_weight" real DEFAULT 0,
	"custom_shipping_cost" real,
	"default_fuel_surcharge_percent" real DEFAULT 0,
	"default_accessorials_cost" real DEFAULT 0,
	"default_insurance_cost" real DEFAULT 0,
	"default_customs_brokerage_cost" real DEFAULT 0,
	"default_incoterm" text,
	"total_tariffs_cost" real DEFAULT 0,
	"total_anti_dumping_cost" real DEFAULT 0,
	"total_other_duties_cost" real DEFAULT 0,
	"total_landed_cost" real DEFAULT 0,
	"tax_rate" real DEFAULT 0,
	"taxable_labor" text DEFAULT 'no',
	"tax_amount" real DEFAULT 0,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_costs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"customer_id" varchar,
	"location_id" varchar,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"building_type" text NOT NULL,
	"applicable_standards" text[],
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"scope_of_work" text,
	"scope_power_by_others" text DEFAULT 'no',
	"scope_demolition_by_others" text DEFAULT 'no',
	"scope_patching_by_others" text DEFAULT 'no',
	"scope_painting_by_others" text DEFAULT 'no',
	"scope_asbestos_abatement_by_others" text DEFAULT 'no',
	"scope_structural_work_by_others" text DEFAULT 'no',
	"scope_fire_alarm_by_others" text DEFAULT 'no',
	"scope_access_control_by_others" text DEFAULT 'no',
	"scope_items_to_remain" text[],
	"scope_items_to_remove" text[],
	"scope_additional_disclaimers" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_line_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" varchar NOT NULL,
	"line_number" serial NOT NULL,
	"item_type" text NOT NULL,
	"description" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"specifications" text,
	"quantity" real DEFAULT 1 NOT NULL,
	"unit_of_measure" text DEFAULT 'each',
	"unit_price" real DEFAULT 0 NOT NULL,
	"line_total" real DEFAULT 0 NOT NULL,
	"opening_id" varchar,
	"catalog_item_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_number" text NOT NULL,
	"project_id" varchar NOT NULL,
	"quote_request_id" varchar,
	"vendor_contact_id" varchar NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"ship_to_name" text,
	"ship_to_address" text,
	"ship_to_city" text,
	"ship_to_state" text,
	"ship_to_zip" text,
	"ship_to_attention" text,
	"requested_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"shipping_method" text,
	"payment_terms" text DEFAULT 'Net 30',
	"tax_rate" real DEFAULT 0,
	"shipping_cost" real DEFAULT 0,
	"subtotal" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"total_amount" real DEFAULT 0,
	"notes" text,
	"internal_notes" text,
	"tracking_number" text,
	"sent_at" timestamp,
	"acknowledged_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"opening_id" varchar,
	"hardware_item_id" varchar,
	"manufacturer_contact_id" varchar NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"trigger_source" text DEFAULT 'manual' NOT NULL,
	"payload" jsonb,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"response_notes" text,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"submitted_for_review_at" timestamp,
	"customer_approval_status" text DEFAULT 'pending',
	"customer_approved_at" timestamp,
	"customer_approved_by" text,
	"customer_approval_tier" text,
	"customer_approval_notes" text,
	"payment_status" text DEFAULT 'unpaid',
	"payment_intent_id" text,
	"payment_amount" real,
	"payment_currency" text DEFAULT 'usd',
	"paid_at" timestamp,
	"payment_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"activity_type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"outcome" text,
	"next_follow_up" timestamp,
	"duration_minutes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_field_reference" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text,
	"guidance" text
);
--> statement-breakpoint
CREATE TABLE "user_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service" varchar NOT NULL,
	"atlassian_domain" text,
	"atlassian_email" text,
	"atlassian_api_token" text,
	"notion_api_key" text,
	"notion_database_id" text,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendor_quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"quote_request_id" varchar,
	"purchase_order_id" varchar,
	"vendor_contact_id" varchar NOT NULL,
	"quote_number" text,
	"quote_date" timestamp,
	"valid_until" timestamp,
	"total_amount" real DEFAULT 0,
	"currency" text DEFAULT 'USD',
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" real,
	"file_data" text NOT NULL,
	"description" text,
	"notes" text,
	"status" text DEFAULT 'pending',
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiring_diagrams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar,
	"opening_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"diagram_type" text DEFAULT 'access-control',
	"canvas_width" integer DEFAULT 1200,
	"canvas_height" integer DEFAULT 800,
	"grid_size" integer DEFAULT 20,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "access_control_components" ADD CONSTRAINT "access_control_components_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_corrections" ADD CONSTRAINT "ai_corrections_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_scan_id_lidar_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."lidar_scans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_items" ADD CONSTRAINT "bundle_items_bundle_id_hardware_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."hardware_bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_items" ADD CONSTRAINT "change_order_items_change_order_id_change_orders_id_fk" FOREIGN KEY ("change_order_id") REFERENCES "public"."change_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_items" ADD CONSTRAINT "change_order_items_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_order_items" ADD CONSTRAINT "change_order_items_hardware_item_id_hardware_items_id_fk" FOREIGN KEY ("hardware_item_id") REFERENCES "public"."hardware_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_violations" ADD CONSTRAINT "compliance_violations_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_violations" ADD CONSTRAINT "compliance_violations_rule_id_compliance_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."compliance_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_history" ADD CONSTRAINT "customer_product_history_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_history" ADD CONSTRAINT "customer_product_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_annotations" ADD CONSTRAINT "diagram_annotations_diagram_id_wiring_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."wiring_diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_components" ADD CONSTRAINT "diagram_components_diagram_id_wiring_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."wiring_diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_components" ADD CONSTRAINT "diagram_components_component_id_access_control_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."access_control_components"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_connections" ADD CONSTRAINT "diagram_connections_diagram_id_wiring_diagrams_id_fk" FOREIGN KEY ("diagram_id") REFERENCES "public"."wiring_diagrams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_connections" ADD CONSTRAINT "diagram_connections_from_component_id_diagram_components_id_fk" FOREIGN KEY ("from_component_id") REFERENCES "public"."diagram_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagram_connections" ADD CONSTRAINT "diagram_connections_to_component_id_diagram_components_id_fk" FOREIGN KEY ("to_component_id") REFERENCES "public"."diagram_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disclaimer_links" ADD CONSTRAINT "disclaimer_links_disclaimer_id_disclaimers_id_fk" FOREIGN KEY ("disclaimer_id") REFERENCES "public"."disclaimers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_locations" ADD CONSTRAINT "door_locations_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_locations" ADD CONSTRAINT "door_locations_floor_plan_id_floor_plans_id_fk" FOREIGN KEY ("floor_plan_id") REFERENCES "public"."floor_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_openings" ADD CONSTRAINT "door_openings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_openings" ADD CONSTRAINT "door_openings_lite_kit_id_lite_kits_id_fk" FOREIGN KEY ("lite_kit_id") REFERENCES "public"."lite_kits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "door_templates" ADD CONSTRAINT "door_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_service_connections" ADD CONSTRAINT "external_service_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_service_connections" ADD CONSTRAINT "external_service_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_bundles" ADD CONSTRAINT "hardware_bundles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_items" ADD CONSTRAINT "hardware_items_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_scans" ADD CONSTRAINT "hardware_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_scans" ADD CONSTRAINT "hardware_scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_scans" ADD CONSTRAINT "hardware_scans_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_scans" ADD CONSTRAINT "hardware_scans_scanned_by_users_id_fk" FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_to_customer_id_customers_id_fk" FOREIGN KEY ("converted_to_customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lidar_scans" ADD CONSTRAINT "lidar_scans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lidar_scans" ADD CONSTRAINT "lidar_scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lidar_scans" ADD CONSTRAINT "lidar_scans_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lidar_scans" ADD CONSTRAINT "lidar_scans_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_external_resources" ADD CONSTRAINT "linked_external_resources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_external_resources" ADD CONSTRAINT "linked_external_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lock_sets" ADD CONSTRAINT "lock_sets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lock_sets" ADD CONSTRAINT "lock_sets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lock_sets" ADD CONSTRAINT "lock_sets_master_key_system_id_master_key_systems_id_fk" FOREIGN KEY ("master_key_system_id") REFERENCES "public"."master_key_systems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_contacts" ADD CONSTRAINT "manufacturer_contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_literature" ADD CONSTRAINT "manufacturer_literature_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_literature" ADD CONSTRAINT "manufacturer_literature_contact_id_manufacturer_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."manufacturer_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_literature" ADD CONSTRAINT "manufacturer_literature_product_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("product_catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_contact_id_manufacturer_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."manufacturer_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manufacturer_products" ADD CONSTRAINT "manufacturer_products_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_key_systems" ADD CONSTRAINT "master_key_systems_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_gasketing" ADD CONSTRAINT "opening_gasketing_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_gasketing" ADD CONSTRAINT "opening_gasketing_gasketing_id_gasketing_catalog_id_fk" FOREIGN KEY ("gasketing_id") REFERENCES "public"."gasketing_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_code_mappings" ADD CONSTRAINT "partner_code_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_code_mappings" ADD CONSTRAINT "partner_code_mappings_partner_id_partner_vendors_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_vendors"("partner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_vendors" ADD CONSTRAINT "partner_vendors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_comparison_cache" ADD CONSTRAINT "price_comparison_cache_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_costs" ADD CONSTRAINT "project_costs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_location_id_customer_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."customer_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line_items" ADD CONSTRAINT "purchase_order_line_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line_items" ADD CONSTRAINT "purchase_order_line_items_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line_items" ADD CONSTRAINT "purchase_order_line_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_contact_id_manufacturer_contacts_id_fk" FOREIGN KEY ("vendor_contact_id") REFERENCES "public"."manufacturer_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_hardware_item_id_hardware_items_id_fk" FOREIGN KEY ("hardware_item_id") REFERENCES "public"."hardware_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_manufacturer_contact_id_manufacturer_contacts_id_fk" FOREIGN KEY ("manufacturer_contact_id") REFERENCES "public"."manufacturer_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_vendor_contact_id_manufacturer_contacts_id_fk" FOREIGN KEY ("vendor_contact_id") REFERENCES "public"."manufacturer_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiring_diagrams" ADD CONSTRAINT "wiring_diagrams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiring_diagrams" ADD CONSTRAINT "wiring_diagrams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiring_diagrams" ADD CONSTRAINT "wiring_diagrams_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_change_order_items_co" ON "change_order_items" USING btree ("change_order_id");--> statement-breakpoint
CREATE INDEX "IDX_change_order_items_type" ON "change_order_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "IDX_change_order_items_action" ON "change_order_items" USING btree ("action");--> statement-breakpoint
CREATE INDEX "IDX_change_orders_project" ON "change_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_change_orders_org" ON "change_orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_change_orders_status" ON "change_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_options_applies_to" ON "door_frame_options" USING btree ("applies_to");--> statement-breakpoint
CREATE INDEX "IDX_options_market" ON "door_frame_options" USING btree ("market");--> statement-breakpoint
CREATE INDEX "IDX_options_attr_group" ON "door_frame_options" USING btree ("attribute_group");--> statement-breakpoint
CREATE INDEX "IDX_options_value_code" ON "door_frame_options" USING btree ("value_code");--> statement-breakpoint
CREATE INDEX "IDX_door_openings_project_id" ON "door_openings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_external_services_org" ON "external_service_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_external_services_service" ON "external_service_connections" USING btree ("service");--> statement-breakpoint
CREATE INDEX "IDX_hardware_items_opening_id" ON "hardware_items" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "IDX_linked_resources_org" ON "linked_external_resources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_linked_resources_project" ON "linked_external_resources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_linked_resources_service" ON "linked_external_resources" USING btree ("service");--> statement-breakpoint
CREATE INDEX "IDX_manufacturer_contacts_name" ON "manufacturer_contacts" USING btree ("manufacturer_name");--> statement-breakpoint
CREATE INDEX "IDX_manufacturer_contacts_email" ON "manufacturer_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_manufacturer_literature_contact" ON "manufacturer_literature" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "IDX_manufacturer_literature_org" ON "manufacturer_literature" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_manufacturer_literature_type" ON "manufacturer_literature" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "IDX_memberships_user_id" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_memberships_organization_id" ON "memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_validation_applies_to" ON "option_validation_rules" USING btree ("applies_to");--> statement-breakpoint
CREATE INDEX "IDX_validation_active" ON "option_validation_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_code_mappings_org" ON "partner_code_mappings" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_code_mappings_partner" ON "partner_code_mappings" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "IDX_code_mappings_internal" ON "partner_code_mappings" USING btree ("internal_code");--> statement-breakpoint
CREATE INDEX "IDX_partner_vendors_org" ON "partner_vendors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_partner_vendors_partner_id" ON "partner_vendors" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "IDX_photos_opening_id" ON "photos" USING btree ("opening_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_price_cache_org_key" ON "price_comparison_cache" USING btree ("organization_id","cache_key");--> statement-breakpoint
CREATE INDEX "IDX_price_cache_expires" ON "price_comparison_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "IDX_projects_organization_id" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");