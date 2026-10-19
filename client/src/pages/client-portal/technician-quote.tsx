import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Wrench,
  Plus,
  Trash2,
  Camera,
  Building2,
  DoorOpen,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const doorItemSchema = z.object({
  location: z.string().min(1, "Location is required"),
  doorType: z.string().min(1, "Door type is required"),
  description: z.string().min(1, "Description is required"),
  condition: z.string().default("unknown"),
  urgency: z.string().default("normal"),
  notes: z.string().optional(),
});

const technicianQuoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  buildingName: z.string().optional(),
  buildingAddress: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  overallNotes: z.string().optional(),
  doors: z.array(doorItemSchema).min(1, "At least one door is required"),
});

type TechnicianQuoteForm = z.infer<typeof technicianQuoteSchema>;
type DoorItem = z.infer<typeof doorItemSchema>;

interface PortalUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  role: string;
  organizationId: string;
  organizationName: string;
}

const doorTypes = [
  { value: "single_door", label: "Single Door" },
  { value: "double_door", label: "Double Door (Pair)" },
  { value: "fire_door", label: "Fire-Rated Door" },
  { value: "hollow_metal", label: "Hollow Metal Door" },
  { value: "wood_door", label: "Wood Door" },
  { value: "glass_door", label: "Glass Door" },
  { value: "storefront", label: "Storefront Door" },
  { value: "sliding_door", label: "Sliding Door" },
  { value: "other", label: "Other" },
];

const conditionOptions = [
  { value: "good", label: "Good - Minor issues" },
  { value: "fair", label: "Fair - Needs repair" },
  { value: "poor", label: "Poor - Replacement likely" },
  { value: "unknown", label: "Unknown - Need inspection" },
];

const urgencyOptions = [
  { value: "low", label: "Low - Routine maintenance" },
  { value: "normal", label: "Normal - Standard timeline" },
  { value: "high", label: "High - Within 1 week" },
  { value: "urgent", label: "Urgent - Same day/next day" },
];

export default function TechnicianQuotePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { data: user, isLoading: userLoading, isError } = useQuery<PortalUser>({
    queryKey: ["/api/portal/auth/me"],
  });

  const form = useForm<TechnicianQuoteForm>({
    resolver: zodResolver(technicianQuoteSchema),
    defaultValues: {
      title: "",
      buildingName: "",
      buildingAddress: "",
      contactName: "",
      contactPhone: "",
      overallNotes: "",
      doors: [{ location: "", doorType: "", description: "", condition: "unknown", urgency: "normal", notes: "" }],
    },
  });

  const doors = form.watch("doors");

  const addDoor = () => {
    const currentDoors = form.getValues("doors");
    form.setValue("doors", [
      ...currentDoors,
      { location: "", doorType: "", description: "", condition: "unknown", urgency: "normal", notes: "" },
    ]);
  };

  const removeDoor = (index: number) => {
    const currentDoors = form.getValues("doors");
    if (currentDoors.length > 1) {
      form.setValue("doors", currentDoors.filter((_, i) => i !== index));
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: TechnicianQuoteForm) => {
      const payload = {
        locationName: data.buildingAddress || data.buildingName || "On-site",
        locationAddress: data.buildingAddress,
        buildingName: data.buildingName,
        priority: data.doors.some(d => d.urgency === "urgent") ? "urgent" 
          : data.doors.some(d => d.urgency === "high") ? "high" : "normal",
        notes: data.overallNotes,
        doors: data.doors.map(d => ({
          locationHint: d.location,
          doorType: d.doorType === "double_door" ? "double" 
            : d.doorType === "sliding_door" ? "sliding" 
            : d.doorType === "single_door" ? "single" : "other",
          doorMaterial: d.doorType === "hollow_metal" ? "hollow_metal" 
            : d.doorType === "wood_door" ? "wood" 
            : d.doorType === "glass_door" ? "glass" : "other",
          conditionNotes: d.condition,
          issueDescription: d.description,
          urgency: d.urgency === "urgent" ? "critical" : d.urgency,
        })),
      };
      return apiRequest("POST", "/api/portal/technician-quote-request", payload);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Quote request submitted",
        description: "A sales representative will contact you shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: TechnicianQuoteForm) => {
    submitMutation.mutate(data);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  if (!user) {
    setLocation("/client-portal/login");
    return null;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">{user.organizationName}</h1>
                <p className="text-sm text-muted-foreground">Technician Portal</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">Quote Request Submitted!</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your quote request has been sent to the sales team. They will review the
                doors you've added and contact you with pricing and scheduling options.
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setLocation("/client-portal")}>
                  Back to Dashboard
                </Button>
                <Button onClick={() => { setSubmitted(false); form.reset(); }}>
                  Submit Another Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/client-portal")}
            aria-label="Back to portal"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Wrench className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Request Quote for Doors</h1>
              <p className="text-sm text-muted-foreground">Add doors for pricing and scheduling</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Site Information</CardTitle>
                <CardDescription>
                  Provide details about the location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Building A Door Repairs"
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="buildingName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} data-testid="input-building-name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="buildingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} data-testid="input-building-address" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} data-testid="input-contact-name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} data-testid="input-contact-phone" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DoorOpen className="h-5 w-5" />
                      Doors for Quote
                    </CardTitle>
                    <CardDescription>
                      Add each door that needs service or replacement
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{doors.length} door{doors.length !== 1 ? "s" : ""}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {doors.map((_, index) => (
                  <div key={index} className="relative">
                    {index > 0 && <Separator className="mb-6" />}
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        Door {index + 1}
                      </h4>
                      {doors.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDoor(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-door-${index}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`doors.${index}.location`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Room 101, Main Lobby"
                                {...field}
                                data-testid={`input-door-location-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`doors.${index}.doorType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Door Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-door-type-${index}`}>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {doorTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name={`doors.${index}.condition`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-door-condition-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {conditionOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`doors.${index}.urgency`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Urgency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-door-urgency-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {urgencyOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`doors.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Issue Description *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the problem or work needed..."
                              className="min-h-[80px]"
                              {...field}
                              data-testid={`textarea-door-description-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`doors.${index}.notes`}
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Any other details (access requirements, etc.)"
                              {...field}
                              data-testid={`input-door-notes-${index}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addDoor}
                  className="w-full"
                  data-testid="button-add-door"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Door
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="overallNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overall Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any general comments about the site or request..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-overall-notes"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/client-portal")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                data-testid="button-submit-quote"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Quote Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
