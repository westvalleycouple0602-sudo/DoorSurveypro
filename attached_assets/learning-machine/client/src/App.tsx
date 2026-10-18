import React, { useState } from 'react'

export default function App(){
  const [projectId,setProjectId]=useState('00000000-0000-0000-0000-000000000000')
  const [doorType,setDoorType]=useState('hinged')
  const [locationLabel,setLocationLabel]=useState('ER Wing A - 102A')
  const [s3Url,setS3Url]=useState('https://example-bucket/tenant-x/proj-y/opening-z/cap-1.jpg')
  const [sha256,setSha256]=useState('0'.repeat(64))
  const [resp,setResp]=useState<any>(null)
  const [server,setServer]=useState('http://localhost:3000')

  async function submit(e:React.FormEvent){
    e.preventDefault()
    const payload = {
      projectId, doorType, locationLabel,
      captures: [{ kind:'photo', s3Url, sha256 }]
    }
    const r = await fetch(`${server}/ingest`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    })
    const j = await r.json()
    setResp(j)
  }

  return (
    <div style={{maxWidth:760,margin:'2rem auto',fontFamily:'Inter, system-ui, sans-serif'}}>
      <h1>DoorSurvey — Capture</h1>
      <p>Post a minimal survey packet to your running server (`/ingest`).</p>
      <form onSubmit={submit} style={{display:'grid',gap:'0.75rem'}}>
        <label>Server URL <input value={server} onChange={e=>setServer(e.target.value)} style={{width:'100%'}}/></label>
        <label>Project ID <input value={projectId} onChange={e=>setProjectId(e.target.value)} style={{width:'100%'}}/></label>
        <label>Door Type <input value={doorType} onChange={e=>setDoorType(e.target.value)} style={{width:'100%'}}/></label>
        <label>Location Label <input value={locationLabel} onChange={e=>setLocationLabel(e.target.value)} style={{width:'100%'}}/></label>
        <fieldset style={{border:'1px solid #ddd',padding:'0.75rem'}}>
          <legend>Capture</legend>
          <label>S3 URL <input value={s3Url} onChange={e=>setS3Url(e.target.value)} style={{width:'100%'}}/></label>
          <label>SHA-256 <input value={sha256} onChange={e=>setSha256(e.target.value)} style={{width:'100%'}}/></label>
        </fieldset>
        <button type="submit">Send to /ingest</button>
      </form>
      {resp && <pre style={{background:'#f7f7f9',padding:'1rem',marginTop:'1rem',borderRadius:8}}>{JSON.stringify(resp,null,2)}</pre>}
    </div>
  )
}
