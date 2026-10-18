import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  DoorOpen,
  Camera,
  Scan,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Image,
  Info,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest, ServiceRequestItem } from "@shared/schemas/portal.schema";

const STEPS = [
  { id: 1, title: "Request Info", icon: Building2, description: "Basic request details" },
  { id: 2, title: "Location", icon: MapPin, description: "Building and access info" },
  { id: 3, title: "Doors", icon: DoorOpen, description: "Add door details" },
  { id: 4, title: "Photos", icon: Camera, description: "Upload photos" },
  { id: 5, title: "Scan", icon: Scan, description: "LiDAR/AR scan (optional)" },
  { id: 6, title: "Review", icon: Send, description: "Submit request" },
];

const requestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  requestType: z.enum(["quote", "repair", "inspection", "emergency", "other"]),
  workOrderNumber: z.string().optional(),
  poNumber: z.string().optional(),
});

const locationSchema = z.object({
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  buildingName: z.string().optional(),
  floorLevel: z.string().optional(),
  accessNotes: z.string().optional(),
});

const doorItemSchema = z.object({
  doorLabel: z.string().optional(),
  locationHint: z.string().optional(),
  doorType: z.string().optional(),
  doorMaterial: z.string().optional(),
  approximateSize: z.string().optional(),
  issueDescription: z.string().optional(),
  urgency: z.enum(["low", "normal", "high", "urgent"]),
});

type RequestFormData = z.infer<typeof requestSchema>;
type LocationFormData = z.infer<typeof locationSchema>;
type DoorItemFormData = z.infer<typeof doorItemSchema>;

interface PortalUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
}

