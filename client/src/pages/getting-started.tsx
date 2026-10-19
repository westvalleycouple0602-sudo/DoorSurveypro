import { GettingStartedWizard } from "@/components/getting-started-wizard";

export default function GettingStarted() {
  return (
    <div className="container max-w-2xl py-8" data-testid="page-getting-started">
      <h1 className="sr-only" data-testid="text-getting-started-title">Getting Started</h1>
      <GettingStartedWizard />
    </div>
  );
}
