import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  DollarSign,
  FileText,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

// Service History Type for display
export interface ServiceHistoryRecord {
  id: string;
  serviceType: string;
  servicePriority: string;
  serviceStatus: string;
  scheduledDate?: Date | null;
  serviceDate?: Date | null;
  completedDate?: Date | null;
  performedBy?: string | null;
  serviceCompany?: string | null;
  technicianName?: string | null;
  workDescription: string;
  issuesFound?: string[] | null;
  laborHours?: number | null;
  laborCost?: number | null;
  partsCost?: number | null;
  totalCost?: number | null;
  warrantyWork: string;
  serviceNotes?: string | null;
  workOrderNumber?: string | null;
  invoiceNumber?: string | null;
  followUpRequired: string;
  followUpDate?: Date | null;
  followUpNotes?: string | null;
  nextServiceDue?: Date | null;
  complianceVerified: string;
  complianceIssues?: string[] | null;
  qualityRating?: string | null;
  createdAt: Date;
}

interface ServiceHistoryPanelProps {
  openingId?: string;
  serviceHistory?: ServiceHistoryRecord[];
  onAddService?: (service: ServiceHistoryRecord) => void;
}

const serviceFormSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  servicePriority: z.string().default("normal"),
  serviceStatus: z.string().default("scheduled"),
  scheduledDate: z.date().optional(),
  serviceDate: z.date().optional(),
  completedDate: z.date().optional(),
  serviceCompany: z.string().optional(),
  technicianName: z.string().optional(),
  technicianContact: z.string().optional(),
  workDescription: z.string().min(1, "Work description is required"),
  laborHours: z.coerce.number().optional(),
  laborCost: z.coerce.number().optional(),
  partsCost: z.coerce.number().optional(),
  totalCost: z.coerce.number().optional(),
  warrantyWork: z.string().default("no"),
  serviceNotes: z.string().optional(),
  workOrderNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  followUpRequired: z.string().default("no"),
  followUpDate: z.date().optional(),
  followUpNotes: z.string().optional(),
  nextServiceDue: z.date().optional(),
  complianceVerified: z.string().default("no"),
  qualityRating: z.string().optional()
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const SERVICE_TYPES = [
  { value: "inspection", label: "Inspection" },
  { value: "preventive-maintenance", label: "Preventive Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "replacement", label: "Component Replacement" },
  { value: "adjustment", label: "Hardware Adjustment" },
  { value: "emergency", label: "Emergency Repair" },
  { value: "warranty-work", label: "Warranty Service" }
];

const SERVICE_STATUS_CONFIG = {
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", icon: Clock },
  "in-progress": { label: "In Progress", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", icon: Wrench },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300", icon: AlertTriangle }
};

const PRIORITY_CONFIG = {
  routine: { label: "Routine", color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  urgent: { label: "Urgent", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  emergency: { label: "Emergency", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" }
};

export function ServiceHistoryPanel({ openingId, serviceHistory: providedHistory = [], onAddService }: ServiceHistoryPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch opening details to get projectId
  const { data: opening } = useQuery({
    queryKey: ['/api/openings', openingId],
    enabled: !!openingId && !onAddService,
  });

  // Fetch service history from API if openingId is provided
  const { data: fetchedHistory = [] } = useQuery<ServiceHistoryRecord[]>({
    queryKey: ['/api/openings', openingId, 'service-history'],
    enabled: !!openingId && !onAddService, // Only fetch if openingId exists and not using callback mode
  });

  // Use fetched history if available, otherwise use provided history
  const serviceHistory = openingId && !onAddService ? fetchedHistory : providedHistory;

  // Create service history mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      if (!openingId) throw new Error("Opening ID is required");
      if (!opening?.projectId) throw new Error("Project ID is required");
      
      return await apiRequest(
        "POST",
        `/api/openings/${openingId}/service-history`,
        {
          ...data,
          projectId: opening.projectId,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/openings', openingId, 'service-history'] });
      toast({
        title: "Service record added",
        description: "The service record has been successfully created.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service record",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceType: "",
      servicePriority: "normal",
      serviceStatus: "scheduled",
      warrantyWork: "no",
      followUpRequired: "no",
      complianceVerified: "no"
    }
  });

  const handleSubmit = (values: ServiceFormValues) => {
    // Use callback if provided (for form integration)
    if (onAddService) {
      const newService: ServiceHistoryRecord = {
        id: crypto.randomUUID(),
        ...values,
        issuesFound: [],
        complianceIssues: [],
        createdAt: new Date()
      };
      onAddService(newService);
      setIsAddDialogOpen(false);
      form.reset();
    } else if (openingId) {
      // Use API mutation
      createServiceMutation.mutate(values);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Service History</h3>
          <p className="text-sm text-muted-foreground">
            Track maintenance, repairs, and inspections for this opening
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-service">
              <Plus className="h-4 w-4 mr-2" />
              Add Service Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Add Service Record</DialogTitle>
              <DialogDescription>
                Record a service event for this door opening
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Basic Information</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SERVICE_TYPES.map((type) => (
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

                      <FormField
                        control={form.control}
                        name="servicePriority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service-priority">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
                                  <SelectItem key={value} value={value}>
                                    {config.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="workDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the work performed or to be performed..."
                              className="min-h-[80px]"
                              {...field}
                              data-testid="textarea-work-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Service Provider Info */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Service Provider</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Company name" data-testid="input-service-company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="technicianName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Technician Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Technician name" data-testid="input-technician-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Cost Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Cost Information</h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="laborHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labor Hours</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.5" {...field} placeholder="0.0" data-testid="input-labor-hours" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="laborCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labor Cost ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-labor-cost" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="partsCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parts Cost ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} placeholder="0.00" data-testid="input-parts-cost" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="warrantyWork"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Work?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="warranty-no" data-testid="radio-warranty-no" />
                                <Label htmlFor="warranty-no">No</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="warranty-yes" data-testid="radio-warranty-yes" />
                                <Label htmlFor="warranty-yes">Yes</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Additional Notes */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="serviceNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Additional notes, observations, or details..."
                              className="min-h-[80px]"
                              {...field}
                              data-testid="textarea-service-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="button-cancel-service"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-save-service">
                      Save Service Record
                    </Button>
                  </div>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Service History List */}
      {serviceHistory.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Service Records</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by adding the first service record for this opening
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {serviceHistory.map((record) => {
            const statusConfig = SERVICE_STATUS_CONFIG[record.serviceStatus as keyof typeof SERVICE_STATUS_CONFIG];
            const priorityConfig = PRIORITY_CONFIG[record.servicePriority as keyof typeof PRIORITY_CONFIG];
            const StatusIcon = statusConfig?.icon || Clock;

            return (
              <Card key={record.id} className="hover-elevate" data-testid={`card-service-${record.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{record.serviceType}</CardTitle>
                        <Badge className={priorityConfig.color} variant="secondary">
                          {priorityConfig.label}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig?.label || record.serviceStatus}
                        {record.serviceDate && (
                          <>
                            <span className="mx-1">•</span>
                            {format(new Date(record.serviceDate), "MMM d, yyyy")}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    {record.totalCost && (
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-4 w-4" />
                        {record.totalCost.toFixed(2)}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{record.workDescription}</p>
                    
                    {(record.serviceCompany || record.technicianName) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {[record.serviceCompany, record.technicianName].filter(Boolean).join(" - ")}
                      </div>
                    )}

                    {record.warrantyWork === "yes" && (
                      <Badge variant="outline" className="text-xs">
                        Warranty Work
                      </Badge>
                    )}

                    {record.workOrderNumber && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        WO: {record.workOrderNumber}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
