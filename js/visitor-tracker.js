/* visitor-tracker.js — records every page visit to Firebase
   Geo APIs ordered by China-mainland reachability:
   1. ipapi.co       (good globally, blocked in CN)
   2. ip-api.com     (accessible in mainland China)
   3. api.ip.sb      (accessible in mainland China)
   4. ipwhois.app    (last resort)
*/
(function () {
  var FB_URL = 'https://private-cv-web-default-rtdb.firebaseio.com';
  var SESSION_KEY = 'vt_' + location.pathname;

  /* Avoid double-recording the same page in the same browser session */
  if (sessionStorage.getItem(SESSION_KEY)) return;

  async function fetchGeo() {
    var apis = [
      function () {
        return fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.latitude) throw new Error('no data');
            return { lat: d.latitude, lon: d.longitude, country: d.country_name, country_code: d.country_code, city: d.city };
          });
      },
      function () {
        return fetch('https://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon', { signal: AbortSignal.timeout(4000) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || d.status !== 'success') throw new Error('no data');
            return { lat: d.lat, lon: d.lon, country: d.country, country_code: d.countryCode, city: d.city };
          });
      },
      function () {
        return fetch('https://api.ip.sb/geoip/', { signal: AbortSignal.timeout(4000) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.latitude) throw new Error('no data');
            return { lat: d.latitude, lon: d.longitude, country: d.country, country_code: d.country_code, city: d.city };
          });
      },
      function () {
        return fetch('https://ipwhois.app/json/', { signal: AbortSignal.timeout(4000) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.latitude) throw new Error('no data');
            return { lat: d.latitude, lon: d.longitude, country: d.country, country_code: d.country_code, city: d.city };
          });
      }
    ];

    for (var i = 0; i < apis.length; i++) {
      try {
        var geo = await apis[i]();
        if (geo && geo.lat != null) return geo;
      } catch (_) { /* try next */ }
    }
    return null;
  }

  async function fbGet(path) {
    var r = await fetch(FB_URL + path + '.json');
    return r.ok ? r.json() : null;
  }
  async function fbPut(path, data) {
    await fetch(FB_URL + path + '.json', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
  async function fbPost(path, data) {
    var r = await fetch(FB_URL + path + '.json', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.ok ? r.json() : null;
  }

  function locKey(geo) {
    return (geo.country_code || 'XX') + '_' +
      Math.round(geo.lat) + '_' +
      Math.round(geo.lon);
  }

  async function record() {
    var geo = await fetchGeo();
    if (!geo) return;

    var key = locKey(geo);
    var existing = await fbGet('/locations/' + key);
    var now = Date.now();

    if (existing) {
      await fbPut('/locations/' + key + '/count', (existing.count || 0) + 1);
      await fbPut('/locations/' + key + '/last_visit', now);
    } else {
      await fbPut('/locations/' + key, {
        lat: parseFloat(parseFloat(geo.lat).toFixed(2)),
        lon: parseFloat(parseFloat(geo.lon).toFixed(2)),
        country: geo.country || 'Unknown',
        country_code: geo.country_code || 'XX',
        city: geo.city || 'Unknown',
        count: 1,
        last_visit: now
      });
    }

    var total = (await fbGet('/total')) || 0;
    await fbPut('/total', total + 1);
    await fbPost('/recents', {
      city: geo.city || 'Unknown',
      country: geo.country || 'Unknown',
      country_code: geo.country_code || 'XX',
      page: location.pathname,
      ts: now
    });

    sessionStorage.setItem(SESSION_KEY, '1');
  }

  record().catch(function () { /* silent fail */ });
})();
