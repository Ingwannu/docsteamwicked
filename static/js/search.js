/* Search with live results */
(function() {
    'use strict';
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    let timer = null;

    input.addEventListener('input', function() {
        clearTimeout(timer);
        const q = this.value.trim();
        if (!q) {
            results.classList.remove('show');
            results.innerHTML = '';
            return;
        }
        timer = setTimeout(function() {
            fetch('/search?q=' + encodeURIComponent(q))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.length === 0) {
                        results.innerHTML = '<div class="search-empty">검색 결과가 없습니다.</div>';
                    } else {
                        results.innerHTML = data.map(function(d) {
                            var html = '<div class="search-result-item" onclick="location.href=\'/doc/' + d.slug + '\'">';
                            html += '<div class="search-result-title">' + escapeHtml(d.title) + '</div>';
                            if (d.description) {
                                html += '<div class="search-result-desc">' + escapeHtml(d.description) + '</div>';
                            }
                            if (d.category) {
                                html += '<span class="search-result-cat">' + escapeHtml(d.category) + '</span>';
                            }
                            html += '</div>';
                            return html;
                        }).join('');
                    }
                    results.classList.add('show');
                })
                .catch(function() {
                    results.innerHTML = '<div class="search-empty">검색 중 오류가 발생했습니다.</div>';
                    results.classList.add('show');
                });
        }, 200);
    });

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Keyboard: Enter goes to first result
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var first = results.querySelector('.search-result-item');
            if (first) first.click();
        }
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.remove('show');
        }
    });

    // Keyboard shortcut: / to focus search
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && document.activeElement !== input) {
            e.preventDefault();
            input.focus();
        }
    });
})();
