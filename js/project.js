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

function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(url || '');
}

// Возвращает embed-URL для YouTube / RuTube / Vimeo, или null
function getEmbedUrl(url) {
    if (!url) return null;

    // YouTube: watch?v=ID, youtu.be/ID, shorts/ID
    let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&autoplay=0`;

    // RuTube: rutube.ru/video/HASH
    m = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
    if (m) return `https://rutube.ru/play/embed/${m[1]}/`;

    // Vimeo: vimeo.com/ID
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;

    return null;
}

// Рендерит нужный HTML для любого src: видеофайл, изображение, embed, или ссылка
function renderMedia(src, title) {
    if (!src) return '';

    // Видеофайл (.mp4 и т.д.)
    if (isVideoUrl(src)) {
        return `<div class="project-media-block">
            <video src="${escAttr(src)}" controls playsinline></video>
        </div>`;
    }

    // Изображение — на всю ширину, та же высота что и видео
    if (isImageUrl(src)) {
        return `<div class="project-media-block">
            <img src="${escAttr(src)}" alt="${escAttr(title || '')}">
        </div>`;
    }

    // YouTube / RuTube / Vimeo
    const embedUrl = getEmbedUrl(src);
    if (embedUrl) {
        return `<div class="project-media-block">
            <iframe src="${escAttr(embedUrl)}"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                loading="lazy">
            </iframe>
        </div>`;
    }

    // Внешняя ссылка (ссылка на тур, презентацию и т.п.)
    return `<a class="project-service-link" href="${escAttr(src)}" target="_blank" rel="noopener">Открыть →</a>`;
}

