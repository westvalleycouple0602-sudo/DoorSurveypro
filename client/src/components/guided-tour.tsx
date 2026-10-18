import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  X, ChevronLeft, ChevronRight, Play, CheckCircle2,
  DoorOpen, FolderOpen, Camera, FileSpreadsheet,
  BarChart3, Key, Users, Settings, Lightbulb, Scan,
  Ruler, Shield, Zap, FileEdit, Package, FileText,
  ListChecks, DollarSign, CircleDot, ClipboardCheck,
  Send, FileWarning, Gauge, CalendarClock, TrendingUp,
  Milestone, Megaphone, Mail, ShoppingCart, Building2,
  Truck, BookOpen, GitCompare, Database, Sparkles, Eye,
  Palette, Network, Webhook, PenTool, Target, Upload,
  FileDown, FileStack, User, CreditCard, Bug, HelpCircle,
  GraduationCap, Rocket, Kanban, Cpu, Info, ArrowRight,
  Keyboard, ExternalLink, ClipboardList, Layers, Lock,
  UserCheck, Briefcase, Activity, CheckCircle
} from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  content?: string;
  target?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  icon?: React.ReactNode;
  section?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  spotlight?: boolean;
  tips?: string[];
  shortcuts?: { keys: string; action: string }[];
  learnMoreHref?: string;
}

export interface TourTrack {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  steps: TourStep[];
}

interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onNavigate?: (href: string) => void;
  startStep?: number;
  showProgress?: boolean;
  allowSkip?: boolean;
  trackId?: string;
}

const TOUR_STORAGE_KEY = "doorsurvey-tour-completed";
const TOUR_STEP_KEY = "doorsurvey-tour-step";
const TOUR_TRACK_KEY = "doorsurvey-tour-track";