export default function NewServiceRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
  const [doorItems, setDoorItems] = useState<ServiceRequestItem[]>([]);
  const [addingDoor, setAddingDoor] = useState(false);

  const { data: user, isLoading: userLoading, error: userError, isError: userIsError } = useQuery<PortalUser>({
    queryKey: ["/api/portal/auth/me"],
  });

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      requestType: "quote",
      workOrderNumber: "",
      poNumber: "",
    },
  });

  const locationForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      locationName: "",
      locationAddress: "",
      buildingName: "",
      floorLevel: "",
      accessNotes: "",
    },
  });

  const doorForm = useForm<DoorItemFormData>({
    resolver: zodResolver(doorItemSchema),
    defaultValues: {
      doorLabel: "",
      locationHint: "",
      doorType: "",
      doorMaterial: "",
      approximateSize: "",
      issueDescription: "",
      urgency: "normal",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData & LocationFormData) => {
      const response = await apiRequest("POST", "/api/portal/requests", data);
      return response.json() as Promise<ServiceRequest>;
    },
    onSuccess: (data) => {
      setServiceRequest(data);
      toast({ title: "Request created", description: "Now add door details." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const addDoorMutation = useMutation({
    mutationFn: async (data: DoorItemFormData) => {
      if (!serviceRequest) throw new Error("No service request");
      const response = await apiRequest("POST", `/api/portal/requests/${serviceRequest.id}/items`, data);
      return response.json() as Promise<ServiceRequestItem>;
    },
    onSuccess: (data) => {
      setDoorItems([...doorItems, data]);
      doorForm.reset();
      setAddingDoor(false);
      toast({ title: "Door added" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const submitRequestMutation = useMutation({
    mutationFn: async () => {
      if (!serviceRequest) throw new Error("No service request");
      const response = await apiRequest("POST", `/api/portal/requests/${serviceRequest.id}/submit`);
      return response.json() as Promise<ServiceRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/requests"] });
      toast({ title: "Request submitted!", description: "Our team will review your request." });
      setLocation("/client-portal");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-12 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (userIsError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  if (userError || !user) {
    setLocation("/client-portal/login");
    return null;
  }

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await requestForm.trigger();
      if (!isValid) return;
    }
    if (currentStep === 2) {
      const isValid = await locationForm.trigger();
      if (!isValid) return;
      
      if (!serviceRequest) {
        const requestData = requestForm.getValues();
        const locationData = locationForm.getValues();
        await createRequestMutation.mutateAsync({ ...requestData, ...locationData });
      }
    }
    setCurrentStep(Math.min(currentStep + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep(Math.max(currentStep - 1, 1));
  };

  const handleAddDoor = async () => {
    const isValid = await doorForm.trigger();
    if (!isValid) return;
    await addDoorMutation.mutateAsync(doorForm.getValues());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/client-portal">
              <Button variant="ghost" size="icon" aria-label="Back to portal" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="font-semibold">New Service Request</h1>
              <p className="text-sm text-muted-foreground">
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
              </p>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-1" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <Card className="mt-6">
          {currentStep === 1 && (
            <Step1RequestInfo form={requestForm} />
          )}
          {currentStep === 2 && (
            <Step2Location form={locationForm} />
          )}
          {currentStep === 3 && (
            <Step3Doors
              doorItems={doorItems}
              addingDoor={addingDoor}
              setAddingDoor={setAddingDoor}
              doorForm={doorForm}
              onAddDoor={handleAddDoor}
              isPending={addDoorMutation.isPending}
            />
          )}
          {currentStep === 4 && (
            <Step4Photos serviceRequest={serviceRequest} doorItems={doorItems} />
          )}
          {currentStep === 5 && (
            <Step5Scan serviceRequest={serviceRequest} doorItems={doorItems} />
          )}
          {currentStep === 6 && (
            <Step6Review
              requestData={requestForm.getValues()}
              locationData={locationForm.getValues()}
              doorItems={doorItems}
              serviceRequest={serviceRequest}
              onSubmit={() => submitRequestMutation.mutate()}
              isPending={submitRequestMutation.isPending}
            />
          )}
        </Card>

        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep < STEPS.length && (
            <Button
              onClick={handleNext}
              disabled={createRequestMutation.isPending}
              className="flex-1"
              data-testid="button-next-step"
            >
              {createRequestMutation.isPending ? "Saving..." : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function StepIndicator({ steps, currentStep }: { steps: typeof STEPS; currentStep: number }) {
  return (
    <div className="flex justify-between gap-1">
      {steps.map((step) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        return (
          <div
            key={step.id}
            className={`flex-1 text-center ${isCurrent ? "opacity-100" : "opacity-50"}`}
          >
            <div
              className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium mb-1
                ${isCompleted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
                ${isCurrent ? "bg-primary text-primary-foreground" : ""}
                ${!isCompleted && !isCurrent ? "bg-gray-100 text-gray-500 dark:bg-gray-800" : ""}
              `}
            >
              {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.id}
            </div>
            <span className="text-[10px] sm:text-xs hidden sm:block">{step.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function Step1RequestInfo({ form }: { form: ReturnType<typeof useForm<RequestFormData>> }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Request Information</CardTitle>
        <CardDescription>
          Tell us about your service request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Replace door hardware in Building A"
                      data-testid="input-title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requestType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-request-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="quote">Quote Request</SelectItem>
                      <SelectItem value="repair">Repair/Service</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you need..."
                      className="min-h-[100px]"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workOrderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work Order #</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional"
                        data-testid="input-work-order"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO #</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional"
                        data-testid="input-po-number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </>
  );
}

function Step2Location({ form }: { form: ReturnType<typeof useForm<LocationFormData>> }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Location Details</CardTitle>
        <CardDescription>
          Where is the work needed?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="locationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Main Campus"
                      data-testid="input-location-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="locationAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Street address"
                      data-testid="input-location-address"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="buildingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Building A"
                        data-testid="input-building"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floorLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2nd Floor"
                        data-testid="input-floor"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accessNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special access instructions, hours, contact info..."
                      className="min-h-[80px]"
                      data-testid="input-access-notes"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include security requirements or contact information.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </>
  );
}

function Step3Doors({
  doorItems,
  addingDoor,
  setAddingDoor,
  doorForm,
  onAddDoor,
  isPending,
}: {
  doorItems: ServiceRequestItem[];
  addingDoor: boolean;
  setAddingDoor: (v: boolean) => void;
  doorForm: ReturnType<typeof useForm<DoorItemFormData>>;
  onAddDoor: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Door Details</CardTitle>
        <CardDescription>
          Add information about each door that needs service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {doorItems.length > 0 && (
          <div className="space-y-2">
            {doorItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {item.doorLabel || `Door ${index + 1}`}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {[item.doorType, item.approximateSize].filter(Boolean).join(" • ") || "No details"}
                  </p>
                </div>
                <Badge variant="outline">{item.urgency || "normal"}</Badge>
              </div>
            ))}
          </div>
        )}

        {addingDoor ? (
          <Form {...doorForm}>
            <form className="space-y-4 p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={doorForm.control}
                  name="doorLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Door Label</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Main Entrance"
                          data-testid="input-door-label"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={doorForm.control}
                  name="locationHint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Near elevator"
                          data-testid="input-door-location"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={doorForm.control}
                  name="doorType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Door Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-door-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single_swing">Single Swing</SelectItem>
                          <SelectItem value="double_swing">Double Swing</SelectItem>
                          <SelectItem value="sliding">Sliding</SelectItem>
                          <SelectItem value="revolving">Revolving</SelectItem>
                          <SelectItem value="overhead">Overhead</SelectItem>
                          <SelectItem value="fire_rated">Fire Rated</SelectItem>
                          <SelectItem value="access_control">Access Control</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={doorForm.control}
                  name="approximateSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-door-size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="3-0 x 7-0">3'0" x 7'0"</SelectItem>
                          <SelectItem value="3-6 x 7-0">3'6" x 7'0"</SelectItem>
                          <SelectItem value="4-0 x 7-0">4'0" x 7'0"</SelectItem>
                          <SelectItem value="6-0 x 7-0 (pair)">6'0" x 7'0" (pair)</SelectItem>
                          <SelectItem value="unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={doorForm.control}
                name="issueDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what's wrong or what you need..."
                        className="min-h-[80px]"
                        data-testid="input-door-issue"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    doorForm.reset();
                    setAddingDoor(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onAddDoor}
                  disabled={isPending}
                  className="flex-1"
                  data-testid="button-save-door"
                >
                  {isPending ? "Saving..." : "Add Door"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Button
            variant="outline"
            onClick={() => setAddingDoor(true)}
            className="w-full"
            data-testid="button-add-door"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Door
          </Button>
        )}

        {doorItems.length === 0 && !addingDoor && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Add at least one door to continue. You can add more later.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </>
  );
}

function Step4Photos({ serviceRequest, doorItems }: { serviceRequest: ServiceRequest | null; doorItems: ServiceRequestItem[] }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Upload Photos</CardTitle>
        <CardDescription>
          Photos help us provide accurate quotes. Take clear photos of each door.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Camera className="h-4 w-4" />
          <AlertDescription>
            Photo upload feature coming soon. For now, you can describe the doors in detail
            or email photos after submitting.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover-elevate">
            <Image className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Front view</span>
          </div>
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover-elevate">
            <Image className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Hardware</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Tip: Include photos of the door hardware, frame, and any visible issues.
        </p>
      </CardContent>
    </>
  );
}

function Step5Scan({ serviceRequest, doorItems }: { serviceRequest: ServiceRequest | null; doorItems: ServiceRequestItem[] }) {
  return (
    <>
      <CardHeader>
        <CardTitle>LiDAR / AR Scan</CardTitle>
        <CardDescription>
          Optional: Use your phone's camera to capture precise measurements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Scan className="h-4 w-4" />
          <AlertDescription>
            LiDAR scanning requires a compatible device (iPhone Pro or iPad Pro).
            This feature will be available in the mobile app.
          </AlertDescription>
        </Alert>

        <div className="aspect-video bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg flex flex-col items-center justify-center">
          <Scan className="h-12 w-12 text-blue-500 mb-3" />
          <p className="text-sm font-medium">3D Scanning</p>
          <p className="text-xs text-muted-foreground">Coming soon to mobile</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Skip this step if you don't have a LiDAR-capable device. Our team can
          schedule a site visit if needed.
        </p>
      </CardContent>
    </>
  );
}

function Step6Review({
  requestData,
  locationData,
  doorItems,
  serviceRequest,
  onSubmit,
  isPending,
}: {
  requestData: RequestFormData;
  locationData: LocationFormData;
  doorItems: ServiceRequestItem[];
  serviceRequest: ServiceRequest | null;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Review & Submit</CardTitle>
        <CardDescription>
          Review your request before submitting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Request Details</h4>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium">{requestData.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline">{requestData.requestType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Priority</span>
              <Badge variant="outline">{requestData.priority}</Badge>
            </div>
            {requestData.workOrderNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Order</span>
                <span>{requestData.workOrderNumber}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-2">Location</h4>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-1">
            {locationData.locationName && <p>{locationData.locationName}</p>}
            {locationData.locationAddress && <p className="text-muted-foreground">{locationData.locationAddress}</p>}
            {(locationData.buildingName || locationData.floorLevel) && (
              <p className="text-sm text-muted-foreground">
                {[locationData.buildingName, locationData.floorLevel].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm font-medium mb-2">Doors ({doorItems.length})</h4>
          {doorItems.length === 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No doors added. Please go back and add at least one door.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {doorItems.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 flex items-center gap-3"
                >
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.doorLabel || `Door ${index + 1}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {[item.doorType, item.approximateSize].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onSubmit}
          disabled={isPending || doorItems.length === 0}
          className="w-full"
          size="lg"
          data-testid="button-submit-request"
        >
          {isPending ? "Submitting..." : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </CardFooter>
    </>
  );
}