document.addEventListener('DOMContentLoaded', () => {
    // Компенсируем fixed header — отступ у <main>
    const mainEl = document.querySelector('main');
    const headerEl = document.querySelector('.header');
    if (headerEl && mainEl) mainEl.style.paddingTop = headerEl.offsetHeight + 'px';

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

    // Мета под заголовком не отображается (по дизайну — только title → photo)

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

    // === 3D-ТУР ===
    const hasTour = item.tour_src && item.tour_src.trim();
    if (hasTour) {
        const tourEl = document.getElementById('project-tour');
        const tourMediaEl = document.getElementById('project-tour-media');
        if (tourMediaEl) {
            tourMediaEl.innerHTML = renderMedia(item.tour_src, item.title);
        }
        if (tourEl) tourEl.hidden = false;
    }

    // === 3D-РОЛИК ===
    const hasVideo = item.video_src && item.video_src.trim();
    if (hasVideo) {
        const mediaEl = document.getElementById('project-3d-media');
        const videoEl = document.getElementById('project-3d');
        if (mediaEl) {
            mediaEl.innerHTML = renderMedia(item.video_src, item.title);
        }
        if (videoEl) videoEl.hidden = false;
    }

    // === ПРЕЗЕНТАЦИИ ===
    const hasPresentation = item.presentation_src && item.presentation_src.trim();
    if (hasPresentation) {
        const presEl = document.getElementById('project-presentation');
        const presMediaEl = document.getElementById('project-presentation-media');
        if (presMediaEl) {
            presMediaEl.innerHTML = renderMedia(item.presentation_src, item.title);
        }
        if (presEl) presEl.hidden = false;
    }

    // === Рендеры экстерьера ===
    let exteriorRenders = [];
    try { exteriorRenders = JSON.parse(item.exterior_renders || '[]'); } catch (e) {}
    if (Array.isArray(exteriorRenders) && exteriorRenders.length) {
        const grid = document.getElementById('exterior-grid');
        grid.innerHTML = exteriorRenders.map((r, i) => {
            const colClass = r.cols === 'full' ? 'render-item--full'
                : r.wide ? 'render-item--full'
                : r.cols === '3' ? 'render-item--third'
                : 'render-item--half';
            return `<button class="render-item ${colClass}" type="button">
                <img src="${escAttr(r.src)}" alt="Рендер экстерьера ${i + 1}">
            </button>`;
        }).join('');
        document.getElementById('project-exterior').hidden = false;
    }

    // === Рендеры интерьера ===
    let interiorRenders = [];
    try { interiorRenders = JSON.parse(item.interior_renders || '[]'); } catch (e) {}
    if (Array.isArray(interiorRenders) && interiorRenders.length) {
        const grid = document.getElementById('interior-grid');
        grid.innerHTML = interiorRenders.map((r, i) => {
            const colClass = r.cols === 'full' ? 'render-item--full'
                : r.wide ? 'render-item--full'
                : r.cols === '3' ? 'render-item--third'
                : 'render-item--half';
            return `<button class="render-item ${colClass}" type="button">
                <img src="${escAttr(r.src)}" alt="Рендер интерьера ${i + 1}">
            </button>`;
        }).join('');
        document.getElementById('project-interior').hidden = false;
    }

    // === Якорная навигация (только существующие секции) ===
    const navEl = document.getElementById('projectSectionsNav');
    const navItems = [];
    if (hasTour) navItems.push({ href: '#project-tour', anchor: 'tour', text: '3D-ТУР' });
    if (hasVideo) navItems.push({ href: '#project-3d', anchor: 'video', text: '3D-РОЛИК' });
    if (hasPresentation) navItems.push({ href: '#project-presentation', anchor: 'presentation', text: 'ПРЕЗЕНТАЦИИ' });
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

    const grids = Array.from(document.querySelectorAll('.renders-grid'));
    if (!grids.length) return;

    let currentImages = [];   // images of the currently open grid only
    let currentIndex = 0;
    let isAnimating = false;
    let touchStartY = 0;
    let touchEndY = 0;

    function updateArrows() {
        prevBtn.classList.toggle('is-hidden', currentIndex === 0);
        nextBtn.classList.toggle('is-hidden', currentIndex === currentImages.length - 1);
    }

    // Vertical slide: direction 'next' = slide up (new comes from bottom), 'prev' = slide down
    function animateTo(newIndex, direction) {
        if (isAnimating || !currentImages[newIndex]) return;
        isAnimating = true;

        const slideOut = direction === 'next' ? '-100%' : '100%';
        const slideIn  = direction === 'next' ? '100%'  : '-100%';

        const nextImg = new Image();
        nextImg.src = currentImages[newIndex].src;
        nextImg.alt = currentImages[newIndex].alt || '';
        nextImg.style.cssText = `
            position: absolute; inset: 0;
            width: 100%; height: 100%;
            object-fit: contain;
            transform: translateY(${slideIn});
            transition: none;
        `;
        imageWrap.appendChild(nextImg);

        // force reflow
        nextImg.getBoundingClientRect();

        const ease = 'cubic-bezier(.4,0,.2,1)';
        galleryImage.style.transition = `transform 0.35s ${ease}`;
        nextImg.style.transition      = `transform 0.35s ${ease}`;
        galleryImage.style.transform  = `translateY(${slideOut})`;
        nextImg.style.transform       = 'translateY(0)';

        nextImg.addEventListener('transitionend', () => {
            galleryImage.src = nextImg.src;
            galleryImage.alt = nextImg.alt;
            galleryImage.style.transition = 'none';
            galleryImage.style.transform  = 'translateY(0)';
            nextImg.remove();
            currentIndex = newIndex;
            updateArrows();
            isAnimating = false;
        }, { once: true });
    }

    function openGallery(images, index) {
        currentImages = images;
        currentIndex = index;
        galleryImage.style.transition = 'none';
        galleryImage.style.transform  = 'translateY(0)';
        galleryImage.src = currentImages[currentIndex].src;
        galleryImage.alt = currentImages[currentIndex].alt || '';
        updateArrows();
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
        if (currentIndex === 0 || isAnimating) return;
        animateTo(currentIndex - 1, 'prev');
    }

    function showNext() {
        if (currentIndex === currentImages.length - 1 || isAnimating) return;
        animateTo(currentIndex + 1, 'next');
    }

    // Bind per-grid — each grid opens only its own images
    grids.forEach(grid => {
        const imgs = Array.from(grid.querySelectorAll('.render-item img'));
        imgs.forEach((img, index) => {
            const trigger = img.closest('.render-item');
            if (!trigger) return;
            trigger.addEventListener('click', () => openGallery(imgs, index));
        });
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
        const diff = touchStartY - touchEndY;
        if (Math.abs(diff) < 50) return;
        if (diff > 0) showNext();
        else showPrev();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
        if (!gallery.classList.contains('is-open')) return;
        if (e.key === 'Escape') closeGallery();
        if (e.key === 'ArrowUp')   showPrev();
        if (e.key === 'ArrowDown') showNext();
    });
}
