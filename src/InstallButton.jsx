import { useEffect, useState } from 'react'

function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
  )

  useEffect(() => {
    const handleBeforeInstallPrompt = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return

    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (installed) return null

  if (installPrompt) {
    return (
      <button className="install-button" type="button" onClick={installApp}>
        Install GlowCart
      </button>
    )
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
  if (isIos) {
    return (
      <button
        className="install-ios-button"
        type="button"
        onClick={() => alert('On iOS Safari, tap Share, then choose Add to Home Screen.')}
      >
        Add to Home Screen
      </button>
    )
  }

  return null
}

export default InstallButton
