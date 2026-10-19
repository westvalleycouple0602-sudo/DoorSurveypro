'use client';
import { useTheme } from 'next-themes'; import { useEffect, useState } from 'react'; import { Sun, Moon } from 'lucide-react';
export function ModeToggle(){ const { theme, setTheme, systemTheme } = useTheme(); const [m,setM]=useState(false); useEffect(()=>setM(true),[]); if(!m) return null;
  const current = theme==='system'? systemTheme: theme;
  return (<button onClick={()=> setTheme(current==='dark'?'light':'dark')} className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm hover:bg-accent" title="Toggle theme" aria-label="Toggle theme">
    {current==='dark'? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}<span className="hidden sm:inline">{current==='dark'?'Light':'Dark'}</span>
  </button>);
}