import React, { useState } from 'react'
import { getJiraIssues, createJiraIssue } from '../api'

export default function TicketsTab(){
  const [projectKey, setProjectKey] = useState('DSP')
  const [issues, setIssues] = useState<any[]>([])
  const [summary, setSummary] = useState('')

  const load = async()=>{
    const data = await getJiraIssues(projectKey)
    setIssues(data.issues || [])
  }

  const create = async()=>{
    if(!summary) return
    await createJiraIssue(projectKey, summary, 'Created from Door Survey Pro')
    setSummary(''); load()
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={projectKey} onChange={e=>setProjectKey(e.target.value)} placeholder="Jira Project Key" className="border px-3 py-2 rounded w-40"/>
        <button onClick={load} className="px-3 py-2 bg-gray-800 text-white rounded">Load Issues</button>
      </div>

      <div className="flex gap-2 mb-4">
        <input value={summary} onChange={e=>setSummary(e.target.value)} placeholder="New issue summary" className="border px-3 py-2 rounded flex-1"/>
        <button onClick={create} className="px-3 py-2 bg-blue-600 text-white rounded">Create</button>
      </div>

      <ul className="space-y-2">
        {issues.map((it:any)=> (
          <li key={it.id} className="p-3 bg-white rounded-lg border">
            <div className="font-semibold">{it.key} — {it.fields?.summary}</div>
            <div className="text-sm text-gray-600">Status: {it.fields?.status?.name}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
