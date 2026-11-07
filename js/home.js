(function () {
  'use strict';
  var list = document.getElementById('home-blog-list');
  if (!list) return;
  fetch('/blog/posts.json')
    .then(function (response) { if (!response.ok) throw new Error('Posts unavailable'); return response.json(); })
    .then(function (posts) {
      var recent = posts.filter(function (post) { return post.path && post.path.indexOf('/blog/posts/') === 0; })
        .sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 3);
      if (!recent.length) return;
      var fragment = document.createDocumentFragment();
      recent.forEach(function (post) {
        var li = document.createElement('li'); li.className = 'home-post';
        var link = document.createElement('a'); link.href = post.path;
        var date = document.createElement('time'); date.dateTime = post.date || ''; date.textContent = (post.date || '').replace(/-/g, '.');
        var copy = document.createElement('div');
        var category = document.createElement('span'); category.className = 'post-category'; category.textContent = post.category || 'Notes';
        var title = document.createElement('h3'); title.textContent = post.title || 'Untitled';
        var summary = document.createElement('p'); summary.textContent = post.summary || '';
        var arrow = document.createElement('span'); arrow.className = 'post-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗';
        copy.append(category, title, summary); link.append(date, copy, arrow); li.appendChild(link); fragment.appendChild(li);
      });
      list.replaceChildren(fragment);
    })
    .catch(function () { /* The crawlable article links remain available offline. */ });
})();
