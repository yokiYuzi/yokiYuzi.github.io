(() => {
  'use strict';
  const timeZone = 'America/Los_Angeles';
  const timeFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const dateFormat = new Intl.DateTimeFormat('zh-CN', {
    timeZone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
  const zoneFormat = new Intl.DateTimeFormat('en-US', {timeZone, timeZoneName: 'short'});
  const clock = document.getElementById('clock');
  const date = document.getElementById('date');
  const zone = document.getElementById('zone');
  let timer;

  function tick() {
    const now = new Date();
    clock.textContent = timeFormat.format(now);
    clock.dateTime = now.toISOString();
    date.textContent = dateFormat.format(now);
    zone.textContent = zoneFormat.formatToParts(now).find(part => part.type === 'timeZoneName').value;
    clearTimeout(timer);
    timer = setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else tick();
  });

  const fullscreen = document.getElementById('fullscreen');
  if (document.fullscreenEnabled) {
    fullscreen.hidden = false;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (_) {
        fullscreen.textContent = '请使用浏览器全屏';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      fullscreen.textContent = document.fullscreenElement ? '退出全屏 ⛶' : '全屏显示 ⛶';
    });
  }
})();
