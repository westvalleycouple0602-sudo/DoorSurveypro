import React, { useState } from 'react'
import { createGoogleEvent, createMsEvent } from '../api'

export default function ScheduleTab(){
  const [summary, setSummary] = useState('Site Visit')
  const [start, setStart] = useState('2025-10-25T18:00:00Z')
  const [end, setEnd] = useState('2025-10-25T19:00:00Z')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [calendarId, setCalendarId] = useState('primary')

  const g = async()=>{
    const res = await createGoogleEvent(calendarId, summary, start, end, location, description)
    alert('Google event created: ' + (res.htmlLink || res.id))
  }
  const ms = async()=>{
    const res = await createMsEvent(summary, start, end, location, description)
    alert('Outlook event created: ' + (res.id || 'ok'))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border px-3 py-2 rounded" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Summary"/>
        <input className="border px-3 py-2 rounded" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location"/>
        <input className="border px-3 py-2 rounded" value={start} onChange={e=>setStart(e.target.value)} placeholder="Start ISO"/>
        <input className="border px-3 py-2 rounded" value={end} onChange={e=>setEnd(e.target.value)} placeholder="End ISO"/>
      </div>
      <textarea className="border px-3 py-2 rounded w-full" rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description"/>

      <div className="flex items-center gap-2">
        <input className="border px-3 py-2 rounded" value={calendarId} onChange={e=>setCalendarId(e.target.value)} placeholder="Google calendarId (primary)"/>
        <button onClick={g} className="px-3 py-2 bg-emerald-600 text-white rounded">Create in Google</button>
        <button onClick={ms} className="px-3 py-2 bg-indigo-600 text-white rounded">Create in Outlook</button>
      </div>
    </div>
  )
}
