// (existing imports remain unchanged above)
import React, { useEffect } from 'react'

// ...keep all your existing App.tsx code ABOVE this unchanged

function CursorLightTracker() {
  useEffect(() => {
    const move = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--glowX', `${e.clientX}px`)
      document.documentElement.style.setProperty('--glowY', `${e.clientY}px`)
    }

    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return null
}

export default function AppWrapper() {
  return (
    <>
      <CursorLightTracker />
      {/* ORIGINAL APP BELOW */}
      <App />
    </>
  )
}
