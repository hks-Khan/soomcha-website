/* Soomcha — shared behaviour: opening once per session, reveal on scroll. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');

  // the head script marks returning visits with .seen; drop the panel after it plays
  const opening = document.querySelector('.opening');
  if (opening) {
    try { sessionStorage.setItem('soomcha-opened', '1'); } catch (e) { /* storage blocked: opening simply plays again */ }
    opening.addEventListener('animationend', (e) => { if (/^opening-(out|skip)$/.test(e.animationName)) opening.remove(); });
    opening.addEventListener('click', () => opening.classList.add('skip'), { once: true });
  }

  // colour theme: follow the OS until the visitor picks one, then remember it
  const light = matchMedia('(prefers-color-scheme: light)');
  const toggle = document.querySelector('.theme-toggle');
  const current = () => root.dataset.theme || (light.matches ? 'light' : 'dark');
  const paint = () => {
    const now = current();
    root.dataset.themeNow = now;
    if (toggle) toggle.setAttribute('aria-label', now === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  };
  paint();
  light.addEventListener('change', paint);
  if (toggle) toggle.addEventListener('click', () => {
    root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('soomcha-theme', root.dataset.theme); } catch (e) { /* not remembered */ }
    paint();
  });

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
})();
