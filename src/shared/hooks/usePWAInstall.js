import { useEffect, useState } from 'react';

let _deferredPrompt = null;
const _promptListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    _deferredPrompt = event;
    _promptListeners.forEach((fn) => fn(event));
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _promptListeners.forEach((fn) => fn(null));
  });
}

function isRunningAsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(window.navigator.standalone)
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function usePWAInstall() {
  const [prompt, setPrompt] = useState(_deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(isRunningAsStandalone);
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === 'true',
  );

  useEffect(() => {
    const listener = (event) => {
      setPrompt(event);
      if (!event) setIsInstalled(true);
    };

    _promptListeners.add(listener);
    return () => _promptListeners.delete(listener);
  }, []);

  const install = async () => {
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setPrompt(null);
      setIsInstalled(true);
    }
    return outcome === 'accepted';
  };

  const dismiss = (permanent = false) => {
    if (permanent) {
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
    setIsDismissed(true);
  };

  const isIOSDevice = isIOS();
  const showIOSGuide = isIOSDevice && !isInstalled && !isDismissed;
  const showInstallPrompt = !isIOSDevice && !isInstalled && !isDismissed && prompt !== null;

  return {
    showInstallPrompt,
    showIOSGuide,
    isInstalled,
    isIOSDevice,
    install,
    dismiss,
  };
}
