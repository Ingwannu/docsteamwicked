/* ============================================================
   TeamWicked Docs — Frontend JavaScript
   Dark mode, TOC scrollspy, reading progress, code copy,
   sidebar toggle, feedback
   ============================================================ */

(function() {
    'use strict';

    /* --- Dark Mode --- */
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('docs-theme') || 'light';
    applyTheme(savedTheme);

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var moon = document.getElementById('iconMoon');
        var sun = document.getElementById('iconSun');
        if (moon && sun) {
            if (theme === 'dark') {
                moon.style.display = 'none';
                sun.style.display = 'inline-block';
            } else {
                moon.style.display = 'inline-block';
                sun.style.display = 'none';
            }
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorage.setItem('docs-theme', next);
        });
    }

    /* --- Reading Progress --- */
    const progressBar = document.getElementById('readingProgress');
    if (progressBar) {
        window.addEventListener('scroll', function() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = Math.min(progress, 100) + '%';
        }, { passive: true });
    }

    /* --- Sidebar Toggle (mobile) --- */
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
    }

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    document.querySelectorAll('.nav-link').forEach(function(link) {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 900 && sidebar) {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
            }
        });
    });

    /* --- TOC Scroll Spy --- */
    const tocLinks = document.querySelectorAll('.toc-link');
    const headings = [];
    if (tocLinks.length > 0) {
        tocLinks.forEach(function(link) {
            const anchor = link.getAttribute('data-anchor');
            const el = document.getElementById(anchor);
            if (el) headings.push({ el: el, link: link });
        });
    }

    if (headings.length > 0) {
        window.addEventListener('scroll', function() {
            let activeIdx = 0;
            const scrollPos = window.scrollY + 100;
            for (let i = 0; i < headings.length; i++) {
                if (headings[i].el.offsetTop <= scrollPos) {
                    activeIdx = i;
                }
            }
            headings.forEach(function(h, i) {
                h.link.classList.toggle('active', i === activeIdx);
            });
        }, { passive: true });
    }

    /* --- Code Copy --- */
    window.copyCode = function(btn) {
        const codeBlock = btn.parentElement.querySelector('pre');
        if (!codeBlock) return;
        const text = codeBlock.textContent;
        navigator.clipboard.writeText(text).then(function() {
            btn.textContent = '복사됨!';
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = '복사';
                btn.classList.remove('copied');
            }, 2000);
        }).catch(function() {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            btn.textContent = '복사됨!';
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = '복사';
                btn.classList.remove('copied');
            }, 2000);
        });
    };

    /* --- Feedback --- */
    const feedbackBtns = document.querySelectorAll('.feedback-btn');
    feedbackBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            const docId = this.dataset.docId;
            const sibling = rating === 1
                ? document.getElementById('feedbackNo')
                : document.getElementById('feedbackYes');

            this.classList.toggle('selected');
            if (sibling) sibling.classList.remove('selected');

            const isSelected = this.classList.contains('selected');

            fetch('/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doc_id: parseInt(docId),
                    rating: isSelected ? rating : 0,
                    comment: ''
                })
            }).catch(function() {});

            if (isSelected) {
            const msg = rating === 1 ? '피드백 감사합니다.' : '피드백 감사합니다. 개선하겠습니다.';
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--primary);color:#fff;padding:10px 24px;border-radius:10px;font-size:14px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:fadeIn .3s';
                toast.textContent = msg;
                document.body.appendChild(toast);
                setTimeout(function() { toast.remove(); }, 2500);
            }
        });
    });
})();
