import { useParams, useLocation, Link, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectCostSchema, type InsertProjectCost, type ProjectCost } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  Calculator, 
  Truck, 
  Weight,
  Loader2,
  Save,
  X,
  FileText,
  Receipt,
  Wrench,
  Zap,
  Users,
  MapPin,
  PieChart,
  BarChart,
  Percent,
  Boxes,
  Flame,
  Trash,
  FileCheck,
  Globe
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/error-state";

export default function Costs() {
  // Support both standalone (/costs) and project-specific (/projects/:projectId/costs) routes
  const { projectId } = useParams<{ projectId: string }>();
  const [standaloneMatch] = useRoute("/costs");
  const isStandaloneMode = standaloneMatch && !projectId;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: project, isLoading: isLoadingProject, isError: isProjectError, error: projectError, refetch: refetchProject } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: costs, isLoading: isLoadingCosts, isError: isCostsError, error: costsError, refetch: refetchCosts } = useQuery<ProjectCost>({
    queryKey: [`/api/projects/${projectId}/costs`],
    enabled: !!projectId,
  });

  const form = useForm<InsertProjectCost>({
    resolver: zodResolver(insertProjectCostSchema),
    defaultValues: {
      projectId,
      baselineTravelOverhead: 0,
      baselineProcurementOverhead: 0,
      baselineReviewLaborOverhead: 0,
      pmHours: 0,
      pmHourlyRate: 0,
      engineeringHours: 0,
      engineeringHourlyRate: 0,
      surveyHours: 0,
      surveyHourlyRate: 0,
      overheadCost: 0,
      travelTime: 0,
      travelRate: 0,
      initialVisitCost: 0,
      expeditedCost: 0,
      subcontractorCost: 0,
      marginPercent: 0,
      discountPercent: 0,
      surchargePercent: 0,
      materialFuelCharge: 0,
      handlingFee: 0,
      programmingTestingLabelingFee: 0,
      firePreventionInspectionFee: 0,
      fireRelabelingInspectionFee: 0,
      disposalFee: 0,
      consumableAllowance: 0,
      consumableNotes: "",
      notes: "",
      // International Trade & Landed Cost defaults
      defaultFuelSurchargePercent: 0,
      defaultAccessorialsCost: 0,
      defaultInsuranceCost: 0,
      defaultCustomsBrokerageCost: 0,
      defaultIncoterm: "",
      totalTariffsCost: 0,
      totalAntiDumpingCost: 0,
      totalOtherDutiesCost: 0,
      totalLandedCost: 0,
    },
  });

  // Update form when costs data loads
  useEffect(() => {
    if (costs && !form.formState.isDirty) {
      form.reset(costs);
    }
  }, [costs, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertProjectCost) => {
      return await apiRequest("PATCH", `/api/projects/${projectId}/costs`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/costs`] });
      toast({
        title: "Success",
        description: "Project costs saved successfully. The updated costs are now reflected in project estimates.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save costs",
        description: error.message || "Unable to save cost data. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const [calculationResults, setCalculationResults] = useState<any>(null);

  const calculateCostsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/calculate-costs`, {});
    },
    onSuccess: (data: any) => {
      setCalculationResults(data.calculations);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/costs`] });
      toast({
        title: "Success",
        description: "Cost calculations completed successfully. All totals, margins, and fees have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to calculate costs",
        description: error.message || "Unable to perform cost calculations. Please check your input values and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProjectCost) => {
    saveMutation.mutate({ ...data, projectId });
  };

  // Calculate totals for summary
  const calculateTotals = () => {
    const values = form.getValues();
    
    // Cost of Business - Baseline costs (applied first)
    const baselineCosts = 
      (values.baselineTravelOverhead || 0) +
      (values.baselineProcurementOverhead || 0) +
      (values.baselineReviewLaborOverhead || 0);
    
    const laborCosts = 
      (values.pmHours || 0) * (values.pmHourlyRate || 0) +
      (values.engineeringHours || 0) * (values.engineeringHourlyRate || 0) +
      (values.surveyHours || 0) * (values.surveyHourlyRate || 0);
    
    const travelCosts = (values.travelTime || 0) * (values.travelRate || 0);
    
    const fixedCosts = 
      (values.overheadCost || 0) +
      (values.initialVisitCost || 0) +
      (values.expeditedCost || 0) +
      (values.subcontractorCost || 0);
    
    const fees = 
      (values.materialFuelCharge || 0) +
      (values.handlingFee || 0) +
      (values.programmingTestingLabelingFee || 0) +
      (values.firePreventionInspectionFee || 0) +
      (values.fireRelabelingInspectionFee || 0) +
      (values.disposalFee || 0) +
      (values.consumableAllowance || 0);
    
    // Calculation order: Baseline → Material/Labor → Fees → Freight (calculated later)
    const subtotal = baselineCosts + laborCosts + travelCosts + fixedCosts + fees;
    const margin = subtotal * ((values.marginPercent || 0) / 100);
    const surcharge = subtotal * ((values.surchargePercent || 0) / 100);
    const discount = subtotal * ((values.discountPercent || 0) / 100);
    
    const total = subtotal + margin + surcharge - discount;
    
    return {
      baselineCosts,
      laborCosts,
      travelCosts,
      fixedCosts,
      fees,
      subtotal,
      margin,
      surcharge,
      discount,
      total,
    };
  };

  const totals = calculateTotals();

  // Show standalone mode message if no project selected
  if (isStandaloneMode) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <Card data-testid="card-project-selector">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Tracking
              </CardTitle>
              <CardDescription>
                Track and manage project costs, labor, materials, and margins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Cost tracking is project-specific. Please select a project to view or manage its costs.
              </p>
              <Button asChild data-testid="button-go-to-projects">
                <Link href="/projects">
                  View Projects
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state
  if (isProjectError) {
    return (
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <ErrorState
            title="Failed to load project"
            message={projectError instanceof Error ? projectError.message : "Unable to fetch project details. Please check your connection and try again."}
            error={projectError as Error}
            onRetry={refetchProject}
            testId="error-project-costs"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isCostsError) {
    return (
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <ErrorState
            title="Failed to load project costs"
            message={costsError instanceof Error ? costsError.message : "Unable to fetch cost data. Please check your connection and try again."}
            error={costsError as Error}
            onRetry={refetchCosts}
            testId="error-costs-data"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoadingProject || isLoadingCosts) {
    return (
      <div className="h-full overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              onClick={() => navigate(`/projects/${projectId}`)}
              aria-label="Back to project"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">Project Costs</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{project?.name}</p>
            </div>
          </div>
          <Button
            onClick={() => calculateCostsMutation.mutate()}
            disabled={calculateCostsMutation.isPending}
            data-testid="button-calculate-costs"
            size="sm"
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            {calculateCostsMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                Calculate Costs
              </>
            )}
          </Button>
        </div>

        {/* Cost Summary Card */}
        <Card>
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PieChart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Cost Summary
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Real-time calculation of project costs</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Cost of Business
                </p>
                <p className="text-lg sm:text-xl font-semibold">${totals.baselineCosts.toFixed(2)}</p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Labor Costs
                </p>
                <p className="text-lg sm:text-xl font-semibold">${totals.laborCosts.toFixed(2)}</p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Travel Costs
                </p>
                <p className="text-lg sm:text-xl font-semibold">${totals.travelCosts.toFixed(2)}</p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Fixed Costs
                </p>
                <p className="text-lg sm:text-xl font-semibold">${totals.fixedCosts.toFixed(2)}</p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <FileCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Fees & Charges
                </p>
                <p className="text-lg sm:text-xl font-semibold">${totals.fees.toFixed(2)}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <BarChart className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Subtotal
                </p>
                <p className="text-base sm:text-lg font-medium">${totals.subtotal.toFixed(2)}</p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Margin ({form.watch("marginPercent") || 0}%)
                </p>
                <p className="text-base sm:text-lg font-medium text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  ${totals.margin.toFixed(2)}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Surcharge ({form.watch("surchargePercent") || 0}%)
                </p>
                <p className="text-base sm:text-lg font-medium text-orange-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  ${totals.surcharge.toFixed(2)}
                </p>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Discount ({form.watch("discountPercent") || 0}%)
                </p>
                <p className="text-base sm:text-lg font-medium text-blue-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  ${totals.discount.toFixed(2)}
                </p>
              </div>
            </div>
            <Separator />
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                Total Project Cost
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">${totals.total.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Calculated Costs Card */}
        {(calculationResults || costs?.estimatedInstallationHours) && (
          <Card>
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calculator className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Calculated Estimates
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Auto-calculated values based on project openings</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    Installation Hours
                  </p>
                  <p className="text-lg sm:text-xl font-semibold" data-testid="text-installation-hours">
                    {(calculationResults?.totalInstallationHours || costs?.estimatedInstallationHours || 0).toFixed(1)} hrs
                  </p>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                    <Weight className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    Total Weight
                  </p>
                  <p className="text-lg sm:text-xl font-semibold" data-testid="text-total-weight">
                    {(calculationResults?.totalProjectWeight || costs?.totalProjectWeight || 0).toFixed(0)} lbs
                  </p>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                    <Wrench className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    Hardware Costs
                  </p>
                  <p className="text-lg sm:text-xl font-semibold" data-testid="text-hardware-costs">
                    ${(calculationResults?.hardwareCosts?.total || (costs?.hardwareMaterialCost || 0) + (costs?.hardwareWasteCost || 0) || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              
              {calculationResults?.hardwareCosts && (
                <div className="text-xs text-muted-foreground space-y-1 p-2 sm:p-3 bg-muted rounded-md">
                  <p className="flex items-center gap-1">
                    <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    Hardware Material: ${calculationResults.hardwareCosts.subtotal.toFixed(2)}
                  </p>
                  <p className="flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    Waste (8%): ${calculationResults.hardwareCosts.waste.toFixed(2)}
                  </p>
                </div>
              )}
              
              {(calculationResults?.freight || costs?.freightBaseCost) && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs sm:text-sm font-medium mb-2 flex items-center gap-1">
                      <Truck className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      Freight Costs
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-muted-foreground">Base</p>
                        <p className="font-medium" data-testid="text-freight-base">
                          ${(calculationResults?.freight?.baseCost || costs?.freightBaseCost || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                          Fuel
                        </p>
                        <p className="font-medium" data-testid="text-freight-fuel">
                          ${(calculationResults?.freight?.fuelSurcharge || costs?.freightFuelSurcharge || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                          Expedited
                        </p>
                        <p className="font-medium" data-testid="text-freight-expedited">
                          ${(calculationResults?.freight?.expeditedFee || costs?.freightExpedited || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-muted-foreground">Lift Gate</p>
                        <p className="font-medium" data-testid="text-freight-liftgate">
                          ${(calculationResults?.freight?.liftGateFee || costs?.freightLiftGate || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs sm:text-sm font-semibold flex items-center gap-1">
                        <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        Total Freight: ${(calculationResults?.freight?.total || (costs?.freightBaseCost || 0) + (costs?.freightFuelSurcharge || 0) + (costs?.freightExpedited || 0) + (costs?.freightLiftGate || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {(calculationResults?.tax || costs?.taxAmount) && (
                <>
                  <Separator />
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <Percent className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                        Tax Amount
                      </p>
                      <p className="text-base sm:text-lg font-semibold" data-testid="text-tax-amount">
                        ${(calculationResults?.tax?.taxAmount || costs?.taxAmount || 0).toFixed(2)}
                      </p>
                    </div>
                    {costs?.taxRate && (
                      <Badge variant="secondary" className="shrink-0 text-xs" data-testid="badge-tax-rate">
                        <Percent className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
                        {costs.taxRate}% tax rate
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Cost of Business - Baseline Costs */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Cost of Business
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Baseline overhead costs applied to every job (calculated first, before material and labor)</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="baselineTravelOverhead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Travel Overhead ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-baseline-travel" />
                        </FormControl>
                        <FormDescription>Fixed travel cost per job</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="baselineProcurementOverhead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Procurement Overhead ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-baseline-procurement" />
                        </FormControl>
                        <FormDescription>Fixed procurement cost per job</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="baselineReviewLaborOverhead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Review Labor Overhead ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-baseline-review" />
                        </FormControl>
                        <FormDescription>Fixed review labor cost per job</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Labor Hours & Rates */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Labor Hours & Rates
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Track project management, engineering, and survey time</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="pmHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PM Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-pm-hours" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pmHourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PM Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-pm-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="engineeringHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engineering Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-engineering-hours" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="engineeringHourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engineering Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-engineering-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="surveyHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Survey Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-survey-hours" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surveyHourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Survey Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-survey-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Travel & Fixed Costs */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Fixed Costs & Travel
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Overhead, travel, initial visits, and subcontractor costs</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="travelTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Time (hours)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-travel-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="travelRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Travel Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-travel-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="overheadCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overhead Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-overhead" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="initialVisitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Visit Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-initial-visit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="expeditedCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expedited Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-expedited" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subcontractorCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcontractor Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-subcontractor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Margin, Discount & Surcharge */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Percent className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Margin, Discount & Surcharge
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Profit margins and adjustments</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="marginPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          Margin (%)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-margin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surchargePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-orange-600" />
                          Surcharge (%)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-surcharge" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-blue-600" />
                          Discount (%)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-discount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fees & Charges */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Fees & Charges
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Additional fees and specialized charges</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="materialFuelCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Material Fuel Charge ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-fuel-charge" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="handlingFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Handling Fee ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-handling" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="programmingTestingLabelingFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          Programming/Testing/Labeling ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-programming" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="firePreventionInspectionFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          Fire Prevention Inspection ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-fire-prevention" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="fireRelabelingInspectionFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          Fire Relabeling Inspection ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-fire-relabeling" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="disposalFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Trash className="h-3 w-3" />
                          Disposal Fee ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-disposal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* International Trade & Landed Cost */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  International Trade & Landed Cost
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Import duties, tariffs, and landed cost calculations</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="defaultFuelSurchargePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Default Fuel Surcharge (%)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-fuel-surcharge-percent" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultAccessorialsCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          Default Accessorials Cost ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-accessorials" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="defaultInsuranceCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Insurance Cost ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-insurance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultCustomsBrokerageCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Customs Brokerage ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-customs-brokerage" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="defaultIncoterm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Incoterm</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-incoterm">
                              <SelectValue placeholder="Select Incoterm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                            <SelectItem value="FCA">FCA - Free Carrier</SelectItem>
                            <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                            <SelectItem value="CFR">CFR - Cost and Freight</SelectItem>
                            <SelectItem value="CIF">CIF - Cost, Insurance and Freight</SelectItem>
                            <SelectItem value="DAP">DAP - Delivered at Place</SelectItem>
                            <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>International Commercial Terms for shipping</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center gap-1">
                    <DollarSign className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                    Import Duties & Tariffs
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="totalTariffsCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Tariffs ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-tariffs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totalAntiDumpingCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anti-Dumping Duties ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-anti-dumping" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totalOtherDutiesCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Duties ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-other-duties" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {(form.watch("totalLandedCost") ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center p-3 sm:p-4 bg-muted rounded-md">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                          Total Landed Cost
                        </p>
                        <p className="text-xl sm:text-2xl font-bold" data-testid="text-landed-cost">
                          ${(form.watch("totalLandedCost") ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Consumables */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Boxes className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Consumable Allowance
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Shims, sealants, lubricants, and other consumables</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="consumableAllowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumable Allowance ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} data-testid="input-consumable" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consumableNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumable Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Details on shims, sealants, lubricants..." data-testid="input-consumable-notes" />
                      </FormControl>
                      <FormDescription>Specify types and quantities of consumables</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* General Notes */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  General Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Additional cost notes..." rows={4} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => navigate(`/projects/${projectId}`)}
                data-testid="button-cancel"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs sm:text-sm" disabled={saveMutation.isPending} data-testid="button-save">
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Save Costs
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
