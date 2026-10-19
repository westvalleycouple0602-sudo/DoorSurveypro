import React from 'react'
import ProjectManagement from './components/ProjectManagement'

export default function App(){
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Door Survey Pro – Project Management</h1>
        <ProjectManagement />
      </div>
    </div>
  )
}
