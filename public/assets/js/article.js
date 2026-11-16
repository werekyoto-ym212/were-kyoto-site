(() => {
  const button = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-nav');
  if (!button || !menu) return;
  // Keep article navigation local while previewing this standalone output folder.
  const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (isLocalPreview) {
    document.querySelectorAll('a[href]').forEach((link) => {
      const target = new URL(link.href, window.location.href);
      if (target.hostname === 'were-kyoto.com') {
        target.protocol = window.location.protocol;
        target.host = window.location.host;
        target.pathname = target.pathname === '/' ? window.location.pathname : target.pathname;
        link.href = `${target.pathname}${target.search}${target.hash}`;
      }
    });
  }

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.hidden = !open;
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });
})();
