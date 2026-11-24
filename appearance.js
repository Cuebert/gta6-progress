(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  function load() {
    try { return localStorage.getItem('journal-theme'); } catch { return null; }
  }
  const saved = load();
  root.dataset.theme = saved === 'light' ? 'light' : 'dark';
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme');
    function render() {
      const dark = root.dataset.theme ? root.dataset.theme === 'dark' : preference.matches;
      button.textContent = dark ? 'Light mode' : 'Dark mode';
      button.setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' mode');
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      const dark = root.dataset.theme ? root.dataset.theme === 'dark' : preference.matches;
      root.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('journal-theme', root.dataset.theme); } catch {}
      render();
    });
    preference.addEventListener('change', render);
    render();
    const published = document.querySelector('meta[name="journal-updated"]');
    if (!published) return;
    let loading = false;
    let timer;
    function later() {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(poll, 60000);
    }
    async function poll() {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const url = new URL(location.pathname, location.origin);
        url.searchParams.set('edition', String(Math.floor(Date.now() / 60000)));
        const response = await fetch(url, {cache:'no-cache', credentials:'omit', referrerPolicy:'no-referrer'});
        if (!response.ok) return;
        const edition = new DOMParser().parseFromString(await response.text(), 'text/html');
        const revision = edition.querySelector('meta[name="journal-updated"]')?.content;
        if (!(Date.parse(revision) > Date.parse(published.content))) return;
        const current = document.querySelector('main');
        const next = edition.querySelector('main');
        if (!next) return;
        const hit = document.elementFromPoint(Math.min(innerWidth / 2, 500), 40);
        const anchor = hit?.closest('[data-record], section[id], footer');
        const top = anchor?.getBoundingClientRect().top;
        const key = anchor?.dataset.record;
        const focus = document.activeElement?.closest('a[href]');
        const focusedLink = focus && current.contains(focus) ? focus.getAttribute('href') : null;
        current.replaceChildren(...Array.from(next.childNodes, n => document.importNode(n, true)));
        published.content = revision;
        if (focusedLink) [...current.querySelectorAll('a')].find(a => a.getAttribute('href') === focusedLink)?.focus({preventScroll:true});
        const same = key ? current.querySelector('[data-record="' + CSS.escape(key) + '"]') : anchor?.id ? document.getElementById(anchor.id) : anchor;
        if (scrollY > 0 && same?.isConnected && Number.isFinite(top)) scrollBy(0, same.getBoundingClientRect().top - top);
      } catch {
        // Keep the verified edition visible when the host cannot be reached.
      } finally {
        loading = false;
        later();
      }
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); else poll(); });
    later();
  });
})();
