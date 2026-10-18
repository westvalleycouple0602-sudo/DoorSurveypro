import React, { useState } from 'react'

export default function Assistant() {
  const [q, setQ] = useState('Show all fire-rated doors on floor 2 missing closers.')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function ask() {
    setLoading(true)
    try {
      const r = await fetch('/ai/sql-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      })
      const data = await r.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <label style={{ fontWeight: 600 }}>Ask your project:</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type a question..."
        style={{ padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
      />
      <button onClick={ask} disabled={loading} style={{ padding: '10px 14px', borderRadius: 8 }}>
        {loading ? 'Thinking…' : 'Ask'}
      </button>
      {result && (
        <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 8, overflow: 'auto' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
