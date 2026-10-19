import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { trackProjectEvent } from "@/lib/project-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2 } from "lucide-react";
import { insertProjectSchema, type InsertProject, type Customer, type CustomerLocation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { toastSuccess, toastError } from "@/lib/toast-utils";
import { ErrorState } from "@/components/error-state";
import { useMilestoneCelebrations } from "@/hooks/use-milestone-celebrations";

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { celebrate } = useMilestoneCelebrations();

  const { data: customers, isLoading: customersLoading, isError: customersError, error: customersErrorObj, refetch: refetchCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      customerId: "none",
      locationId: "none",
      name: "",
      location: "",
      buildingType: "Office Building",
      quoteType: "none",
      applicableStandards: [],
      status: "active",
      notes: "",
    },
  });

  // Watch the selected customer to fetch their locations
  const selectedCustomerId = form.watch("customerId");

  const { data: customerLocations, isLoading: locationsLoading, isError: locationsError, error: locationsErrorObj, refetch: refetchLocations } = useQuery<CustomerLocation[]>({
    queryKey: ["/api/customers", selectedCustomerId, "locations"],
    enabled: !!selectedCustomerId && selectedCustomerId !== "none",
  });

  const createProject = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      trackProjectEvent("project_created", { location: "new_project" });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toastSuccess({
        title: "Project created successfully",
        description: "You can now start adding door openings and measurements.",
      });
      celebrate("first-project");
      setLocation(`/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toastError({
        title: "Failed to create project",
        description: error.message || "Unable to save project. Please verify all required fields and try again.",
      });
    },
  });

  const onSubmit = (data: InsertProject) => {
    const projectData = {
      ...data,
      customerId: data.customerId && data.customerId !== "none" ? data.customerId : null,
      locationId: data.locationId && data.locationId !== "none" ? data.locationId : null,
      quoteType: data.quoteType && data.quoteType !== "none" ? data.quoteType : null,
    };
    createProject.mutate(projectData);
  };

  return (
    <div className="h-full">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/projects")}
            data-testid="button-back"
            aria-label="Go back to projects"
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">New Project</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Create a new survey project for door and hardware estimates
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Memorial Hospital Renovation"
                          data-testid="input-project-name"
                          className="min-h-[48px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 123 Main St, Springfield"
                          data-testid="input-location"
                          className="min-h-[48px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer (Optional)</FormLabel>
                      {customersError ? (
                        <>
                          <div className="p-4 border rounded-md bg-destructive/10">
                            <ErrorState
                              title="Customer list unavailable"
                              message={customersErrorObj instanceof Error ? customersErrorObj.message : "Unable to load customers. You can still create this project - customer linking can be added later."}
                              error={customersErrorObj as Error}
                              onRetry={refetchCustomers}
                              testId="error-customers"
                            />
                          </div>
                          <FormDescription>
                            Customer selection is temporarily unavailable. Your project will be created without a linked customer.
                          </FormDescription>
                        </>
                      ) : (
                        <>
                          <Select 
                            onValueChange={(value) => {
                              // Set to empty string if "none", otherwise use the value
                              field.onChange(value === "none" ? "" : value);
                              // Reset location when customer changes
                              form.setValue("locationId", "");
                            }} 
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-customer" className="min-h-[48px]">
                                <SelectValue placeholder="Select a customer (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent position="popper" className="z-[100]">
                              {customersLoading ? (
                                <div className="flex items-center justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                                </div>
                              ) : (
                                <>
                                  <SelectItem value="none">No customer</SelectItem>
                                  {customers?.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Link this project to a customer to track preferences
                          </FormDescription>
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCustomerId && selectedCustomerId !== "none" && (
                  <>
                    {locationsError ? (
                      <div className="p-4 border rounded-md">
                        <ErrorState
                          title="Failed to load customer locations"
                          message={locationsErrorObj instanceof Error ? locationsErrorObj.message : "Unable to fetch location data."}
                          error={locationsErrorObj as Error}
                          onRetry={refetchLocations}
                          testId="error-locations"
                        />
                      </div>
                    ) : locationsLoading ? (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>Loading customer locations...</span>
                      </div>
                    ) : customerLocations && customerLocations.length > 0 ? (
                      <FormField
                        key={`location-field-${selectedCustomerId}`}
                        control={form.control}
                        name="locationId"
                        render={({ field }) => (
                          <FormItem className="relative z-0">
                            <FormLabel>Customer Location (Optional)</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                // Set to empty string if "none", otherwise use the value
                                field.onChange(value === "none" ? "" : value);
                              }}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-location" className="relative z-10 min-h-[48px]">
                                  <SelectValue placeholder="Select a location (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent position="popper" className="z-[100]">
                                <SelectItem value="none">No location</SelectItem>
                                {customerLocations.map((location) => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.locationName} - {location.city}, {location.state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Link this project to a specific customer location
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : null}
                  </>
                )}

                <FormField
                  control={form.control}
                  name="buildingType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-building-type" className="min-h-[48px]">
                            <SelectValue placeholder="Select building type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper" className="z-[100]">
                          <SelectItem value="Hospital">Hospital</SelectItem>
                          <SelectItem value="Office Building">Office Building</SelectItem>
                          <SelectItem value="School">School</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                          <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                          <SelectItem value="Industrial">Industrial</SelectItem>
                          <SelectItem value="Government">Government</SelectItem>
                          <SelectItem value="Hotel">Hotel</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quoteType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-quote-type" className="min-h-[48px]">
                            <SelectValue placeholder="Select quote type (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper" className="z-[100]">
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="aftermarket">Aftermarket / Pre-Existing</SelectItem>
                          <SelectItem value="tenant_improvement">Tenant Improvement</SelectItem>
                          <SelectItem value="new_construction">New Construction</SelectItem>
                          <SelectItem value="hardware_only">Hardware Only</SelectItem>
                          <SelectItem value="automation_only">Automation Only</SelectItem>
                          <SelectItem value="repair">Repair</SelectItem>
                          <SelectItem value="rough_order_magnitude">Rough Order of Magnitude</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Categorize this quote for reporting and tracking purposes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicableStandards"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Applicable Building Standards</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Select which codes and standards apply to this project
                        </p>
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        {[
                          { id: "ADA", label: "ADA - Accessibility Standards", description: "Americans with Disabilities Act requirements" },
                          { id: "IBC", label: "IBC - International Building Code", description: "General building code requirements" },
                          { id: "NFPA", label: "NFPA - Fire Protection Standards", description: "Fire door and life safety requirements" },
                          { id: "ANSI/SDI", label: "ANSI/SDI - Steel Door & Frame", description: "Steel door and frame manufacturing standards" },
                          { id: "ANSI/BHMA", label: "ANSI/BHMA - Hardware Standards", description: "Door hardware performance standards" },
                          { id: "FGI", label: "FGI - Healthcare Facilities", description: "Hospital and healthcare-specific guidelines" },
                          { id: "NEC", label: "NEC - Electrical Code", description: "Electrical requirements for automation" },
                        ].map((standard) => (
                          <FormField
                            key={standard.id}
                            control={form.control}
                            name="applicableStandards"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={standard.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(standard.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), standard.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== standard.id
                                              )
                                            )
                                      }}
                                      data-testid={`checkbox-standard-${standard.id.toLowerCase().replace('/', '-')}`}
                                      className="shrink-0"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none min-w-0">
                                    <FormLabel className="font-normal cursor-pointer text-sm sm:text-base">
                                      {standard.label}
                                    </FormLabel>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      {standard.description}
                                    </p>
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional project information..."
                          className="min-h-24 text-base"
                          data-testid="input-notes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/projects")}
                    data-testid="button-cancel"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProject.isPending}
                    data-testid="button-submit"
                    className="w-full sm:w-auto"
                  >
                    {createProject.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
