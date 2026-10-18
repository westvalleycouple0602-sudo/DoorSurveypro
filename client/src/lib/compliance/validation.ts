// Compliance validation schema
import { z } from "zod";

export const ComplianceRecordSchema = z.object({
  jurisdiction: z.object({
    state: z.string().optional(),
    ibc_edition: z.enum(["2015","2018","2021"]).optional(),
    nfpa101_edition: z.enum(["2018","2021"]).optional(),
    max_hw_height_aff: z.number().optional(),
    max_reader_height_aff: z.number().optional(),
  }).optional(),
  door: z.object({
    is_accessible_route: z.boolean().optional(),
    is_interior: z.boolean().optional(),
    is_egress_required: z.boolean().optional(),
    is_fire_door: z.boolean().optional(),
    requires_smoke_label: z.boolean().optional(),
    approach: z.enum(["front-pull-latch","front-push-no-latch","hinge-pull","latch-pull","perpendicular-pull"]).optional(),
    swing_direction: z.enum(["egress","opposed","neutral"]).optional(),
    location_zone: z.enum(["interior","exterior"]).optional(),
    occupancy_group: z.enum(["A","B","E","I-2","M","R","S","F","H","U","Other"]).optional(),
    space_type: z.enum(["corridor","classroom","restroom","stair","office","exterior","storage","other"]).optional(),
  }),
  geometry: z.object({
    leaf_width_in: z.number().optional(),
    leaf_height_in: z.number().optional(),
    clear_width_in: z.number().optional(),
    door_thickness_in: z.number().optional(),
  }).optional(),
  hardware: z.object({
    role: z.enum(["operable","inactive","decorative"]).optional(),
    category: z.string().optional(),
    function_code: z.string().optional(),
    bhma_function: z.string().optional(),
    height_aff: z.number().min(0, "Height must be a positive number").max(96, "Unlikely hardware height").optional(),
  }),
  electrical: z.object({
    device_type: z.enum(["maglock","electric_strike","exit_device_EL","qel","electrified_trim","reader","none"]).optional(),
    voltage: z.enum(["12VDC","24VDC","120VAC","LowVoltageOther"]).optional(),
    current_inrush_A: z.number().optional(),
    current_hold_A: z.number().optional(),
    inrush_ms: z.number().optional(),
    psu_capacity_A: z.number().optional(),
    el_module_present: z.boolean().optional(),
    fire_alarm_interface: z.boolean().optional(),
  }).optional(),
  threshold: z.object({
    height_in: z.number().optional(),
    beveled: z.boolean().optional(),
    bevel_slope_ratio: z.number().optional(),
  }).optional(),
  clearance: z.object({
    pull: z.object({ depth_in: z.number().optional(), width_in: z.number().optional() }).optional(),
    push: z.object({ depth_in: z.number().optional(), width_in: z.number().optional() }).optional(),
  }).optional(),
  labels_docs: z.object({
    s_label_present: z.boolean().optional(),
    ul_markings: z.string().optional(),
    barcode_data: z.string().optional(),
    drawings_ref: z.string().optional(),
  }).optional(),
  measurements: z.object({
    opening_force_lbf: z.number().optional(),
    closing_time_90_to_12_sec: z.number().optional(),
  }).optional(),
  reader: z.object({
    height_aff: z.number().optional(),
    type: z.enum(["prox","multi-tech","pinpad","biometric","other"]).optional(),
  }).optional(),
  notes: z.string().optional(),
});

export type ComplianceRecord = z.infer<typeof ComplianceRecordSchema>;
