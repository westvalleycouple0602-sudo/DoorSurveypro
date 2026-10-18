import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format, addDays, startOfDay, isSameDay, parseISO, addMinutes } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Car,
  Building2,
  AlertCircle,
  CalendarCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AvailableSlot {
  start: string;
  end: string;
  travelMinutes: number;
}

interface AvailabilityResponse {
  location: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  travelMinutes: number;
  slotDuration: number;
  availableSlots: AvailableSlot[];
  totalSlots: number;
  availableCount: number;
}

interface Location {
  id: string;
  locationName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface PortalUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  role: string;
  organizationId: string;
  organizationName: string;
  customerId: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  travelMinutes: number;
  notes: string | null;
  clientNotes: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface MyAppointmentsResponse {
  appointments: Appointment[];
}

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

export default function ScheduleSiteWalk() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [duration, setDuration] = useState<string>("60");
  const [clientNotes, setClientNotes] = useState<string>("");
  const [step, setStep] = useState<"select" | "confirm">("select");

  const { data: user, isLoading: userLoading, error: userError } = useQuery<PortalUser>({
    queryKey: ["/api/portal/auth/me"],
  });

  const { data: myProjects, isLoading: projectsLoading, isError: projectsError } = useQuery<{ projects: ProjectSummary[] }>({
    queryKey: ["/api/portal/my-projects"],
    enabled: !!user,
  });

  const { data: locations, isLoading: locationsLoading, isError: locationsError } = useQuery<{ locations: Location[] }>({
    queryKey: ["/api/portal/customer-locations"],
    enabled: !!user,
  });

  const { data: myAppointments, isError: appointmentsError } = useQuery<MyAppointmentsResponse>({
    queryKey: ["/api/portal/site-walk/my-appointments"],
    enabled: !!user,
  });

  const fromDate = useMemo(() => selectedDate.toISOString(), [selectedDate]);
  const toDate = useMemo(() => addDays(selectedDate, 7).toISOString(), [selectedDate]);

