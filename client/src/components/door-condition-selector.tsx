import { Control } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckCircle2, AlertCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DoorConditionSelectorProps {
  control: Control<any>;
}

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent", icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  { value: "good", label: "Good", icon: CheckCircle2, color: "text-blue-600 dark:text-blue-400" },
  { value: "fair", label: "Fair", icon: AlertCircle, color: "text-yellow-600 dark:text-yellow-400" },
  { value: "poor", label: "Poor", icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400" },
  { value: "critical", label: "Critical", icon: XCircle, color: "text-red-600 dark:text-red-400" }
];

const COMMON_ISSUES = [
  "Warping",
  "Cracking",
  "Rust/Corrosion",
  "Paint Deterioration",
  "Hardware Malfunction",
  "Improper Clearance",
  "Seal Failure",
  "Hinge Issues",
  "Lock Problems",
  "Closer Malfunction",
  "Frame Damage",
  "Threshold Damage",
  "Weather Stripping Worn",
  "Glass Damage",
  "Fire Rating Compromise"
];

const REPLACEMENT_RECOMMENDATIONS = [
  { value: "none", label: "No Action Required", description: "Door is in acceptable condition" },
  { value: "monitor", label: "Monitor", description: "Check during next inspection cycle" },
  { value: "schedule", label: "Schedule Replacement", description: "Plan for replacement in upcoming budget cycle" },
  { value: "urgent", label: "Urgent Replacement", description: "Replace as soon as possible due to safety or compliance" }
];

export function DoorConditionSelector({ control }: DoorConditionSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Condition Assessment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Condition Assessment</CardTitle>
          <CardDescription>
            Rate the current condition of the door, frame, and hardware components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Door Condition */}
          <FormField
            control={control}
            name="doorCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Door Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-door-condition">
                      <SelectValue placeholder="Select door condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", option.color)} />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Frame Condition */}
          <FormField
            control={control}
            name="frameCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frame Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-frame-condition">
                      <SelectValue placeholder="Select frame condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", option.color)} />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hardware Condition */}
          <FormField
            control={control}
            name="hardwareCondition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hardware Condition</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-hardware-condition">
                      <SelectValue placeholder="Select hardware condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", option.color)} />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assessment Date */}
          <FormField
            control={control}
            name="conditionAssessmentDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Assessment Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal justify-start gap-2",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-assessment-date"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Issues Identification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Identified Issues</CardTitle>
          <CardDescription>
            Select all applicable issues found during the condition assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="conditionIssues"
            render={() => (
              <FormItem>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {COMMON_ISSUES.map((issue) => (
                    <FormField
                      key={issue}
                      control={control}
                      name="conditionIssues"
                      render={({ field }) => {
                        const isChecked = Array.isArray(field.value) && field.value.includes(issue);
                        return (
                          <FormItem
                            key={issue}
                            className="flex flex-row items-start space-x-2 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const current = Array.isArray(field.value) ? field.value : [];
                                  return checked
                                    ? field.onChange([...current, issue])
                                    : field.onChange(current.filter((value) => value !== issue));
                                }}
                                data-testid={`checkbox-issue-${issue.toLowerCase().replace(/\s+/g, '-')}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {issue}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Condition Notes</CardTitle>
          <CardDescription>
            Additional observations, measurements, or details about the condition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="conditionNotes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Enter detailed notes about the condition assessment..."
                    className="min-h-[120px]"
                    {...field}
                    data-testid="textarea-condition-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Replacement Recommendation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Replacement Recommendation</CardTitle>
          <CardDescription>
            Provide a recommendation for replacement or further action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="replacementRecommendation"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {REPLACEMENT_RECOMMENDATIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="peer sr-only"
                          data-testid={`radio-replacement-${option.value}`}
                        />
                        <Label
                          htmlFor={option.value}
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-md border-2 p-4 hover-elevate active-elevate-2 cursor-pointer",
                            "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                          )}
                        >
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="replacementJustification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Justification</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Provide justification for the replacement recommendation..."
                    className="min-h-[100px]"
                    {...field}
                    data-testid="textarea-replacement-justification"
                  />
                </FormControl>
                <FormDescription>
                  Include cost estimates, safety concerns, compliance issues, or other relevant factors
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
