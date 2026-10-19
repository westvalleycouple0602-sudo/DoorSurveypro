import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface ValidationRule {
  id: number;
  ruleId: string;
  appliesTo: "door" | "frame";
  severity: "error" | "warning";
  whenConditions: {
    when?: {
      attribute_group: string;
      attribute_name: string;
      value_regex: string;
    };
    when_any_of?: Array<{
      attribute_group: string;
      attribute_name: string;
      value_regex: string;
    }>;
  };
  requirements: {
    require_any_of?: Array<{
      attribute_group: string;
      attribute_name: string;
      allowed_codes: string[];
    }>;
    validate?: {
      min_clear_width_mm?: number;
    };
  };
  message: string;
  references: string[];
  isActive: string;
}

interface DoorFrameValidationMessagesProps {
  formValues: Record<string, any>;
  appliesTo?: "door" | "frame";
}

export function DoorFrameValidationMessages({
  formValues,
  appliesTo,
}: DoorFrameValidationMessagesProps) {
  const { data: rules = [], isLoading } = useQuery<ValidationRule[]>({
    queryKey: appliesTo ? ["/api/validation-rules", { appliesTo }] : ["/api/validation-rules"],
  });

  if (isLoading) {
    return null;
  }

  const violations = evaluateRules(rules, formValues);

  if (violations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="validation-messages">
      {violations.map((violation, idx) => (
        <Alert
          key={idx}
          variant={violation.severity === "error" ? "destructive" : "default"}
          data-testid={`alert-validation-${violation.severity}`}
        >
          {violation.severity === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>{violation.severity === "error" ? "Error" : "Warning"}</AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              <div>{violation.message}</div>
              {violation.references.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  References: {violation.references.join(", ")}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

function evaluateRules(
  rules: ValidationRule[],
  formValues: Record<string, any>
): Array<{ severity: "error" | "warning"; message: string; references: string[] }> {
  const violations: Array<{ severity: "error" | "warning"; message: string; references: string[] }> = [];

  for (const rule of rules) {
    if (rule.isActive !== "yes") continue;

    // Check if conditions are met
    const conditionsMet = checkConditions(rule.whenConditions, formValues);
    
    if (!conditionsMet) continue;

    // Check requirements
    const requirementsMet = checkRequirements(rule.requirements, formValues);

    if (!requirementsMet) {
      violations.push({
        severity: rule.severity,
        message: rule.message,
        references: rule.references,
      });
    }
  }

  return violations;
}

function checkConditions(
  conditions: ValidationRule["whenConditions"],
  formValues: Record<string, any>
): boolean {
  // Handle "when" single condition
  if (conditions.when) {
    const fieldValue = getFieldValueByAttributeInfo(
      formValues,
      conditions.when.attribute_group,
      conditions.when.attribute_name
    );
    if (!fieldValue) return false;
    const regex = new RegExp(conditions.when.value_regex);
    return regex.test(fieldValue);
  }

  // Handle "when_any_of" multiple conditions
  if (conditions.when_any_of) {
    return conditions.when_any_of.some((cond) => {
      const fieldValue = getFieldValueByAttributeInfo(
        formValues,
        cond.attribute_group,
        cond.attribute_name
      );
      if (!fieldValue) return false;
      const regex = new RegExp(cond.value_regex);
      return regex.test(fieldValue);
    });
  }

  return false;
}

function checkRequirements(
  requirements: ValidationRule["requirements"],
  formValues: Record<string, any>
): boolean {
  // Handle "require_any_of" - at least one requirement must be met
  if (requirements.require_any_of) {
    return requirements.require_any_of.some((req) => {
      const fieldValue = getFieldValueByAttributeInfo(
        formValues,
        req.attribute_group,
        req.attribute_name
      );
      if (!fieldValue) return false;
      return req.allowed_codes.includes(fieldValue);
    });
  }

  // Handle "validate" custom validation logic
  if (requirements.validate) {
    // ADA clear width validation
    if (requirements.validate.min_clear_width_mm !== undefined) {
      const minClearWidthMm = requirements.validate.min_clear_width_mm;
      
      // Get door width from form
      const doorWidth = formValues.doorWidth;
      if (!doorWidth) {
        // Can't validate without door width - assume valid
        return true;
      }

      // Parse door width (could be "3'-0"", "36", etc.)
      const widthInches = parseDoorWidth(doorWidth);
      if (widthInches === null) {
        // Can't parse - assume valid to avoid false positives
        return true;
      }

      // Convert to mm (1 inch = 25.4 mm)
      const nominalWidthMm = widthInches * 25.4;

      // For a proper ADA check, we'd need exact frame and hardware measurements
      // Using a realistic estimate based on standard configurations:
      // - Frame width reduction: ~0.75-1" per side = 1.5-2" total
      // - Standard hardware: measured from face of door, not from nominal width
      // - Total width reduction estimate: ~2" for typical commercial frames
      // - Note: A 3'-0" (36") door typically has 34-35" clear width, well above 32" requirement
      const estimatedDeductionInches = 2;
      const estimatedClearWidthMm = (widthInches - estimatedDeductionInches) * 25.4;

      // Return false if clear width is less than minimum (violation detected)
      return estimatedClearWidthMm >= minClearWidthMm;
    }
  }

  return true;
}

// Helper function to parse door width from various formats
function parseDoorWidth(width: string): number | null {
  if (!width) return null;
  
  // Try parsing feet-inches format like "3'-0", "3-0", "3'0"", "3' 0""
  // Matches: number + separator(s) + number
  const feetInchesMatch = width.match(/(\d+)['\s-]+(\d+)/);
  if (feetInchesMatch) {
    const feet = parseInt(feetInchesMatch[1], 10);
    const inches = parseInt(feetInchesMatch[2], 10);
    return feet * 12 + inches;
  }
  
  // Try parsing as plain inches
  const inchesMatch = width.match(/^(\d+(?:\.\d+)?)(?:\s*(?:in|inch|inches|"))?$/i);
  if (inchesMatch) {
    return parseFloat(inchesMatch[1]);
  }
  
  return null;
}

// Map attribute group/name to form field names
// This mapping is based on the catalog structure and form field names
function getFieldValueByAttributeInfo(
  formValues: Record<string, any>,
  attributeGroup: string,
  attributeName: string
): string | undefined {
  // Create a mapping from attribute info to form field names
  const fieldMappings: Record<string, string> = {
    // Door attributes
    "Fire/Code|Fire Rating": "doorFireRating",
    "Glazing|Fire-Resistive Glass": "visionLiteGlassType",
    "Glazing|Vision Panel": "visionLitePresent",
    "Electrified|Access Reader": "accessControlType",
    "Electrified|Power Transfer": "electrifiedHardware",
    "Size/Handing|Nominal Width": "doorWidth",
    // Frame attributes
    "Material|Frame Material": "frameMaterial",
    "Dimension|Throat (Wall) Depth": "frameDepth",
  };

  const key = `${attributeGroup}|${attributeName}`;
  const fieldName = fieldMappings[key];

  if (!fieldName) {
    return undefined;
  }

  return formValues[fieldName];
}
