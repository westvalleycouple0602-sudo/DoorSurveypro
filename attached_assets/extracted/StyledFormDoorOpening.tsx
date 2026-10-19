// StyledFormDoorOpening.tsx
// Tailwind + shadcn/ui + zod + react-hook-form
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// shadcn/ui components (assumes library installed)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import { OpeningRecordSchema, OpeningRecord } from "./validation";
import { ruleTips, tip } from "./ruleTooltips";

type Props = {
  defaultValue?: OpeningRecord;
  onSubmit?: (v: OpeningRecord) => void;
};

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{children}</div>;
}

function Field({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs cursor-help">?</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-80 text-xs leading-relaxed">{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

export default function StyledFormDoorOpening({ defaultValue, onSubmit }: Props) {
  const form = useForm<OpeningRecord>({
    resolver: zodResolver(OpeningRecordSchema),
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
      <Card className="border rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Jurisdiction</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="State" tooltip={tip(ruleTips.jurisdiction)}>
              <Input placeholder="CA" {...register("jurisdiction.state")} />
            </Field>
            <Field label="IBC Edition">
              <Select value={watch("jurisdiction.ibc_edition") ?? ""} onValueChange={(v)=>setValue("jurisdiction.ibc_edition", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select edition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2015">2015</SelectItem>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="NFPA 101 Edition">
              <Select value={watch("jurisdiction.nfpa101_edition") ?? ""} onValueChange={(v)=>setValue("jurisdiction.nfpa101_edition", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select edition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Local Max Hardware Height (in)" tooltip={tip(ruleTips.ca44)}>
              <Input type="number" step="0.1" placeholder="44" {...register("jurisdiction.max_hw_height_aff", { valueAsNumber: true })} />
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Door Context</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Accessible Route" tooltip={tip(ruleTips.force5lbf)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_accessible_route")} onCheckedChange={(v)=>setValue("door.is_accessible_route", !!v)} />
                <span className="text-sm text-muted-foreground">{watch("door.is_accessible_route") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Interior">
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_interior")} onCheckedChange={(v)=>setValue("door.is_interior", !!v)} />
                <span className="text-sm text-muted-foreground">{watch("door.is_interior") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Egress Required" tooltip={tip(ruleTips.singleMotion)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_egress_required")} onCheckedChange={(v)=>setValue("door.is_egress_required", !!v)} />
                <span className="text-sm text-muted-foreground">{watch("door.is_egress_required") ? "Yes" : "No"}</span>
              </div>
            </Field>
            <Field label="Fire Door" tooltip={tip(ruleTips.fireDoor)}>
              <div className="flex items-center gap-2">
                <Switch checked={!!watch("door.is_fire_door")} onCheckedChange={(v)=>setValue("door.is_fire_door", !!v)} />
                <span className="text-sm text-muted-foreground">{watch("door.is_fire_door") ? "Yes" : "No"}</span>
              </div>
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label="Approach">
              <Select value={watch("door.approach") ?? ""} onValueChange={(v)=>setValue("door.approach", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select approach" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="front-pull-latch">front-pull-latch</SelectItem>
                  <SelectItem value="front-push-no-latch">front-push-no-latch</SelectItem>
                  <SelectItem value="hinge-pull">hinge-pull</SelectItem>
                  <SelectItem value="latch-pull">latch-pull</SelectItem>
                  <SelectItem value="perpendicular-pull">perpendicular-pull</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Swing Direction">
              <Select value={watch("door.swing_direction") ?? ""} onValueChange={(v)=>setValue("door.swing_direction", v as any)}>
                <SelectTrigger><SelectValue placeholder="egress/opposed/neutral" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="egress">egress</SelectItem>
                  <SelectItem value="opposed">opposed</SelectItem>
                  <SelectItem value="neutral">neutral</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Occupancy">
              <Select value={watch("door.occupancy_group") ?? ""} onValueChange={(v)=>setValue("door.occupancy_group", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A","B","E","I-2","M","R","S","F","H","U","Other"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Space Type">
              <Select value={watch("door.space_type") ?? ""} onValueChange={(v)=>setValue("door.space_type", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["corridor","classroom","restroom","stair","office","exterior","storage","other"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Geometry & Clearances</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Leaf Width (in)"><Input type="number" step="0.1" {...register("geometry.leaf_width_in", { valueAsNumber: true })} /></Field>
            <Field label="Leaf Height (in)"><Input type="number" step="0.1" {...register("geometry.leaf_height_in", { valueAsNumber: true })} /></Field>
            <Field label="Clear Width (in)"><Input type="number" step="0.1" {...register("geometry.clear_width_in", { valueAsNumber: true })} /></Field>
            <Field label="Door Thickness (in)"><Input type="number" step="0.01" {...register("geometry.door_thickness_in", { valueAsNumber: true })} /></Field>
            <Field label="Threshold Height (in)" tooltip={tip(ruleTips.threshold)}><Input type="number" step="0.1" {...register("threshold.height_in", { valueAsNumber: true })} /></Field>
            <Field label="Threshold Beveled"><Switch checked={!!watch("threshold.beveled")} onCheckedChange={(v)=>setValue("threshold.beveled", !!v)} /></Field>
            <Field label="Pull Clearance (depth x width in)">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="0.1" placeholder="depth" {...register("clearance.pull.depth_in", { valueAsNumber: true })} />
                <Input type="number" step="0.1" placeholder="width" {...register("clearance.pull.width_in", { valueAsNumber: true })} />
              </div>
            </Field>
            <Field label="Push Clearance (depth x width in)">
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="0.1" placeholder="depth" {...register("clearance.push.depth_in", { valueAsNumber: true })} />
                <Input type="number" step="0.1" placeholder="width" {...register("clearance.push.width_in", { valueAsNumber: true })} />
              </div>
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Hardware & Electrical</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Hardware Category"><Input placeholder="lock, closer, hinge, strike, maglock, exit device..." {...register("hardware.category")} /></Field>
            <Field label="Function Code"><Input placeholder="ND80PD, L9050, AU5407..." {...register("hardware.function_code")} /></Field>
            <Field label="BHMA Function" tooltip={tip(ruleTips.heightRange)}><Input placeholder="F86, F109, F84..." {...register("hardware.bhma_function")} /></Field>
            <Field label="Hardware Height (AFF, in)" tooltip={tip(ruleTips.heightRange)}>
              <Input type="number" step="0.1" {...register("hardware.height_aff", { valueAsNumber: true })} />
              {errors?.hardware?.height_aff && <p className="text-xs text-destructive mt-1">{errors.hardware.height_aff.message as string}</p>}
            </Field>
            <Field label="Device Type">
              <Select value={watch("electrical.device_type") ?? ""} onValueChange={(v)=>setValue("electrical.device_type", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["maglock","electric_strike","exit_device_EL","qel","electrified_trim","reader","none"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Voltage">
              <Select value={watch("electrical.voltage") ?? ""} onValueChange={(v)=>setValue("electrical.voltage", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["12VDC","24VDC","120VAC","LowVoltageOther"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Inrush (A)"><Input type="number" step="0.01" {...register("electrical.current_inrush_A", { valueAsNumber: true })} /></Field>
            <Field label="Hold (A)"><Input type="number" step="0.01" {...register("electrical.current_hold_A", { valueAsNumber: true })} /></Field>
            <Field label="Inrush Duration (ms)"><Input type="number" step="1" {...register("electrical.inrush_ms", { valueAsNumber: true })} /></Field>
            <Field label="PSU Capacity (A)"><Input type="number" step="0.01" {...register("electrical.psu_capacity_A", { valueAsNumber: true })} /></Field>
            <Field label="EL Module Present"><Switch checked={!!watch("electrical.el_module_present")} onCheckedChange={(v)=>setValue("electrical.el_module_present", !!v)} /></Field>
            <Field label="Fire Alarm Interface" tooltip={tip(ruleTips.maglock)}><Switch checked={!!watch("electrical.fire_alarm_interface")} onCheckedChange={(v)=>setValue("electrical.fire_alarm_interface", !!v)} /></Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Measurements & Reader</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="Opening Force (lbf)" tooltip={tip(ruleTips.force5lbf)}><Input type="number" step="0.1" {...register("measurements.opening_force_lbf", { valueAsNumber: true })} /></Field>
            <Field label="Closer: 90° → 12° (sec)"><Input type="number" step="0.1" {...register("measurements.closing_time_90_to_12_sec", { valueAsNumber: true })} /></Field>
            <Field label="Reader Height (AFF, in)"><Input type="number" step="0.1" {...register("reader.height_aff", { valueAsNumber: true })} /></Field>
            <Field label="Reader Type">
              <Select value={watch("reader.type") ?? ""} onValueChange={(v)=>setValue("reader.type", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["prox","multi-tech","pinpad","biometric","other"].map(o=>(<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </FieldRow>
        </CardContent>
      </Card>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Labels & Documentation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FieldRow>
            <Field label="S-Label Present"><Switch checked={!!watch("labels_docs.s_label_present")} onCheckedChange={(v)=>setValue("labels_docs.s_label_present", !!v)} /></Field>
            <Field label="UL Markings"><Input {...register("labels_docs.ul_markings")} /></Field>
            <Field label="Barcode"><Input {...register("labels_docs.barcode_data")} /></Field>
            <Field label="Drawing Ref"><Input {...register("labels_docs.drawings_ref")} /></Field>
          </FieldRow>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit">Save Opening</Button>
      </div>
    </form>
  );
}