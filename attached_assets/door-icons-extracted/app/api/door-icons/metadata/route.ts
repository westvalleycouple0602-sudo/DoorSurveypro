import { NextResponse } from "next/server"; import path from "path"; import fs from "fs/promises";
export const revalidate = 300;
export async function GET(){ try{ const pack = path.join(process.cwd(),"public","door_icons_pack"); const raw = await fs.readFile(path.join(pack,"metadata.json"),"utf8");
  const data = JSON.parse(raw); const base="/door_icons_pack"; const normalized = data.map((m:any)=>({...m, icon: String(m.icon).startsWith("http")? m.icon : `${base}/${m.icon}`}));
  return NextResponse.json(normalized, { headers: { "Cache-Control": "public, max-age=300" } }); } catch(e:any){ return NextResponse.json({ error: e?.message||"metadata load failed" }, { status: 500 }); } }