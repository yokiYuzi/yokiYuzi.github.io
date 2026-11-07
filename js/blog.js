/* Research subjects with native, keyboard-accessible disclosure buttons. */
(function () {
  'use strict';
  var list = document.getElementById('category-list');
  function esc(value) {
    var element = document.createElement('span');
    element.textContent = value || '';
    return element.innerHTML;
  }
  function row(post) {
    var published = post.path && post.path !== '#';
    var title = published
      ? '<a class="post-row-title" href="' + esc(post.path) + '">' + esc(post.title) + '</a>'
      : '<span class="post-row-title"><span class="badge-soon">Coming soon</span>' + esc(post.title) + '</span>';
    return '<div class="post-row"><div class="post-row-left"><div class="post-row-date">' + esc(post.date) + '</div>' + title +
      '<div class="post-row-summary">' + esc(post.summary) + '</div></div>' + (published ? '<span class="post-row-arrow" aria-hidden="true">↗</span>' : '') + '</div>';
  }
  list.addEventListener('click', function (event) {
    var button = event.target.closest('[data-category-toggle]');
    if (!button) return;
    var id = button.getAttribute('aria-controls');
    var extras = document.getElementById(id);
    var block = button.closest('.category-block');
    var opening = extras.hidden;
    extras.hidden = !opening;
    block.classList.toggle('open', opening);
    block.querySelectorAll('[data-category-toggle]').forEach(function (control) {
      control.setAttribute('aria-expanded', String(opening));
    });
    block.querySelector('.cat-toggle-label').textContent = opening ? '−' : '+';
    var footer = block.querySelector('.cat-expand-btn');
    footer.textContent = opening ? 'Show fewer notes ↑' : footer.dataset.closedLabel;
  });
  fetch('/blog/posts.json', {cache:'no-store'})
    .then(function (response) { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
    .then(function (posts) {
      var groups = {};
      posts.forEach(function (post) { var category=post.category || 'General'; (groups[category] || (groups[category]=[])).push(post); });
      document.getElementById('total-count').textContent = posts.length;
      list.innerHTML = Object.keys(groups).map(function (category,index) {
        var items=groups[category].sort(function (a,b) { return (b.date || '').localeCompare(a.date || ''); });
        var count=items.length-1;
        var label='Show '+count+' more note'+(count===1?'':'s')+' ↓';
        var heading='<span class="cat-left"><span class="cat-index">'+String(index+1).padStart(2,'0')+'</span><span class="cat-name">'+esc(category)+'</span></span><span class="cat-right"><span class="cat-count">'+items.length+' notes</span>'+(count?'<span class="cat-toggle-label" aria-hidden="true">+</span>':'')+'</span>';
        return '<section class="category-block" id="cat-'+index+'"><h2 class="cat-heading">'+
          (count?'<button type="button" class="cat-header" data-category-toggle aria-expanded="false" aria-controls="extras-'+index+'">'+heading+'</button>':'<div class="cat-header">'+heading+'</div>')+
          '</h2><div class="cat-preview">'+row(items[0])+'</div>'+
          (count?'<div class="cat-extras" id="extras-'+index+'" hidden>'+items.slice(1).map(row).join('')+'</div><div class="cat-expand-footer"><button type="button" class="cat-expand-btn" data-category-toggle data-closed-label="'+label+'" aria-expanded="false" aria-controls="extras-'+index+'">'+label+'</button></div>':'')+'</section>';
      }).join('');
    })
    .catch(function () { list.innerHTML='<p class="empty-state">The notebook could not be loaded. <a href="/archives/">Browse the archive</a> or try refreshing.</p>'; });
})();
