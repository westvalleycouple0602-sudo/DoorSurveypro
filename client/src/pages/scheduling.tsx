import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useMemo, useCallback, DragEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, addDays, parseISO, isSameDay, startOfWeek, addWeeks, isToday, differenceInMilliseconds } from "date-fns";
import { GripVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  User,
  Phone,
  Mail,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link as LinkIcon,
  Wrench,
  Eye,
  Play,
  AlertTriangle,
  Users,
  TrendingUp,
  Zap,
  Paintbrush,
  HardHat,
  ClipboardList,
  BarChart3,
  Filter,
  Ruler,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/error-state";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AvailabilityBlock {
  id: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  reason: string | null;
  blockType: string;
  recurrenceRule: string | null;
  appliesToOrgWide: boolean;
  locationId: string | null;
  createdAt: string;
}

type AppointmentType = "site_walk" | "measurement_verification" | "installation" | "warranty_repair";

interface Appointment {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  appointmentType?: AppointmentType;
  locationName: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  travelMinutes: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  notes: string | null;
  clientNotes: string | null;
  priority?: "normal" | "urgent";
  tradeDependencies?: string[];
  assignedTeam?: string[];
  project: { id: string; name: string } | null;
  portalUser: { id: string; name: string; email: string } | null;
  assignedUser: { id: string; name: string } | null;
  confirmedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface CalendarStatus {
  connected: boolean;
  provider: string | null;
  accountEmail: string | null;
  calendarName: string | null;
  homeBaseAddress: string | null;
  lastSyncAt: string | null;
  message?: string;
}

interface TradePartner {
  id: string;
  name: string;
  trade: string;
  phone: string;
  email: string;
}

const BLOCK_TYPES = [
  { value: "unavailable", label: "Unavailable" },
  { value: "vacation", label: "Vacation" },
  { value: "meeting", label: "Meeting" },
  { value: "lunch", label: "Lunch Break" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

const APPOINTMENT_TYPES: { value: AppointmentType; label: string; color: string; bgColor: string; icon: any }[] = [
  { value: "site_walk", label: "Site Walk", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700", icon: ClipboardList },
  { value: "measurement_verification", label: "Measurements", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700", icon: Ruler },
  { value: "installation", label: "Installation", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700", icon: Wrench },
  { value: "warranty_repair", label: "Warranty", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700", icon: Shield },
];

const TRADE_DEPENDENCIES = [
  { id: "electrician", label: "Electrician", icon: Zap },
  { id: "drywall", label: "Drywall", icon: Building2 },
  { id: "paint", label: "Paint", icon: Paintbrush },
  { id: "flooring", label: "Flooring", icon: HardHat },
  { id: "hvac", label: "HVAC", icon: Building2 },
  { id: "plumbing", label: "Plumbing", icon: Wrench },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  no_show: { label: "No Show", variant: "destructive" },
};

const getAppointmentTypeConfig = (type?: AppointmentType) => {
  return APPOINTMENT_TYPES.find(t => t.value === type) || APPOINTMENT_TYPES[0];
};

export default function SchedulingPage() {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [typeFilters, setTypeFilters] = useState<Record<AppointmentType, boolean>>({
    site_walk: true,
    measurement_verification: true,
    installation: true,
    warranty_repair: true,
  });
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"today" | "calendar" | "analytics">("today");

  const [newBlock, setNewBlock] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endDate: format(new Date(), "yyyy-MM-dd"),
    endTime: "17:00",
    allDay: false,
    blockType: "unavailable",
    reason: "",
    appliesToOrgWide: true,
  });

  const [newAppointment, setNewAppointment] = useState({
    appointmentType: "site_walk" as AppointmentType,
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    locationName: "",
    locationAddress: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: "",
    priority: "normal" as "normal" | "urgent",
    tradeDependencies: [] as string[],
    assignedTeam: [] as string[],
    projectId: "",
  });

  const fromDate = useMemo(() => selectedWeek.toISOString(), [selectedWeek]);
  const toDate = useMemo(() => addDays(selectedWeek, 7).toISOString(), [selectedWeek]);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: calendarStatus, isLoading: statusLoading } = useQuery<CalendarStatus>({
    queryKey: ["/api/site-walk/calendar-status"],
  });

  const { data: appointments, isLoading: appointmentsLoading, isError: appointmentsError, error: appointmentsErrorObj, refetch: refetchAppointments } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ["/api/site-walk/appointments", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/site-walk/appointments?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load appointments");
      return res.json();
    },
  });

  const { data: blocks, isLoading: blocksLoading, isError: blocksError, error: blocksErrorObj, refetch: refetchBlocks } = useQuery<{ blocks: AvailabilityBlock[] }>({
    queryKey: ["/api/site-walk/blocks", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const res = await fetch(`/api/site-walk/blocks?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load blocks");
      return res.json();
    },
  });

  const schedulingError = appointmentsError || blocksError;
  const schedulingErrorObj = appointmentsErrorObj || blocksErrorObj;

  if (schedulingError) {
    return (
      <div className="container max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <ErrorState
          title="Unable to Load Scheduling"
          message={schedulingErrorObj instanceof Error ? schedulingErrorObj.message : "We couldn't load the scheduling data. Please try again."}
          error={schedulingErrorObj as Error}
          onRetry={() => {
            refetchAppointments();
            refetchBlocks();
          }}
          testId="error-scheduling"
        />
      </div>
    );
  }

  const createBlockMutation = useMutation({
    mutationFn: async () => {
      const startAt = newBlock.allDay
        ? new Date(`${newBlock.startDate}T00:00:00`).toISOString()
        : new Date(`${newBlock.startDate}T${newBlock.startTime}`).toISOString();
      const endAt = newBlock.allDay
        ? new Date(`${newBlock.endDate}T23:59:59`).toISOString()
        : new Date(`${newBlock.endDate}T${newBlock.endTime}`).toISOString();

      return apiRequest("POST", "/api/site-walk/blocks", {
        startAt,
        endAt,
        allDay: newBlock.allDay,
        blockType: newBlock.blockType,
        reason: newBlock.reason || undefined,
        appliesToOrgWide: newBlock.appliesToOrgWide,
      });
    },
    onSuccess: () => {
      toast({ title: "Block Created", description: "The time block has been added." });
      queryClient.invalidateQueries({ queryKey: ["/api/site-walk/blocks"] });
      setShowBlockDialog(false);
      resetBlockForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      const scheduledStart = new Date(`${newAppointment.date}T${newAppointment.startTime}`).toISOString();
      const scheduledEnd = new Date(`${newAppointment.date}T${newAppointment.endTime}`).toISOString();

      return apiRequest("POST", "/api/site-walk/appointments", {
        scheduledStart,
        scheduledEnd,
        appointmentType: newAppointment.appointmentType,
        locationName: newAppointment.locationName || undefined,
        locationAddress: newAppointment.locationAddress || undefined,
        clientName: newAppointment.clientName || undefined,
        clientEmail: newAppointment.clientEmail || undefined,
        clientPhone: newAppointment.clientPhone || undefined,
        notes: newAppointment.notes || undefined,
        priority: newAppointment.priority,
        tradeDependencies: newAppointment.tradeDependencies,
        projectId: newAppointment.projectId || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Appointment Created", description: "The appointment has been scheduled." });
      queryClient.invalidateQueries({ queryKey: ["/api/site-walk/appointments"] });
      setShowAppointmentDialog(false);
      resetAppointmentForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/site-walk/appointments/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "The appointment status has been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/site-walk/appointments"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      return apiRequest("DELETE", `/api/site-walk/blocks/${blockId}`);
    },
    onSuccess: () => {
      toast({ title: "Block Removed", description: "The time block has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/site-walk/blocks"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const appointment = appointments?.appointments?.find(a => a.id === id);
      if (!appointment) throw new Error("Appointment not found");

      const oldStart = parseISO(appointment.scheduledStart);
      const oldEnd = parseISO(appointment.scheduledEnd);
      const duration = differenceInMilliseconds(oldEnd, oldStart);

      const startTime = format(oldStart, "HH:mm:ss");
      const newScheduledStart = new Date(`${newDate}T${startTime}`);
      const newScheduledEnd = new Date(newScheduledStart.getTime() + duration);

      return apiRequest("PATCH", `/api/site-walk/appointments/${id}`, {
        scheduledStart: newScheduledStart.toISOString(),
        scheduledEnd: newScheduledEnd.toISOString(),
      });
    },
    onSuccess: (_, variables) => {
      const appointment = appointments?.appointments?.find(a => a.id === variables.id);
      toast({
        title: "Appointment Rescheduled",
        description: `${appointment?.clientName || "Appointment"} moved to ${format(parseISO(variables.newDate), "EEEE, MMM d")}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/site-walk/appointments"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Reschedule Failed", description: error.message });
    },
  });

  const resetBlockForm = () => {
    setNewBlock({
      startDate: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endDate: format(new Date(), "yyyy-MM-dd"),
      endTime: "17:00",
      allDay: false,
      blockType: "unavailable",
      reason: "",
      appliesToOrgWide: true,
    });
  };

  const resetAppointmentForm = () => {
    setNewAppointment({
      appointmentType: "site_walk",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      locationName: "",
      locationAddress: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      notes: "",
      priority: "normal",
      tradeDependencies: [],
      assignedTeam: [],
      projectId: "",
    });
    setQuickAddDate(null);
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(selectedWeek, i));
  }, [selectedWeek]);

  const appointmentsByDay = useMemo(() => {
    if (!appointments?.appointments) return {};
    const grouped: Record<string, Appointment[]> = {};
    appointments.appointments.forEach((apt) => {
      const dayKey = format(parseISO(apt.scheduledStart), "yyyy-MM-dd");
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(apt);
    });
    return grouped;
  }, [appointments?.appointments]);

  const filteredAppointmentsByDay = useMemo(() => {
    const filtered: Record<string, Appointment[]> = {};
    Object.entries(appointmentsByDay).forEach(([day, apts]) => {
      filtered[day] = apts.filter(apt => {
        const type = apt.appointmentType || "site_walk";
        return typeFilters[type];
      });
    });
    return filtered;
  }, [appointmentsByDay, typeFilters]);

  const todayAppointments = useMemo(() => {
    return appointmentsByDay[todayStr] || [];
  }, [appointmentsByDay, todayStr]);

  const blocksByDay = useMemo(() => {
    if (!blocks?.blocks) return {};
    const grouped: Record<string, AvailabilityBlock[]> = {};
    blocks.blocks.forEach((block) => {
      const dayKey = format(parseISO(block.startAt), "yyyy-MM-dd");
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(block);
    });
    return grouped;
  }, [blocks?.blocks]);

  const pipelineData = useMemo(() => {
    const allApts = appointments?.appointments || [];
    const installations = allApts.filter(a => a.appointmentType === "installation" && a.status !== "completed" && a.status !== "cancelled");
    
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
      const weekEnd = addDays(weekStart, 6);
      const count = installations.filter(apt => {
        const date = parseISO(apt.scheduledStart);
        return date >= weekStart && date <= weekEnd;
      }).length;
      return {
        week: format(weekStart, "MMM d"),
        count,
        weekNum: i + 1,
      };
    });
    return weeks;
  }, [appointments?.appointments]);

  const capacityUtilization = useMemo(() => {
    const allApts = appointments?.appointments || [];
    const totalSlots = 7 * 8;
    const usedSlots = allApts.filter(a => a.status !== "cancelled").length;
    return Math.min(Math.round((usedSlots / totalSlots) * 100), 100);
  }, [appointments?.appointments]);

  const conflictingSchedules = useMemo(() => {
    const allApts = appointments?.appointments || [];
    const conflicts: Appointment[] = [];
    
    allApts.forEach((apt, i) => {
      const aptStart = parseISO(apt.scheduledStart);
      const aptEnd = parseISO(apt.scheduledEnd);
      
      allApts.slice(i + 1).forEach(other => {
        const otherStart = parseISO(other.scheduledStart);
        const otherEnd = parseISO(other.scheduledEnd);
        
        if (aptStart < otherEnd && aptEnd > otherStart) {
          if (!conflicts.includes(apt)) conflicts.push(apt);
          if (!conflicts.includes(other)) conflicts.push(other);
        }
      });
    });
    
    return conflicts;
  }, [appointments?.appointments]);

  const handlePreviousWeek = () => setSelectedWeek(addWeeks(selectedWeek, -1));
  const handleNextWeek = () => setSelectedWeek(addWeeks(selectedWeek, 1));
  const handleThisWeek = () => setSelectedWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const openQuickAdd = (date: Date) => {
    setQuickAddDate(format(date, "yyyy-MM-dd"));
    setNewAppointment(prev => ({ ...prev, date: format(date, "yyyy-MM-dd") }));
    setShowAppointmentDialog(true);
  };

  const openDetailSheet = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setShowDetailSheet(true);
  };

  const toggleTypeFilter = (type: AppointmentType) => {
    setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, appointment: Appointment) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appointment.id);
    setDraggedAppointment(appointment);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedAppointment(null);
    setDragOverDay(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(dayKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, targetDayKey: string) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData("text/plain");
    
    if (appointmentId && draggedAppointment) {
      const currentDayKey = format(parseISO(draggedAppointment.scheduledStart), "yyyy-MM-dd");
      
      if (currentDayKey !== targetDayKey) {
        rescheduleAppointmentMutation.mutate({ id: appointmentId, newDate: targetDayKey });
      }
    }
    
    setDraggedAppointment(null);
    setDragOverDay(null);
  }, [draggedAppointment, rescheduleAppointmentMutation]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Scheduling Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage all appointments, installations, and scheduling</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-block" size="sm">
                <Clock className="h-4 w-4 mr-1.5" />
                Block Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Block Time</DialogTitle>
                <DialogDescription>
                  Add a time period when you are unavailable.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <Label>All Day</Label>
                  <Switch
                    checked={newBlock.allDay}
                    onCheckedChange={(checked) => setNewBlock(prev => ({ ...prev, allDay: checked }))}
                    data-testid="switch-all-day"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={newBlock.startDate}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, startDate: e.target.value }))}
                      data-testid="input-block-start-date"
                    />
                  </div>
                  {!newBlock.allDay && (
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newBlock.startTime}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, startTime: e.target.value }))}
                        data-testid="input-block-start-time"
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={newBlock.endDate}
                      onChange={(e) => setNewBlock(prev => ({ ...prev, endDate: e.target.value }))}
                      data-testid="input-block-end-date"
                    />
                  </div>
                  {!newBlock.allDay && (
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newBlock.endTime}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, endTime: e.target.value }))}
                        data-testid="input-block-end-time"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newBlock.blockType}
                    onValueChange={(value) => setNewBlock(prev => ({ ...prev, blockType: value }))}
                  >
                    <SelectTrigger data-testid="select-block-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    value={newBlock.reason}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Add notes..."
                    data-testid="input-block-reason"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
                <Button onClick={() => createBlockMutation.mutate()} disabled={createBlockMutation.isPending} data-testid="button-create-block">
                  {createBlockMutation.isPending ? "Creating..." : "Create Block"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAppointmentDialog} onOpenChange={(open) => { setShowAppointmentDialog(open); if (!open) resetAppointmentForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-appointment" size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Appointment</DialogTitle>
                <DialogDescription>
                  Schedule a new appointment for site walks, measurements, installations, or warranty repairs.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Appointment Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {APPOINTMENT_TYPES.map(type => {
                      const Icon = type.icon;
                      const isSelected = newAppointment.appointmentType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setNewAppointment(prev => ({ ...prev, appointmentType: type.value }))}
                          className={cn(
                            "p-3 rounded-md border text-left transition-colors",
                            isSelected ? type.bgColor : "hover:bg-muted"
                          )}
                          data-testid={`button-type-${type.value}`}
                        >
                          <Icon className={cn("h-5 w-5 mb-1", type.color)} />
                          <div className="text-sm font-medium">{type.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newAppointment.date}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, date: e.target.value }))}
                      data-testid="input-appointment-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newAppointment.startTime}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, startTime: e.target.value }))}
                      data-testid="input-appointment-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newAppointment.endTime}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, endTime: e.target.value }))}
                      data-testid="input-appointment-end-time"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location Name</Label>
                    <Input
                      value={newAppointment.locationName}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, locationName: e.target.value }))}
                      placeholder="e.g., ABC Office Building"
                      data-testid="input-location-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={newAppointment.locationAddress}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, locationAddress: e.target.value }))}
                      placeholder="123 Main St, City, State"
                      data-testid="input-location-address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input
                      value={newAppointment.clientName}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder="John Smith"
                      data-testid="input-client-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newAppointment.clientEmail}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, clientEmail: e.target.value }))}
                      placeholder="john@example.com"
                      data-testid="input-client-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newAppointment.clientPhone}
                      onChange={(e) => setNewAppointment(prev => ({ ...prev, clientPhone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      data-testid="input-client-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newAppointment.priority}
                    onValueChange={(value: "normal" | "urgent") => setNewAppointment(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newAppointment.appointmentType === "installation" && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <HardHat className="h-4 w-4" />
                        Trade Dependencies
                      </Label>
                      <p className="text-xs text-muted-foreground">Select trades that must complete work before this installation.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {TRADE_DEPENDENCIES.map(trade => {
                          const Icon = trade.icon;
                          const isSelected = newAppointment.tradeDependencies.includes(trade.id);
                          return (
                            <div key={trade.id} className="flex items-center gap-2">
                              <Checkbox
                                id={trade.id}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setNewAppointment(prev => ({
                                    ...prev,
                                    tradeDependencies: checked
                                      ? [...prev.tradeDependencies, trade.id]
                                      : prev.tradeDependencies.filter(t => t !== trade.id)
                                  }));
                                }}
                                data-testid={`checkbox-trade-${trade.id}`}
                              />
                              <Label htmlFor={trade.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {trade.label}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newAppointment.notes}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any special instructions or notes..."
                    data-testid="input-appointment-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAppointmentDialog(false)}>Cancel</Button>
                <Button onClick={() => createAppointmentMutation.mutate()} disabled={createAppointmentMutation.isPending} data-testid="button-create-appointment">
                  {createAppointmentMutation.isPending ? "Creating..." : "Create Appointment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile View Tabs - Only visible on small screens */}
      <div className="lg:hidden">
        <div className="flex rounded-lg border bg-muted p-1 gap-1">
          <button
            onClick={() => setMobileView("today")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMobileView("today"); }}
            tabIndex={0}
            role="button"
            className={cn(
              "flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-colors",
              mobileView === "today" 
                ? "bg-background shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="button-mobile-today"
          >
            <Calendar className="h-4 w-4 mx-auto mb-1" />
            Today
          </button>
          <button
            onClick={() => setMobileView("calendar")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMobileView("calendar"); }}
            tabIndex={0}
            role="button"
            className={cn(
              "flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-colors",
              mobileView === "calendar" 
                ? "bg-background shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="button-mobile-calendar"
          >
            <Clock className="h-4 w-4 mx-auto mb-1" />
            Week
          </button>
          <button
            onClick={() => setMobileView("analytics")}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMobileView("analytics"); }}
            tabIndex={0}
            role="button"
            className={cn(
              "flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-colors",
              mobileView === "analytics" 
                ? "bg-background shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid="button-mobile-analytics"
          >
            <BarChart3 className="h-4 w-4 mx-auto mb-1" />
            Stats
          </button>
        </div>
      </div>

      {statusLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : calendarStatus ? (
        <Card className={cn(
          calendarStatus.connected ? "border-green-200 dark:border-green-900" : "border-yellow-200 dark:border-yellow-900",
          "hidden sm:block"
        )}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {calendarStatus.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="text-calendar-status">
                    {calendarStatus.connected
                      ? `Connected to ${calendarStatus.provider === "google" ? "Google Calendar" : "Microsoft Outlook"}`
                      : "Calendar Not Connected"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {calendarStatus.connected ? calendarStatus.accountEmail : calendarStatus.message}
                  </p>
                </div>
              </div>
              {calendarStatus.homeBaseAddress && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Home Base:</span> {calendarStatus.homeBaseAddress}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters - hidden on mobile unless calendar view */}
      <div className={cn(
        "flex flex-wrap items-center gap-2",
        "lg:flex",
        mobileView === "calendar" ? "flex" : "hidden lg:flex"
      )}>
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-2">Filter:</span>
        {APPOINTMENT_TYPES.map(type => {
          const Icon = type.icon;
          const isActive = typeFilters[type.value];
          return (
            <Button
              key={type.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTypeFilter(type.value)}
              className={cn("gap-1.5 h-9 sm:h-8", isActive && type.bgColor.replace("bg-", "bg-opacity-50 "))}
              data-testid={`button-filter-${type.value}`}
            >
              <Icon className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", isActive && type.color)} />
              <span className="hidden sm:inline">{type.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Today's Tasks Panel - visible on desktop OR when mobile "today" view */}
        <div className={cn(
          "lg:col-span-3 space-y-4",
          "lg:block",
          mobileView === "today" ? "block" : "hidden lg:block"
        )}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Today's Tasks
              </CardTitle>
              <CardDescription>{format(new Date(), "EEEE, MMMM d")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[400px] pr-2">
                {appointmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No appointments today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAppointments.map(apt => {
                      const typeConfig = getAppointmentTypeConfig(apt.appointmentType);
                      const status = statusConfig[apt.status] || statusConfig.pending;
                      const Icon = typeConfig.icon;
                      
                      return (
                        <Card 
                          key={apt.id} 
                          className={cn("cursor-pointer hover-elevate", typeConfig.bgColor)}
                          onClick={() => openDetailSheet(apt)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetailSheet(apt); }}
                          tabIndex={0}
                          role="button"
                          data-testid={`card-today-appointment-${apt.id}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className={cn("h-4 w-4 shrink-0", typeConfig.color)} />
                                <span className="text-sm font-medium truncate">
                                  {format(parseISO(apt.scheduledStart), "h:mm a")}
                                </span>
                                {apt.priority === "urgent" && (
                                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                                )}
                              </div>
                              <Badge variant={status.variant} className="text-[10px] shrink-0">
                                {status.label}
                              </Badge>
                            </div>
                            
                            {apt.clientName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">{apt.clientName}</span>
                              </div>
                            )}
                            
                            {apt.locationName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{apt.locationName}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2 flex-wrap">
                              {apt.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="min-h-[44px] lg:min-h-0 h-11 lg:h-8 text-sm lg:text-xs min-w-[88px] px-4 lg:px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatusMutation.mutate({ id: apt.id, status: "in_progress" });
                                  }}
                                  data-testid={`button-start-${apt.id}`}
                                >
                                  <Play className="h-4 w-4 lg:h-3 lg:w-3 mr-2 lg:mr-1" />
                                  Start
                                </Button>
                              )}
                              {apt.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="min-h-[44px] lg:min-h-0 h-11 lg:h-8 text-sm lg:text-xs min-w-[88px] px-4 lg:px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatusMutation.mutate({ id: apt.id, status: "completed" });
                                  }}
                                  data-testid={`button-complete-${apt.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 lg:h-3 lg:w-3 mr-2 lg:mr-1" />
                                  Complete
                                </Button>
                              )}
                              {(apt.status === "pending" || apt.status === "confirmed") && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="min-h-[44px] lg:min-h-0 h-11 lg:h-8 text-sm lg:text-xs text-destructive px-4 lg:px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateAppointmentStatusMutation.mutate({ id: apt.id, status: "cancelled" });
                                  }}
                                  data-testid={`button-cancel-${apt.id}`}
                                >
                                  <XCircle className="h-4 w-4 lg:h-3 lg:w-3 mr-2 lg:mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Blocks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[150px] pr-2">
                {blocksLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (blocksByDay[todayStr] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No blocks today</p>
                ) : (
                  <div className="space-y-2">
                    {(blocksByDay[todayStr] || []).map(block => {
                      const blockType = BLOCK_TYPES.find(t => t.value === block.blockType);
                      return (
                        <div key={block.id} className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {block.allDay ? "All Day" : `${format(parseISO(block.startAt), "h:mm a")} - ${format(parseISO(block.endAt), "h:mm a")}`}
                            </p>
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {blockType?.label || block.blockType}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBlockMutation.mutate(block.id)}
                            aria-label="Delete block"
                            data-testid={`button-delete-block-${block.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Calendar/Week View Panel - visible on desktop OR when mobile "calendar" view */}
        <div className={cn(
          "lg:col-span-6 space-y-4",
          "lg:block",
          mobileView === "calendar" ? "block" : "hidden lg:block"
        )}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-base">Week View</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePreviousWeek} aria-label="Previous week" data-testid="button-prev-week">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleThisWeek} data-testid="button-this-week" size="sm">
                    Today
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNextWeek} aria-label="Next week" data-testid="button-next-week">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {format(selectedWeek, "MMMM d")} - {format(addDays(selectedWeek, 6), "MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 -mx-3 lg:mx-0 px-0 lg:px-0">
              {/* Horizontal scroll container for mobile/tablet */}
              <div className="overflow-x-auto lg:overflow-visible pb-2 -mx-1 px-1">
                <div className="grid grid-cols-7 gap-2 min-w-[700px] lg:min-w-0">
                  {weekDays.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayAppointments = filteredAppointmentsByDay[dayKey] || [];
                    const dayBlocks = blocksByDay[dayKey] || [];
                    const isTodayDate = isSameDay(day, new Date());
                    const typeGroups = APPOINTMENT_TYPES.reduce((acc, type) => {
                      acc[type.value] = dayAppointments.filter(a => (a.appointmentType || "site_walk") === type.value).length;
                      return acc;
                    }, {} as Record<AppointmentType, number>);

                    const isDragOver = dragOverDay === dayKey;
                    const isDragging = !!draggedAppointment;

                    return (
                      <div 
                        key={dayKey} 
                        className={cn(
                          "min-w-[100px] lg:min-w-0 rounded-md transition-colors flex flex-col",
                          isDragOver && "bg-primary/10 ring-2 ring-primary ring-inset"
                        )}
                        onDragOver={(e) => handleDragOver(e, dayKey)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayKey)}
                        data-testid={`drop-zone-${dayKey}`}
                      >
                        <div className={cn(
                          "text-center py-3 lg:py-1.5 mb-2 rounded-md border min-h-[48px] lg:min-h-0",
                          isTodayDate && "bg-primary text-primary-foreground"
                        )}>
                          <div className="text-sm lg:text-[10px] uppercase">{format(day, "EEE")}</div>
                          <div className="text-lg lg:text-sm font-semibold">{format(day, "d")}</div>
                        </div>

                      <div className="flex flex-wrap gap-0.5 mb-2 justify-center">
                        {APPOINTMENT_TYPES.map(type => {
                          const count = typeGroups[type.value];
                          if (count === 0) return null;
                          return (
                            <div 
                              key={type.value} 
                              className={cn("w-2 h-2 rounded-full", type.bgColor.split(" ")[0])}
                              title={`${count} ${type.label}`}
                            />
                          );
                        })}
                      </div>

                      {isDragging && isDragOver && (
                        <div className="text-[10px] text-center text-primary font-medium py-1 mb-1">
                          Drop here
                        </div>
                      )}

                      <ScrollArea className="h-[200px] sm:h-[280px]">
                        <div 
                          className="space-y-1 pr-1 min-h-full"
                          onDragOver={(e) => handleDragOver(e, dayKey)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, dayKey)}
                        >
                          {appointmentsLoading ? (
                            <Skeleton className="h-12 w-full" />
                          ) : dayAppointments.length === 0 && dayBlocks.length === 0 ? (
                            <div 
                              className={cn(
                                "text-[10px] text-center py-8 min-h-[100px] rounded-md border-2 border-dashed transition-colors",
                                isDragging && isDragOver 
                                  ? "border-primary bg-primary/5 text-primary font-medium" 
                                  : isDragging 
                                    ? "border-muted-foreground/30 text-muted-foreground" 
                                    : "border-transparent text-muted-foreground"
                              )}
                            >
                              {isDragging ? "Drop to schedule" : "-"}
                            </div>
                          ) : (
                            <>
                              {dayAppointments.map((apt) => {
                                const typeConfig = getAppointmentTypeConfig(apt.appointmentType);
                                const status = statusConfig[apt.status] || statusConfig.pending;
                                const Icon = typeConfig.icon;
                                const isBeingDragged = draggedAppointment?.id === apt.id;
                                
                                return (
                                  <div
                                    key={apt.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, apt)}
                                    onDragEnd={handleDragEnd}
                                    className={cn(
                                      "transition-opacity",
                                      isBeingDragged && "opacity-50"
                                    )}
                                  >
                                    <Card 
                                      className={cn(
                                        "text-sm lg:text-[10px] cursor-grab active:cursor-grabbing hover-elevate min-h-[44px] lg:min-h-0",
                                        typeConfig.bgColor,
                                        isBeingDragged && "ring-2 ring-primary"
                                      )}
                                      onClick={() => !isDragging && openDetailSheet(apt)}
                                      onKeyDown={(e) => { if (!isDragging && (e.key === 'Enter' || e.key === ' ')) openDetailSheet(apt); }}
                                      tabIndex={0}
                                      role="button"
                                      data-testid={`card-week-appointment-${apt.id}`}
                                    >
                                      <CardContent className="p-3 lg:p-1.5 space-y-1 lg:space-y-0.5">
                                        <div className="flex items-center gap-2 lg:gap-1">
                                          <GripVertical className="h-4 w-4 lg:h-2.5 lg:w-2.5 shrink-0 text-muted-foreground/50" />
                                          <Icon className={cn("h-4 w-4 lg:h-2.5 lg:w-2.5 shrink-0", typeConfig.color)} />
                                          <span className="font-medium truncate">
                                            {format(parseISO(apt.scheduledStart), "h:mma")}
                                          </span>
                                          {apt.priority === "urgent" && (
                                            <AlertTriangle className="h-4 w-4 lg:h-2.5 lg:w-2.5 text-orange-500 shrink-0" />
                                          )}
                                        </div>
                                        {apt.clientName && (
                                          <p className="text-muted-foreground truncate">{apt.clientName}</p>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                );
                              })}
                              {dayBlocks.map((block) => (
                                <div key={block.id} className="text-[10px] p-1.5 bg-muted/50 rounded border border-dashed">
                                  <span className="text-muted-foreground">
                                    {block.allDay ? "Blocked" : format(parseISO(block.startAt), "h:mma")}
                                  </span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </ScrollArea>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full min-h-[44px] lg:min-h-0 min-w-[44px] h-11 lg:h-7 text-sm lg:text-[10px] mt-auto pt-1"
                        onClick={() => openQuickAdd(day)}
                        data-testid={`button-quick-add-${dayKey}`}
                      >
                        <Plus className="h-5 w-5 lg:h-3 lg:w-3" />
                      </Button>
                    </div>
                  );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                Trade Coordination
              </CardTitle>
              <CardDescription>Manage trade dependencies for installations</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TRADE_DEPENDENCIES.map(trade => {
                  const Icon = trade.icon;
                  return (
                    <div key={trade.id} className="flex items-center gap-2 p-2 rounded-md border">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{trade.label}</p>
                        <p className="text-xs text-muted-foreground">Schedule TBD</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Panel - visible on desktop OR when mobile "analytics" view */}
        <div className={cn(
          "lg:col-span-3 space-y-4",
          "lg:block",
          mobileView === "analytics" ? "block" : "hidden lg:block"
        )}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  aria-label="Toggle analytics"
                  data-testid="button-toggle-analytics"
                >
                  {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showAnalytics && (
              <CardContent className="pt-0 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Capacity Utilization</span>
                    <span className="text-xs font-medium">{capacityUtilization}%</span>
                  </div>
                  <Progress value={capacityUtilization} className="h-2" />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Installation Pipeline (4 weeks)</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={pipelineData}>
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value: number) => [`${value} installs`, "Count"]}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {conflictingSchedules.length > 0 && (
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-md border border-orange-300 dark:border-orange-700">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Scheduling Conflicts</span>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      {conflictingSchedules.length} overlapping appointments detected
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Field Tech 1</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">3 tasks</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Field Tech 2</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">2 tasks</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="text-sm">Installer</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">1 task</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <p className="text-lg font-bold text-blue-600">{appointments?.appointments?.filter(a => a.appointmentType === "site_walk" || !a.appointmentType).length || 0}</p>
                  <p className="text-[10px] text-blue-600">Site Walks</p>
                </div>
                <div className="text-center p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                  <p className="text-lg font-bold text-green-600">{appointments?.appointments?.filter(a => a.appointmentType === "measurement_verification").length || 0}</p>
                  <p className="text-[10px] text-green-600">Measurements</p>
                </div>
                <div className="text-center p-2 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <p className="text-lg font-bold text-purple-600">{appointments?.appointments?.filter(a => a.appointmentType === "installation").length || 0}</p>
                  <p className="text-[10px] text-purple-600">Installations</p>
                </div>
                <div className="text-center p-2 rounded-md bg-orange-100 dark:bg-orange-900/30">
                  <p className="text-lg font-bold text-orange-600">{appointments?.appointments?.filter(a => a.appointmentType === "warranty_repair").length || 0}</p>
                  <p className="text-[10px] text-orange-600">Warranty</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedAppointment && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {(() => {
                    const typeConfig = getAppointmentTypeConfig(selectedAppointment.appointmentType);
                    const Icon = typeConfig.icon;
                    return (
                      <>
                        <Icon className={cn("h-5 w-5", typeConfig.color)} />
                        {typeConfig.label}
                      </>
                    );
                  })()}
                </SheetTitle>
                <SheetDescription>
                  {format(parseISO(selectedAppointment.scheduledStart), "EEEE, MMMM d, yyyy")}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <Badge variant={statusConfig[selectedAppointment.status]?.variant || "secondary"}>
                    {statusConfig[selectedAppointment.status]?.label || selectedAppointment.status}
                  </Badge>
                  {selectedAppointment.priority === "urgent" && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(selectedAppointment.scheduledStart), "h:mm a")} - {format(parseISO(selectedAppointment.scheduledEnd), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  {selectedAppointment.locationName && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.locationName}</p>
                        {selectedAppointment.locationAddress && (
                          <p className="text-sm text-muted-foreground">{selectedAppointment.locationAddress}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedAppointment.clientName && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Client</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.clientName}</p>
                        {selectedAppointment.clientEmail && (
                          <a href={`mailto:${selectedAppointment.clientEmail}`} className="text-sm text-primary flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {selectedAppointment.clientEmail}
                          </a>
                        )}
                        {selectedAppointment.clientPhone && (
                          <a href={`tel:${selectedAppointment.clientPhone}`} className="text-sm text-primary flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedAppointment.clientPhone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedAppointment.project && (
                    <div className="flex items-start gap-3">
                      <LinkIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Project</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.project.name}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.assignedUser && (
                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Assigned To</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.assignedUser.name}</p>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.tradeDependencies && selectedAppointment.tradeDependencies.length > 0 && (
                    <div className="flex items-start gap-3">
                      <HardHat className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Trade Dependencies</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAppointment.tradeDependencies.map(trade => (
                            <Badge key={trade} variant="outline" className="text-xs">
                              {TRADE_DEPENDENCIES.find(t => t.id === trade)?.label || trade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div className="flex items-start gap-3">
                      <ClipboardList className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  {selectedAppointment.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateAppointmentStatusMutation.mutate({ id: selectedAppointment.id, status: "in_progress" });
                        setShowDetailSheet(false);
                      }}
                      data-testid="button-sheet-start"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {selectedAppointment.status === "in_progress" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateAppointmentStatusMutation.mutate({ id: selectedAppointment.id, status: "completed" });
                        setShowDetailSheet(false);
                      }}
                      data-testid="button-sheet-complete"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  {(selectedAppointment.status === "pending" || selectedAppointment.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        updateAppointmentStatusMutation.mutate({ id: selectedAppointment.id, status: "cancelled" });
                        setShowDetailSheet(false);
                      }}
                      data-testid="button-sheet-cancel"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
