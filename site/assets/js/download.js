// Download section: stays "Coming soon" until a GitHub Release with macOS installers exists,
// then turns the buttons into real download links automatically (no redeploy needed).
(function () {
  var REPO = 'umer-2k1/pixel-buddies';
  var $ = function (s) { return document.querySelector(s); };

  function mb(bytes) { return (bytes / 1048576).toFixed(0) + ' MB'; }
  function dmg(assets, arm) {
    var list = (assets || []).filter(function (a) { return /\.dmg$/i.test(a.name); });
    return list.find(function (a) { return arm ? /arm64/i.test(a.name) : !/arm64/i.test(a.name); });
  }
  function enable(el, asset) {
    if (!asset) return;
    el.href = asset.browser_download_url;
    el.classList.remove('disabled');
    el.removeAttribute('aria-disabled');
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
    var chip = el.querySelector('[data-state]');
    if (chip) chip.textContent = mb(asset.size);
  }

  // Public so it can be exercised without a real release: BuddiesDownload.render(releaseJson)
  function render(release) {
    if (!release || !release.assets) return false;
    var arm = dmg(release.assets, true), intel = dmg(release.assets, false);
    if (!arm && !intel) return false;
    enable($('#dl-arm'), arm);
    enable($('#dl-intel'), intel);
    $('#dl-status').classList.add('ready');
    $('#dl-status-text').textContent = 'Version ' + String(release.tag_name || '').replace(/^v/, '') + ' is ready to download.';
    $('#dl-note').innerHTML = 'Requires macOS 10.15 or later. The app isn’t code-signed yet, so on first launch <b>right-click it and choose Open</b>. ' +
      '<a href="https://github.com/' + REPO + '/releases" rel="noopener">All releases</a>';
    var chip = $('#hero-chip'); if (chip) chip.textContent = 'v' + String(release.tag_name || '').replace(/^v/, '');
    return true;
  }

  function init() {
    if (!window.fetch) return;
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(render)
      .catch(function () { /* offline or not public yet: keep "Coming soon" */ });
  }

  window.BuddiesDownload = { render: render };
  init();
})();
