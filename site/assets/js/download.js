// Download section. Every button points at a stable "latest release" URL, so one link always serves
// the newest version. Buttons stay on "Coming soon" until the GitHub API confirms a release with that
// file exists; if the API can't be reached (offline, rate-limited) but isn't a clear "no release",
// the stable links are enabled anyway.
(function () {
  var REPO = 'umer-2k1/pixel-buddies';
  var LATEST = 'https://github.com/' + REPO + '/releases/latest/download/';
  var $ = function (s) { return document.querySelector(s); };
  var BTN = ['#dl-arm', '#dl-intel', '#dl-win'];

  function mb(bytes) { return Math.round(bytes / 1048576) + ' MB'; }
  function enable(el, size) {
    el.href = LATEST + el.dataset.file;
    el.classList.remove('disabled');
    ['aria-disabled', 'role', 'tabindex'].forEach(function (a) { el.removeAttribute(a); });
    el.querySelector('[data-state]').textContent = size ? mb(size) : 'Download';
  }
  function ready(version) {
    $('#dl-status').classList.add('ready');
    $('#dl-status-text').textContent = version ? 'Version ' + version + ' is ready to download.' : 'Ready to download.';
    $('#dl-note').innerHTML = 'Requires macOS 10.15 or later, or Windows 10/11. <a href="https://github.com/' + REPO + '/releases" rel="noopener">All releases</a>';
    $('#dl-howto').hidden = false;
    var chip = $('#hero-chip'); if (chip) chip.textContent = version ? 'v' + version : 'Free';
  }

  // Public so the page can be checked without a real release: BuddiesDownload.render(releaseJson)
  function render(release) {
    if (!release || !release.assets) return false;
    var byName = {};
    release.assets.forEach(function (a) { byName[a.name] = a; });
    var any = false;
    BTN.forEach(function (id) { var el = $(id), a = byName[el.dataset.file]; if (a) { enable(el, a.size); any = true; } });
    if (!any) return false;
    if (byName['Buddies-mac-arm64.dmg'] || byName['Buddies-mac-x64.dmg']) $('#dl-cmd').hidden = false;
    ready(String(release.tag_name || '').replace(/^v/, ''));
    return true;
  }

  function fallback() { BTN.forEach(function (id) { enable($(id)); }); $('#dl-cmd').hidden = false; ready(''); }

  var copy = $('#cmd-copy');
  if (copy) copy.addEventListener('click', function () {
    var text = $('#cmd-text').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () {
      copy.textContent = 'Copied!'; setTimeout(function () { copy.textContent = 'Copy'; }, 1600);
    }, function () { window.getSelection().selectAllChildren($('#cmd-text')); });
  });

  if (window.fetch) {
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) {
        if (r.status === 404) return null;            // no release yet (or repo not public): stay "Coming soon"
        if (!r.ok) throw new Error('api ' + r.status); // rate limit etc.: fall back to stable links
        return r.json();
      })
      .then(function (rel) { if (rel) render(rel); })
      .catch(fallback);
  }
  window.BuddiesDownload = { render: render };
})();
