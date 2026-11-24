import { useNetworkStatus } from '../hooks/useNetworkStatus.js'

export default function OfflineBanner() {
  const { isOnline } = useNetworkStatus()
  if (isOnline) return null

  return (
    <aside className="offline-banner" role="status">
      You are offline. Previously loaded products and your saved cart are available; checkout and account actions need a connection.
    </aside>
  )
}
