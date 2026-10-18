import React, { useMemo } from "react";
import { DoorScanFlow, TenantCtx, buildContext } from "@doorsurvey/scan-react";

export default function App() {
  const tenant = { id: "acme", name: "ACME Doors", locale: "en-US", flags: { voice: false, subtitles: true } };
  const user = { id: "u_123", email: "tech@acme.com", role: "surveyor" as const };
  const ctx = useMemo(() => buildContext(tenant as any, user as any), []);
  return (
    <TenantCtx.Provider value={ctx as any}>
      <div style={{padding: 20, fontFamily:"Inter, system-ui, sans-serif"}}>
        <DoorScanFlow onComplete={(payload) => console.log("complete", payload)} />
      </div>
    </TenantCtx.Provider>
  );
}
