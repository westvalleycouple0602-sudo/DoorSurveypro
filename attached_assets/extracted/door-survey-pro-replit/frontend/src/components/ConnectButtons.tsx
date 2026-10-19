import React from 'react'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function ConnectButtons(){
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <a href={`${API}/oauth/atlassian/start`} className="px-3 py-2 bg-blue-600 text-white rounded-lg">Connect Jira/Confluence</a>
      <a href={`${API}/oauth/google/start`} className="px-3 py-2 bg-emerald-600 text-white rounded-lg">Connect Google Calendar</a>
      <a href={`${API}/oauth/ms/start`} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">Connect Outlook</a>
    </div>
  )
}
