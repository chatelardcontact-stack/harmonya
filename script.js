/* =============================================
   HARMONYA — Premium Script
   ============================================= */

// ── Custom Cursor ─────────────────────────────
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');
let mx = 0, my = 0, fx = 0, fy = 0;

if (cursor && follower) {
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  function animateFollower() {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Hover state on interactive elements
  document.querySelectorAll('a, button, .soin-card, .gift-item, .pillar, .review-card').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

// ── Navbar scroll ─────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Burger menu ───────────────────────────────
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ── Scroll reveal ─────────────────────────────
const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

// ── Hero text reveal on load ──────────────────
window.addEventListener('load', () => {
  document.querySelectorAll('.hero-content .reveal-up').forEach(el => {
    setTimeout(() => el.classList.add('visible'), parseInt(el.style.getPropertyValue('--d') || '0'));
  });
});

// ── Service tabs ──────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// ── Reviews slider ────────────────────────────
const track = document.getElementById('reviewsTrack');
const dotsContainer = document.getElementById('revDots');
const cards = track ? track.querySelectorAll('.review-card') : [];
let current = 0;
let autoInterval;

function getVisible() {
  const w = window.innerWidth;
  if (w > 1100) return 3;
  if (w > 700)  return 2;
  return 1;
}

function buildDots() {
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  const total = Math.ceil(cards.length / getVisible());
  for (let i = 0; i < total; i++) {
    const d = document.createElement('button');
    d.className = 'rev-dot' + (i === current ? ' active' : '');
    d.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(d);
  }
}

function goTo(idx) {
  const total = Math.ceil(cards.length / getVisible());
  current = (idx + total) % total;
  const cardW = cards[0] ? cards[0].offsetWidth + 24 : 404;
  track.style.transform = `translateX(-${current * cardW * getVisible()}px)`;
  dotsContainer.querySelectorAll('.rev-dot').forEach((d, i) => d.classList.toggle('active', i === current));
}

function startAuto() {
  clearInterval(autoInterval);
  autoInterval = setInterval(() => goTo(current + 1), 4500);
}

if (track && cards.length) {
  buildDots();
  startAuto();
  document.getElementById('revNext')?.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  document.getElementById('revPrev')?.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  window.addEventListener('resize', () => { buildDots(); goTo(0); });
}

// ── Smooth scroll ─────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
    }
  });
});

// ── Contact form ──────────────────────────────
document.getElementById('contactForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const text = btn.querySelector('.btn-submit-text');
  text.textContent = 'Message envoyé ✓';
  btn.style.background = '#4a7c59';
  setTimeout(() => {
    text.textContent = 'Envoyer le message';
    btn.style.background = '';
    e.target.reset();
  }, 3500);
});

// ── Gift card hover parallax ──────────────────
document.querySelectorAll('.gift-item').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - .5) * 10;
    const y = ((e.clientY - r.top)  / r.height - .5) * 10;
    card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-3px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ── Soin card tilt + click to book ────────────
const MASSAGE_NAME_MAP = {
  'découverte': 'decouverte',
  'immersion':  'immersion',
  'évasion':    'evasion',
  'cocooning':  'cocooning',
  'massage duo':'duo',
  'duo':        'duo'
};

document.querySelectorAll('.soin-card').forEach(card => {
  // Tilt
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - .5) * 6;
    const y = ((e.clientY - r.top)  / r.height - .5) * 6;
    card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });

  // Click → booking modal
  card.style.cursor = 'pointer';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.addEventListener('click', () => {
    if (typeof openBookingModal !== 'function') return;
    const panel   = card.closest('.tab-panel');
    const panelId = panel ? panel.id.replace('panel-', '') : null;
    if (!panelId) return;

    if (panelId === 'massages') {
      // Each card opens its specific massage
      const name = (card.querySelector('.soin-name')?.textContent || '').toLowerCase().trim();
      openBookingModal(MASSAGE_NAME_MAP[name] || 'massages');
    } else {
      // Drainage panels: any card click opens that panel's booking
      openBookingModal(panelId);
    }
  });
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') card.click(); });
});

// ── Number counter (hero stars / stats) ───────
function animateValue(el, end, duration = 1400) {
  let start = 0;
  const step = end / (duration / 16);
  const tick = () => {
    start = Math.min(start + step, end);
    el.textContent = start.toFixed(start < end ? 0 : 0);
    if (start < end) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
