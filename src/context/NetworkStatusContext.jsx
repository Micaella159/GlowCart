import { useEffect, useState } from 'react'
import { NetworkStatusContext } from './networkStatus.js'

export function NetworkStatusProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const setOnline = () => setIsOnline(true)
    const setOffline = () => setIsOnline(false)

    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  }, [])

  return (
    <NetworkStatusContext.Provider value={{ isOnline }}>
      {children}
    </NetworkStatusContext.Provider>
  )
}
