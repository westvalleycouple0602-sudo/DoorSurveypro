CREATE TABLE "additional_door_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"custom_category" text,
	"name" text NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost" real DEFAULT 0,
	"sku" text,
	"manufacturer" text,
	"supplier_name" text,
	"model_number" text,
	"install_notes" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ahj_variations" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text,
	"code_edition" text,
	"rule_id" text,
	"override" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "api_key_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"method" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer,
	"ip_address" varchar,
	"user_agent" text,
	"error_message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" varchar(8) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rate_limit" integer DEFAULT 1000 NOT NULL,
	"rate_limit_window" varchar DEFAULT 'hour' NOT NULL,
	"last_used_at" timestamp,
	"request_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" varchar,
	"revoked_reason" text,
	"allowed_ips" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "ar_measurements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"project_id" varchar,
	"opening_id" varchar,
	"measured_by" varchar NOT NULL,
	"measurement_type" text NOT NULL,
	"value" real NOT NULL,
	"unit" text DEFAULT 'inches' NOT NULL,
	"device_type" text,
	"has_lidar" text DEFAULT 'no',
	"ar_technology" text DEFAULT 'webxr' NOT NULL,
	"confidence_score" real,
	"estimated_error" real,
	"measurement_points" jsonb,
	"anchor_points" jsonb,
	"lighting_condition" text,
	"surface_quality" text,
	"distance_from_device" real,
	"ar_session_image_url" text,
	"calibration_image_url" text,
	"notes" text,
	"verified_by" varchar,
	"verified_at" timestamp,
	"validation_notes" text,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"method" varchar(8) NOT NULL,
	"path" varchar(512) NOT NULL,
	"status" integer NOT NULL,
	"ip" varchar(64),
	"user_agent" text,
	"response_time_ms" integer,
	"extra" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "background_jobs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"organization_id" varchar,
	"user_id" varchar,
	"job_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"input_data" jsonb,
	"result" jsonb,
	"error" text,
	"error_stack" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bhma_finishes" (
	"code_us" text PRIMARY KEY NOT NULL,
	"code_bhma" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar NOT NULL,
	"description" text,
	"color" varchar,
	"icon" varchar,
	"display_order" integer DEFAULT 0,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_post_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"tag_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" varchar NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"featured_image" text,
	"featured_image_alt" text,
	"category_id" varchar,
	"author_id" varchar NOT NULL,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_for" timestamp,
	"meta_title" text,
	"meta_description" text,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"twitter_card" varchar DEFAULT 'summary_large_image',
	"canonical_url" text,
	"keywords" text[],
	"view_count" integer DEFAULT 0 NOT NULL,
	"read_time_minutes" integer,
	"is_featured" text DEFAULT 'no' NOT NULL,
	"allow_comments" text DEFAULT 'yes' NOT NULL,
	"is_external" text DEFAULT 'no' NOT NULL,
	"external_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bom_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bom_id" varchar NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"family" text,
	"bhma_function" text,
	"brand" text,
	"sku" text,
	"finish" text,
	"grade" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"msrp" real,
	"catalog_item_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_template_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"item_category" text,
	"manufacturer" text,
	"model_number" text,
	"description" text,
	"quantity" real,
	"size_spec" text,
	"finish" text,
	"handing" text,
	"fire_rating" text,
	"notes" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "boms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"generated_by" varchar NOT NULL,
	"context" jsonb,
	"total_msrp" real DEFAULT 0,
	"item_count" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_studies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"slug" varchar NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"customer_name" text NOT NULL,
	"customer_company" text NOT NULL,
	"customer_title" text,
	"customer_photo" text,
	"company_logo" text,
	"industry" text,
	"project_type" text,
	"project_size" text,
	"location" text,
	"duration" text,
	"challenge" text NOT NULL,
	"solution" text NOT NULL,
	"results" text NOT NULL,
	"testimonial_quote" text,
	"metrics" jsonb,
	"hero_image" text,
	"gallery_images" jsonb,
	"video_url" text,
	"pdf_url" text,
	"is_featured" text DEFAULT 'no',
	"display_order" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"seo_keywords" text,
	"views" integer DEFAULT 0,
	"downloads" integer DEFAULT 0,
	"published_at" timestamp,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "case_studies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "code_embeddings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk" text NOT NULL,
	"embedding" vector(1536),
	"code_type" text NOT NULL,
	"section" text,
	"chapter" text,
	"page" integer,
	"edition" text,
	"title" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_rules" (
	"rule_id" text PRIMARY KEY NOT NULL,
	"category" text,
	"condition" text,
	"jurisdiction" text,
	"severity" text,
	"guidance" text
);
--> statement-breakpoint
CREATE TABLE "distributor_manufacturers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"distributor_id" varchar NOT NULL,
	"manufacturer_name" text NOT NULL,
	"is_preferred" text DEFAULT 'no',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"website" text,
	"account_number" text,
	"vendor_type" text,
	"regions" text[],
	"notes" text,
	"discount_multiplier" text,
	"markup_percent" real,
	"flat_fee" real,
	"shipping_fee_type" text,
	"shipping_fee_amount" real,
	"handling_fee" real,
	"minimum_order_amount" real,
	"payment_terms" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "function_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" text,
	"family" text,
	"function_code" text,
	"name" text,
	"description" text,
	"verified" text DEFAULT 'no'
);
--> statement-breakpoint
CREATE TABLE "hardware_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"subtype" text,
	"brand" text,
	"model" text,
	"nomenclature" text,
	"grade" text,
	"bhma_standard" text,
	"bhma_certified" text,
	"msrp" real,
	"typical_price" real,
	"material" text,
	"finish_options" text,
	"dimensions" text,
	"door_thickness" text,
	"power" text,
	"features" text,
	"use" text,
	"fire_rating" text,
	"ada_compliant" text,
	"cross_ref" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_sets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"category" varchar(50),
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_template" boolean DEFAULT false,
	"base_cost" real,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hubspot_sync_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" varchar,
	"organization_id" varchar NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"sync_direction" varchar(32) NOT NULL,
	"outcome" varchar(32) NOT NULL,
	"local_object_type" varchar(64) NOT NULL,
	"local_object_id" varchar(128) NOT NULL,
	"hubspot_object_type" varchar(64),
	"hubspot_object_id" varchar(64),
	"error_code" varchar(64),
	"error_message" text,
	"diff_snapshot" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hubspot_sync_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"local_object_type" varchar(64) NOT NULL,
	"local_object_id" varchar(128) NOT NULL,
	"hubspot_object_type" varchar(64) NOT NULL,
	"hubspot_object_id" varchar(64) NOT NULL,
	"sync_direction" varchar(32) DEFAULT 'push' NOT NULL,
	"sync_status" varchar(32) DEFAULT 'synced' NOT NULL,
	"last_sync_at" timestamp,
	"last_attempt_at" timestamp,
	"last_error" text,
	"last_etag" varchar(256),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"service" varchar NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"metadata" jsonb,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lock_functions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text,
	"function" text,
	"typical_use" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"is_enabled" text DEFAULT 'yes' NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opening_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"opening_id" varchar NOT NULL,
	"kind" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"thumb_url" text,
	"file_size" integer,
	"mime_type" varchar(100),
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_catalog_imports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"file_url" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"error_message" text,
	"extracted_data" jsonb DEFAULT '[]'::jsonb,
	"item_count" integer DEFAULT 0,
	"imported_at" timestamp,
	"imported_item_count" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roadmap_milestones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"quarter" varchar NOT NULL,
	"theme" text NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roadmap_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" varchar NOT NULL,
	"task_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" varchar NOT NULL,
	"duration_weeks" integer,
	"status" varchar DEFAULT 'not_started' NOT NULL,
	"assigned_to" varchar,
	"dependencies" text[],
	"notes" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"query" text,
	"entity_types" jsonb DEFAULT '["projects"]'::jsonb NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scan_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"measurement_system" varchar(20) DEFAULT 'imperial' NOT NULL,
	"coverage_threshold" integer DEFAULT 85 NOT NULL,
	"confidence_threshold" real DEFAULT 0.85 NOT NULL,
	"min_distance_m" real DEFAULT 1.5 NOT NULL,
	"max_distance_m" real DEFAULT 2 NOT NULL,
	"max_angle_deg" integer DEFAULT 25 NOT NULL,
	"enable_voice" boolean DEFAULT false NOT NULL,
	"enable_subtitles" boolean DEFAULT true NOT NULL,
	"enable_dual_pass" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "scan_configs_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "scan_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"opening_id" varchar,
	"event_type" varchar(100) NOT NULL,
	"event_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"query" text NOT NULL,
	"entity_types" jsonb DEFAULT '[]'::jsonb,
	"filters" jsonb,
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"opening_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"service_type" text NOT NULL,
	"service_priority" text DEFAULT 'normal' NOT NULL,
	"service_status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_date" timestamp,
	"service_date" timestamp,
	"completed_date" timestamp,
	"performed_by" varchar,
	"service_company" text,
	"technician_name" text,
	"technician_contact" text,
	"work_description" text NOT NULL,
	"issues_found" text[],
	"components_serviced" text[],
	"parts_replaced" jsonb,
	"labor_hours" real,
	"labor_cost" real,
	"parts_cost" real,
	"total_cost" real,
	"warranty_work" text DEFAULT 'no' NOT NULL,
	"service_photos" text[],
	"service_notes" text,
	"customer_signature" text,
	"work_order_number" text,
	"invoice_number" text,
	"follow_up_required" text DEFAULT 'no',
	"follow_up_date" timestamp,
	"follow_up_notes" text,
	"next_service_due" timestamp,
	"compliance_verified" text DEFAULT 'no',
	"compliance_issues" text[],
	"quality_rating" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"customer_name" text NOT NULL,
	"customer_title" text,
	"customer_company" text NOT NULL,
	"customer_photo" text,
	"company_logo" text,
	"quote" text NOT NULL,
	"rating" integer,
	"project_type" text,
	"industry" text,
	"results_summary" text,
	"is_featured" text DEFAULT 'no',
	"display_order" integer DEFAULT 0,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_url" text,
	"date_given" timestamp,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "validation_results" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opening_id" varchar NOT NULL,
	"country" varchar DEFAULT 'US' NOT NULL,
	"residential" text DEFAULT 'no' NOT NULL,
	"accessible_route" text DEFAULT 'yes' NOT NULL,
	"egress_required" text DEFAULT 'yes' NOT NULL,
	"occupant_load" integer DEFAULT 0,
	"total_checks" integer DEFAULT 0 NOT NULL,
	"failed_checks" integer DEFAULT 0 NOT NULL,
	"passed_checks" integer DEFAULT 0 NOT NULL,
	"overall_status" varchar DEFAULT 'pending' NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"measurements" jsonb,
	"door_config" jsonb,
	"validated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status_code" integer,
	"response_time" integer,
	"success" text NOT NULL,
	"error_message" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" text DEFAULT 'yes' NOT NULL,
	"retry_attempts" integer DEFAULT 3 NOT NULL,
	"timeout_seconds" integer DEFAULT 30 NOT NULL,
	"last_triggered_at" timestamp,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_success" timestamp,
	"last_failure" timestamp,
	"last_failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "door_openings" DROP CONSTRAINT "door_openings_lite_kit_id_lite_kits_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_location_id_customer_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_performance_duty_level" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_veneer_grade" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_veneer_piece_match" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_veneer_face_match" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_appearance_pairs_sets_tran" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_core_type" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_hardware_blocking" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_hardware_blocking_spec" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_core_edge_interface" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_fire_door_test_method" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_bullet_resistant" text DEFAULT 'no';--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_electrostatic_shield" text DEFAULT 'no';--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_hpdl_manufacturer" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_hpdl_thickness" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_hpdl_pattern_color_finish" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_lpdl_manufacturer" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_lpdl_pattern_color" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_aesthetic_grade" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_factory_machined_hardware" text DEFAULT 'no';--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_wood_beaded_lites" text DEFAULT 'no';--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_metal_vision_panels" text DEFAULT 'no';--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_finish_system" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_finish_system_other" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "wdma_finish_application" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "door_condition" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "frame_condition" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "hardware_condition" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "condition_issues" text[];--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "condition_notes" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "condition_assessment_date" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "condition_photos" text[];--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "replacement_recommendation" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "replacement_justification" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "opening_status" text DEFAULT 'not-installed' NOT NULL;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "installation_date" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "installed_by" varchar;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "installer_company" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "warranty_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "warranty_end_date" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "warranty_provider" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "warranty_terms_notes" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "last_service_date" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "next_service_due" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "service_frequency" text;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "retirement_date" timestamp;--> statement-breakpoint
