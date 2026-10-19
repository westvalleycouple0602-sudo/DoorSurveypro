import React, { useState } from 'react'
import { createConfluencePage } from '../api'

export default function DocsTab(){
  const [spaceId, setSpaceId] = useState('')
  const [title, setTitle] = useState('Survey Report')
  const [htmlBody, setHtmlBody] = useState('<p>Door Survey content...</p>')

  const create = async()=>{
    if(!spaceId) return alert('Provide spaceId')
    const res = await createConfluencePage(spaceId, title, htmlBody)
    alert('Created page id ' + (res.id || JSON.stringify(res)))
  }

  return (
    <div className="space-y-3">
      <input value={spaceId} onChange={e=>setSpaceId(e.target.value)} placeholder="Confluence spaceId" className="border px-3 py-2 rounded w-full"/>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Page title" className="border px-3 py-2 rounded w-full"/>
      <textarea value={htmlBody} onChange={e=>setHtmlBody(e.target.value)} rows={6} className="border px-3 py-2 rounded w-full"/>
      <button onClick={create} className="px-3 py-2 bg-blue-600 text-white rounded">Publish to Confluence</button>
    </div>
  )
}
