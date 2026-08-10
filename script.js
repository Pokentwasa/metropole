(function () {
  'use strict';

  /* ============================================
     SPA ROUTER
     Views are <section class="view" data-view="name">
     Links use data-route="name" and href="#name"
  ============================================ */

  const views = document.querySelectorAll('.view');
  const routeLinks = document.querySelectorAll('[data-route]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const nav = document.getElementById('nav');

  function showView(name) {
    let found = false;
    views.forEach(v => {
      const match = v.dataset.view === name;
      v.classList.toggle('is-visible', match);
      if (match) found = true;
    });

    // Fallback to home if route doesn't exist
    if (!found) {
      views.forEach(v => v.classList.toggle('is-visible', v.dataset.view === 'home'));
      name = 'home';
    }

    // Update nav active states
    navLinks.forEach(a => {
      a.classList.toggle('is-active', a.dataset.route === name);
    });

    // Close mobile menu
    nav.classList.remove('nav--open');

    // Scroll to top on view change
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Track page view
    trackEvent('page_view', { view: name, attribution: 'spa_router' });
  }

  // Handle route clicks
  routeLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const route = link.dataset.route;
      history.pushState({ view: route }, '', '#' + route);
      showView(route);
    });
  });

  // Handle back/forward browser buttons
  window.addEventListener('popstate', e => {
    const route = (e.state && e.state.view) || location.hash.replace('#', '') || 'home';
    showView(route);
  });

  // Initial route from URL hash
  const initialRoute = location.hash.replace('#', '') || 'home';
  showView(initialRoute);

  /* ============================================
     MOBILE NAV TOGGLE
  ============================================ */
  const navToggle = document.getElementById('navToggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('nav--open');
    });
  }

  /* ============================================
     ROOM FILTERS — scoped per location view
     Each location view has its own .filter-status,
     .filter-gender and .room-grid.
  ============================================ */

  document.querySelectorAll('[data-view^="location-"]').forEach(view => {
    const statusSel = view.querySelector('.filter-status');
    const genderSel = view.querySelector('.filter-gender');
    const grid = view.querySelector('.room-grid');
    if (!grid) return;

    function applyFilters() {
      const status = statusSel ? statusSel.value : 'all';
      const gender = genderSel ? genderSel.value : 'all';
      let visible = 0;

      grid.querySelectorAll('.room-card').forEach(card => {
        const statusMatch = status === 'all' || card.dataset.status === status;
        const genderMatch = gender === 'all' || card.dataset.gender === gender;
        const show = statusMatch && genderMatch;
        card.classList.toggle('is-hidden', !show);
        if (show) visible++;
      });

      // Empty state
      let empty = grid.querySelector('.room-empty');
      if (visible === 0) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'room-empty glass';
          empty.innerHTML = '<p>No rooms match these filters.</p><p class="re-sub">Try adjusting your selection or enquire about upcoming availability.</p>';
          grid.appendChild(empty);
        }
      } else if (empty) {
        empty.remove();
      }

      trackEvent('filter_change', {
        attribution: 'room_filter',
        location: view.dataset.view.replace('location-', ''),
        status: status,
        gender: gender,
        results: visible
      });
    }

    if (statusSel) statusSel.addEventListener('change', applyFilters);
    if (genderSel) genderSel.addEventListener('change', applyFilters);
  });

  /* ============================================
     ENQUIRY FORM
  ============================================ */
  const enquiryForm = document.getElementById('enquiryForm');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', e => {
      e.preventDefault();

      const formData = new FormData(enquiryForm);
      const payload = Object.fromEntries(formData.entries());

      // Track conversion with full attribution
      trackEvent('form_submit', {
        attribution: 'contact_form',
        room_preference: payload.roomPreference || 'not_specified',
        has_message: !!payload.message
      });

      const btn = enquiryForm.querySelector('button[type="submit"]');
      btn.textContent = 'Sending...';
      btn.disabled = true;

      // Simulate submission — replace with real endpoint (Formspree/API)
      setTimeout(() => {
        btn.textContent = 'Enquiry Sent ✓';
        setTimeout(() => {
          btn.innerHTML = 'Send Enquiry →';
          btn.disabled = false;
          enquiryForm.reset();
        }, 2500);
      }, 900);
    });
  }

  /* ============================================
     CONVERSION EVENT TRACKING
     Every element with data-event fires an event
     with its data-attribution for revenue attribution.
     Supports GA4 (gtag), Meta Pixel (fbq), and dataLayer.
  ============================================ */

  function trackEvent(eventName, params) {
    params = params || {};

    // GA4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, params);
    }

    // Meta Pixel
    if (typeof fbq !== 'undefined') {
      fbq('trackCustom', eventName, params);
    }

    // GTM dataLayer
    if (window.dataLayer) {
      window.dataLayer.push(Object.assign({ event: eventName }, params));
    }

    // Debug (remove in production)
    // console.log('[track]', eventName, params);
  }

  // Wire up ALL elements with data-event attributes
  document.querySelectorAll('[data-event]').forEach(el => {
    // Skip form fields (tracked on submit) and selects (tracked on change)
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
    if (el.tagName === 'SELECT') return;

    el.addEventListener('click', () => {
      trackEvent(el.dataset.event, {
        attribution: el.dataset.attribution || 'unknown',
        location: el.dataset.location || undefined,
        room: el.dataset.room || undefined
      });
    });
  });

  /* ============================================
     UTM CAPTURE — persist campaign params for
     attribution across the session
  ============================================ */
  (function captureUTM() {
    const params = new URLSearchParams(location.search);
    const utm = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(key => {
      if (params.get(key)) utm[key] = params.get(key);
    });
    if (Object.keys(utm).length) {
      window.__attribution = utm;
      trackEvent('campaign_landing', utm);
    }
  })();

})();
