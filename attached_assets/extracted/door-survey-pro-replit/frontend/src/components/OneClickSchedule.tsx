
import React, { useState } from 'react'
import { scheduleSiteVisit, resolveConfluenceSpaceIdByKey, uploadConfluenceAttachments, listGoogleCalendars, listMsCalendars } from '../api'

export default function OneClickSchedule(){
  const [projectKey, setProjectKey] = useState('DSP')
  const [summary, setSummary] = useState('Site visit – 123 Main St')
  const [description, setDescription] = useState('Measure door openings')
  const [startISO, setStartISO] = useState('2025-10-26T18:00:00Z')
  const [endISO, setEndISO] = useState('2025-10-26T19:00:00Z')
  const [location, setLocation] = useState('123 Main St')
  const [calendarProvider, setCalendarProvider] = useState<'google'|'microsoft'>('google')
  const [calendars, setCalendars] = useState<{id:string; label:string}[]>([])
  const [calendarId, setCalendarId] = useState('primary')
  const [spaceKey, setSpaceKey] = useState('') // Confluence space KEY
  const [spaceId, setSpaceId] = useState('') // Confluence spaceId
  const [parentId, setParentId] = useState('')
  const [files, setFiles] = useState<File[]>([])

  React.useEffect(()=>{
    (async()=>{
      try{
        if(calendarProvider==='google'){
          const res = await listGoogleCalendars();
          setCalendars((res.items||[]).map(c=>({id:c.id, label:c.summary||c.id})));
          if(res.items?.length){ setCalendarId(res.items[0].id) }
        } else {
          const res = await listMsCalendars();
          setCalendars((res.items||[]).map(c=>({id:c.id, label:c.name||c.id})));
        }
      }catch(e){ console.error(e); }
    })();
  }, [calendarProvider])


const resolveSpace = async()=>{
  if(!spaceId && spaceKey){
    const res = await resolveConfluenceSpaceIdByKey(spaceKey)
    setSpaceId(res.spaceId)
    alert('Resolved spaceId: ' + res.spaceId)
  }
}
  const go = async()=>{
    const res = await scheduleSiteVisit({
      projectKey, summary, description, startISO, endISO, location,
      calendarProvider,
      calendarId: calendarProvider==='google' ? calendarId : undefined,
      confluenceSpaceId: spaceId || undefined,
      confluenceParentId: parentId || undefined
    })
    if (files.length && res.confluence && res.confluence.id){
      try { await uploadConfluenceAttachments(res.confluence.id, files); } catch(e){ console.error(e); }
    }
    alert('Created!\n' + JSON.stringify(res, null, 2))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border px-3 py-2 rounded" value={projectKey} onChange={e=>setProjectKey(e.target.value)} placeholder="Jira Project Key"/>
        <input className="border px-3 py-2 rounded" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Summary"/>
        <input className="border px-3 py-2 rounded" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location"/>
        <input className="border px-3 py-2 rounded" value={startISO} onChange={e=>setStartISO(e.target.value)} placeholder="Start ISO"/>
        <input className="border px-3 py-2 rounded" value={endISO} onChange={e=>setEndISO(e.target.value)} placeholder="End ISO"/>
        <select className="border px-3 py-2 rounded" value={calendarProvider} onChange={e=>setCalendarProvider(e.target.value as any)}>
          <option value="google">Google Calendar</option>
          <option value="microsoft">Outlook (Microsoft)</option>
        </select>
        {calendarProvider==='google' && (
          <select className="border px-3 py-2 rounded" value={calendarId} onChange={e=>setCalendarId(e.target.value)}>
            {calendars.map(c=> <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}
      </div>
      <textarea className="border px-3 py-2 rounded w-full" rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border px-3 py-2 rounded" value={spaceId} onChange={e=>setSpaceId(e.target.value)} placeholder="Confluence spaceId (optional)"/>
        <input className="border px-3 py-2 rounded" value={parentId} onChange={e=>setParentId(e.target.value)} placeholder="Confluence parentId (optional)"/>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Attachments (optional):</label>
        <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files || []))} />
      </div>
      <button onClick={go} className="px-4 py-2 bg-orange-600 text-white rounded-lg">One‑click: Create Issue + Event + Page</button>
    </div>
  )
}
