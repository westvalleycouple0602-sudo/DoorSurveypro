import React from 'react'
import Assistant from './components/Assistant'

export default function App() {
  return (
    <div style={{ maxWidth: 780, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>DoorSurvey Pro — AI Assistant</h1>
      <p>Ask questions about your openings, run compliance checks, and more.</p>
      <Assistant />
    </div>
  )
}
