import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft, AlertTriangle } from "lucide-react";

interface ProjectDetail {
  id: string;
  name: string;
  status: string;
  customerName?: string;
  locationName?: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
}

interface DoorOpening {
  id: string;
  openingNumber: string;
  floor?: string;
  room?: string;
  doorType?: string;
  location: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  actorName?: string;
  createdAt: string;
}

interface ProjectDetailResponse {
  project: ProjectDetail;
  summary: {
    totalOpenings: number;
    statusCounts: Record<string, number>;
    completedPercentage: number;
  };
  openings: DoorOpening[];
  recentActivity: ActivityItem[];
}

export default function ProjectReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error, isError } = useQuery<ProjectDetailResponse>({
    queryKey: ["/api/portal/projects", id],
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      document.title = `Project Report - ${data.project.name}`;
    }
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-6 w-48 mb-8" />
        <Skeleton className="h-64 w-full" />
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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Report Not Available</h1>
          <p className="text-gray-600 mb-4">Unable to generate report for this project.</p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </div>
    );
  }

  const { project, summary, openings } = data;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          @page { margin: 0.5in; }
        }
      `}</style>

      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b z-50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" onClick={handleClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white p-8 pt-24 print:pt-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 pb-6 border-b-2 border-gray-900">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Project Report
                </h1>
                <h2 className="text-xl text-gray-700">{project.name}</h2>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Generated: {format(new Date(), "MMMM d, yyyy")}</p>
                <p>Report ID: {project.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          </div>

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
              Project Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-medium">{project.customerName || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium capitalize">{project.status.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{project.locationName || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">Address</p>
                <p className="font-medium">
                  {project.address ? (
                    <>
                      {project.address}<br />
                      {[project.city, project.state].filter(Boolean).join(", ")}
                    </>
                  ) : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium">{format(new Date(project.createdAt), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium">{format(new Date(project.updatedAt), "MMMM d, yyyy")}</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
              Project Summary
            </h3>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{summary.totalOpenings}</p>
                <p className="text-sm text-gray-600">Total Openings</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{summary.completedPercentage}%</p>
                <p className="text-sm text-gray-600">Complete</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">
                  {Object.values(summary.statusCounts).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-sm text-gray-600">Items Tracked</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
              Door Openings ({openings.length})
            </h3>
            {openings.length === 0 ? (
              <p className="text-gray-500 italic">No door openings recorded</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-3 font-semibold">#</th>
                    <th className="text-left p-3 font-semibold">Location</th>
                    <th className="text-left p-3 font-semibold">Floor</th>
                    <th className="text-left p-3 font-semibold">Room</th>
                    <th className="text-left p-3 font-semibold">Door Type</th>
                    <th className="text-left p-3 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {openings.map((opening, index) => (
                    <tr key={opening.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="p-3 font-mono">{opening.openingNumber}</td>
                      <td className="p-3">{opening.location}</td>
                      <td className="p-3">{opening.floor || "—"}</td>
                      <td className="p-3">{opening.room || "—"}</td>
                      <td className="p-3">{opening.doorType || "—"}</td>
                      <td className="p-3">{format(new Date(opening.createdAt), "MMM d, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <footer className="mt-12 pt-6 border-t text-sm text-gray-500 text-center">
            <p>This report was generated by DoorSurvey Pro Client Portal</p>
            <p className="mt-1">
              {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
