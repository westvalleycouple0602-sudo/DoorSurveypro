const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export async function getJiraIssues(projectKey: string, jqlExtra?: string){
  const u = new URL(BASE+"/api/jira/issues");
  u.searchParams.set("projectKey", projectKey);
  if (jqlExtra) u.searchParams.set("jqlExtra", jqlExtra);
  const r = await fetch(u.toString());
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createJiraIssue(projectKey: string, summary: string, description: string){
  const r = await fetch(BASE+"/api/jira/issues", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({projectKey, summary, description})});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createConfluencePage(spaceId: string, title: string, htmlBody: string, parentId?: string){
  const r = await fetch(BASE+"/api/confluence/pages", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({spaceId, title, htmlBody, parentId})});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createGoogleEvent(calendarId: string, summary: string, startISO: string, endISO: string, location?: string, description?: string){
  const r = await fetch(BASE+"/api/google/events", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({calendarId, summary, startISO, endISO, location, description})});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createMsEvent(summary: string, startISO: string, endISO: string, location?: string, description?: string){
  const r = await fetch(BASE+"/api/ms/events", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({summary, startISO, endISO, location, description})});
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}


export async function scheduleSiteVisit(payload: {
  projectKey: string;
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  location?: string;
  calendarProvider: 'google'|'microsoft';
  calendarId?: string;
  confluenceSpaceId?: string;
  confluenceParentId?: string|null;
}){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/api/actions/schedule_visit", {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}


export async function resolveConfluenceSpaceIdByKey(key: string){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const u = new URL(BASE+"/api/confluence/space_id");
  u.searchParams.set("key", key);
  const r = await fetch(u.toString());
  if(!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{spaceId: string}>;
}

export async function uploadConfluenceAttachments(pageId: string, files: File[]){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  const r = await fetch(`${BASE}/api/confluence/pages/${pageId}/attachments`, {
    method: 'POST',
    body: fd
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}


export async function listGoogleCalendars(){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/api/google/calendars");
  if(!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{items: {id:string, summary:string}[]}>;
}

export async function listMsCalendars(){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/api/ms/calendars");
  if(!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{items: {id:string, name:string}[]}>;
}


export async function githubSaveInstallation(installation_id:number, owner:string, repo:string){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/github/installation", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({installation_id, owner, repo})});
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
export async function githubExport(payload:any){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/github/export", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
export async function githubDispatch(owner:string, repo:string, workflow:string, inputs:any, ref='main'){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/github/actions/dispatch", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({owner, repo, workflow, inputs, ref})});
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
export async function githubRelease(payload:any){
  const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  const r = await fetch(BASE+"/github/releases", {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
  if(!r.ok) throw new Error(await r.text()); return r.json();
}
