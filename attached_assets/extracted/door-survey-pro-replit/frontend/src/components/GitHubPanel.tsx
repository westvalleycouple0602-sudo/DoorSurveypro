
import React, { useState } from 'react'
import { githubSaveInstallation, githubExport, githubDispatch, githubRelease } from '../api'

export default function GitHubPanel(){
  const [installationId, setInstallationId] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('survey/DSP-123/2025-10-25')
  const [workflow, setWorkflow] = useState('door-survey-validate.yml')
  const [tag, setTag] = useState('v2025.10.25')

  const save = async()=>{
    if(!installationId || !owner || !repo) return alert('Fill installationId/owner/repo')
    await githubSaveInstallation(parseInt(installationId,10), owner, repo)
    alert('Saved default GitHub installation & repo')
  }

  const exportPR = async()=>{
    const files = [{
      path: `reports/DSP-123/2025-10-25/summary.json`,
      content: JSON.stringify({ sample: true, project: 'DSP-123', date: '2025-10-25' }, null, 2),
      isBase64: false
    }]
    const res = await githubExport({ owner, repo, base:'main', branch, files })
    alert('PR opened: ' + (res.pr?.html_url || 'ok'))
  }

  const dispatch = async()=>{
    const res = await githubDispatch(owner, repo, workflow, { project: 'DSP-123', datePath: 'reports/DSP-123/2025-10-25' }, 'main')
    alert('Workflow dispatched')
  }

  const release = async()=>{
    const content = btoa('hello world from door survey pro\n')
    const res = await githubRelease({ owner, repo, tag, name: tag, body: 'Survey Pack', assets: [{ filename:'hello.txt', content }] })
    alert('Release: ' + (res.release?.html_url || 'ok'))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="border px-3 py-2 rounded" value={installationId} onChange={e=>setInstallationId(e.target.value)} placeholder="Installation ID"/>
        <input className="border px-3 py-2 rounded" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Owner (org/user)"/>
        <input className="border px-3 py-2 rounded" value={repo} onChange={e=>setRepo(e.target.value)} placeholder="Repo"/>
      </div>
      <button onClick={save} className="px-3 py-2 bg-gray-800 text-white rounded">Save Installation</button>

      <hr className="my-2"/>

      <input className="border px-3 py-2 rounded w-full" value={branch} onChange={e=>setBranch(e.target.value)} placeholder="Branch name"/>
      <button onClick={exportPR} className="px-3 py-2 bg-blue-600 text-white rounded">Export to GitHub (PR)</button>

      <hr className="my-2"/>

      <input className="border px-3 py-2 rounded w-full" value={workflow} onChange={e=>setWorkflow(e.target.value)} placeholder="Workflow file e.g. .github/workflows/door-survey-validate.yml"/>
      <button onClick={dispatch} className="px-3 py-2 bg-indigo-600 text-white rounded">Validate & Build (Actions)</button>

      <hr className="my-2"/>

      <input className="border px-3 py-2 rounded w-full" value={tag} onChange={e=>setTag(e.target.value)} placeholder="Release tag"/>
      <button onClick={release} className="px-3 py-2 bg-emerald-600 text-white rounded">Create Release</button>
    </div>
  )
}
