(function () {
  if (!/^https?:$/.test(location.protocol)) return;
  if (!window.fetch || !window.DOMParser || !history.pushState) return;

  var PERSIST = /(header-init|page-nav)\.js(\?|$)/;
  var cache = new Map();
  var token = 0;
  function pageKey(u) {
    return u.pathname + u.search;
  }

  function scrollTop(behavior) {
    window.scrollTo({ top: 0, left: 0, behavior: behavior });
  }

  var loadedKey = pageKey(location);

  [].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).forEach(function (l) {
    l.setAttribute('data-nav-href', l.href);
  });

  function getHeader() {
    return document.querySelector('.main-header');
  }

  function isPersistentScript(node) {
    return node.tagName === 'SCRIPT' && PERSIST.test(node.getAttribute('src') || '');
  }

  function fetchPage(url) {
    var key = url.href.split('#')[0];
    if (!cache.has(key)) {
      var p = fetch(key, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('bad status');
          return res.text();
        })
        .then(function (text) {
          return new DOMParser().parseFromString(text, 'text/html');
        });
      p.catch(function () {
        cache.delete(key);
      });
      cache.set(key, p);
    }
    return cache.get(key);
  }

  function sameStructure(nextHeader) {
    var current = getHeader();
    if (!current || !nextHeader) return false;
    var a = current.querySelectorAll('*');
    var b = nextHeader.querySelectorAll('*');
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].tagName !== b[i].tagName) return false;
    }
    return true;
  }

  function syncHeader(nextHeader) {
    var a = getHeader().querySelectorAll('*');
    var b = nextHeader.querySelectorAll('*');
    for (var i = 0; i < b.length; i++) {
      if (a[i].id === 'brandLogo') continue;
      ['class', 'href', 'aria-current'].forEach(function (attr) {
        var next = b[i].getAttribute(attr);
        var prev = a[i].getAttribute(attr);
        if (next === prev) return;
        if (next === null) a[i].removeAttribute(attr);
        else a[i].setAttribute(attr, next);
      });
    }
  }

  function absoluteHref(el, base) {
    return new URL(el.getAttribute('href'), base).href;
  }

  function prepareStyles(doc, url) {
    var wanted = [].slice.call(doc.querySelectorAll('link[rel="stylesheet"]')).map(function (l) {
      return { href: absoluteHref(l, url), source: l };
    });
    var existing = {};
    [].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).forEach(function (l) {
      existing[l.getAttribute('data-nav-href')] = l;
    });
    var waits = [];
    wanted.forEach(function (item, index) {
      if (existing[item.href]) return;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = item.href;
      link.setAttribute('data-nav-href', item.href);
      if (item.source.getAttribute('crossorigin') !== null) link.crossOrigin = item.source.getAttribute('crossorigin');
      var anchor = null;
      for (var j = index + 1; j < wanted.length; j++) {
        if (existing[wanted[j].href]) {
          anchor = existing[wanted[j].href];
          break;
        }
      }
      waits.push(new Promise(function (resolve) {
        link.addEventListener('load', resolve);
        link.addEventListener('error', resolve);
      }));
      if (anchor) anchor.parentNode.insertBefore(link, anchor);
      else document.head.appendChild(link);
      existing[item.href] = link;
    });
    var ownHref = function (h) {
      return h.indexOf(location.origin) === 0;
    };
    var wantedOrder = wanted.map(function (item) { return item.href; }).filter(ownHref);
    var domOrder = [].slice.call(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(function (l) { return l.getAttribute('data-nav-href'); })
      .filter(function (h) { return ownHref(h) && wantedOrder.indexOf(h) !== -1; });
    if (domOrder.join('|') !== wantedOrder.join('|')) {
      wantedOrder.forEach(function (href) {
        var old = existing[href];
        if (old) old.setAttribute('data-nav-stale', '1');
        var fresh = document.createElement('link');
        fresh.rel = 'stylesheet';
        fresh.href = href;
        fresh.setAttribute('data-nav-href', href);
        waits.push(new Promise(function (resolve) {
          fresh.addEventListener('load', resolve);
          fresh.addEventListener('error', resolve);
        }));
        document.head.appendChild(fresh);
        existing[href] = fresh;
      });
    }
    return Promise.all(waits).then(function () {
      return wanted.map(function (item) {
        return item.href;
      });
    });
  }

  function removeObsoleteStyles(wantedHrefs) {
    [].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).forEach(function (l) {
      if (l.hasAttribute('data-nav-stale')) {
        l.parentNode.removeChild(l);
        return;
      }
      var href = l.getAttribute('data-nav-href');
      if (href.indexOf(location.origin) !== 0) return;
      if (wantedHrefs.indexOf(href) === -1) l.parentNode.removeChild(l);
    });
  }

  function collectScripts(fragment) {
    var list = [].slice.call(fragment.querySelectorAll('script'));
    var out = [];
    list.forEach(function (s) {
      if (!PERSIST.test(s.getAttribute('src') || '')) {
        out.push({ src: s.getAttribute('src'), text: s.textContent });
      }
      s.parentNode.removeChild(s);
    });
    return out;
  }

  function runScripts(scripts, url) {
    var captured = [];
    var docAdd = document.addEventListener;
    var winAdd = window.addEventListener;

    function hook(original) {
      return function (type, fn, opts) {
        if (type === 'DOMContentLoaded' || type === 'load') {
          captured.push(fn);
          return;
        }
        return original.call(this, type, fn, opts);
      };
    }

    document.addEventListener = hook(docAdd);
    window.addEventListener = hook(winAdd);

    function restore() {
      document.addEventListener = docAdd;
      window.addEventListener = winAdd;
    }

    var chain = scripts.reduce(function (prev, item) {
      return prev.then(function () {
        if (item.src) {
          return fetch(new URL(item.src, url).href)
            .then(function (res) {
              return res.text();
            })
            .then(function (code) {
              (0, eval)(code);
            });
        }
        (0, eval)(item.text);
      }).catch(function (err) {
        console.error(err);
      });
    }, Promise.resolve());

    return chain.then(function () {
      restore();
      captured.forEach(function (fn) {
        try {
          fn.call(document, new Event('DOMContentLoaded'));
        } catch (err) {
          console.error(err);
        }
      });
    }, restore);
  }

  function swapContent(doc, url, push, wantedHrefs) {
    if (push) history.pushState(null, '', url.href);
    loadedKey = pageKey(url);

    document.title = doc.title;

    var keepDark = document.body.classList.contains('dark');
    document.body.className = doc.body.className;
    if (keepDark) document.body.classList.add('dark');

    syncHeader(doc.querySelector('.main-header'));

    var header = getHeader();
    [].slice.call(document.body.childNodes).forEach(function (node) {
      if (node === header || isPersistentScript(node)) return;
      document.body.removeChild(node);
    });

    var fragment = document.createDocumentFragment();
    var passedHeader = false;
    [].slice.call(doc.body.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.matches('.main-header')) {
        passedHeader = true;
        return;
      }
      if (!passedHeader || isPersistentScript(node)) return;
      fragment.appendChild(document.importNode(node, true));
    });

    var scripts = collectScripts(fragment);
    document.body.appendChild(fragment);
    removeObsoleteStyles(wantedHrefs);

    if (url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)))) {
      document.getElementById(decodeURIComponent(url.hash.slice(1))).scrollIntoView();
    } else {
      scrollTop('instant');
    }

    return runScripts(scripts, url);
  }

  function navigate(url, push) {
    var id = ++token;
    return fetchPage(url).then(function (doc) {
      if (id !== token) return;
      if (!sameStructure(doc.querySelector('.main-header'))) {
        location.href = url.href;
        return;
      }
      return prepareStyles(doc, url).then(function (wantedHrefs) {
        if (id !== token) return;
        return swapContent(doc, url, push, wantedHrefs);
      });
    }).catch(function () {
      location.href = url.href;
    });
  }

  function eligible(a, e) {
    if (e) {
      if (e.defaultPrevented || e.button !== 0) return null;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
    }
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return null;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return null;
    if (!/\.html?$/i.test(url.pathname) && url.pathname.slice(-1) !== '/') return null;
    return url;
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    var url = eligible(a, e);
    if (!url) return;
    if (pageKey(url) === loadedKey) {
      if (url.hash) return;
      e.preventDefault();
      scrollTop('smooth');
      return;
    }
    e.preventDefault();
    navigate(url, true);
  });

  function warm(e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    var url = eligible(a, null);
    if (url && pageKey(url) !== loadedKey) fetchPage(url).catch(function () {});
  }

  document.addEventListener('mouseover', warm);
  document.addEventListener('touchstart', warm, { passive: true });
  document.addEventListener('focusin', warm);

  window.addEventListener('popstate', function () {
    if (pageKey(location) === loadedKey) return;
    navigate(new URL(location.href), false);
  });
})();