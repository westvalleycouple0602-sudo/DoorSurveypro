import type { ManufacturerOrderFormTemplate, ManufacturerId, DivisionCode } from "./types";

export const allegionHardwareOrderTemplate: ManufacturerOrderFormTemplate = {
  id: "tmpl_allegion_std_hw",
  manufacturer: "ALLEGION",
  name: "Allegion Standard Hardware Order",
  version: "1.1",
  divisions: ["08"],
  fields: [
    {
      id: "project_name",
      label: "Project Name",
      type: "STRING",
      required: true,
      defaultSource: "project.name"
    },
    {
      id: "job_number",
      label: "Job/Reference Number",
      type: "STRING",
      required: true,
      defaultSource: "project.jobNumber"
    },
    {
      id: "required_on_site_date",
      label: "Required On Site Date",
      type: "DATE",
      required: true,
      defaultSource: "item.maxRequiredOnSiteDate"
    },
    {
      id: "door_schedule_ref",
      label: "Door Schedule Reference/Revision",
      type: "STRING",
      required: true
    },
    {
      id: "hardware_sets_ref",
      label: "Hardware Sets Reference",
      type: "STRING",
      required: true
    },
    {
      id: "finish",
      label: "Primary Finish (e.g., 626, 613, 690)",
      type: "STRING",
      required: true,
      validations: [
        {
          type: "MATCH_PATTERN",
          pattern: "^[0-9]{3}[A-Z]?$",
          severity: "WARN",
          message: "Finish should be a 3-digit code (e.g., 626)"
        }
      ]
    },
    {
      id: "hardware_summary",
      label: "Hardware/Opening Summary",
      type: "STRING",
      required: true,
      defaultSource: "item.summaryByOpening"
    },
    {
      id: "special_instructions",
      label: "Special Instructions",
      type: "STRING",
      required: false
    }
  ]
};

export const allegionElectrifiedTemplate: ManufacturerOrderFormTemplate = {
  id: "tmpl_allegion_electrified",
  manufacturer: "ALLEGION",
  name: "Allegion Electrified Hardware Order",
  version: "1.0",
  divisions: ["28"],
  fields: [
    {
      id: "project_name",
      label: "Project Name",
      type: "STRING",
      required: true,
      defaultSource: "project.name"
    },
    {
      id: "job_number",
      label: "Job Number",
      type: "STRING",
      required: true,
      defaultSource: "project.jobNumber"
    },
    {
      id: "riser_diagram_ref",
      label: "Riser Diagram Reference",
      type: "STRING",
      required: true
    },
    {
      id: "sequence_of_operations",
      label: "Sequence of Operations Confirmed?",
      type: "BOOLEAN",
      required: true
    },
    {
      id: "voltage_details",
      label: "Voltage/Power Details",
      type: "STRING",
      required: true
    },
    {
      id: "required_on_site_date",
      label: "Required On Site Date",
      type: "DATE",
      required: true,
      defaultSource: "item.maxRequiredOnSiteDate"
    },
    {
      id: "hardware_summary",
      label: "Hardware Summary",
      type: "STRING",
      required: true,
      defaultSource: "item.summaryByOpening"
    }
  ]
};

export const assaAbloyAccessOrderTemplate: ManufacturerOrderFormTemplate = {
  id: "tmpl_assa_access",
  manufacturer: "ASSA_ABLOY",
  name: "ASSA ABLOY Electronic Access/Div 28 Order",
  version: "1.1",
  divisions: ["28"],
  fields: [
    {
      id: "project_name",
      label: "Project Name",
      type: "STRING",
      required: true,
      defaultSource: "project.name"
    },
    {
      id: "job_number",
      label: "Job Number",
      type: "STRING",
      required: true,
      defaultSource: "project.jobNumber"
    },
    {
      id: "riser_diagram_ref",
      label: "Riser Diagram Reference",
      type: "STRING",
      required: true
    },
    {
      id: "sequence_of_operations",
      label: "Sequence of Operations Confirmed?",
      type: "BOOLEAN",
      required: true
    },
    {
      id: "voltage_details",
      label: "Voltage/Power Details",
      type: "STRING",
      required: true
    },
    {
      id: "integration_platform",
      label: "Access Control Platform",
      type: "SELECT",
      required: true,
      options: ["Aperio", "Seos", "HID", "Other"]
    },
    {
      id: "required_on_site_date",
      label: "Required On Site Date",
      type: "DATE",
      required: true,
      defaultSource: "item.maxRequiredOnSiteDate"
    }
  ]
};

