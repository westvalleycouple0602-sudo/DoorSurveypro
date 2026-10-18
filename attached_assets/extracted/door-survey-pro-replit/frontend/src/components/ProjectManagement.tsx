import React, { useState } from 'react'
import ConnectButtons from './ConnectButtons'
import TicketsTab from './TicketsTab'
import DocsTab from './DocsTab'
import ScheduleTab from './ScheduleTab'
import OneClickSchedule from './OneClickSchedule'
import GitHubPanel from './GitHubPanel'

export default function ProjectManagement(){
  const [tab, setTab] = useState<'tickets'|'docs'|'schedule'|'oneclick'|'github'>('tickets')
  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={()=>setTab(k)} className={`px-4 py-2 rounded-lg border ${tab===k? 'bg-white shadow':'bg-gray-100'}`}>{label}</button>
  )

  return (
    <div className="space-y-4">
      <ConnectButtons />
      <div className="flex gap-2">{tabBtn('tickets','Tickets')}{tabBtn('docs','Docs')}{tabBtn('schedule','Schedule')}{tabBtn('oneclick','One‑click')}{tabBtn('github','GitHub')}</div>
      <div className="p-4 bg-white rounded-xl border">
        {tab==='tickets' && <TicketsTab/>}
        {tab==='docs' && <DocsTab/>}
        {tab==='schedule' && <ScheduleTab/>}
        {tab==='oneclick' && <OneClickSchedule/>}
        {tab==='github' && <GitHubPanel/>}
      </div>
    </div>
  )
}
