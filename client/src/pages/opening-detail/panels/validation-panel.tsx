import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { ValidationResults } from "@/components/validation-results";
import { ComplianceForm } from "@/components/compliance-form";
import { useToast } from "@/hooks/use-toast";
import { useOpeningDetail } from "../context";

export default function ValidationPanel() {
  const { opening } = useOpeningDetail();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <ValidationResults opening={opening} />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Building Code Compliance Data
          </CardTitle>
          <CardDescription>
            Enter detailed compliance data for building code validation including jurisdiction, hardware heights, clearances, and electrical specifications. Fields are linked to specific IBC, ADA, and NFPA code requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ComplianceForm
            onSubmit={(data) => {
              toast({
                title: "Compliance data saved",
                description: "Building code compliance data has been recorded for this opening.",
              });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
