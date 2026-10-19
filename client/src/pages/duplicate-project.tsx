import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import type { Project, Customer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";

const duplicateSchema = z.object({
  customerId: z.string().optional(),
  name: z.string().min(1, "Project name is required"),
});

export default function DuplicateProject() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: project, isLoading: projectLoading, isError: projectError } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });
  
  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<z.infer<typeof duplicateSchema>>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: {
      customerId: "",
      name: "",
    },
  });

  // Reset form with project data once it loads
  useEffect(() => {
    if (project) {
      form.reset({
        customerId: project.customerId || "",
        name: `${project.name} (Copy)`,
      });
    }
  }, [project, form]);

  const duplicateProject = useMutation({
    mutationFn: async (data: z.infer<typeof duplicateSchema>) => {
      const payload: any = { name: data.name };
      if (data.customerId) {
        payload.customerId = data.customerId;
      }
      const res = await apiRequest("POST", `/api/projects/${id}/duplicate`, payload);
      return await res.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Quote Duplicated",
        description: `Created new quote "${newProject.name}" successfully.`,
      });
      setLocation(`/projects/${newProject.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Duplication Failed",
        description: error.message || "Unable to duplicate quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof duplicateSchema>) => {
    duplicateProject.mutate(data);
  };

  if (projectLoading || customersLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <ErrorState
        title="Project Not Found"
        message="Unable to load the project for duplication."
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${id}`}>
            <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Go back to project">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Duplicate Quote</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create a copy of "{project.name}" with all door openings and hardware
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Configuration
            </CardTitle>
            <CardDescription>
              Choose a new name and optionally assign to a different customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Project Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter project name"
                          data-testid="input-project-name"
                        />
                      </FormControl>
                      <FormDescription>
                        Give the duplicated quote a unique name
                      </FormDescription>
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Keep same customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Keep same customer</SelectItem>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leave blank to keep the same customer, or select a different one
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={duplicateProject.isPending}
                    data-testid="button-submit-duplicate"
                  >
                    {duplicateProject.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Duplicating...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate Quote
                      </>
                    )}
                  </Button>
                  <Link href={`/projects/${id}`}>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What will be duplicated?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <p>All door openings with their measurements and specifications</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <p>All hardware items assigned to each opening</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <p>Project settings and applicable standards</p>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              </div>
              <p>Photos and vendor quotes will NOT be duplicated</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