export const assaAbloyMechanicalTemplate: ManufacturerOrderFormTemplate = {
  id: "tmpl_assa_mechanical",
  manufacturer: "ASSA_ABLOY",
  name: "ASSA ABLOY Mechanical Hardware Order",
  version: "1.0",
  divisions: ["08"],
  fields: [
    {
      id: "project_name",
      label: "Project Name",
      type: "STRING",
      required: true,
      defaultSource: "project.name"
    },
    {
      id: "job_number",
      label: "Job/Reference Number",
      type: "STRING",
      required: true,
      defaultSource: "project.jobNumber"
    },
    {
      id: "door_schedule_ref",
      label: "Door Schedule Reference",
      type: "STRING",
      required: true
    },
    {
      id: "hardware_sets_ref",
      label: "Hardware Sets Reference",
      type: "STRING",
      required: true
    },
    {
      id: "finish",
      label: "Primary Finish",
      type: "STRING",
      required: true
    },
    {
      id: "keying_system",
      label: "Keying System Reference",
      type: "STRING",
      required: false
    },
    {
      id: "required_on_site_date",
      label: "Required On Site Date",
      type: "DATE",
      required: true,
      defaultSource: "item.maxRequiredOnSiteDate"
    },
    {
      id: "hardware_summary",
      label: "Hardware Summary",
      type: "STRING",
      required: true,
      defaultSource: "item.summaryByOpening"
    }
  ]
};

export const dormakabaTemplate: ManufacturerOrderFormTemplate = {
  id: "tmpl_dormakaba_std",
  manufacturer: "DORMAKABA",
  name: "dormakaba Standard Order",
  version: "1.0",
  divisions: ["08", "28"],
  fields: [
    {
      id: "project_name",
      label: "Project Name",
      type: "STRING",
      required: true,
      defaultSource: "project.name"
    },
    {
      id: "job_number",
      label: "Job Number",
      type: "STRING",
      required: true,
      defaultSource: "project.jobNumber"
    },
    {
      id: "door_schedule_ref",
      label: "Door Schedule Reference",
      type: "STRING",
      required: true
    },
    {
      id: "product_category",
      label: "Product Category",
      type: "SELECT",
      required: true,
      options: ["Door Closers", "Exit Devices", "Electronic Locks", "Access Control"]
    },
    {
      id: "finish",
      label: "Finish",
      type: "STRING",
      required: true
    },
    {
      id: "required_on_site_date",
      label: "Required On Site Date",
      type: "DATE",
      required: true,
      defaultSource: "item.maxRequiredOnSiteDate"
    },
    {
      id: "hardware_summary",
      label: "Hardware Summary",
      type: "STRING",
      required: true,
      defaultSource: "item.summaryByOpening"
    }
  ]
};

export const hagerTemplate: ManufacturerOrderFormTemplate = {
  id: "tmpl_hager_std",
  manufacturer: "HAGER",
  name: "Hager Companies Order",
  version: "1.0",
  divisions: ["08"],
  fields: [
    {
      id: "project_name",
      label: "Project Name",
      type: "STRING",
      required: true,
      defaultSource: "project.name"
    },
    {
      id: "job_number",
      label: "Job Number",
      type: "STRING",
      required: true,
      defaultSource: "project.jobNumber"
    },
    {
      id: "product_type",
      label: "Product Type",
      type: "SELECT",
      required: true,
      options: ["Hinges", "Weatherstripping", "Thresholds", "Door Bottoms", "Seals"]
    },
    {
      id: "finish",
      label: "Finish",
      type: "STRING",
      required: true
    },
    {
      id: "required_on_site_date",
      label: "Required On Site Date",
      type: "DATE",
      required: true,
      defaultSource: "item.maxRequiredOnSiteDate"
    },
    {
      id: "hardware_summary",
      label: "Item Summary",
      type: "STRING",
      required: true,
      defaultSource: "item.summaryByOpening"
    }
  ]
};

export const manufacturerOrderTemplates: ManufacturerOrderFormTemplate[] = [
  allegionHardwareOrderTemplate,
  allegionElectrifiedTemplate,
  assaAbloyAccessOrderTemplate,
  assaAbloyMechanicalTemplate,
  dormakabaTemplate,
  hagerTemplate
];

export function getTemplateForManufacturer(
  manufacturer: ManufacturerId, 
  division: DivisionCode
): ManufacturerOrderFormTemplate | undefined {
  return manufacturerOrderTemplates.find(
    t => t.manufacturer === manufacturer && t.divisions.includes(division)
  );
}

export function getTemplatesForManufacturer(manufacturer: ManufacturerId): ManufacturerOrderFormTemplate[] {
  return manufacturerOrderTemplates.filter(t => t.manufacturer === manufacturer);
}

export function getTemplateById(templateId: string): ManufacturerOrderFormTemplate | undefined {
  return manufacturerOrderTemplates.find(t => t.id === templateId);
}