ALTER TABLE "door_openings" ADD COLUMN "retirement_reason" text;--> statement-breakpoint
ALTER TABLE "hardware_items" ADD COLUMN "procurement_source_type" text;--> statement-breakpoint
ALTER TABLE "hardware_items" ADD COLUMN "procurement_source_id" varchar;--> statement-breakpoint
ALTER TABLE "hardware_items" ADD COLUMN "procurement_source_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "manufacturer_contacts" ADD COLUMN "discount_multiplier" text;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "utm_source" varchar;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "utm_medium" varchar;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "utm_campaign" varchar;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "utm_content" varchar;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "utm_term" varchar;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "email_opened" timestamp;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "email_clicked" timestamp;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "trial_started" timestamp;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "converted_to_paid" timestamp;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "user_id" varchar;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "language" varchar(10) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "additional_door_items" ADD CONSTRAINT "additional_door_items_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "additional_door_items" ADD CONSTRAINT "additional_door_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ahj_variations" ADD CONSTRAINT "ahj_variations_rule_id_code_rules_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."code_rules"("rule_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_usage_logs" ADD CONSTRAINT "api_key_usage_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_measurements" ADD CONSTRAINT "ar_measurements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_measurements" ADD CONSTRAINT "ar_measurements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_measurements" ADD CONSTRAINT "ar_measurements_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_measurements" ADD CONSTRAINT "ar_measurements_measured_by_users_id_fk" FOREIGN KEY ("measured_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_measurements" ADD CONSTRAINT "ar_measurements_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_id_boms_id_fk" FOREIGN KEY ("bom_id") REFERENCES "public"."boms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_catalog_item_id_hardware_catalog_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."hardware_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_template_items" ADD CONSTRAINT "bom_template_items_template_id_bom_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bom_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_templates" ADD CONSTRAINT "bom_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_templates" ADD CONSTRAINT "bom_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boms" ADD CONSTRAINT "boms_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributor_manufacturers" ADD CONSTRAINT "distributor_manufacturers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributor_manufacturers" ADD CONSTRAINT "distributor_manufacturers_distributor_id_distributors_id_fk" FOREIGN KEY ("distributor_id") REFERENCES "public"."distributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributors" ADD CONSTRAINT "distributors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_sets" ADD CONSTRAINT "hardware_sets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_sets" ADD CONSTRAINT "hardware_sets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubspot_sync_events" ADD CONSTRAINT "hubspot_sync_events_link_id_hubspot_sync_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."hubspot_sync_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubspot_sync_events" ADD CONSTRAINT "hubspot_sync_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubspot_sync_links" ADD CONSTRAINT "hubspot_sync_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_files" ADD CONSTRAINT "opening_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_files" ADD CONSTRAINT "opening_files_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_files" ADD CONSTRAINT "opening_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_catalog_imports" ADD CONSTRAINT "pdf_catalog_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_catalog_imports" ADD CONSTRAINT "pdf_catalog_imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_milestones" ADD CONSTRAINT "roadmap_milestones_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_milestone_id_roadmap_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."roadmap_milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmap_tasks" ADD CONSTRAINT "roadmap_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_configs" ADD CONSTRAINT "scan_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_metrics" ADD CONSTRAINT "scan_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_metrics" ADD CONSTRAINT "scan_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_metrics" ADD CONSTRAINT "scan_metrics_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_history" ADD CONSTRAINT "service_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_opening_id_door_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."door_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_delivery_logs" ADD CONSTRAINT "webhook_delivery_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_additional_door_items_opening_id" ON "additional_door_items" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "IDX_additional_door_items_organization_id" ON "additional_door_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_api_key_usage_logs_api_key_id" ON "api_key_usage_logs" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "IDX_api_key_usage_logs_organization_id" ON "api_key_usage_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_api_key_usage_logs_timestamp" ON "api_key_usage_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "IDX_api_keys_organization_id" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_api_keys_key_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "IDX_api_keys_created_by" ON "api_keys" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "IDX_background_jobs_organization_id" ON "background_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_background_jobs_user_id" ON "background_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_background_jobs_status" ON "background_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_background_jobs_job_type" ON "background_jobs" USING btree ("job_type");--> statement-breakpoint
CREATE INDEX "IDX_blog_categories_slug" ON "blog_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_blog_categories_active" ON "blog_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_blog_post_tags_post" ON "blog_post_tags" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "IDX_blog_post_tags_tag" ON "blog_post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "IDX_blog_posts_slug" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_blog_posts_status" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_blog_posts_category" ON "blog_posts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "IDX_blog_posts_author" ON "blog_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "IDX_blog_posts_published" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "IDX_blog_posts_featured" ON "blog_posts" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "IDX_blog_tags_slug" ON "blog_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_bom_items_bom_id" ON "bom_items" USING btree ("bom_id");--> statement-breakpoint
CREATE INDEX "IDX_bom_template_items_template_id" ON "bom_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "IDX_bom_templates_organization_id" ON "bom_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_bom_templates_name" ON "bom_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "IDX_boms_opening_id" ON "boms" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "IDX_boms_organization_id" ON "boms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_case_studies_slug" ON "case_studies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "IDX_case_studies_status" ON "case_studies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_case_studies_industry" ON "case_studies" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "IDX_case_studies_featured" ON "case_studies" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_code_embeddings_vector" ON "code_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_code_embeddings_type" ON "code_embeddings" USING btree ("code_type");--> statement-breakpoint
CREATE INDEX "idx_code_embeddings_category" ON "code_embeddings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_dist_mfg_distributor" ON "distributor_manufacturers" USING btree ("distributor_id");--> statement-breakpoint
CREATE INDEX "IDX_dist_mfg_manufacturer" ON "distributor_manufacturers" USING btree ("manufacturer_name");--> statement-breakpoint
CREATE INDEX "UNQ_dist_mfg_combo" ON "distributor_manufacturers" USING btree ("organization_id","distributor_id","manufacturer_name");--> statement-breakpoint
CREATE INDEX "IDX_distributors_org" ON "distributors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_distributors_name" ON "distributors" USING btree ("name");--> statement-breakpoint
CREATE INDEX "IDX_distributors_active" ON "distributors" USING btree ("organization_id","archived_at");--> statement-breakpoint
CREATE INDEX "IDX_hardware_catalog_category" ON "hardware_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_hardware_catalog_brand" ON "hardware_catalog" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "IDX_hubspot_sync_events_link" ON "hubspot_sync_events" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "IDX_hubspot_sync_events_organization" ON "hubspot_sync_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_hubspot_sync_events_outcome" ON "hubspot_sync_events" USING btree ("outcome","created_at");--> statement-breakpoint
CREATE INDEX "IDX_hubspot_sync_events_local" ON "hubspot_sync_events" USING btree ("local_object_type","local_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_hubspot_sync_links_local" ON "hubspot_sync_links" USING btree ("organization_id","local_object_type","local_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_hubspot_sync_links_hubspot" ON "hubspot_sync_links" USING btree ("organization_id","hubspot_object_type","hubspot_object_id");--> statement-breakpoint
CREATE INDEX "IDX_hubspot_sync_links_organization" ON "hubspot_sync_links" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_hubspot_sync_links_pending" ON "hubspot_sync_links" USING btree ("organization_id","sync_status","last_attempt_at") WHERE "hubspot_sync_links"."sync_status" IN ('pending', 'failed');--> statement-breakpoint
CREATE INDEX "IDX_integration_credentials_organization_id" ON "integration_credentials" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_integration_credentials_service" ON "integration_credentials" USING btree ("service");--> statement-breakpoint
CREATE INDEX "IDX_notification_preferences_user_id" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_notification_preferences_channel" ON "notification_preferences" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "IDX_roadmap_milestones_organization_id" ON "roadmap_milestones" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_roadmap_milestones_quarter" ON "roadmap_milestones" USING btree ("quarter");--> statement-breakpoint
CREATE INDEX "IDX_roadmap_tasks_milestone_id" ON "roadmap_tasks" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "IDX_roadmap_tasks_status" ON "roadmap_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_roadmap_tasks_assigned_to" ON "roadmap_tasks" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "IDX_saved_searches_organization_id" ON "saved_searches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_saved_searches_user_id" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_saved_searches_is_global" ON "saved_searches" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "IDX_scan_configs_organization_id" ON "scan_configs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_scan_metrics_organization_id" ON "scan_metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_scan_metrics_user_id" ON "scan_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_scan_metrics_opening_id" ON "scan_metrics" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "IDX_scan_metrics_event_type" ON "scan_metrics" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "IDX_scan_metrics_created_at" ON "scan_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_search_history_organization_id" ON "search_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_search_history_user_id" ON "search_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_search_history_created_at" ON "search_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_service_history_opening_id" ON "service_history" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "IDX_service_history_project_id" ON "service_history" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_service_history_organization_id" ON "service_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_service_history_service_date" ON "service_history" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "IDX_service_history_status" ON "service_history" USING btree ("service_status");--> statement-breakpoint
CREATE INDEX "IDX_testimonials_status" ON "testimonials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_testimonials_featured" ON "testimonials" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "IDX_testimonials_industry" ON "testimonials" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "IDX_webhook_delivery_logs_webhook_id" ON "webhook_delivery_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "IDX_webhook_delivery_logs_organization_id" ON "webhook_delivery_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_webhook_delivery_logs_timestamp" ON "webhook_delivery_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "IDX_webhook_delivery_logs_success" ON "webhook_delivery_logs" USING btree ("success");--> statement-breakpoint
CREATE INDEX "IDX_webhooks_organization_id" ON "webhooks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_webhooks_is_active" ON "webhooks" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "door_openings" ADD CONSTRAINT "door_openings_installed_by_users_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prelaunch_signups" ADD CONSTRAINT "prelaunch_signups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_customers_contact_email" ON "customers" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "IDX_door_openings_project_opening" ON "door_openings" USING btree ("project_id","opening_number");--> statement-breakpoint
CREATE INDEX "IDX_edge_lite_types_category" ON "edge_lite_types_hmma_810" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_hardware_items_opening_type" ON "hardware_items" USING btree ("opening_id","item_type");--> statement-breakpoint
CREATE INDEX "IDX_hardware_location_cheat_item" ON "hardware_location_cheat" USING btree ("item");--> statement-breakpoint
CREATE INDEX "IDX_leads_organization_id" ON "leads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "IDX_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_leads_assigned_to" ON "leads" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "IDX_leads_converted_to_customer_id" ON "leads" USING btree ("converted_to_customer_id");--> statement-breakpoint
CREATE INDEX "IDX_leads_org_status" ON "leads" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "IDX_photos_opening_captured" ON "photos" USING btree ("opening_id","captured_at");--> statement-breakpoint
CREATE INDEX "IDX_prelaunch_email" ON "prelaunch_signups" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_prelaunch_utm_campaign" ON "prelaunch_signups" USING btree ("utm_campaign");--> statement-breakpoint
CREATE INDEX "IDX_prelaunch_created_at" ON "prelaunch_signups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_projects_org_updated" ON "projects" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "IDX_projects_org_status" ON "projects" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "IDX_purchase_orders_project_id" ON "purchase_orders" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_purchase_orders_quote_request_id" ON "purchase_orders" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "IDX_purchase_orders_vendor_contact_id" ON "purchase_orders" USING btree ("vendor_contact_id");--> statement-breakpoint
CREATE INDEX "IDX_purchase_orders_status" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_purchase_orders_po_number" ON "purchase_orders" USING btree ("po_number");--> statement-breakpoint
CREATE INDEX "IDX_purchase_orders_project_status" ON "purchase_orders" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "IDX_quote_requests_project_id" ON "quote_requests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "IDX_quote_requests_opening_id" ON "quote_requests" USING btree ("opening_id");--> statement-breakpoint
CREATE INDEX "IDX_quote_requests_hardware_item_id" ON "quote_requests" USING btree ("hardware_item_id");--> statement-breakpoint
CREATE INDEX "IDX_quote_requests_manufacturer_contact_id" ON "quote_requests" USING btree ("manufacturer_contact_id");--> statement-breakpoint
CREATE INDEX "IDX_quote_requests_status" ON "quote_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_quote_requests_project_status" ON "quote_requests" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "IDX_survey_field_reference_topic" ON "survey_field_reference" USING btree ("topic");