export function GuidedTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  onNavigate,
  startStep = 0,
  showProgress = true,
  allowSkip = true,
  trackId = "complete",
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(startStep);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showTips, setShowTips] = useState(false);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const sections = useMemo(() => {
    const seen = new Set<string>();
    return steps
      .map((s) => s.section)
      .filter((s): s is string => !!s && !seen.has(s) && seen.add(s) !== undefined);
  }, [steps]);

  const currentSection = step?.section;
  const currentSectionIndex = currentSection ? sections.indexOf(currentSection) : -1;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(startStep);
      setShowTips(false);
    }
  }, [isOpen, startStep]);

  const findTargetElement = useCallback(() => {
    if (!step?.target) return null;
    return document.querySelector(step.target);
  }, [step?.target]);

  useEffect(() => {
    if (!isOpen || !step?.target) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const element = findTargetElement();
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    const element = findTargetElement();
    if (element) {
      resizeObserver.observe(element);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, step?.target, findTargetElement]);

  useEffect(() => {
    localStorage.setItem(TOUR_STEP_KEY, currentStep.toString());
  }, [currentStep]);

  const handleNext = () => {
    setShowTips(false);
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setShowTips(false);
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleJumpToSection = (sectionName: string) => {
    const idx = steps.findIndex((s) => s.section === sectionName);
    if (idx >= 0) {
      setShowTips(false);
      setCurrentStep(idx);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`${TOUR_STORAGE_KEY}-${trackId}`, "true");
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(`${TOUR_STORAGE_KEY}-${trackId}`, "skipped");
    localStorage.setItem(TOUR_STORAGE_KEY, "skipped");
    onClose();
  };

  if (!isOpen) return null;

  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect || step?.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const tooltipWidth = 440;
    const tooltipHeight = 350;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let style: React.CSSProperties = {};

    switch (step?.position) {
      case "top":
        style = {
          top: `${Math.max(8, targetRect.top - tooltipHeight - padding)}px`,
          left: `${Math.min(vw - tooltipWidth - 8, Math.max(8, targetRect.left + targetRect.width / 2 - tooltipWidth / 2))}px`,
        };
        break;
      case "bottom":
        style = {
          top: `${Math.min(vh - tooltipHeight - 8, targetRect.bottom + padding)}px`,
          left: `${Math.min(vw - tooltipWidth - 8, Math.max(8, targetRect.left + targetRect.width / 2 - tooltipWidth / 2))}px`,
        };
        break;
      case "left":
        style = {
          top: `${Math.min(vh - tooltipHeight - 8, Math.max(8, targetRect.top + targetRect.height / 2 - tooltipHeight / 2))}px`,
          left: `${Math.max(8, targetRect.left - tooltipWidth - padding)}px`,
        };
        break;
      case "right":
      default:
        style = {
          top: `${Math.min(vh - tooltipHeight - 8, Math.max(8, targetRect.top + targetRect.height / 2 - tooltipHeight / 2))}px`,
          left: `${Math.min(vw - tooltipWidth - 8, targetRect.right + padding)}px`,
        };
        break;
    }

    return style;
  };

  const tooltipStyle = getTooltipPosition();
  const hasTips = step?.tips && step.tips.length > 0;
  const hasShortcuts = step?.shortcuts && step.shortcuts.length > 0;
  const hasExtras = hasTips || hasShortcuts || step?.learnMoreHref;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" data-testid="guided-tour-overlay">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={allowSkip ? handleSkip : undefined}
      />

      {targetRect && step?.spotlight !== false && (
        <div
          className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      )}

      <Card
        className="absolute w-[440px] max-w-[92vw] shadow-2xl border-primary/20"
        style={tooltipStyle}
        data-testid="guided-tour-card"
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {step?.icon && (
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  {step.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <CardTitle className="text-base" data-testid="tour-step-title">
                    {step?.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs" data-testid="text-tour-step-count">
                    {currentStep + 1}/{steps.length}
                  </Badge>
                  {step?.section && (
                    <Badge variant="outline" className="text-[10px]" data-testid="text-tour-section">
                      {step.section}
                    </Badge>
                  )}
                </div>
                <CardDescription data-testid="tour-step-description">
                  {step?.description}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              aria-label="Close tour"
              data-testid="tour-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {step?.content && (
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="tour-step-content">
              {step.content}
            </p>
          )}

          {hasExtras && (
            <>
              <Separator />
              <div className="space-y-2">
                {hasTips && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTips((prev) => !prev)}
                      className="w-full justify-start gap-1.5 text-xs font-medium text-muted-foreground"
                      data-testid="tour-toggle-tips"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span>{showTips ? "Hide" : "Show"} Tips ({step.tips!.length})</span>
                    </Button>
                    {showTips && (
                      <ul className="mt-1.5 space-y-1 pl-5">
                        {step.tips!.map((tip, i) => (
                          <li key={i} className="text-xs text-muted-foreground list-disc" data-testid={`tour-tip-${i}`}>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {hasShortcuts && (
                  <div className="flex items-start gap-1.5">
                    <Keyboard className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {step.shortcuts!.map((sc, i) => (
                        <span key={i} className="text-xs text-muted-foreground" data-testid={`tour-shortcut-${i}`}>
                          <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">{sc.keys}</kbd>
                          {" "}{sc.action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {step?.learnMoreHref && (
                  <a
                    href={step.learnMoreHref}
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    data-testid="tour-learn-more"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    Learn more in Help Center
                  </a>
                )}
              </div>
            </>
          )}

          {step?.action && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                if (step.action?.href && onNavigate) {
                  onNavigate(step.action.href);
                }
                step.action?.onClick?.();
              }}
              data-testid="tour-action-button"
            >
              {step.action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {sections.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {sections.map((sec, i) => {
                const isCurrent = sec === currentSection;
                const sectionSteps = steps.filter((s) => s.section === sec);
                const allDone = currentStep > steps.indexOf(sectionSteps[sectionSteps.length - 1]);
                return (
                  <Button
                    key={sec}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleJumpToSection(sec)}
                    className={cn(
                      "h-4 w-4 min-h-0 rounded-full p-0 shrink-0",
                      isCurrent
                        ? "bg-primary"
                        : allDone
                          ? "bg-primary/40"
                          : "bg-muted-foreground/20"
                    )}
                    title={sec}
                    data-testid={`tour-section-dot-${i}`}
                  >
                    <span className="sr-only">{sec}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {showProgress && (
            <Progress value={progress} className="h-1" data-testid="tour-progress" />
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {allowSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  data-testid="tour-skip"
                >
                  Skip tour
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  data-testid="tour-previous"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                data-testid="tour-next"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}

const S = {
  WELCOME: "Welcome",
  FIELD: "Field Operations",
  ESTIMATING: "Estimating",
  QUOTES: "Quotes & Delivery",
  PM: "Project Management",
  SALES: "Sales & CRM",
  PROCUREMENT: "Procurement",
  CATALOG: "Product Catalog",
  ANALYTICS: "Analytics & Reports",
  AI: "AI & Automation",
  TEAM: "Team & HR",
  ORG: "Organization",
  DATA: "Data Management",
  ACCOUNT: "Account",
  HELP: "Help & Support",
  FINISH: "Finish",
};

export const completeTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to DoorSurvey Pro",
    description: "Your complete commercial door survey platform",
    content: "This tour covers every section of the application so you know exactly how to operate each feature. You can jump between sections using the dots below, or step through one by one. Let's get started!",
    position: "center",
    section: S.WELCOME,
    icon: <Lightbulb className="h-5 w-5" />,
    tips: [
      "You can restart this tour anytime from the header bar",
      "Press '?' to open keyboard shortcuts at any time",
      "Use Ctrl+K to open the command palette for quick navigation",
    ],
    shortcuts: [
      { keys: "?", action: "Shortcuts" },
      { keys: "Ctrl+K", action: "Command palette" },
    ],
  },
  {
    id: "sidebar-nav",
    title: "Sidebar Navigation",
    description: "Your main navigation hub",
    content: "The sidebar organizes all features into logical sections. Each section groups related tools together. You can collapse the sidebar on smaller screens using the menu button in the header. Sections are role-aware -- you'll only see items you have permission to access.",
    target: "[data-testid='button-sidebar-toggle']",
    position: "bottom",
    section: S.WELCOME,
    icon: <Layers className="h-5 w-5" />,
    tips: [
      "On tablets and phones, the sidebar slides in as an overlay",
      "Items with a lock icon require a higher subscription tier",
      "Badge counts on items show pending actions needing your attention",
    ],
  },

  {
    id: "fo-dashboard",
    title: "Dashboard",
    description: "Your daily command center",
    content: "The Dashboard gives you an at-a-glance view of active projects, recent activity, upcoming deadlines, and key metrics. It's the first thing you see when you log in and is designed to surface what needs your attention right now.",
    target: "[data-testid='link-dashboard']",
    position: "right",
    section: S.FIELD,
    icon: <FolderOpen className="h-5 w-5" />,
    tips: [
      "Dashboard cards update in real-time as your team works",
      "Click any metric card to drill into its detail page",
      "Your most recent projects appear at the top for quick access",
    ],
    learnMoreHref: "/help",
  },
  {
    id: "fo-projects",
    title: "Projects",
    description: "Organize all your survey work",
    content: "Projects are the foundation of DoorSurvey Pro. Each project represents a building or client engagement. Inside a project you'll find all door openings, hardware selections, compliance data, photos, and quotes organized in one place. Create projects for new buildings, renovations, or maintenance assessments.",
    target: "[data-testid='link-projects']",
    position: "right",
    section: S.FIELD,
    icon: <FolderOpen className="h-5 w-5" />,
    tips: [
      "Use project templates to pre-fill common settings for building types",
      "Archive completed projects to keep your list clean",
      "Each project tracks its own compliance status independently",
      "You can duplicate a project to quickly set up similar jobs",
    ],
    shortcuts: [
      { keys: "Ctrl+N", action: "New project" },
    ],
    learnMoreHref: "/help/guides",
  },
  {
    id: "fo-door-survey",
    title: "Door Survey Wizard",
    description: "Guided data capture for every opening",
    content: "The 11-step survey wizard walks you through capturing every detail for a door opening: dimensions, frame type, fire rating, hardware, ADA compliance, security devices, and conditions. It ensures nothing is missed and validates data as you go. Designed for iPad use in the field.",
    target: "[data-testid='link-door-survey']",
    position: "right",
    section: S.FIELD,
    icon: <ClipboardList className="h-5 w-5" />,
    tips: [
      "Enable offline mode before heading to areas with poor connectivity",
      "Use voice-to-text for notes when your hands are occupied",
      "The wizard remembers your position if you need to step away",
      "Quick-capture mode is available for simple interior doors",
    ],
    learnMoreHref: "/help/guides",
  },
  {
    id: "fo-floor-plans",
    title: "Floor Plans",
    description: "Visual layout of door locations",
    content: "Upload building floor plans and place door markers on them to create an interactive map of all openings. This helps your team locate doors during surveys and gives clients a visual overview. Click any marker to jump to that door's details.",
    target: "[data-testid='link-floor-plans']",
    position: "right",
    section: S.FIELD,
    icon: <Layers className="h-5 w-5" />,
    tips: [
      "Supported formats include PDF, PNG, and JPG floor plans",
      "Drag markers to reposition them on the plan",
      "Color-coded markers indicate survey completion status",
    ],
  },
  {
    id: "fo-lidar",
    title: "LiDAR Scans",
    description: "Triple-scan enforcement for accuracy",
    content: "DoorSurvey Pro requires THREE scans per opening for complete assessment: one with the door open (capturing both sides), and two with the door closed from opposite sides (Side A and Side B). This ensures all hardware, conditions, and dimensions are captured from every angle. The system blocks hardware identification until all three scans are complete.",
    target: "[data-testid='link-lidar-scans']",
    position: "right",
    section: S.FIELD,
    icon: <Scan className="h-5 w-5" />,
    tips: [
      "Hold your device steady during scans for best results",
      "Use fiducial markers for calibration in large openings",
      "Scan status shows green only when all 3 scans are complete",
      "3D models are stored in GLTF, USDZ, and OBJ formats",
    ],
    learnMoreHref: "/help/guides",
  },
  {
    id: "fo-ar",
    title: "AR Measurements",
    description: "Augmented reality dimension capture",
    content: "Use your device's camera and AR capabilities to measure door dimensions, clearances, and hardware positions in real-time. AR measurements are automatically linked to the corresponding door opening and can be verified against LiDAR scan data.",
    target: "[data-testid='link-ar-measurements']",
    position: "right",
    section: S.FIELD,
    icon: <Ruler className="h-5 w-5" />,
    tips: [
      "Calibrate your device at the start of each session for accuracy",
      "Measure in good lighting for best AR tracking",
      "Measurements sync with the door survey wizard automatically",
    ],
  },
  {
    id: "fo-wiring",
    title: "Wiring Diagrams",
    description: "Electronic access control layouts",
    content: "Create and manage wiring diagrams for Division 28 electronic security devices. Link diagrams to specific doors showing power supplies, controllers, readers, and cable runs. Essential for access control system planning and installation.",
    target: "[data-testid='link-wiring-diagrams']",
    position: "right",
    section: S.FIELD,
    icon: <Zap className="h-5 w-5" />,
  },
  {
    id: "fo-change-orders",
    title: "Change Orders",
    description: "Track scope modifications",
    content: "When project scope changes after the initial survey, create change orders to document what changed, why, and the cost impact. Change orders maintain a full audit trail and automatically update affected quotes and hardware schedules.",
    target: "[data-testid='link-change-orders']",
    position: "right",
    section: S.FIELD,
    icon: <FileEdit className="h-5 w-5" />,
    tips: [
      "Each change order is versioned for accountability",
      "Link change orders to specific door openings for traceability",
    ],
  },
  {
    id: "fo-div28",
    title: "Div28 Security Assessments",
    description: "Electronic security device evaluation",
    content: "Assess and document Division 28 electronic security requirements for each opening. This includes card readers, electric strikes, magnetic locks, request-to-exit devices, and door position switches. The assessment integrates with wiring diagrams and the compliance engine.",
    target: "[data-testid='link-div28-assessments']",
    position: "right",
    section: S.FIELD,
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "fo-pm-board",
    title: "PM Board",
    description: "Kanban-style task management",
    content: "A visual project board using Kanban columns to track tasks through stages like To Do, In Progress, Review, and Complete. Drag cards between columns, assign team members, set due dates, and get a clear picture of project workflow. Includes procurement red-flag alerts.",
    target: "[data-testid='link-pm-board']",
    position: "right",
    section: S.FIELD,
    icon: <Kanban className="h-5 w-5" />,
    tips: [
      "Drag and drop cards between columns to update status",
      "Red flags highlight items that need procurement attention",
      "Filter the board by assignee, priority, or due date",
    ],
  },

  {
    id: "est-templates",
    title: "Estimate Templates",
    description: "Reusable estimation configurations",
    content: "Create templates for common door configurations to speed up estimating. A template can include pre-selected hardware, standard labor rates, and default specifications. Apply a template to quickly populate a new opening's estimate instead of starting from scratch.",
    target: "[data-testid='link-templates']",
    position: "right",
    section: S.ESTIMATING,
    icon: <FileText className="h-5 w-5" />,
    tips: [
      "Templates can be shared across your organization",
      "Create templates for common building types (hospital, office, school)",
      "Templates auto-calculate pricing based on your rate tables",
    ],
  },
  {
    id: "est-bundles",
    title: "Hardware Bundles",
    description: "Pre-configured hardware groupings",
    content: "Bundles let you group commonly used hardware items together. For example, a 'Standard Office Door' bundle might include a lever set, closer, hinges, and a kick plate. Apply bundles to openings for instant, consistent hardware selection.",
    target: "[data-testid='link-bundles']",
    position: "right",
    section: S.ESTIMATING,
    icon: <Package className="h-5 w-5" />,
  },
  {
    id: "est-schedule",
    title: "Hardware Schedule",
    description: "Complete hardware specifications list",
    content: "The hardware schedule is your master list of all hardware items across all openings in a project. It shows quantities, specifications, pricing, and compatibility status. Export it as a professional Excel or PDF document for submittal packages.",
    target: "[data-testid='link-hardware-schedule']",
    position: "right",
    section: S.ESTIMATING,
    icon: <ListChecks className="h-5 w-5" />,
    tips: [
      "Group the schedule by floor, wing, or hardware type",
      "The schedule automatically flags incompatible hardware combinations",
      "Export directly to Excel with your company branding",
    ],
    learnMoreHref: "/help/guides",
  },
  {
    id: "est-costs",
    title: "Cost Tracking",
    description: "Monitor project financials",
    content: "Track material costs, labor estimates, and margins for each project. Cost tracking pulls pricing from your hardware catalog and applies your configured markup percentages. Compare estimated vs. actual costs as projects progress.",
    target: "[data-testid='link-costs']",
    position: "right",
    section: S.ESTIMATING,
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    id: "est-keying",
    title: "Keying Systems",
    description: "Master key system planning",
    content: "Design and manage keying hierarchies from grand master down to individual change keys. Assign key groups to doors, generate keying schedules, and ensure proper keying across the building. Integrates with the hardware catalog for lock compatibility.",
    target: "[data-testid='link-keying-systems']",
    position: "right",
    section: S.ESTIMATING,
    icon: <Key className="h-5 w-5" />,
  },
  {
    id: "est-gasketing",
    title: "Gasketing Catalog",
    description: "Seal and weatherstrip selection",
    content: "Browse gasketing products including smoke seals, weatherstripping, thresholds, and acoustic seals. Filter by door type, fire rating requirement, and manufacturer. The catalog includes cross-reference data to help you find equivalent products.",
    target: "[data-testid='link-gasketing-catalog']",
    position: "right",
    section: S.ESTIMATING,
    icon: <CircleDot className="h-5 w-5" />,
  },

  {
    id: "qd-engineering",
    title: "Engineering Review",
    description: "Technical review queue",
    content: "Before quotes go out, the engineering review catches specification errors, code compliance issues, and hardware incompatibilities. Pending reviews are indicated by badge counts in the sidebar. Review and approve or send back for corrections.",
    target: "[data-testid='link-engineering-review']",
    position: "right",
    section: S.QUOTES,
    icon: <ClipboardCheck className="h-5 w-5" />,
    tips: [
      "Badge count in the sidebar shows items waiting for your review",
      "Use the bulk approval feature for routine projects",
      "Add review notes that are visible to the estimating team",
    ],
  },
  {
    id: "qd-delivery",
    title: "Quote Delivery",
    description: "Send quotes to customers",
    content: "Deliver quotes via email, share link, or PDF download. Customers receive an interactive page where they can review options, select alternatives, add electronic signatures, and approve the quote. Track delivery status and customer engagement in real-time.",
    target: "[data-testid='link-quote-delivery']",
    position: "right",
    section: S.QUOTES,
    icon: <Send className="h-5 w-5" />,
    tips: [
      "Customers can approve quotes with a digital signature",
      "Configure option groups to let customers choose between alternatives",
      "DocuSign integration is available for formal contracts",
    ],
  },
  {
    id: "qd-analytics",
    title: "Quote Analytics",
    description: "Conversion and performance metrics",
    content: "Track your quote win rate, average turnaround time, and revenue by project type. Identify which estimators have the highest conversion rates and which project types generate the most revenue. Requires Professional tier.",
    target: "[data-testid='link-quote-analytics']",
    position: "right",
    section: S.QUOTES,
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "qd-disclaimers",
    title: "Disclaimers",
    description: "Standard terms and conditions",
    content: "Manage the legal disclaimers and terms that appear on your quotes. Create different disclaimer sets for different project types or jurisdictions. Disclaimers are automatically attached to generated quotes.",
    target: "[data-testid='link-disclaimers']",
    position: "right",
    section: S.QUOTES,
    icon: <FileWarning className="h-5 w-5" />,
  },

  {
    id: "pm-overview",
    title: "Project Overview",
    description: "High-level project status",
    content: "See all your active projects with their current stage, completion percentage, and key dates. Filter by status, customer, or team member. This is where project managers monitor the overall health of their portfolio.",
    target: "[data-testid='link-project-management']",
    position: "right",
    section: S.PM,
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    id: "pm-service-queue",
    title: "Service Queue",
    description: "Incoming work requests",
    content: "A prioritized list of service requests, warranty repairs, and follow-up items. Items flow into the queue from various sources including customer requests, scheduled maintenance, and field technician reports. Assign and prioritize from one central location.",
    target: "[data-testid='link-service-queue']",
    position: "right",
    section: S.PM,
    icon: <ListChecks className="h-5 w-5" />,
  },
  {
    id: "pm-manager",
    title: "Manager Dashboard",
    description: "Team performance at a glance",
    content: "A manager-focused view showing team utilization, project health scores, and resource allocation. Identify bottlenecks, overloaded team members, or projects at risk. Drill into any metric for detailed analysis.",
    target: "[data-testid='link-manager-dashboard']",
    position: "right",
    section: S.PM,
    icon: <Gauge className="h-5 w-5" />,
  },
  {
    id: "pm-scheduling",
    title: "Scheduling",
    description: "Unified calendar management",
    content: "Schedule site walks, measurement verifications, installations, and warranty repairs from a single calendar. Features a three-panel layout with drag-and-drop rescheduling and trade coordination. Integrates with Google Calendar and Microsoft 365.",
    target: "[data-testid='link-scheduling']",
    position: "right",
    section: S.PM,
    icon: <CalendarClock className="h-5 w-5" />,
    tips: [
      "Drag appointments to reschedule directly on the calendar",
      "Color-coded events distinguish between visit types",
      "Sync with your personal calendar for conflict detection",
    ],
  },

  {
    id: "sales-customers",
    title: "Customers",
    description: "Client relationship management",
    content: "Manage your customer database with contact information, project history, and communication logs. Each customer profile shows all their projects, quotes, and invoices in one place. Import customers from CSV or HubSpot.",
    target: "[data-testid='link-customers']",
    position: "right",
    section: S.SALES,
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "sales-pipeline",
    title: "Sales Pipeline",
    description: "Track deals from lead to close",
    content: "Visual pipeline showing deals moving through stages: Lead, Qualified, Proposal, Negotiation, and Closed. Track deal value, probability, and expected close date. New leads are flagged with badge counts in the sidebar.",
    target: "[data-testid='link-sales']",
    position: "right",
    section: S.SALES,
    icon: <TrendingUp className="h-5 w-5" />,
    tips: [
      "Badge count shows new leads requiring attention",
      "Drag deals between pipeline stages to update status",
      "Set up automated email follow-ups for each stage",
    ],
  },
  {
    id: "sales-milestones",
    title: "Sales Milestones",
    description: "Revenue goals and achievements",
    content: "Set monthly, quarterly, and annual sales targets. Track progress toward milestones with visual indicators. Celebrate team achievements as milestones are reached to keep motivation high.",
    target: "[data-testid='link-sales-milestones']",
    position: "right",
    section: S.SALES,
    icon: <Milestone className="h-5 w-5" />,
  },
  {
    id: "sales-email-templates",
    title: "Email Templates",
    description: "Pre-built communication templates",
    content: "Access 35+ pre-built email templates across 14 categories including proposals, follow-ups, approvals, and notifications. Templates support variable substitution for personalization and are role-based so each team member sees relevant templates.",
    target: "[data-testid='link-email-templates']",
    position: "right",
    section: S.SALES,
    icon: <Mail className="h-5 w-5" />,
    tips: [
      "Templates auto-fill project details, customer names, and dates",
      "Customize templates to match your brand voice",
      "Track email open rates when integrated with HubSpot",
    ],
  },

  {
    id: "proc-po",
    title: "Purchase Orders",
    description: "Order management for hardware",
    content: "Create and track purchase orders to manufacturers and distributors. POs are generated from your hardware schedules with quantities, pricing, and delivery requirements. Track order status from submitted through received.",
    target: "[data-testid='link-purchase-orders']",
    position: "right",
    section: S.PROCUREMENT,
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    id: "proc-manufacturers",
    title: "Manufacturers",
    description: "Vendor contact directory",
    content: "Maintain your directory of door and hardware manufacturers with contact information, product lines, lead times, and pricing agreements. Link manufacturers to their products in the catalog for streamlined ordering.",
    target: "[data-testid='link-manufacturers']",
    position: "right",
    section: S.PROCUREMENT,
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    id: "proc-distributors",
    title: "Distributors",
    description: "Supply chain partners",
    content: "Manage your distributor relationships including territory coverage, discount tiers, and delivery capabilities. Compare pricing across distributors to find the best sourcing options for each project.",
    target: "[data-testid='link-distributors']",
    position: "right",
    section: S.PROCUREMENT,
    icon: <Truck className="h-5 w-5" />,
  },

  {
    id: "cat-catalog",
    title: "Product Catalog",
    description: "Comprehensive hardware database",
    content: "Browse and search thousands of door and hardware products. The catalog includes detailed specifications, pricing tiers, fire ratings, and compatibility data. Filter by manufacturer, product type, fire rating, or ADA compliance. Products are organized in a hierarchical taxonomy.",
    target: "[data-testid='link-catalog']",
    position: "right",
    section: S.CATALOG,
    icon: <Package className="h-5 w-5" />,
    tips: [
      "Use barcode scanning to quickly find products on-site",
      "Favorite frequently used products for quick access",
      "The catalog includes cross-reference data between manufacturers",
    ],
    learnMoreHref: "/help/guides",
  },
  {
    id: "cat-reference-library",
    title: "Reference Library",
    description: "Technical documentation repository",
    content: "Access manufacturer cut sheets, installation guides, specification documents, and technical bulletins. Documents are linked to catalog products so you can quickly find the right information during surveys or estimating.",
    target: "[data-testid='link-reference-library']",
    position: "right",
    section: S.CATALOG,
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "cat-code-reference",
    title: "Code Reference",
    description: "Building code lookup",
    content: "Look up building code requirements by jurisdiction, building type, and occupancy. Covers IBC, NFPA 80, NFPA 101, ADA, and state-specific amendments. The reference is linked to the compliance validation engine for automated checking.",
    target: "[data-testid='link-code-reference']",
    position: "right",
    section: S.CATALOG,
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "cat-cross-reference",
    title: "Cross-Reference",
    description: "Find equivalent products",
    content: "When a specified product is unavailable, use cross-reference to find compatible alternatives from other manufacturers. The system checks dimensions, functions, fire ratings, and mounting compatibility to suggest valid substitutions.",
    target: "[data-testid='link-cross-reference']",
    position: "right",
    section: S.CATALOG,
    icon: <GitCompare className="h-5 w-5" />,
  },
  {
    id: "cat-reference-data",
    title: "Reference Data",
    description: "System configuration data",
    content: "Manage the underlying reference data that powers the application: door types, frame types, fire rating categories, finish options, and other standardized values. Changes here affect dropdowns and validation rules throughout the system.",
    target: "[data-testid='link-reference']",
    position: "right",
    section: S.CATALOG,
    icon: <Database className="h-5 w-5" />,
  },

  {
    id: "analytics-dashboard",
    title: "Analytics Dashboard",
    description: "Business intelligence overview",
    content: "Interactive charts and graphs showing project volumes, revenue trends, quote conversion rates, and team productivity. Filter by date range, customer, or project type. Requires Professional tier for full access.",
    target: "[data-testid='link-analytics-dashboard']",
    position: "right",
    section: S.ANALYTICS,
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "analytics-reports",
    title: "Reports",
    description: "Generate detailed reports",
    content: "Create professional reports including hardware schedules, cost summaries, compliance documentation, and project status reports. Customize report layouts, add your branding, and export to Excel, PDF, or both.",
    target: "[data-testid='link-reports']",
    position: "right",
    section: S.ANALYTICS,
    icon: <FileEdit className="h-5 w-5" />,
    tips: [
      "Save report configurations as templates for reuse",
      "Schedule recurring reports for automatic generation",
      "Reports include version history for audit trails",
    ],
  },
  {
    id: "analytics-performance",
    title: "Performance Metrics",
    description: "Operational efficiency tracking",
    content: "Monitor key performance indicators like average survey time, quote turnaround, and first-pass approval rates. Identify trends and areas for improvement across your team and processes.",
    target: "[data-testid='link-performance']",
    position: "right",
    section: S.ANALYTICS,
    icon: <Activity className="h-5 w-5" />,
  },
  {
    id: "analytics-revenue",
    title: "Revenue Assessment",
    description: "SaaS business health metrics",
    content: "Admin-only dashboard showing MRR, ARR, valuation estimates, SaaS health scores, tier breakdowns, growth metrics, and 6-month trends. Provides a comprehensive view of business financial performance.",
    target: "[data-testid='link-revenue-assessment']",
    position: "right",
    section: S.ANALYTICS,
    icon: <DollarSign className="h-5 w-5" />,
  },

  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "Intelligent chat helper",
    content: "Ask the AI assistant questions about hardware selection, code compliance, or estimating best practices. It understands your project context and can suggest hardware, check specifications, or explain building code requirements in plain language.",
    target: "[data-testid='link-ai-chat']",
    position: "right",
    section: S.AI,
    icon: <Sparkles className="h-5 w-5" />,
    tips: [
      "Ask about code compliance for specific door configurations",
      "The AI can suggest hardware based on your project requirements",
      "Enterprise tier includes RAG-enhanced compliance answers",
    ],
  },
  {
    id: "ai-recommendations",
    title: "Hardware Recommendations",
    description: "AI-suggested hardware selections",
    content: "Based on your door specifications, fire rating, and building type, the AI recommends compatible hardware from your catalog. Recommendations consider code requirements, budget constraints, and your organization's preferred manufacturers.",
    target: "[data-testid='link-recommendations']",
    position: "right",
    section: S.AI,
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    id: "ai-compliance",
    title: "Compliance Validation",
    description: "Automated code checking",
    content: "The compliance engine validates your door hardware selections against 95 rules across Division 8 and Division 28 specifications. It checks IBC, NFPA 80, NFPA 101, ADA, and jurisdiction-specific requirements. Issues are flagged with severity levels and specific code citations.",
    target: "[data-testid='link-compliance-validation']",
    position: "right",
    section: S.AI,
    icon: <CheckCircle className="h-5 w-5" />,
    tips: [
      "Run compliance checks before sending quotes to catch issues early",
      "The engine supports jurisdiction-specific code overlays",
      "Remediation guidance suggests how to resolve each issue",
    ],
    learnMoreHref: "/help/guides",
  },

  {
    id: "team-roles",
    title: "Team & Roles",
    description: "Manage team members and permissions",
    content: "Invite team members, assign roles (Owner, Admin, Manager, Engineer, Technician, Viewer, etc.), and configure what each role can access. Role-based permissions control which sidebar items and features each team member sees.",
    target: "[data-testid='link-team']",
    position: "right",
    section: S.TEAM,
    icon: <Shield className="h-5 w-5" />,
    tips: [
      "Use the Quick Employee Invite for rapid onboarding",
      "Custom permissions can override default role settings",
      "Each role has a color-coded badge for easy identification",
    ],
  },
  {
    id: "team-hr",
    title: "HR Onboarding",
    description: "New employee setup workflow",
    content: "Guide new hires through the onboarding process with automated checklists, training assignments, and equipment provisioning. Track onboarding progress and ensure every new team member is set up properly before heading to the field.",
    target: "[data-testid='link-hr-onboarding']",
    position: "right",
    section: S.TEAM,
    icon: <UserCheck className="h-5 w-5" />,
  },
  {
    id: "team-job-titles",
    title: "Job Titles",
    description: "Organizational structure",
    content: "Define and manage job titles within your organization. Job titles are used in team assignments, email signatures, and report headers. Keep your organizational structure clean and consistent.",
    target: "[data-testid='link-job-titles']",
    position: "right",
    section: S.TEAM,
    icon: <Briefcase className="h-5 w-5" />,
  },

  {
    id: "org-branding",
    title: "Branding",
    description: "Customize your company look",
    content: "Upload your logo, set brand colors, and configure how your company appears on quotes, reports, and customer-facing pages. The branding wizard can import colors from your logo automatically. Your branding is applied to all generated documents.",
    target: "[data-testid='link-branding']",
    position: "right",
    section: S.ORG,
    icon: <Palette className="h-5 w-5" />,
    tips: [
      "The wizard extracts colors from your logo automatically",
      "Preview how branding looks on quotes before saving",
      "Upload both full and icon-only logo versions",
    ],
  },
  {
    id: "org-integrations",
    title: "Integrations",
    description: "Connect external services",
    content: "Connect DoorSurvey Pro with HubSpot, DocuSign, Google Calendar, Microsoft 365, and other services. Integrations enable bidirectional data sync, automated workflows, and unified communication across your tools. Enterprise tier required.",
    target: "[data-testid='link-integrations']",
    position: "right",
    section: S.ORG,
    icon: <Network className="h-5 w-5" />,
  },
  {
    id: "org-webhooks",
    title: "Webhooks",
    description: "Event-driven notifications",
    content: "Configure webhook endpoints to receive real-time notifications when events occur in DoorSurvey Pro. Webhooks use HMAC-SHA256 signatures for security and include automatic retry logic for failed deliveries.",
    target: "[data-testid='link-webhooks']",
    position: "right",
    section: S.ORG,
    icon: <Webhook className="h-5 w-5" />,
  },
  {
    id: "org-system-admin",
    title: "System Admin",
    description: "Platform-level settings",
    content: "Owner and Admin only. Configure system-wide settings including security policies, session management, rate limiting, and infrastructure health monitoring. View audit logs and manage platform-level configurations.",
    target: "[data-testid='link-system-admin']",
    position: "right",
    section: S.ORG,
    icon: <Cpu className="h-5 w-5" />,
  },

  {
    id: "data-import",
    title: "Import Data",
    description: "Bulk data loading",
    content: "Import projects, door openings, hardware catalogs, and customer data from CSV or Excel files. The import wizard maps your columns to DoorSurvey Pro fields, validates data before import, and reports any errors. Great for migrating from other systems.",
    target: "[data-testid='link-import']",
    position: "right",
    section: S.DATA,
    icon: <Upload className="h-5 w-5" />,
    tips: [
      "Download a sample template to see the expected format",
      "Preview data before committing the import",
      "Large imports run in the background with progress notifications",
    ],
  },
  {
    id: "data-export",
    title: "Export Data",
    description: "Download your information",
    content: "Export projects, hardware schedules, and reports in various formats including Excel, PDF, and CSV. Configure which fields to include and apply filters to export subsets of your data. Export profiles save your preferences for repeated use.",
    target: "[data-testid='link-export']",
    position: "right",
    section: S.DATA,
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: "data-pdf-import",
    title: "PDF Catalog Import",
    description: "Extract data from manufacturer PDFs",
    content: "Upload manufacturer PDF catalogs and the system uses OCR and AI to extract product data, specifications, and pricing. Extracted data is mapped to catalog entries for review before being added to your hardware database.",
    target: "[data-testid='link-pdf-catalog-import']",
    position: "right",
    section: S.DATA,
    icon: <FileStack className="h-5 w-5" />,
  },

  {
    id: "acct-profile",
    title: "Your Profile",
    description: "Personal settings and preferences",
    content: "Manage your display name, email, profile photo, and notification preferences. Enable two-factor authentication for added security. Your profile settings are personal and don't affect other team members.",
    target: "[data-testid='link-profile']",
    position: "right",
    section: S.ACCOUNT,
    icon: <User className="h-5 w-5" />,
    tips: [
      "Enable 2FA with TOTP for enhanced account security",
      "Set your preferred units (imperial or metric)",
      "Configure which notifications you want to receive",
    ],
  },
  {
    id: "acct-settings",
    title: "Account Settings",
    description: "Organization-wide configuration",
    content: "Configure settings that apply to your entire organization including default units, timezone, currency, and notification policies. Changes here affect all team members in your organization.",
    target: "[data-testid='link-account-settings']",
    position: "right",
    section: S.ACCOUNT,
    icon: <Settings className="h-5 w-5" />,
  },
  {
    id: "acct-billing",
    title: "Billing",
    description: "Subscription and payment management",
    content: "View your current plan, manage payment methods, download invoices, and upgrade or downgrade your subscription. The billing page shows your usage against plan limits including projects, users, and AI features.",
    target: "[data-testid='link-billing']",
    position: "right",
    section: S.ACCOUNT,
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: "acct-bug",
    title: "Bug Reports",
    description: "Report issues you encounter",
    content: "Found something that doesn't work right? Submit a bug report with steps to reproduce, screenshots, and device information. Our team reviews reports and prioritizes fixes. You'll be notified when your reported issue is resolved.",
    target: "[data-testid='link-bug-report']",
    position: "right",
    section: S.ACCOUNT,
    icon: <Bug className="h-5 w-5" />,
  },

  {
    id: "help-center",
    title: "Help Center",
    description: "FAQs and knowledge base",
    content: "Search our comprehensive knowledge base for answers to common questions. Browse by category including Getting Started, Projects, Hardware, Compliance, Reports, Billing, and Team Management. Each article includes step-by-step instructions.",
    target: "[data-testid='link-help-center']",
    position: "right",
    section: S.HELP,
    icon: <HelpCircle className="h-5 w-5" />,
    shortcuts: [
      { keys: "?", action: "Keyboard shortcuts" },
      { keys: "Ctrl+K", action: "Quick search" },
    ],
  },
  {
    id: "help-guides",
    title: "Feature Guides",
    description: "In-depth feature walkthroughs",
    content: "Detailed guides for each major feature including use cases, benefits, and pro tips. Guides cover the Door Survey Wizard, Photo Annotation, Hardware Catalog, Compliance Engine, Report Generation, and more.",
    target: "[data-testid='link-feature-guides']",
    position: "right",
    section: S.HELP,
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    id: "help-getting-started",
    title: "Getting Started Wizard",
    description: "Step-by-step setup checklist",
    content: "A guided checklist that walks you through initial setup: create your organization, configure branding, invite team members, set up your first project, and import your hardware catalog. Track your setup progress with the badge in the sidebar.",
    target: "[data-testid='link-getting-started']",
    position: "right",
    section: S.HELP,
    icon: <Rocket className="h-5 w-5" />,
    tips: [
      "The sidebar badge shows your setup progress (e.g. 3/6)",
      "You can complete setup steps in any order",
      "Completing all steps unlocks a getting-started celebration",
    ],
  },

  {
    id: "complete",
    title: "Tour Complete!",
    description: "You're ready to use DoorSurvey Pro",
    content: "You've now seen every section of the application. Remember: you can restart this tour anytime from the header, press '?' for keyboard shortcuts, or visit the Help Center for detailed documentation. Ready to get started?",
    position: "center",
    section: S.FINISH,
    icon: <CheckCircle2 className="h-5 w-5" />,
    action: {
      label: "Create Your First Project",
      href: "/projects",
    },
    tips: [
      "Start by creating a project and adding your first door opening",
      "The Door Survey Wizard guides you through every step",
      "Use the Getting Started checklist to track your initial setup",
    ],
    shortcuts: [
      { keys: "?", action: "Keyboard shortcuts" },
      { keys: "Ctrl+K", action: "Command palette" },
      { keys: "Ctrl+N", action: "New project" },
    ],
  },
];

export const fieldTechTourSteps: TourStep[] = [
  {
    id: "ft-welcome",
    title: "Field Technician Quick Start",
    description: "Everything you need for on-site surveys",
    content: "This tour focuses on the tools you'll use most in the field: projects, the door survey wizard, LiDAR scanning, AR measurements, and photo capture. These are optimized for iPad and tablet use.",
    position: "center",
    section: "Getting Started",
    icon: <Scan className="h-5 w-5" />,
    tips: [
      "Turn on offline mode before entering low-connectivity areas",
      "Keep your iPad charged -- LiDAR scanning uses significant battery",
      "Use landscape orientation for the best survey wizard experience",
    ],
  },
  {
    id: "ft-projects",
    title: "Your Assigned Projects",
    description: "Find the project you're surveying today",
    content: "Open Projects to see work assigned to you. Each project has a building address, contact info, and a list of door openings to survey. Tap a project to see its details and start surveying doors.",
    target: "[data-testid='link-projects']",
    position: "right",
    section: "Projects",
    icon: <FolderOpen className="h-5 w-5" />,
    tips: [
      "Projects assigned to you appear with your name highlighted",
      "Check the project notes for any special instructions from your PM",
      "Download the project for offline use before heading to the site",
    ],
  },
  {
    id: "ft-survey",
    title: "Door Survey Wizard",
    description: "Your primary data capture tool",
    content: "The wizard walks you through 11 steps for each door opening. Start with basic info (door number, location), then capture dimensions, frame details, fire rating, hardware, and conditions. Photos are captured along the way. The wizard saves your progress automatically.",
    target: "[data-testid='link-door-survey']",
    position: "right",
    section: "Surveying",
    icon: <ClipboardList className="h-5 w-5" />,
    tips: [
      "Use the quick-capture mode for simple interior doors",
      "The wizard validates data in real-time to catch errors early",
      "Swipe to move between steps or use the step indicator",
      "Voice-to-text works for notes -- tap the microphone icon",
    ],
  },
  {
    id: "ft-lidar",
    title: "LiDAR Scanning (Triple Scan)",
    description: "Three scans required per opening",
    content: "Each opening needs THREE scans: (1) Door OPEN -- capturing both sides, (2) Door CLOSED from Side A, (3) Door CLOSED from Side B. The system will not allow you to proceed to hardware identification until all three scans are complete. This ensures complete coverage of all hardware, reveals, and conditions.",
    target: "[data-testid='link-lidar-scans']",
    position: "right",
    section: "Scanning",
    icon: <Scan className="h-5 w-5" />,
    tips: [
      "Hold your device steady and move slowly during scans",
      "Ensure adequate lighting for best scan quality",
      "Use fiducial markers for large openings to improve accuracy",
      "The status indicator shows: red (0/3), yellow (1-2/3), green (3/3)",
    ],
  },
  {
    id: "ft-ar",
    title: "AR Measurements",
    description: "Quick dimension capture",
    content: "Point your device at a door to measure width, height, and clearances using augmented reality. AR measurements provide a fast alternative to tape measures and automatically record to the door's file. Verify critical dimensions with manual measurements.",
    target: "[data-testid='link-ar-measurements']",
    position: "right",
    section: "Scanning",
    icon: <Ruler className="h-5 w-5" />,
    tips: [
      "Calibrate at the start of each survey session",
      "AR works best in well-lit spaces with visible edges",
      "Measurements are accurate to approximately 1/4 inch",
    ],
  },
  {
    id: "ft-floor-plans",
    title: "Floor Plans",
    description: "Know where you are in the building",
    content: "Floor plans show you which doors have been surveyed and which still need attention. Tap a door marker to navigate directly to that opening's survey. Completed doors show green markers, in-progress shows yellow, and not-started shows gray.",
    target: "[data-testid='link-floor-plans']",
    position: "right",
    section: "Navigation",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: "ft-div28",
    title: "Security Device Assessment",
    description: "Document electronic access control",
    content: "When a door has electronic security devices (card readers, electric strikes, mag locks), use the Div28 assessment to document the existing equipment and specify new requirements. This feeds directly into wiring diagrams and the compliance engine.",
    target: "[data-testid='link-div28-assessments']",
    position: "right",
    section: "Security",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "ft-bug",
    title: "Report Issues",
    description: "Something not working right?",
    content: "If you encounter any problems in the field -- app crashes, scan failures, or data issues -- submit a bug report immediately. Include steps to reproduce the problem and attach screenshots if possible. This helps us fix issues quickly.",
    target: "[data-testid='link-bug-report']",
    position: "right",
    section: "Support",
    icon: <Bug className="h-5 w-5" />,
  },
  {
    id: "ft-complete",
    title: "Ready for the Field!",
    description: "You know the essential tools",
    content: "You're ready to start surveying. Remember: complete all three LiDAR scans per opening before moving on, use the wizard to ensure nothing is missed, and submit bug reports for any issues. Good luck out there!",
    position: "center",
    section: "Finish",
    icon: <CheckCircle2 className="h-5 w-5" />,
    action: {
      label: "Open Projects",
      href: "/projects",
    },
  },
];

export const estimatorTourSteps: TourStep[] = [
  {
    id: "est-welcome",
    title: "Office Estimator Quick Start",
    description: "Tools for accurate, professional estimates",
    content: "This tour focuses on the estimating workflow: reviewing survey data, selecting hardware, building quotes, and delivering proposals. These tools are designed for desktop use in the office.",
    position: "center",
    section: "Getting Started",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    id: "est-projects",
    title: "Review Survey Data",
    description: "Start with completed field surveys",
    content: "Open a project to review survey data captured by field technicians. Check door dimensions, photos, LiDAR scans, and condition notes. Verify that all three scans are complete for each opening before proceeding with hardware selection.",
    target: "[data-testid='link-projects']",
    position: "right",
    section: "Review",
    icon: <FolderOpen className="h-5 w-5" />,
    tips: [
      "Filter projects by status to find ones ready for estimating",
      "Check LiDAR scan status -- all 3 scans must be green",
      "Review field technician notes for special conditions",
    ],
  },
  {
    id: "est-catalog",
    title: "Hardware Catalog",
    description: "Select the right products",
    content: "Search the catalog by product type, manufacturer, fire rating, or ADA compliance. Compare specifications side-by-side and check compatibility with the door's requirements. Add selected hardware to the door opening's specification.",
    target: "[data-testid='link-catalog']",
    position: "right",
    section: "Selection",
    icon: <Package className="h-5 w-5" />,
    tips: [
      "Use the cross-reference tool to find equivalent products",
      "Check the compatibility indicator before selecting hardware",
      "Bulk-apply hardware bundles for similar door types",
    ],
  },
  {
    id: "est-bundles",
    title: "Hardware Bundles",
    description: "Speed up with pre-configured sets",
    content: "Apply hardware bundles to quickly populate specifications for standard door types. For example, a 'Healthcare Patient Room' bundle includes all required hardware for that application, pre-checked for code compliance.",
    target: "[data-testid='link-bundles']",
    position: "right",
    section: "Selection",
    icon: <Package className="h-5 w-5" />,
  },
  {
    id: "est-templates",
    title: "Estimate Templates",
    description: "Standardized pricing and labor",
    content: "Apply estimate templates that include standard labor rates, markup percentages, and pricing rules. Templates ensure consistent pricing across your team and can be customized per building type or customer.",
    target: "[data-testid='link-templates']",
    position: "right",
    section: "Pricing",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "est-schedule",
    title: "Hardware Schedule",
    description: "Your deliverable document",
    content: "Generate the hardware schedule that lists every item, quantity, and price for the project. This is your primary deliverable for submittals and quotes. Export to Excel or PDF with your company branding applied.",
    target: "[data-testid='link-hardware-schedule']",
    position: "right",
    section: "Output",
    icon: <ListChecks className="h-5 w-5" />,
    tips: [
      "Review the schedule for any flagged incompatibilities",
      "Group by floor or area for large projects",
      "Include alternates for specified products where available",
    ],
  },
  {
    id: "est-compliance",
    title: "Compliance Check",
    description: "Validate before quoting",
    content: "Run the compliance validation engine before generating your quote. It checks all 95 rules across Division 8 and Division 28, flagging any issues with specific code citations. Fix issues before sending to engineering review.",
    target: "[data-testid='link-compliance-validation']",
    position: "right",
    section: "Validation",
    icon: <CheckCircle className="h-5 w-5" />,
    tips: [
      "Address high-severity issues first -- they can block approvals",
      "The engine provides remediation suggestions for each issue",
      "Re-run validation after making corrections to confirm resolution",
    ],
  },
  {
    id: "est-engineering",
    title: "Engineering Review",
    description: "Technical approval workflow",
    content: "Submit your estimate for engineering review. Engineers check specifications, verify compliance, and approve or return with corrections. You'll see the review status update in real-time.",
    target: "[data-testid='link-engineering-review']",
    position: "right",
    section: "Approval",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    id: "est-quote-delivery",
    title: "Quote Delivery",
    description: "Send to the customer",
    content: "Once approved, deliver the quote to your customer. They receive an interactive page to review options, select alternatives, and approve with a digital signature. Track whether the quote has been opened and viewed.",
    target: "[data-testid='link-quote-delivery']",
    position: "right",
    section: "Delivery",
    icon: <Send className="h-5 w-5" />,
  },
  {
    id: "est-costs",
    title: "Cost & Margin Tracking",
    description: "Monitor project profitability",
    content: "Track material costs, labor estimates, and profit margins. Compare your estimates against actual costs as the project progresses. Identify where margins are tight and where there's room for adjustment.",
    target: "[data-testid='link-costs']",
    position: "right",
    section: "Financial",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    id: "est-complete",
    title: "Ready to Estimate!",
    description: "You know the estimating workflow",
    content: "You're ready to start building professional estimates. The typical workflow is: Review survey data, select hardware, run compliance, get engineering approval, and deliver the quote. The system guides you through each step.",
    position: "center",
    section: "Finish",
    icon: <CheckCircle2 className="h-5 w-5" />,
    action: {
      label: "Open Projects",
      href: "/projects",
    },
  },
];

export const adminTourSteps: TourStep[] = [
  {
    id: "admin-welcome",
    title: "Admin & Manager Tour",
    description: "Platform management and oversight",
    content: "This tour covers administrative features: team management, organization settings, analytics, billing, and system configuration. These tools help you manage your organization and monitor business performance.",
    position: "center",
    section: "Getting Started",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    id: "admin-team",
    title: "Team Management",
    description: "Control who can do what",
    content: "Add team members, assign roles, and configure permissions. Each role determines which sections of the app a person can access. Custom permissions let you fine-tune access beyond the default role settings.",
    target: "[data-testid='link-team']",
    position: "right",
    section: "People",
    icon: <Users className="h-5 w-5" />,
    tips: [
      "Use Quick Employee Invite for batch onboarding",
      "Review permissions quarterly to keep access current",
      "Custom permissions override the default role access",
    ],
  },
  {
    id: "admin-hr",
    title: "HR Onboarding",
    description: "New hire setup process",
    content: "Automate new employee onboarding with checklists and training assignments. Track progress for each new hire and ensure they complete required steps before accessing production data.",
    target: "[data-testid='link-hr-onboarding']",
    position: "right",
    section: "People",
    icon: <UserCheck className="h-5 w-5" />,
  },
  {
    id: "admin-branding",
    title: "Company Branding",
    description: "Make it yours",
    content: "Configure your company's visual identity: logo, colors, and document headers. This branding appears on all quotes, reports, and customer-facing pages. The wizard can extract your brand colors from your logo automatically.",
    target: "[data-testid='link-branding']",
    position: "right",
    section: "Organization",
    icon: <Palette className="h-5 w-5" />,
  },
  {
    id: "admin-integrations",
    title: "External Integrations",
    description: "Connect your tools",
    content: "Set up connections to HubSpot, DocuSign, Google Calendar, and Microsoft 365. Integrations enable data sync, calendar coordination, and document signing without leaving the platform.",
    target: "[data-testid='link-integrations']",
    position: "right",
    section: "Organization",
    icon: <Network className="h-5 w-5" />,
  },
  {
    id: "admin-billing",
    title: "Billing & Subscription",
    description: "Plans, payments, and usage",
    content: "Manage your subscription tier (Starter, Professional, Enterprise), update payment methods, and monitor usage against plan limits. View invoices and manage billing contacts.",
    target: "[data-testid='link-billing']",
    position: "right",
    section: "Financial",
    icon: <CreditCard className="h-5 w-5" />,
    tips: [
      "Monitor usage limits to avoid service interruptions",
      "Annual billing saves 20% compared to monthly",
      "Enterprise tier unlocks AI features and unlimited users",
    ],
  },
  {
    id: "admin-analytics",
    title: "Business Analytics",
    description: "Data-driven decisions",
    content: "Comprehensive dashboards showing revenue trends, project volumes, team productivity, and quote conversion rates. Use filters to slice data by time period, customer, or project type.",
    target: "[data-testid='link-analytics-dashboard']",
    position: "right",
    section: "Insights",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "admin-revenue",
    title: "Revenue Assessment",
    description: "SaaS business health",
    content: "Admin-only dashboard with MRR, ARR, valuation estimates, and SaaS health scores. Track growth trends, tier distribution, and churn metrics. Use this for board reports and strategic planning.",
    target: "[data-testid='link-revenue-assessment']",
    position: "right",
    section: "Insights",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    id: "admin-manager",
    title: "Manager Dashboard",
    description: "Team oversight and resource allocation",
    content: "See team utilization, project health scores, and workload distribution. Identify bottlenecks, reassign work, and ensure projects stay on track. Drill into any metric for team member-level detail.",
    target: "[data-testid='link-manager-dashboard']",
    position: "right",
    section: "Operations",
    icon: <Gauge className="h-5 w-5" />,
  },
  {
    id: "admin-system",
    title: "System Administration",
    description: "Platform-level controls",
    content: "Configure security policies, rate limiting, session management, and infrastructure health monitoring. Review audit logs for compliance. Access system-level diagnostics and performance metrics.",
    target: "[data-testid='link-system-admin']",
    position: "right",
    section: "System",
    icon: <Cpu className="h-5 w-5" />,
    tips: [
      "Review audit logs regularly for security compliance",
      "Set session timeout policies to match your security requirements",
      "Monitor infrastructure health for proactive issue detection",
    ],
  },
  {
    id: "admin-complete",
    title: "Admin Tour Complete",
    description: "You have the keys to the kingdom",
    content: "You now know where to find every administrative tool. For day-to-day operations, the Manager Dashboard and Team pages are your go-to screens. For strategic planning, check Analytics and Revenue Assessment regularly.",
    position: "center",
    section: "Finish",
    icon: <CheckCircle2 className="h-5 w-5" />,
    action: {
      label: "Go to Manager Dashboard",
      href: "/manager-dashboard",
    },
  },
];

export const defaultTourSteps = completeTourSteps;

export const tourTracks: TourTrack[] = [
  {
    id: "complete",
    label: "Complete Tour",
    description: "Full walkthrough of every feature and section",
    icon: <Lightbulb className="h-5 w-5" />,
    steps: completeTourSteps,
  },
  {
    id: "field-tech",
    label: "Field Technician",
    description: "On-site survey tools for iPad users",
    icon: <Scan className="h-5 w-5" />,
    steps: fieldTechTourSteps,
  },
  {
    id: "estimator",
    label: "Office Estimator",
    description: "Desktop estimating and quoting workflow",
    icon: <DollarSign className="h-5 w-5" />,
    steps: estimatorTourSteps,
  },
  {
    id: "admin",
    label: "Admin & Manager",
    description: "Organization management and oversight",
    icon: <Shield className="h-5 w-5" />,
    steps: adminTourSteps,
  },
];

export function useTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string>("complete");

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(completed === "true" || completed === "skipped");
  }, []);

  const startTour = useCallback((trackId?: string) => {
    const id = trackId || "complete";
    setActiveTrackId(id);
    setIsOpen(true);
  }, []);

  const endTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem(TOUR_STEP_KEY);
    tourTracks.forEach((t) => {
      localStorage.removeItem(`${TOUR_STORAGE_KEY}-${t.id}`);
    });
    setHasCompletedTour(false);
  }, []);

  const activeTrack = tourTracks.find((t) => t.id === activeTrackId) || tourTracks[0];

  return {
    isOpen,
    hasCompletedTour,
    startTour,
    endTour,
    resetTour,
    activeTrackId,
    activeTrack,
    setActiveTrackId,
  };
}

export function TourTrackSelector({
  onSelect,
  className,
}: {
  onSelect: (trackId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)} data-testid="tour-track-selector">
      {tourTracks.map((track) => (
        <Button
          key={track.id}
          variant="ghost"
          onClick={() => onSelect(track.id)}
          className="flex items-center gap-3 h-auto p-3 justify-start text-left w-full"
          data-testid={`tour-track-${track.id}`}
        >
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            {track.icon}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">{track.label}</div>
            <div className="text-xs text-muted-foreground">{track.description}</div>
          </div>
        </Button>
      ))}
    </div>
  );
}

export function TourTrigger({ className, startTour }: { className?: string; startTour: (trackId?: string) => void }) {
  const [showSelector, setShowSelector] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSelector((prev) => !prev)}
        className={cn("gap-2", className)}
        data-testid="button-start-tour"
      >
        <Play className="h-4 w-4" />
        Take a Tour
      </Button>

      {showSelector && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSelector(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg" data-testid="tour-track-dropdown">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Choose Your Tour</CardTitle>
              <CardDescription className="text-xs">
                Select a tour based on your role
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <TourTrackSelector
                onSelect={(trackId) => {
                  setShowSelector(false);
                  startTour(trackId);
                }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export interface PageHelpConfig {
  route: string;
  title: string;
  description: string;
  tips: string[];
  shortcuts?: { keys: string; action: string }[];
  learnMoreHref?: string;
}

export const pageHelpRegistry: Record<string, PageHelpConfig> = {
  "/": {
    route: "/",
    title: "Dashboard",
    description: "Your command center showing active projects, recent activity, and key metrics at a glance.",
    tips: [
      "Click any metric card to drill into its detail page",
      "Recent projects appear at the top for quick access",
      "The dashboard refreshes automatically as your team works",
    ],
    shortcuts: [
      { keys: "Ctrl+K", action: "Quick search" },
      { keys: "Ctrl+N", action: "New project" },
    ],
    learnMoreHref: "/help",
  },
  "/projects": {
    route: "/projects",
    title: "Projects",
    description: "All your door survey projects. Each project represents a building or client engagement with its own door openings, hardware, and compliance data.",
    tips: [
      "Use filters to find projects by status, customer, or date",
      "Archive completed projects to keep the list manageable",
      "Click a project to see all its door openings and details",
      "Use templates to pre-fill settings for common building types",
    ],
    shortcuts: [
      { keys: "Ctrl+N", action: "New project" },
    ],
    learnMoreHref: "/help/guides",
  },
  "/door-survey": {
    route: "/door-survey",
    title: "Door Survey Wizard",
    description: "An 11-step guided workflow for capturing complete door opening data. Designed for use on iPads in the field.",
    tips: [
      "Enable offline mode before heading to low-connectivity areas",
      "Use voice-to-text for notes when hands are occupied",
      "Quick-capture mode speeds up simple interior doors",
      "The wizard saves your position automatically",
      "All three LiDAR scans must be complete before hardware identification",
    ],
    learnMoreHref: "/help/guides",
  },
  "/lidar-scans": {
    route: "/lidar-scans",
    title: "LiDAR Scans",
    description: "Triple-scan management. Each opening requires three scans: door open (both sides), door closed Side A, and door closed Side B.",
    tips: [
      "Hold your device steady and move slowly during scans",
      "Status shows red (0/3), yellow (1-2/3), green (3/3)",
      "Use fiducial markers for calibration in large openings",
      "3D models are stored in GLTF, USDZ, and OBJ formats",
      "Hardware identification is blocked until all 3 scans complete",
    ],
    learnMoreHref: "/help/guides",
  },
  "/catalog": {
    route: "/catalog",
    title: "Product Catalog",
    description: "Browse and search thousands of door hardware products with specifications, pricing, and compatibility data.",
    tips: [
      "Use barcode scanning to quickly find products on-site",
      "Favorite frequently used products for quick access",
      "Cross-reference tool finds equivalent products from other manufacturers",
      "Filter by fire rating, ADA compliance, or manufacturer",
    ],
    learnMoreHref: "/help/guides",
  },
  "/hardware-schedule": {
    route: "/hardware-schedule",
    title: "Hardware Schedule",
    description: "Master list of all hardware items across all openings in a project with quantities, specifications, and pricing.",
    tips: [
      "Group by floor, wing, or hardware type for organization",
      "Flagged items indicate incompatible hardware combinations",
      "Export to Excel with your company branding applied",
      "Save report configurations as templates for repeated use",
    ],
    learnMoreHref: "/help/guides",
  },
  "/engineering-review": {
    route: "/engineering-review",
    title: "Engineering Review",
    description: "Technical review queue where engineers verify specifications, compliance, and hardware compatibility before quotes go out.",
    tips: [
      "Sidebar badge count shows items waiting for review",
      "Use bulk approval for routine, low-risk projects",
      "Add review notes visible to the estimating team",
      "Rejected items include specific correction instructions",
    ],
  },
  "/quote-delivery": {
    route: "/quote-delivery",
    title: "Quote Delivery",
    description: "Send quotes via email or shareable link. Customers review, select options, sign, and approve interactively.",
    tips: [
      "Track whether the customer has opened and viewed the quote",
      "Configure option groups for customer selection",
      "DocuSign integration available for formal contracts",
      "Multi-channel delivery supports email, link, and PDF",
    ],
  },
  "/team": {
    route: "/team",
    title: "Team & Roles",
    description: "Manage team members, assign roles, and configure permissions that control feature access.",
    tips: [
      "Use Quick Employee Invite for rapid batch onboarding",
      "Custom permissions override default role access settings",
      "Each role has a color-coded badge for easy identification",
      "Review permissions quarterly to keep access levels current",
    ],
  },
  "/analytics": {
    route: "/analytics",
    title: "Analytics Dashboard",
    description: "Interactive charts showing project volumes, revenue trends, quote conversion rates, and team productivity.",
    tips: [
      "Use date range filters to compare performance periods",
      "Click chart segments to drill into detailed data",
      "Export charts and data for presentations or reports",
    ],
  },
  "/compliance-validation": {
    route: "/compliance-validation",
    title: "Compliance Validation",
    description: "Automated code checking against 95 rules across Division 8 and Division 28 specifications.",
    tips: [
      "Run compliance checks before sending quotes",
      "Issues include severity levels and specific code citations",
      "The engine supports jurisdiction-specific code overlays",
      "Remediation guidance suggests how to resolve each issue",
    ],
    learnMoreHref: "/help/guides",
  },
  "/scheduling": {
    route: "/scheduling",
    title: "Scheduling",
    description: "Unified calendar for site walks, measurements, installations, and warranty repairs with drag-and-drop rescheduling.",
    tips: [
      "Drag appointments to reschedule on the calendar",
      "Color-coded events distinguish between visit types",
      "Sync with Google Calendar or Microsoft 365",
      "Trade coordination features align multiple crews",
    ],
  },
  "/sales": {
    route: "/sales",
    title: "Sales Pipeline",
    description: "Visual pipeline tracking deals from lead through qualification, proposal, negotiation, to close.",
    tips: [
      "Sidebar badge shows new leads needing attention",
      "Drag deals between stages to update their status",
      "Set up automated email follow-ups per stage",
      "Track deal value, probability, and expected close date",
    ],
  },
  "/settings": {
    route: "/settings",
    title: "Account Settings",
    description: "Organization-wide configuration including defaults, timezone, currency, and notification policies.",
    tips: [
      "Changes here affect all team members",
      "Set default units (imperial or metric) for your org",
      "Configure notification policies for project events",
    ],
  },
  "/billing": {
    route: "/billing",
    title: "Billing & Subscription",
    description: "Manage your plan, payment methods, invoices, and monitor usage against plan limits.",
    tips: [
      "Monitor usage limits to avoid service interruptions",
      "Annual billing saves 20% compared to monthly",
      "Enterprise tier unlocks AI features and unlimited users",
      "Download invoices for your records",
    ],
  },
  "/branding": {
    route: "/branding",
    title: "Branding",
    description: "Customize your company's visual identity that appears on quotes, reports, and customer-facing pages.",
    tips: [
      "The wizard extracts brand colors from your logo automatically",
      "Preview how branding looks on quotes before saving",
      "Upload both full logo and icon-only versions",
    ],
  },
  "/import": {
    route: "/import",
    title: "Import Data",
    description: "Bulk import projects, hardware catalogs, and customer data from CSV or Excel files.",
    tips: [
      "Download sample templates to see the expected format",
      "Preview data before committing the import",
      "Large imports run in background with progress notifications",
      "Map your columns to DoorSurvey Pro fields in the wizard",
    ],
  },
  "/ai-chat": {
    route: "/ai-chat",
    title: "AI Assistant",
    description: "Ask questions about hardware selection, code compliance, or estimating best practices. The AI understands your project context.",
    tips: [
      "Ask about code compliance for specific door configurations",
      "The AI suggests hardware based on your project requirements",
      "Enterprise tier includes RAG-enhanced compliance answers",
      "Type naturally -- the assistant understands context",
    ],
  },
  "/revenue-assessment": {
    route: "/revenue-assessment",
    title: "Revenue Assessment",
    description: "Admin-only SaaS business health dashboard with MRR, ARR, valuation estimates, and growth metrics.",
    tips: [
      "Track 6-month trends for board presentations",
      "SaaS health score combines multiple performance metrics",
      "Tier breakdown shows customer distribution by plan",
    ],
  },
  "/help": {
    route: "/help",
    title: "Help Center",
    description: "Comprehensive knowledge base with FAQs, how-to articles, and video tutorials organized by category.",
    tips: [
      "Use the search bar to find answers quickly",
      "Browse by category for structured learning",
      "Each article includes step-by-step instructions",
    ],
    shortcuts: [
      { keys: "?", action: "Keyboard shortcuts dialog" },
      { keys: "Ctrl+K", action: "Quick search / command palette" },
    ],
  },
};

export function PageHelpButton({ route }: { route: string }) {
  const [showHelp, setShowHelp] = useState(false);
  const config = pageHelpRegistry[route];

  if (!config) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowHelp((prev) => !prev)}
        aria-label="Show page help"
        data-testid="button-page-help"
      >
        <Info className="h-4 w-4" />
      </Button>

      {showHelp && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowHelp(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg" data-testid="page-help-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{config.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowHelp(false)}
                  aria-label="Close help"
                  data-testid="page-help-close"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription className="text-xs">
                {config.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {config.tips.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="text-xs font-medium">Tips</span>
                  </div>
                  <ul className="space-y-1 pl-5">
                    {config.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground list-disc" data-testid={`page-help-tip-${i}`}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {config.shortcuts && config.shortcuts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Shortcuts</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {config.shortcuts.map((sc, i) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">{sc.keys}</kbd>
                        {" "}{sc.action}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {config.learnMoreHref && (
                <a
                  href={config.learnMoreHref}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  onClick={() => setShowHelp(false)}
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Learn more in Help Center
                </a>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
