/*
  project.js — загружает проект по slug, рендерит все секции,
  затем активирует существующие фичи: якорную навигацию и галерею рендеров.
*/

function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
}
function escAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

// Текст с переносами строк → HTML
function textToHtml(text) {
    return esc(text).replace(/\n/g, '<br>');
}

function isVideoUrl(url) {
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url || '');
}

document.addEventListener('DOMContentLoaded', () => {
    loadProject();
});

async function loadProject() {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');

    const container = document.getElementById('project-container');

    if (!slug) {
        showNotFound('Проект не указан');
        return;
    }

    let item;
    try {
        const res = await fetch('/api/projects/' + encodeURIComponent(slug));
        if (!res.ok) {
            showNotFound('Проект не найден');
            return;
        }
        item = await res.json();
    } catch (e) {
        showNotFound('Ошибка загрузки проекта');
        return;
    }

    // === Заголовок, обложка, breadcrumb ===
    document.title = item.title + ' — Decard';
    document.getElementById('project-breadcrumb').textContent = item.title;
    document.getElementById('project-title').textContent = item.title;

    const coverEl = document.getElementById('project-cover');
    if (item.cover_image) {
        coverEl.src = item.cover_image;
        coverEl.alt = item.title;
    } else {
        coverEl.style.display = 'none';
    }

    // === О проекте ===
    const aboutText = document.getElementById('project-about-text');
    if (item.about_text && item.about_text.trim()) {
        aboutText.innerHTML = textToHtml(item.about_text);
    } else {
        document.getElementById('project-about').hidden = true;
    }

    // === 3D-ролик ===
    const hasVideo = item.video_src && item.video_src.trim();
    if (hasVideo) {
        const mediaEl = document.getElementById('project-3d-media');
        if (isVideoUrl(item.video_src)) {
            mediaEl.innerHTML = `<video src="${escAttr(item.video_src)}" controls muted playsinline style="width: 100%; height: auto; display: block;"></video>`;
        } else {
            mediaEl.innerHTML = `<img src="${escAttr(item.video_src)}" alt="3D ролик ${escAttr(item.title)}">`;
        }
        document.getElementById('project-3d').hidden = false;
    }

    // === Рендеры экстерьера ===
    let exteriorRenders = [];
    try { exteriorRenders = JSON.parse(item.exterior_renders || '[]'); } catch (e) {}
    if (Array.isArray(exteriorRenders) && exteriorRenders.length) {
        const grid = document.getElementById('exterior-grid');
        grid.innerHTML = exteriorRenders.map((r, i) => `
            <button class="render-item ${r.wide ? 'render-item--wide' : 'render-item--small'}" type="button">
                <img src="${escAttr(r.src)}" alt="Рендер экстерьера ${i + 1}">
            </button>
        `).join('');
        document.getElementById('project-exterior').hidden = false;
    }

    // === Рендеры интерьера ===
    let interiorRenders = [];
    try { interiorRenders = JSON.parse(item.interior_renders || '[]'); } catch (e) {}
    if (Array.isArray(interiorRenders) && interiorRenders.length) {
        const grid = document.getElementById('interior-grid');
        grid.innerHTML = interiorRenders.map((r, i) => `
            <button class="render-item ${r.wide ? 'render-item--wide' : 'render-item--small'}" type="button">
                <img src="${escAttr(r.src)}" alt="Рендер интерьера ${i + 1}">
            </button>
        `).join('');
        document.getElementById('project-interior').hidden = false;
    }

    // === Якорная навигация (только существующие секции) ===
    const navEl = document.getElementById('projectSectionsNav');
    const navItems = [];
    if (hasVideo) navItems.push({ href: '#project-3d', anchor: '3d', text: '3D-ТУР' });
    if (exteriorRenders.length) navItems.push({ href: '#project-exterior', anchor: 'exterior', text: 'ЭКСТЕРЬЕР' });
    if (interiorRenders.length) navItems.push({ href: '#project-interior', anchor: 'interior', text: 'ИНТЕРЬЕР' });

    if (navItems.length) {
        navEl.innerHTML = navItems.map(n =>
            `<a href="${n.href}" data-anchor="${n.anchor}">${n.text}</a>`
        ).join('');
    } else {
        navEl.remove();
    }

    // === Следующий проект ===
    if (item.nextProject) {
        document.getElementById('project-next-title').hidden = false;
        const nextLink = document.getElementById('project-next-link');
        nextLink.href = 'project.html?slug=' + encodeURIComponent(item.nextProject.slug);
        nextLink.hidden = false;
        document.getElementById('project-next-img').src = item.nextProject.cover_image || '';
        document.getElementById('project-next-img').alt = item.nextProject.title || '';
        document.getElementById('project-next-name').textContent = item.nextProject.title || '';
    }

    // === Активируем навигацию и галерею ===
    initProjectSectionButtons();
    initProjectGallery();
}

