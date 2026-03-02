let deferredPrompt = null;

export function initInstall() {
  const btn = document.getElementById('install-btn');
  const iosHint = document.getElementById('ios-install-hint');

  if (!btn) return;

  // iOS detection — no beforeinstallprompt on Safari
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;

  if (isIos && !isStandalone && iosHint) {
    iosHint.hidden = false;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      btn.hidden = true;
    }
    deferredPrompt = null;
  });

  window.addEventListener('appinstalled', () => {
    btn.hidden = true;
    if (iosHint) iosHint.hidden = true;
  });
}
