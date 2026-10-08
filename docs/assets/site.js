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

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
})();