  const { data: availability, isLoading: availabilityLoading, isFetching: availabilityFetching, isError: availabilityError } = useQuery<AvailabilityResponse>({
    queryKey: ["/api/portal/site-walk/availability", selectedLocationId, fromDate, toDate, duration],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        duration,
      });
      if (selectedLocationId) {
        params.set("locationId", selectedLocationId);
      }
      const res = await fetch(`/api/portal/site-walk/availability?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load availability");
      return res.json();
    },
    enabled: !!user,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error("No time slot selected");
      
      return apiRequest("POST", "/api/portal/site-walk/book", {
        locationId: selectedLocationId || undefined,
        projectId: selectedProjectId || undefined,
        start: selectedSlot.start,
        end: selectedSlot.end,
        clientNotes: clientNotes || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Site Walk Scheduled",
        description: "Your appointment has been confirmed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/site-walk/my-appointments"] });
      setLocation("/client-portal");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message,
      });
    },
  });

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));
  }, [selectedDate]);

  const slotsByDay = useMemo(() => {
    if (!availability?.availableSlots) return {};
    
    const grouped: Record<string, AvailableSlot[]> = {};
    
    availability.availableSlots.forEach((slot) => {
      const date = parseISO(slot.start);
      const dayKey = format(date, "yyyy-MM-dd");
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(slot);
    });
    
    return grouped;
  }, [availability?.availableSlots]);

  const upcomingAppointments = useMemo(() => {
    if (!myAppointments?.appointments) return [];
    const now = new Date();
    return myAppointments.appointments
      .filter(a => a.status !== "cancelled" && a.status !== "completed" && new Date(a.scheduledStart) > now)
      .slice(0, 3);
  }, [myAppointments]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userError || !user || projectsError || locationsError || availabilityError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Failed to load scheduling information</h2>
          <p className="text-muted-foreground">There was an error connecting to the server. Please try again.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-refresh">
          Refresh Page
        </Button>
      </div>
    );
  }

  const handlePreviousWeek = () => {
    const newDate = addDays(selectedDate, -7);
    if (newDate >= startOfDay(new Date())) {
      setSelectedDate(newDate);
      setSelectedSlot(null);
    }
  };

  const handleNextWeek = () => {
    setSelectedDate(addDays(selectedDate, 7));
    setSelectedSlot(null);
  };

  const handleConfirm = () => {
    if (selectedSlot) {
      setStep("confirm");
    }
  };

  const handleBook = () => {
    bookMutation.mutate();
  };

  const selectedLocation = locations?.locations.find(l => l.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/client-portal">
              <Button variant="ghost" size="icon" aria-label="Back to portal" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">Schedule Site Walk</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {appointmentsError ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="py-4 flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Unable to load upcoming appointments</p>
            </CardContent>
          </Card>
        ) : upcomingAppointments.length > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarCheck className="h-4 w-4" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{format(new Date(apt.scheduledStart), "MMM d")}</Badge>
                    <span>{format(new Date(apt.scheduledStart), "h:mm a")} - {format(new Date(apt.scheduledEnd), "h:mm a")}</span>
                  </div>
                  {apt.locationName && (
                    <span className="text-muted-foreground truncate max-w-[200px]">{apt.locationName}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === "select" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Options</CardTitle>
                <CardDescription>Choose location and appointment duration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location (Optional)</Label>
                    <Select value={selectedLocationId} onValueChange={(val) => {
                      setSelectedLocationId(val);
                      setSelectedSlot(null);
                    }}>
                      <SelectTrigger data-testid="select-location">
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific location</SelectItem>
                        {locations?.locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.locationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedLocation && (
                      <p className="text-xs text-muted-foreground">
                        {[selectedLocation.address, selectedLocation.city, selectedLocation.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Appointment Duration</Label>
                    <Select value={duration} onValueChange={(val) => {
                      setDuration(val);
                      setSelectedSlot(null);
                    }}>
                      <SelectTrigger data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {myProjects?.projects && myProjects.projects.length > 0 && (
                  <div className="space-y-2">
                    <Label>Related Project (Optional)</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger data-testid="select-project">
                        <SelectValue placeholder="Link to a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No project</SelectItem>
                        {myProjects.projects.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            {proj.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {availability?.travelMinutes && availability.travelMinutes > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Car className="h-4 w-4" />
                    <span>Estimated travel time: {availability.travelMinutes} minutes</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Available Times</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousWeek}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePreviousWeek(); }}
                      disabled={isSameDay(selectedDate, startOfDay(new Date()))}
                      aria-label="Previous week"
                      data-testid="button-prev-week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[180px] text-center">
                      {format(selectedDate, "MMM d")} - {format(addDays(selectedDate, 6), "MMM d, yyyy")}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextWeek}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNextWeek(); }}
                      aria-label="Next week"
                      data-testid="button-next-week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {availabilityLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : availability?.availableCount === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No Available Times</h3>
                    <p className="text-sm text-muted-foreground">
                      Try selecting a different week or duration.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const daySlots = slotsByDay[dayKey] || [];
                      const isToday = isSameDay(day, new Date());
                      const isPast = day < startOfDay(new Date());
                      
                      return (
                        <div key={dayKey} className="flex flex-col">
                          <div className={cn(
                            "text-center py-2 mb-2 rounded-t-md",
                            isToday && "bg-primary text-primary-foreground",
                            isPast && "opacity-50"
                          )}>
                            <div className="text-xs uppercase">{format(day, "EEE")}</div>
                            <div className="text-lg font-semibold">{format(day, "d")}</div>
                          </div>
                          
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-1 pr-2">
                              {daySlots.length === 0 ? (
                                <div className="text-xs text-center text-muted-foreground py-4">
                                  No slots
                                </div>
                              ) : (
                                daySlots.map((slot) => {
                                  const isSelected = selectedSlot?.start === slot.start;
                                  return (
                                    <Button
                                      key={slot.start}
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      className={cn(
                                        "w-full text-xs justify-center",
                                        availabilityFetching && "opacity-50"
                                      )}
                                      onClick={() => setSelectedSlot(slot)}
                                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSlot(slot); }}
                                      data-testid={`slot-${format(parseISO(slot.start), "HH-mm")}`}
                                    >
                                      {format(parseISO(slot.start), "h:mm a")}
                                    </Button>
                                  );
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              
              {selectedSlot && (
                <CardFooter className="border-t pt-4">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-medium">
                        {format(parseISO(selectedSlot.start), "EEEE, MMMM d")} at {format(parseISO(selectedSlot.start), "h:mm a")}
                      </span>
                    </div>
                    <Button onClick={handleConfirm} data-testid="button-continue">
                      Continue
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Your Appointment</CardTitle>
              <CardDescription>Review the details and add any notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Date & Time</div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(selectedSlot!.start), "EEEE, MMMM d, yyyy")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(selectedSlot!.start), "h:mm a")} - {format(parseISO(selectedSlot!.end), "h:mm a")}
                      </div>
                    </div>
                  </div>

                  {selectedLocation && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Location</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedLocation.locationName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {[selectedLocation.address, selectedLocation.city, selectedLocation.state, selectedLocation.zip].filter(Boolean).join(", ")}
                        </div>
                      </div>
                    </div>
                  )}

                  {availability?.travelMinutes && availability.travelMinutes > 0 && (
                    <div className="flex items-start gap-3">
                      <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Travel Time</div>
                        <div className="text-sm text-muted-foreground">
                          Approximately {availability.travelMinutes} minutes
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requirements or information for the visit..."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      rows={4}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep("select")} data-testid="button-back-to-select">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleBook} 
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBook(); }}
                disabled={bookMutation.isPending}
                data-testid="button-confirm-booking"
              >
                {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