function showNotFound(message) {
    const container = document.getElementById('project-page');
    if (container) {
        container.innerHTML = `
            <div class="container" style="padding: 120px 0; text-align: center; color: var(--color-text-secondary, #a8a8a8);">
                <h2 style="color: var(--color-main-white, #fff); margin-bottom: 24px;">${esc(message)}</h2>
                <p><a href="portfolio.html" style="color: var(--color-main-decard, #1D45C5); text-decoration: underline;">Вернуться к портфолио</a></p>
            </div>
        `;
    }
}

/* ============ СУЩЕСТВУЮЩИЕ ФИЧИ ============ */

function initProjectSectionButtons() {
    const nav = document.getElementById('projectSectionsNav');
    const hero = document.getElementById('projectHero');

    if (!nav || !hero) return;

    const links = nav.querySelectorAll('[data-anchor]');

    links.forEach((link) => {
        const key = link.dataset.anchor;
        const section = document.querySelector(`[data-section="${key}"]`);
        if (!section) link.remove();
    });

    if (!nav.querySelector('a')) {
        nav.remove();
        return;
    }

    function updateNavVisibility() {
        const heroRect = hero.getBoundingClientRect();
        const heroBottomAbsolute = window.scrollY + heroRect.bottom;
        const stillOnFirstScreen = heroBottomAbsolute > window.scrollY + window.innerHeight;

        if (stillOnFirstScreen) nav.classList.remove('is-hidden');
        else nav.classList.add('is-hidden');
    }

    window.addEventListener('scroll', updateNavVisibility, { passive: true });
    window.addEventListener('resize', updateNavVisibility);
    updateNavVisibility();
}

function initProjectGallery() {
    const gallery = document.getElementById('projectGallery');
    const galleryImage = document.getElementById('galleryImage');
    const closeBtn = document.getElementById('galleryClose');
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    const backdrop = gallery?.querySelector('.project-gallery__backdrop');
    const imageWrap = gallery?.querySelector('.project-gallery__image-wrap');

    if (!gallery || !galleryImage || !closeBtn || !prevBtn || !nextBtn || !backdrop || !imageWrap) return;

    const renderImages = Array.from(document.querySelectorAll('.renders-grid .render-item img'));
    if (!renderImages.length) return;

    let currentIndex = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    function updateArrows() {
        prevBtn.classList.toggle('is-hidden', currentIndex === 0);
        nextBtn.classList.toggle('is-hidden', currentIndex === renderImages.length - 1);
    }

    function updateImage() {
        const current = renderImages[currentIndex];
        if (!current) return;
        galleryImage.src = current.src;
        galleryImage.alt = current.alt || '';
        updateArrows();
    }

    function openGallery(index) {
        currentIndex = index;
        updateImage();
        gallery.classList.add('is-open');
        gallery.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('gallery-open');
        document.body.classList.add('gallery-open');
    }

    function closeGallery() {
        gallery.classList.remove('is-open');
        gallery.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('gallery-open');
        document.body.classList.remove('gallery-open');
    }

    function showPrev() {
        if (currentIndex === 0) return;
        currentIndex -= 1;
        updateImage();
    }

    function showNext() {
        if (currentIndex === renderImages.length - 1) return;
        currentIndex += 1;
        updateImage();
    }

    function handleSwipe() {
        const diffY = touchEndY - touchStartY;
        if (Math.abs(diffY) < 50) return;
        if (diffY > 0) showPrev();
        else showNext();
    }

    renderImages.forEach((img, index) => {
        const trigger = img.closest('.render-item');
        if (!trigger) return;
        trigger.addEventListener('click', () => openGallery(index));
    });

    closeBtn.addEventListener('click', closeGallery);
    backdrop.addEventListener('click', closeGallery);
    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);

    imageWrap.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    imageWrap.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (!gallery.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeGallery();
        if (e.key === 'ArrowUp') showPrev();
        if (e.key === 'ArrowDown') showNext();
    });
}
