import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, ExternalLink, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CodeReference() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-4 sm:space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Book className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Code Reference & Standards</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive reference for building codes, life-safety standards, and automation guidance for commercial door systems
        </p>
      </div>

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes" data-testid="tab-codes">Model Codes</TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-automation">Automation & Access Control</TabsTrigger>
          <TabsTrigger value="jurisdiction" data-testid="tab-jurisdiction">Jurisdiction Lookup</TabsTrigger>
          <TabsTrigger value="checklists" data-testid="tab-checklists">Checklists</TabsTrigger>
        </TabsList>

        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Major Model Codes & Standards</CardTitle>
              <CardDescription>
                Key building codes and standards for commercial door systems, hardware, and life safety
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-l-primary pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">International Building Code (IBC)</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Means of egress, permitted special locking arrangements, panic hardware, clearances and required operation. 
                        See Chapter 10 for means-of-egress requirements and special locking provisions.
                      </p>
                      <a 
                        href="https://codes.iccsafe.org/content/IBC2021P2/chapter-10-means-of-egress" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                        data-testid="link-ibc"
                      >
                        IBC Chapter 10 - ICC <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Badge variant="outline">IBC</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-destructive pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">NFPA 101 — Life Safety Code</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Egress, limitations on locking in the means of egress, delayed egress, and other life-safety restrictions 
                        relevant to electrically locked openings.
                      </p>
                      <a 
                        href="https://www.nfpa.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                        data-testid="link-nfpa101"
                      >
                        NFPA.org (search NFPA 101) <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Badge variant="outline">NFPA 101</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-destructive pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">NFPA 80 — Fire Doors and Opening Protectives</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Installation, labeling, required annual inspection and maintenance for fire doors, frames, and hardware. 
                        Critical for fire-rated openings.
                      </p>
                      <a 
                        href="https://www.nfpa.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                        data-testid="link-nfpa80"
                      >
                        NFPA.org (search NFPA 80) <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Badge variant="outline">NFPA 80</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-primary pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">2010 ADA Standards & Access Board Guidance</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Technical requirements for door maneuvering clearances, threshold heights, maximum opening forces, and 
                        power-operated door controls (public accommodations & government facilities).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <a 
                          href="https://www.ada.gov/law-and-regs/design-standards/2010-stds/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                          data-testid="link-ada"
                        >
                          ADA 2010 Standards <ExternalLink className="w-3 h-3" />
                        </a>
                        <a 
                          href="https://www.access-board.gov/ada/guides/chapter-4-entrances-doors-and-gates/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                          data-testid="link-access-board"
                        >
                          Access Board Guide <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <Badge variant="outline">ADA</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-primary pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">ANSI/BHMA A156 Series</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Performance and test standards for builders hardware (locks, exit devices, closers, hinges, power-operated doors, etc.). 
                        Use specific A156 parts for the listed hardware type.
                      </p>
                      <a 
                        href="https://buildershardware.com/ANSI-BHMA-Standards" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                        data-testid="link-bhma"
                      >
                        ANSI/BHMA Standards Overview <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Badge variant="outline">ANSI/BHMA</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-primary pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">UL Standards for Doors & Access Control</h3>
                      <p className="text-sm text-muted-foreground mb-2">Important UL standards:</p>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4 mb-2">
                        <li>• UL 10B / UL 10C / NFPA 252 — Fire testing for door assemblies</li>
                        <li>• UL 1784 — Air leakage / smoke testing of door assemblies</li>
                        <li>• UL 294 — Access Control System Units (electrified locks, control panels, readers, delayed/controlled egress)</li>
                      </ul>
                      <a 
                        href="https://www.ul.com/news/proper-application-ul-standards-controlled-or-delayed-egress-locking-devices-ul-294-1034" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                        data-testid="link-ul"
                      >
                        UL 294 Access Control Guidance <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <Badge variant="outline">UL</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-primary pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">OSHA</h3>
                      <p className="text-sm text-muted-foreground">
                        Workplace exit route and egress maintenance requirements (employer responsibilities, exit routes, and door functionality).
                      </p>
                    </div>
                    <Badge variant="outline">OSHA</Badge>
                  </div>
                </div>

                <div className="border-l-4 border-l-primary pl-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Government Procurement Specs</h3>
                      <p className="text-sm text-muted-foreground">
                        UFGS / agency specs (e.g., UFGS 08 71 00 Door Hardware) used on many federal projects — useful for spec language 
                        that ties standards together.
                      </p>
                    </div>
                    <Badge variant="outline">UFGS</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation & Access Control Design Guidelines</CardTitle>
              <CardDescription>
                Conservative, life-safety-compliant suggestions for electrified hardware and access control systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {[
                    {
                      title: "Use Listed Hardware",
                      icon: CheckCircle,
                      content: "All electrified locks, maglocks, door operators and access-control panels used on egress paths should be UL-listed for their intended use (UL 294 for access control, UL 10C/10B for fire door assemblies where applicable, UL 1784 for smoke control)."
                    },
                    {
                      title: "Egress-First Logic",
                      icon: AlertCircle,
                      content: "Always design systems so that a person can freely exit without credentials, tools, or special knowledge (push-to-exit or panic device that mechanically releases or a supervised sensor or fail-safe release). Any special locking (delayed egress, controlled egress, or access-controlled egress) must meet IBC/NFPA criteria (time delay limits, alarms, signage, and immediate release by fire alarm or local egress action)."
                    },
                    {
                      title: "Integration with Fire Alarm",
                      icon: AlertCircle,
                      content: "Electrified locks and automatic operators on fire-rated or egress doors must release on loss of power and on required fire alarm signals; provide supervised inputs so that fire alarm activates a door release (hardwired or supervised relay per code)."
                    },
                    {
                      title: "Power & Battery Backup",
                      icon: CheckCircle,
                      content: "Provide redundant power (primary + UPS) sized for the lock, operator, controller and auxiliary devices for a minimum hold-open or controlled behavior during power loss (and to meet local AHJ requirements). Supervision, battery health monitoring, and periodic testing are recommended."
                    },
                    {
                      title: "Fail-Safe vs Fail-Secure Logic",
                      icon: CheckCircle,
                      content: "Determine per-door function: egress doors typically use fail-safe releases (unlock on power loss) unless code/permitted hardware and electrified hardware configuration allow fail-secure only with approved delayed/controlled egress and occupant safety measures."
                    },
                    {
                      title: "UL Listing for Each System Component",
                      icon: CheckCircle,
                      content: "Not just the lock: control panels, power supplies, delayed-egress modules and supervised wiring may require listing/testing depending on the locking arrangement and AHJ expectations. Clarify with AHJ early."
                    },
                    {
                      title: "Sensors & Activation Placement",
                      icon: CheckCircle,
                      content: "Motion sensors for automatic doors should be on the egress side where required; push-plates or activation switches must meet ADA mounting heights and operable force limits. Avoid placing sensors or readers in a way that traps occupants in egress flow."
                    },
                    {
                      title: "Documentation & Labeling",
                      icon: FileText,
                      content: "Provide as-built wiring diagrams, UL listing reports for installed devices, product cut sheets, and door hardware schedules noting fire-rated labels and field modifications. Label delayed egress doors and provide visible signage where required."
                    },
                    {
                      title: "Testing & Maintenance",
                      icon: CheckCircle,
                      content: "Implement NFPA 80-required inspections for fire doors and a documented preventive maintenance plan for access control and operators (including annual fire-door inspection records)."
                    },
                    {
                      title: "Local AHJ Coordination",
                      icon: AlertCircle,
                      content: "Model codes are often amended at the state/city level; submit a hardware schedule and locking diagram to the AHJ early (delayed egress and special locking often require approval/permits)."
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <item.icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jurisdiction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>State & Local Code Adoption Lookup</CardTitle>
              <CardDescription>
                Resources for finding the specific building code edition adopted in your jurisdiction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Important Note
                </h4>
                <p className="text-sm text-muted-foreground">
                  Model codes are often amended at the state/city level. Always confirm the exact edition adopted 
                  (e.g., 2018 IBC, 2021 IBC, 2024 IBC) and any local amendments before starting your project.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">ICC Code Adoption Map & Master Adoption Chart</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Interactive and PDF charts showing where model codes are adopted and which edition. 
                    Use this to find adopted I-Codes for a state or local jurisdiction.
                  </p>
                  <a 
                    href="https://www.iccsafe.org/wp-content/uploads/Code_Adoption_Maps.pdf" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                    data-testid="link-icc-maps"
                  >
                    ICC Code Adoption Maps (PDF) <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">California (Title 24)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    California publishes Title 24 (building standards) and state amendments (important for electrified hardware and accessibility). 
                    Check the California Building Standards Commission and local city amendments.
                  </p>
                  <a 
                    href="https://www.dgs.ca.gov/bsc/codes" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                    data-testid="link-california"
                  >
                    California Building Standards <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">New York City</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    NYC maintains its own Construction Codes and amendments (e.g., NYC 2022 Construction Codes). 
                    Consult DOB guidance for door/equipment interpretations.
                  </p>
                  <a 
                    href="https://www.nyc.gov/site/buildings/codes/2022-construction-codes.page" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                    data-testid="link-nyc"
                  >
                    NYC Construction Codes <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Florida</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Florida Building Code and accessibility requirements (state adopted with editions). 
                    Check Florida Building Commission materials.
                  </p>
                  <a 
                    href="https://www.floridabuilding.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:underline inline-flex items-center gap-1"
                    data-testid="link-florida"
                  >
                    Florida Building Code <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">General Approach for Any Jurisdiction</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Use the ICC adoption map to find the base code</li>
                    <li>Check the state building commission website for state amendments</li>
                    <li>Review the municipal building department website for local amendments</li>
                    <li>Contact the local AHJ (Authority Having Jurisdiction) for clarification</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Automation Checklist
                </CardTitle>
                <CardDescription>Copy into spec or BOM for automation projects</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Hardware schedule with BHMA/ANSI spec (A156 part numbers)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>UL listing references for each door assembly or device (UL file numbers)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Wiring & power diagram showing fire alarm interlock and UPS</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Door labeling: fire rating, delayed egress signage, panic hardware locations</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Test plan: functional test after install, NFPA 80 inspection report, annual maintenance plan</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  AHJ Submission Checklist
                </CardTitle>
                <CardDescription>Documents to submit to building/fire department</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Door hardware schedule & cut sheets</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Shop drawings showing wiring, power supplies, and control schematics</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Manufacturer UL listing documents for products used</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Fire door inspection & test reports (NFPA 80) after installation</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Signage plan for any special locking arrangements (delayed egress)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Reference Links</CardTitle>
              <CardDescription>High-value resources for door professionals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { label: "IBC Chapter 10 — Means of Egress", url: "https://codes.iccsafe.org/content/IBC2021P2/chapter-10-means-of-egress" },
                  { label: "NFPA 80 — Fire Doors", url: "https://www.nfpa.org/" },
                  { label: "NFPA 101 — Life Safety Code", url: "https://www.nfpa.org/" },
                  { label: "ADA 2010 Standards", url: "https://www.ada.gov/law-and-regs/design-standards/2010-stds/" },
                  { label: "ANSI/BHMA A156 Series", url: "https://buildershardware.com/ANSI-BHMA-Standards" },
                  { label: "UL 294 Access Control", url: "https://www.ul.com/news/proper-application-ul-standards-controlled-or-delayed-egress-locking-devices-ul-294-1034" },
                  { label: "ICC Code Adoption Maps", url: "https://www.iccsafe.org/wp-content/uploads/Code_Adoption_Maps.pdf" },
                  { label: "California Title 24", url: "https://www.dgs.ca.gov/bsc/codes" },
                  { label: "NYC Construction Codes", url: "https://www.nyc.gov/site/buildings/codes/2022-construction-codes.page" },
                  { label: "Florida Building Code", url: "https://www.floridabuilding.org/" }
                ].map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover-elevate active-elevate-2 text-sm group"
                    data-testid={`quick-link-${index}`}
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
