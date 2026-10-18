import type { 
  ManufacturerOrderFormTemplate, 
  ManufacturerOrderFieldValue, 
  ManufacturerOrderFormInstance,
  ProcurementItemContext,
  ProjectContext,
  FieldValidationStatus,
  OrderFormPdfPayload,
  OrderFormPdfMode,
  ManufacturerId,
  DivisionCode
} from "./types";
import { getTemplateById, getTemplateForManufacturer } from "./orderFormTemplates";

interface AutoFillContext {
  project: ProjectContext;
  items: ProcurementItemContext[];
}

function resolveDefaultValue(defaultSource: string | undefined, ctx: AutoFillContext): any {
  if (!defaultSource) return undefined;
  
  const parts = defaultSource.split(".");
  const root = parts[0];
  const field = parts.slice(1).join(".");
  
  switch (root) {
    case "project":
      return getNestedValue(ctx.project, field);
    case "item":
      if (field === "maxRequiredOnSiteDate") {
        const dates = ctx.items
          .filter(i => i.requiredOnSiteDate)
          .map(i => new Date(i.requiredOnSiteDate!).getTime());
        if (dates.length === 0) return undefined;
        return new Date(Math.max(...dates)).toISOString().split("T")[0];
      }
      if (field === "summaryByOpening") {
        return ctx.items
          .map(i => `${i.partNumber} (${i.quantity}x) - ${i.description}`)
          .join("; ");
      }
      if (ctx.items.length > 0) {
        return getNestedValue(ctx.items[0], field);
      }
      return undefined;
    default:
      return undefined;
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

export function initializeOrderForm(
  templateId: string,
  projectId: string,
  manufacturer: ManufacturerId,
  division: DivisionCode,
  procurementItemIds: string[],
  createdByUserId: string,
  autoFillCtx?: AutoFillContext
): ManufacturerOrderFormInstance {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  const fields: ManufacturerOrderFieldValue[] = template.fields.map(f => {
    let value: any = undefined;
    let status: FieldValidationStatus = "missing";
    
    if (autoFillCtx && f.defaultSource) {
      value = resolveDefaultValue(f.defaultSource, autoFillCtx);
      if (value !== undefined && value !== "") {
        status = "ok";
      }
    }
    
    if (!f.required && value === undefined) {
      status = "ok";
    }
    
    return {
      fieldId: f.id,
      value,
      status,
      messages: status === "missing" ? ["This field is required"] : []
    };
  });
  
  return {
    id: `form_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    projectId,
    templateId,
    manufacturer,
    division,
    procurementItemIds,
    fields,
    generatedAt: new Date().toISOString(),
    createdByUserId
  };
}

export function validateOrderFormField(
  template: ManufacturerOrderFormTemplate,
  fieldId: string,
  value: any
): { status: FieldValidationStatus; messages: string[] } {
  const fieldDef = template.fields.find(f => f.id === fieldId);
  if (!fieldDef) {
    return { status: "invalid", messages: ["Unknown field"] };
  }
  
  const messages: string[] = [];
  
  if (fieldDef.required) {
    if (value === undefined || value === null || value === "") {
      return { status: "missing", messages: ["This field is required"] };
    }
  } else {
    if (value === undefined || value === null || value === "") {
      return { status: "ok", messages: [] };
    }
  }
  
  if (fieldDef.validations) {
    for (const rule of fieldDef.validations) {
      switch (rule.type) {
        case "MATCH_PATTERN":
          if (rule.pattern && typeof value === "string") {
            const regex = new RegExp(rule.pattern);
            if (!regex.test(value)) {
              if (rule.severity === "ERROR") {
                return { status: "invalid", messages: [rule.message] };
              }
              messages.push(rule.message);
            }
          }
          break;
        case "MATCH_ENUM":
          if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            if (rule.severity === "ERROR") {
              return { status: "invalid", messages: [rule.message] };
            }
            messages.push(rule.message);
          }
          break;
      }
    }
  }
  
  if (messages.length > 0) {
    return { status: "needs_review", messages };
  }
  
  return { status: "ok", messages: [] };
}

export function updateOrderFormField(
  form: ManufacturerOrderFormInstance,
  fieldId: string,
  value: any
): ManufacturerOrderFormInstance {
  const template = getTemplateById(form.templateId);
  if (!template) {
    throw new Error(`Template not found: ${form.templateId}`);
  }
  
  const { status, messages } = validateOrderFormField(template, fieldId, value);
  
  const newFields = form.fields.map(f => {
    if (f.fieldId === fieldId) {
      return { fieldId, value, status, messages };
    }
    return f;
  });
  
  return { ...form, fields: newFields };
}

export function isFormComplete(form: ManufacturerOrderFormInstance): boolean {
  return form.fields.every(f => f.status === "ok");
}

export function getFormValidationSummary(form: ManufacturerOrderFormInstance): {
  complete: boolean;
  missing: string[];
  invalid: string[];
  needsReview: string[];
} {
  const template = getTemplateById(form.templateId);
  const fieldLabels = Object.fromEntries(
    (template?.fields || []).map(f => [f.id, f.label])
  );
  
  return {
    complete: form.fields.every(f => f.status === "ok"),
    missing: form.fields.filter(f => f.status === "missing").map(f => fieldLabels[f.fieldId] || f.fieldId),
    invalid: form.fields.filter(f => f.status === "invalid").map(f => fieldLabels[f.fieldId] || f.fieldId),
    needsReview: form.fields.filter(f => f.status === "needs_review").map(f => fieldLabels[f.fieldId] || f.fieldId)
  };
}

export function buildOrderFormPdfPayload(
  form: ManufacturerOrderFormInstance,
  project: ProjectContext,
  items: ProcurementItemContext[],
  mode: OrderFormPdfMode
): OrderFormPdfPayload {
  const template = getTemplateById(form.templateId);
  if (!template) {
    throw new Error(`Template not found: ${form.templateId}`);
  }
  
  const fields = form.fields.map(f => {
    const fieldDef = template.fields.find(fd => fd.id === f.fieldId);
    let displayValue = f.value?.toString() || "";
    
    if (mode === "MANUFACTURER") {
      if (f.fieldId === "internal_notes" || f.fieldId === "cost_notes") {
        displayValue = "[REDACTED]";
      }
    }
    
    return {
      label: fieldDef?.label || f.fieldId,
      value: displayValue,
      status: f.status,
      messages: f.messages
    };
  });
  
  const itemLines = items.map(item => ({
    division: item.division,
    partNumber: item.partNumber,
    description: item.description,
    quantity: item.quantity,
    manufacturer: item.manufacturer
  }));
  
  return {
    title: template.name,
    manufacturer: form.manufacturer,
    projectName: project.name,
    jobNumber: project.jobNumber,
    generatedAt: new Date().toISOString(),
    fields,
    items: itemLines,
    footerText: mode === "MANUFACTURER" ? "This order form was generated by DoorSurvey Pro." : undefined,
    mode
  };
}

export function selectTemplate(
  manufacturer: ManufacturerId,
  division: DivisionCode
): ManufacturerOrderFormTemplate | undefined {
  return getTemplateForManufacturer(manufacturer, division);
}
