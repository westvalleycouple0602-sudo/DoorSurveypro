import React, { useEffect, useRef, useState } from "react";

type Opening = { id:string; code:string; x:number; y:number; label?:string; type?:string; status?:string; thumbUrl?:string };
type FloorPlan = { id:string; name:string; imageUrl:string; openings: Opening[] };

export default function FloorPlanViewer_Sample({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<FloorPlan|null>(null);
  const [selected, setSelected] = useState<Opening|null>(null);
  useEffect(() => { fetch(`/api/floorplans/${planId}`, { headers: { Authorization: "Bearer TOKEN", "X-Tenant-Id": "TENANT" } }).then(r=>r.json()).then(setPlan) }, [planId]);
  if (!plan) return <div style={{padding:16}}>Loading…</div>;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16, height:"80vh" }}>
      <div style={{ position:"relative", overflow:"auto", border:"1px solid #e5e7eb", borderRadius:12 }}>
        <img src={plan.imageUrl} alt={plan.name} style={{ display:"block", maxWidth:"100%" }} />
        {plan.openings.map(o => (
          <button key={o.id} onClick={()=>setSelected(o)}
            style={{ position:"absolute", left:`${o.x*100}%`, top:`${o.y*100}%`, transform:"translate(-50%, -100%)", borderRadius:9999, border:"1px solid #cbd5e1", background:"#fff", width:32, height:32 }}>
            <span style={{ fontSize:10, fontWeight:700 }}>{o.code.replace(/[^0-9A-Z]/g,"").slice(-3) || "NEW"}</span>
          </button>
        ))}
      </div>
      <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:16 }}>
        <div style={{ fontWeight:600 }}>{plan.name}</div>
        {selected ? (
          <div style={{ marginTop:12 }}>
            <div style={{ fontWeight:600 }}>{selected.code}</div>
            <div style={{ fontSize:12, color:"#64748b" }}>{selected.type || "Opening"}</div>
            {selected.thumbUrl && <img src={selected.thumbUrl} style={{ width:"100%", borderRadius:8, marginTop:8 }} />}
          </div>
        ) : <div style={{ fontSize:12, color:"#64748b", marginTop:8 }}>Click a marker to view details.</div>}
      </div>
    </div>
  );
}
