import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ComplianceRecordSchema, type ComplianceRecord } from "@/lib/compliance/validation";
import { ruleTips, tip } from "@/lib/compliance/ruleTooltips";
import { HelpCircle, Save } from "lucide-react";

type Props = {
  defaultValue?: ComplianceRecord;
  onSubmit?: (v: ComplianceRecord) => void;
  onCancel?: () => void;
};

// Helper to convert empty/NaN numeric inputs to undefined for optional fields
const asOptionalNumber = (v: any) => {
  if (v === '' || v === null || v === undefined) return undefined;
  const num = Number(v);
  return isNaN(num) ? undefined : num;
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{children}</div>;
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs cursor-help text-muted-foreground hover-elevate">
                  <HelpCircle className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-80 text-xs leading-relaxed" data-testid="tooltip-content">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

export function ComplianceForm({ defaultValue, onSubmit, onCancel }: Props) {
  const form = useForm<ComplianceRecord>({
    resolver: zodResolver(ComplianceRecordSchema),
    defaultValues: defaultValue ?? {
      jurisdiction: { state: "CA", ibc_edition: "2021", nfpa101_edition: "2018" },
      door: { is_accessible_route: true, is_interior: true, is_egress_required: true, approach: "front-pull-latch", swing_direction: "egress", occupancy_group: "B", space_type: "corridor" },
      hardware: { role: "operable", category: "lock", height_aff: 42 },
      geometry: {},
      threshold: {},
      clearance: { pull: {}, push: {} },
      electrical: {},
      measurements: {},
      labels_docs: {},
      reader: {}
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit(v => onSubmit?.(v))} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Jurisdiction & Building Codes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="State" tooltip={tip(ruleTips.jurisdiction)}>
              <Input placeholder="CA" {...register("jurisdiction.state")} data-testid="input-state" />
            </Field>
            <Field label="IBC Edition">
              <Select value={watch("jurisdiction.ibc_edition") ?? ""} onValueChange={(v)=>setValue("jurisdiction.ibc_edition", v as any)}>
                <SelectTrigger data-testid="select-ibc-edition"><SelectValue placeholder="Select edition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2015">2015</SelectItem>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="NFPA 101 Edition">
              <Select value={watch("jurisdiction.nfpa101_edition") ?? ""} onValueChange={(v)=>setValue("jurisdiction.nfpa101_edition", v as any)}>
                <SelectTrigger data-testid="select-nfpa-edition"><SelectValue placeholder="Select edition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Local Max Hardware Height (in)" tooltip={tip(ruleTips.ca44)}>
              <Input type="number" step="0.1" placeholder="44" {...register("jurisdiction.max_hw_height_aff", { setValueAs: asOptionalNumber })} data-testid="input-max-hw-height" />
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Door Context & Accessibility</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Accessible Route" tooltip={tip(ruleTips.force5lbf)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_accessible_route")} onCheckedChange={(v)=>setValue("door.is_accessible_route", !!v)} data-testid="switch-accessible-route" />
                <span className="text-sm text-muted-foreground">{watch("door.is_accessible_route") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Interior">
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_interior")} onCheckedChange={(v)=>setValue("door.is_interior", !!v)} data-testid="switch-interior" />
                <span className="text-sm text-muted-foreground">{watch("door.is_interior") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Egress Required" tooltip={tip(ruleTips.singleMotion)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_egress_required")} onCheckedChange={(v)=>setValue("door.is_egress_required", !!v)} data-testid="switch-egress" />
                <span className="text-sm text-muted-foreground">{watch("door.is_egress_required") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Fire Door" tooltip={tip(ruleTips.fireDoor)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_fire_door")} onCheckedChange={(v)=>setValue("door.is_fire_door", !!v)} data-testid="switch-fire-door" />
                <span className="text-sm text-muted-foreground">{watch("door.is_fire_door") ? "Yes" : "No"}</span>
              </div>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Approach">
              <Select value={watch("door.approach") ?? ""} onValueChange={(v)=>setValue("door.approach", v as any)}>
                <SelectTrigger data-testid="select-approach"><SelectValue placeholder="Select approach" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="front-pull-latch">Front Pull (Latch Side)</SelectItem>
                  <SelectItem value="front-push-no-latch">Front Push (No Latch)</SelectItem>
                  <SelectItem value="hinge-pull">Hinge Side Pull</SelectItem>
                  <SelectItem value="latch-pull">Latch Side Pull</SelectItem>
                  <SelectItem value="perpendicular-pull">Perpendicular Pull</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Swing Direction">
              <Select value={watch("door.swing_direction") ?? ""} onValueChange={(v)=>setValue("door.swing_direction", v as any)}>
                <SelectTrigger data-testid="select-swing"><SelectValue placeholder="Select direction" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="egress">Egress</SelectItem>
                  <SelectItem value="opposed">Opposed to Egress</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Occupancy Group">
              <Select value={watch("door.occupancy_group") ?? ""} onValueChange={(v)=>setValue("door.occupancy_group", v as any)}>
                <SelectTrigger data-testid="select-occupancy"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A","B","E","I-2","M","R","S","F","H","U","Other"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Space Type">
              <Select value={watch("door.space_type") ?? ""} onValueChange={(v)=>setValue("door.space_type", v as any)}>
                <SelectTrigger data-testid="select-space-type"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["corridor","classroom","restroom","stair","office","exterior","storage","other"].map(o=>(<SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Geometry & Clearances</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Leaf Width (in)">
              <Input type="number" step="0.1" {...register("geometry.leaf_width_in", { setValueAs: asOptionalNumber })} data-testid="input-leaf-width" />
            </Field>
            <Field label="Leaf Height (in)">
              <Input type="number" step="0.1" {...register("geometry.leaf_height_in", { setValueAs: asOptionalNumber })} data-testid="input-leaf-height" />
            </Field>
            <Field label="Clear Width (in)">
              <Input type="number" step="0.1" {...register("geometry.clear_width_in", { setValueAs: asOptionalNumber })} data-testid="input-clear-width" />
            </Field>
            <Field label="Door Thickness (in)">
              <Input type="number" step="0.01" {...register("geometry.door_thickness_in", { setValueAs: asOptionalNumber })} data-testid="input-thickness" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Threshold Height (in)" tooltip={tip(ruleTips.threshold)}>
              <Input type="number" step="0.1" {...register("threshold.height_in", { setValueAs: asOptionalNumber })} data-testid="input-threshold-height" />
            </Field>
            <Field label="Threshold Beveled">
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("threshold.beveled")} onCheckedChange={(v)=>setValue("threshold.beveled", !!v)} data-testid="switch-threshold-beveled" />
                <span className="text-sm text-muted-foreground">{watch("threshold.beveled") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Pull Clearance Depth (in)">
              <Input type="number" step="0.1" placeholder="Depth" {...register("clearance.pull.depth_in", { setValueAs: asOptionalNumber })} data-testid="input-pull-depth" />
            </Field>
            <Field label="Pull Clearance Width (in)">
              <Input type="number" step="0.1" placeholder="Width" {...register("clearance.pull.width_in", { setValueAs: asOptionalNumber })} data-testid="input-pull-width" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Push Clearance Depth (in)">
              <Input type="number" step="0.1" placeholder="Depth" {...register("clearance.push.depth_in", { setValueAs: asOptionalNumber })} data-testid="input-push-depth" />
            </Field>
            <Field label="Push Clearance Width (in)">
              <Input type="number" step="0.1" placeholder="Width" {...register("clearance.push.width_in", { setValueAs: asOptionalNumber })} data-testid="input-push-width" />
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hardware Specifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Hardware Category">
              <Input placeholder="lock, closer, exit device..." {...register("hardware.category")} data-testid="input-hw-category" />
            </Field>
            <Field label="Function Code">
              <Input placeholder="ND80PD, L9050, AU5407..." {...register("hardware.function_code")} data-testid="input-function-code" />
            </Field>
            <Field label="BHMA Function" tooltip={tip(ruleTips.heightRange)}>
              <Input placeholder="F86, F109, F84..." {...register("hardware.bhma_function")} data-testid="input-bhma-function" />
            </Field>
            <Field label="Hardware Height (AFF, in)" tooltip={tip(ruleTips.heightRange)}>
              <Input type="number" step="0.1" {...register("hardware.height_aff", { setValueAs: asOptionalNumber })} data-testid="input-hw-height" />
              {errors?.hardware?.height_aff && <p className="text-xs text-destructive mt-1">{errors.hardware.height_aff.message as string}</p>}
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Electrical & Access Control</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Device Type">
              <Select value={watch("electrical.device_type") ?? ""} onValueChange={(v)=>setValue("electrical.device_type", v as any)}>
                <SelectTrigger data-testid="select-device-type"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["maglock","electric_strike","exit_device_EL","qel","electrified_trim","reader","none"].map(o=>(<SelectItem key={o} value={o}>{o.replace(/_/g, ' ').toUpperCase()}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Voltage">
              <Select value={watch("electrical.voltage") ?? ""} onValueChange={(v)=>setValue("electrical.voltage", v as any)}>
                <SelectTrigger data-testid="select-voltage"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["12VDC","24VDC","120VAC","LowVoltageOther"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Inrush Current (A)">
              <Input type="number" step="0.01" {...register("electrical.current_inrush_A", { setValueAs: asOptionalNumber })} data-testid="input-inrush" />
            </Field>
            <Field label="Hold Current (A)">
              <Input type="number" step="0.01" {...register("electrical.current_hold_A", { setValueAs: asOptionalNumber })} data-testid="input-hold" />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Fire Alarm Interface" tooltip={tip(ruleTips.maglock)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("electrical.fire_alarm_interface")} onCheckedChange={(v)=>setValue("electrical.fire_alarm_interface", !!v)} data-testid="switch-fire-alarm" />
                <span className="text-sm text-muted-foreground">{watch("electrical.fire_alarm_interface") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Reader Height (AFF, in)">
              <Input type="number" step="0.1" {...register("reader.height_aff", { setValueAs: asOptionalNumber })} data-testid="input-reader-height" />
            </Field>
            <Field label="Reader Type">
              <Select value={watch("reader.type") ?? ""} onValueChange={(v)=>setValue("reader.type", v as any)}>
                <SelectTrigger data-testid="select-reader-type"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["prox","multi-tech","pinpad","biometric","other"].map(o=>(<SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Measurements</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Opening Force (lbf)" tooltip={tip(ruleTips.force5lbf)}>
              <Input type="number" step="0.1" {...register("measurements.opening_force_lbf", { setValueAs: asOptionalNumber })} data-testid="input-opening-force" />
            </Field>
            <Field label="Closer: 90° → 12° (sec)">
              <Input type="number" step="0.1" {...register("measurements.closing_time_90_to_12_sec", { setValueAs: asOptionalNumber })} data-testid="input-closing-time" />
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Labels & Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="S-Label Present">
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("labels_docs.s_label_present")} onCheckedChange={(v)=>setValue("labels_docs.s_label_present", !!v)} data-testid="switch-s-label" />
                <span className="text-sm text-muted-foreground">{watch("labels_docs.s_label_present") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="UL Markings">
              <Input {...register("labels_docs.ul_markings")} data-testid="input-ul-markings" />
            </Field>
            <Field label="Barcode">
              <Input {...register("labels_docs.barcode_data")} data-testid="input-barcode" />
            </Field>
            <Field label="Drawing Reference">
              <Input {...register("labels_docs.drawings_ref")} data-testid="input-drawing-ref" />
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
        )}
        <Button type="submit" data-testid="button-save">
          <Save className="h-4 w-4 mr-2" />
          Save Compliance Data
        </Button>
      </div>
    </form>
  );
}
