(function () {
  'use strict';

  var list = document.getElementById('column-list');
  var count = document.getElementById('column-count');
  if (!list || !count) return;

  // Entries use the same title, date, summary, and path fields as the blog catalog.
  fetch('/column/posts.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load column');
      return response.json();
    })
    .then(function (posts) {
      if (!Array.isArray(posts)) throw new Error('Invalid column catalog');
      var published = posts.filter(function (post) {
        return post && typeof post.title === 'string' && post.title.trim() &&
          typeof post.path === 'string' && /^\/column\/posts\/[a-z0-9-]+\/$/.test(post.path);
      }).sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || ''));
      });
      if (!published.length) return;

      var entries = document.createDocumentFragment();
      published.forEach(function (post) {
        var article = document.createElement('article');
        article.className = 'column-entry';
        if (typeof post.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
          var date = document.createElement('time');
          date.dateTime = post.date;
          date.textContent = post.date;
          article.appendChild(date);
        }
        var heading = document.createElement('h3');
        var link = document.createElement('a');
        link.href = post.path;
        link.textContent = post.title;
        heading.appendChild(link);
        article.appendChild(heading);
        if (typeof post.summary === 'string' && post.summary.trim()) {
          var summary = document.createElement('p');
          summary.textContent = post.summary;
          article.appendChild(summary);
        }
        entries.appendChild(article);
      });
      list.replaceChildren(entries);
      count.textContent = published.length + (published.length === 1 ? ' essay' : ' essays');
    })
    .catch(function () {
      var message = document.createElement('p');
      message.textContent = 'The essay list could not be loaded. Please refresh to try again.';
      list.replaceChildren(message);
      count.textContent = 'Unavailable';
    });
})();
