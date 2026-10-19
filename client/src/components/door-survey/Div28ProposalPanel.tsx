// client/src/components/door-survey/Div28ProposalPanel.tsx
// Division 28 Proposal Text Display and Export Component

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  FileText,
  Copy,
  Check,
  ChevronRight,
  FileDown,
  Sparkles,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { OpeningProposalPackage, ProposalTextBlock, Div28Feature } from "@shared/types/div28";

interface Div28ProposalPanelProps {
  proposal: OpeningProposalPackage;
  openingLabel?: string;
  onExport?: (format: "text" | "markdown") => void;
}

const FEATURE_LABELS: Record<Div28Feature, string> = {
  ACCESS_CONTROL: "Access Control",
  DOOR_AUTOMATION: "Door Automation",
  CONTROLLED_EGRESS: "Controlled Egress",
  DELAYED_EGRESS: "Delayed Egress",
  SURVEILLANCE: "Video Surveillance",
  INTRUSION_DETECTION: "Intrusion Detection",
  GUN_DETECTION_READY: "Gun Detection Ready",
  LOCKDOWN_CONTROL: "Lockdown Control",
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied",
        description: label ? `${label} copied to clipboard` : "Text copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="h-8 w-8"
      aria-label={`Copy ${label || "text"}`}
      data-testid={`button-copy-${label?.toLowerCase().replace(/\s+/g, "-") || "text"}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

interface ProposalSectionProps {
  title: string;
  body: string;
  features?: Div28Feature[];
}

function ProposalSection({ title, body, features }: ProposalSectionProps) {
  return (
    <div className="space-y-2 p-4 rounded-lg bg-muted/50">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h4 className="font-medium">{title}</h4>
          {features && features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {FEATURE_LABELS[feature]}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <CopyButton text={body} label={title} />
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>
    </div>
  );
}

export function Div28ProposalPanel({
  proposal,
  openingLabel,
  onExport,
}: Div28ProposalPanelProps) {
  const { toast } = useToast();

  const handleExportAll = (format: "text" | "markdown") => {
    if (onExport) {
      onExport(format);
      return;
    }

    let content = "";
    if (format === "markdown") {
      content = `# Division 28 Proposal - ${openingLabel || proposal.openingId}\n\n`;
      content += `## Summary\n${proposal.summary}\n\n`;
      content += `## Base Option\n${proposal.baseOptionText}\n\n`;
      if (proposal.upgradeOptions.length > 0) {
        content += `## Upgrade Options\n`;
        proposal.upgradeOptions.forEach((opt) => {
          content += `### ${opt.title}\n${opt.body}\n\n`;
        });
      }
    } else {
      content = `Division 28 Proposal - ${openingLabel || proposal.openingId}\n\n`;
      content += `SUMMARY:\n${proposal.summary}\n\n`;
      content += `BASE OPTION:\n${proposal.baseOptionText}\n\n`;
      if (proposal.upgradeOptions.length > 0) {
        content += `UPGRADE OPTIONS:\n`;
        proposal.upgradeOptions.forEach((opt) => {
          content += `${opt.title}:\n${opt.body}\n\n`;
        });
      }
    }

    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Exported",
        description: `Proposal copied as ${format === "markdown" ? "Markdown" : "plain text"}`,
      });
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Div 28 Proposal Text</CardTitle>
            <CardDescription>
              Opening: {openingLabel || proposal.openingId}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportAll("text")}
            data-testid="button-export-text"
          >
            <FileDown className="h-4 w-4 mr-1" />
            Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportAll("markdown")}
            data-testid="button-export-markdown"
          >
            <FileDown className="h-4 w-4 mr-1" />
            MD
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" data-testid="tab-proposal-summary">
              Summary
            </TabsTrigger>
            <TabsTrigger value="base" data-testid="tab-proposal-base">
              Base Option
            </TabsTrigger>
            <TabsTrigger value="upgrades" data-testid="tab-proposal-upgrades">
              Upgrades
              {proposal.upgradeOptions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {proposal.upgradeOptions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Executive Summary</h4>
                </div>
                <CopyButton text={proposal.summary} label="Summary" />
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.summary}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="base" className="mt-4">
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Base Configuration</h4>
                </div>
                <CopyButton text={proposal.baseOptionText} label="Base Option" />
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.baseOptionText}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upgrades" className="mt-4">
            {proposal.upgradeOptions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p>No upgrade options recommended for this opening.</p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {proposal.upgradeOptions.map((option, index) => (
                  <AccordionItem
                    key={option.id}
                    value={option.id}
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-2 text-left">
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                        <span className="font-medium">{option.title}</span>
                        {option.appliesToFeatures.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {option.appliesToFeatures.length} feature{option.appliesToFeatures.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <ProposalSection
                        title={option.title}
                        body={option.body}
                        features={option.appliesToFeatures}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default Div28ProposalPanel;
