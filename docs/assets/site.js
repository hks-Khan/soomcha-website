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

// Product motion: autoplay while visible; preserve an explicit pause.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.promo-media').forEach((figure) => {
    const video = figure.querySelector('video');
    const toggle = figure.querySelector('.video-toggle');
    if (!video || !toggle) return;
    let visible = false;
    let pausedByUser = false;
    let manuallyStarted = false;
    video.muted = true;
    toggle.hidden = false;
    const paint = () => {
      toggle.classList.toggle('is-paused', video.paused);
      toggle.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    };
    const sync = () => {
      if (!visible || document.hidden || pausedByUser || (reduced.matches && !manuallyStarted)) {
        video.pause();
      } else {
        video.play().catch(paint);
      }
      paint();
    };
    toggle.addEventListener('click', () => {
      if (video.paused) {
        pausedByUser = false;
        manuallyStarted = true;
        video.play().catch(paint);
      } else {
        pausedByUser = true;
        video.pause();
      }
      paint();
    });
    video.addEventListener('play', paint);
    video.addEventListener('pause', paint);
    reduced.addEventListener('change', () => { manuallyStarted = false; sync(); });
    document.addEventListener('visibilitychange', sync);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.2 }).observe(video);
    paint();
  });
})();

// Waitlist submissions never fall back to a URL query containing the email.
(() => {
  document.querySelectorAll('[data-waitlist]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const status = form.querySelector('.form-status');
      const button = form.querySelector('button[type="submit"]');
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        status.textContent = 'Registration is temporarily unavailable. Please try again later.';
        return;
      }
      button.disabled = true;
      status.textContent = 'Joining…';
      const data = new FormData(form);
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.get('email'), consent: data.get('consent') === 'on', website: data.get('website') }),
          signal: AbortSignal.timeout(20000)
        });
        const result = await response.json();
        if (!response.ok || !result.saved) throw new Error(result.error || 'Please try again later.');
        status.textContent = result.confirmationSent
          ? 'You’re on the list. Check your inbox for a confirmation email.'
          : 'You’re on the list. Your confirmation email hasn’t been sent yet. Please try again later or contact support@soomcha.com.';
        if (result.confirmationSent) form.reset();
      } catch (error) {
        status.textContent = error.name === 'TimeoutError'
          ? 'This is taking longer than expected. Please try again.'
          : 'We couldn’t complete your request. Please try again later.';
      } finally {
        button.disabled = false;
      }
    });
  });
})();

// Aquach: seven original screens in one layered, swipeable sequence.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-screen-deck]').forEach((deck) => {
    const cards = [...deck.querySelectorAll('.deck-card')];
    let index = 0, visible = false, hovered = false, focused = false, timer;
    let gesture = null;
    const schedule = (delay = 4500) => {
      clearTimeout(timer);
      if (!visible || hovered || focused || document.hidden || reduced.matches) return;
      timer = setTimeout(() => show(index + 1), delay);
    };
    const show = (next, manual = false) => {
      index = (next + cards.length) % cards.length;
      cards.forEach((card, i) => {
        let offset = (i - index + cards.length) % cards.length;
        if (offset > cards.length / 2) offset -= cards.length;
        card.dataset.position = String(offset);
        card.setAttribute('aria-hidden', String(offset !== 0));
      });
      deck.dataset.activeIndex = String(index);
      schedule(manual ? 9000 : 4500);
    };
    deck.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      hovered = true; schedule();
    });
    deck.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      hovered = false; schedule();
    });
    deck.addEventListener('focusin', () => { focused = true; schedule(); });
    deck.addEventListener('focusout', () => { focused = false; schedule(); });
    deck.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
    });
    deck.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const card = event.target.closest('.deck-card');
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, card: cards.indexOf(card) };
      clearTimeout(timer);
      deck.setPointerCapture(event.pointerId);
    });
    deck.addEventListener('pointerup', (event) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const { x, y, card } = gesture;
      gesture = null;
      const dx = event.clientX - x, dy = event.clientY - y;
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), true);
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && card >= 0) show(card === index ? index + 1 : card, true);
      else schedule(9000);
    });
    deck.addEventListener('pointercancel', () => { gesture = null; schedule(9000); });
    document.addEventListener('visibilitychange', () => schedule());
    reduced.addEventListener('change', () => schedule());
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: .25 }).observe(deck);
    show(0);
  });
})();
