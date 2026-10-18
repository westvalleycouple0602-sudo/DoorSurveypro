'use client';
import React, { useState } from "react"; import DoorIconPicker from "@/components/DoorIconPicker"; import { DoorIconPackImporter } from "@/components/DoorIconPackImporter"; import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; import { Separator } from "@/components/ui/separator";
export default function DoorIconsPreviewPage(){ const [sel,setSel]=useState<any[]>([]);
  return (<div className="container mx-auto max-w-7xl p-6 space-y-6">
    <h1 className="text-2xl font-bold tracking-tight">Door Icons Preview</h1><p className="text-muted-foreground">Browse the merged icon pack, filter by attributes, and optionally upload a new pack.</p>
    <Card><CardHeader><CardTitle>Icon Selector</CardTitle></CardHeader><CardContent><DoorIconPicker basePath="/door_icons_pack" metadataUrl="/api/door-icons/metadata" multiSelect onChange={(_ids, items)=>setSel(items)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Selected</CardTitle></CardHeader><CardContent>{sel.length===0? <div className="text-sm text-muted-foreground">No items selected yet.</div> : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{sel.map((m:any)=>(<div key={m.id} className="border rounded-xl p-3 text-sm"><div className="font-medium line-clamp-1">{m.label}</div><img src={m.icon} alt={m.label} className="mt-2 h-24 w-full object-contain"/></div>))}</div>
    )}</CardContent></Card>
    <Separator />
    <Card><CardHeader><CardTitle>Import a New Pack (.zip)</CardTitle></CardHeader><CardContent><DoorIconPackImporter uploadUrl="/api/door-icons/upload" /><p className="text-xs text-muted-foreground mt-3">Uploads replace the current pack in <code>public/door_icons_pack</code>. After upload, refresh this page to see new icons.</p></CardContent></Card>
  </div>); }