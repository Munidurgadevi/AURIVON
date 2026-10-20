const MOON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
  <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/>
</svg>`;
const SUN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
</svg>`;
function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage blocked: ignore */ }
}
function getThemeLogo(mode) {
  const inPagesFolder = /[\\/]pages[\\/]/i.test(window.location.pathname);
  const file = mode === 'dark' ? 'logo_darkmode.png' : 'logo_lightmode.png';
  return new URL(
    (inPagesFolder ? '../assets/images/' : 'assets/images/') + file,
    document.baseURI
  ).href;
}
function updateFavicon(mode) {
  const icon = getThemeLogo(mode);
  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(link => {
    link.href = icon;
  });
}
function initTheme() {
  const toggle = document.getElementById('darkModeBtn');
  const logo = document.getElementById('brandLogo');
  const saved = storageGet('theme') === 'dark' ? 'dark' : 'light';
  updateFavicon(saved);
  if (!toggle) return;
  function applyTheme(mode) {
    document.body.classList.toggle('dark', mode === 'dark');
    toggle.innerHTML = mode === 'dark' ? SUN_SVG : MOON_SVG;
    if (logo) logo.src = getThemeLogo(mode);
    updateFavicon(mode);
    storageSet('theme', mode);
  }
  applyTheme(saved);
  toggle.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
  });
}
function initRTL() {
  const toggle = document.getElementById('rtlBtn');
  if (!toggle) return;
  const html = document.documentElement;
  function applyDir(isRTL) {
    html.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    toggle.textContent = isRTL ? 'LTR' : 'RTL';
    storageSet('rtl', isRTL);
  }
  applyDir(storageGet('rtl') === 'true');
  toggle.addEventListener('click', () => {
    applyDir(html.getAttribute('dir') !== 'rtl');
  });
}

initTheme();
initRTL();

(function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-navigation');
  if (!toggle || !nav) return;
  var MOBILE_MAX = 960;
  var dropdown = nav.querySelector('.nav-dropdown');
  var dropToggle = nav.querySelector('.nav-dropdown-toggle');

  function closeDropdown() {
    if (dropdown) dropdown.classList.remove('open');
    if (dropToggle) dropToggle.setAttribute('aria-expanded', 'false');
  }

  function setOpen(open) {
    if (open) {
      var header = document.querySelector('.main-header');
      if (header && getComputedStyle(header).position === 'relative') window.scrollTo(0, 0);
    }
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open) closeDropdown();
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!nav.classList.contains('is-open'));
  });

  if (dropToggle) {
    dropToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var isOpen = dropdown.classList.toggle('open');
      dropToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (dropdown && !dropdown.contains(e.target)) closeDropdown();
    if (!nav.classList.contains('is-open')) return;
    var path = e.composedPath ? e.composedPath() : [];
    var actions = document.querySelector('.header-actions');
    if (actions && path.indexOf(actions) !== -1 && path.indexOf(toggle) === -1) return;
    if (path.indexOf(nav) === -1 && path.indexOf(toggle) === -1) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDropdown();
    if (nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > MOBILE_MAX) setOpen(false);
  });

  window.addEventListener('popstate', function () { setOpen(false); });
})();