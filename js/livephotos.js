(function () {
  'use strict';
  var active = null;
  document.querySelectorAll('[data-live-photo]').forEach(function (card) {
    var video = card.querySelector('video');
    var button = card.querySelector('[data-live-play]');
    var status = card.querySelector('.live-photo-status');
    if (!video || !button || !status) return;

    function showPhoto() {
      video.pause();
      video.hidden = true;
      button.textContent = 'Play Live Photo';
      button.setAttribute('aria-pressed', 'false');
      if (active === showPhoto) active = null;
    }

    function playbackError() {
      showPhoto();
      status.textContent = 'Playback is unavailable. You can view the full-size photo or download the original below.';
    }

    button.hidden = false;
    showPhoto();
    button.addEventListener('click', function () {
      if (!video.hidden) { showPhoto(); return; }
      if (active) active();
      active = showPhoto;
      status.textContent = '';
      video.hidden = false;
      video.currentTime = 0;
      button.textContent = 'Show still photo';
      button.setAttribute('aria-pressed', 'true');
      var result = video.play();
      if (result && result.catch) result.catch(function (error) {
        // A quick switch to another photo can cancel a pending play request.
        if (error.name !== 'AbortError') playbackError();
      });
    });
    video.addEventListener('error', playbackError);
    var source = video.querySelector('source');
    if (source) source.addEventListener('error', playbackError);
    video.addEventListener('ended', function () {
      if (!document.fullscreenElement && !video.webkitDisplayingFullscreen) showPhoto();
    });
  });
})();
