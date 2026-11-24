import { useContext } from 'react'
import { NetworkStatusContext } from '../context/networkStatus.js'

export function useNetworkStatus() {
  const value = useContext(NetworkStatusContext)
  if (!value) throw new Error('useNetworkStatus must be used inside NetworkStatusProvider.')
  return value
}
