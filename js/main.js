// ============================================================
// SwiftTrack Pro — Main JavaScript (shared across all pages)
// ============================================================

// ── Navbar ──────────────────────────────────────────────────
(function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      navbar.classList.remove('transparent');
    } else {
      navbar.classList.remove('scrolled');
      navbar.classList.add('transparent');
    }
  };
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Hamburger / Mobile nav
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileClose = document.querySelector('.mobile-close');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
  }
  if (mobileClose) {
    mobileClose.addEventListener('click', () => {
      hamburger && hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // Close mobile nav on link click
  document.querySelectorAll('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger && hamburger.classList.remove('open');
      mobileNav && mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Set active nav link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// ── Scroll Animations ────────────────────────────────────────
(function initScrollAnimations() {
  const targets = document.querySelectorAll('[data-animate]');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  targets.forEach(t => observer.observe(t));
})();

// ── Counter Animations ───────────────────────────────────────
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  const startVal = 0;
  const isFloat = target % 1 !== 0;

  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (target - startVal) * ease;
    el.textContent = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = isFloat ? target.toFixed(1) : target.toLocaleString();
  };
  requestAnimationFrame(step);
}

(function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
})();

// ── Testimonials — duplicate for infinite scroll ─────────────
(function initTestimonials() {
  const track = document.querySelector('.testimonials-track');
  if (!track) return;
  const cards = track.innerHTML;
  track.innerHTML = cards + cards; // duplicate for seamless loop
})();

// ── Hero quick-track form ────────────────────────────────────
(function initHeroTrack() {
  const form = document.getElementById('hero-track-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('hero-track-input').value.trim();
    if (code) {
      window.location.href = `track.html?code=${encodeURIComponent(code)}`;
    }
  });
})();

// ── Smooth page transitions ──────────────────────────────────
document.querySelectorAll('a[href]').forEach(link => {
  const href = link.getAttribute('href');
  if (
    !href ||
    href.startsWith('#') ||
    href.startsWith('http') ||
    href.startsWith('mailto') ||
    href.startsWith('tel') ||
    link.hasAttribute('data-no-transition')
  ) return;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity .3s ease';
    setTimeout(() => {
      window.location.href = href;
    }, 280);
  });
});

window.addEventListener('pageshow', () => {
  document.body.style.opacity = '1';
  document.body.style.transition = 'opacity .4s ease';
});

// ── Contact form ─────────────────────────────────────────────
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const SUPABASE_URL  = 'https://blitracqgaggxuypqbpo.supabase.co';
  const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaXRyYWNxZ2FnZ3h1eXBxYnBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODU1MjgsImV4cCI6MjA4OTU2MTUyOH0.vAwSRoqGk-nL0BfnXL6-rSSM6MQS6dWcoghLimdVIVs';
  const msgDiv = document.getElementById('contact-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type=submit]');
    const origText  = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner"></span> Sending…';
    submitBtn.disabled = true;
    msgDiv && (msgDiv.innerHTML = '');

    const body = {
      name:    form.querySelector('[name=name]').value.trim(),
      email:   form.querySelector('[name=email]').value.trim(),
      phone:   form.querySelector('[name=phone]')?.value.trim() || null,
      subject: form.querySelector('[name=subject]').value.trim(),
      message: form.querySelector('[name=message]').value.trim(),
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed');
      form.reset();
      if (msgDiv) msgDiv.innerHTML = `<div class="alert alert-success"><i data-lucide="check" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i> Message sent! We'll get back to you within 24 hours.</div>`;
    } catch {
      if (msgDiv) msgDiv.innerHTML = `<div class="alert alert-error"><i data-lucide="x" style="width:1.2em; height:1.2em; vertical-align:-0.2em; display:inline-block;"></i> Something went wrong. Please try again or email us directly.</div>`;
    } finally {
      submitBtn.innerHTML = origText;
      submitBtn.disabled  = false;
    }
  });
})();

// ── Utility: format date ─────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

window.SwiftTrack = { formatDate, formatDateTime };
