let lenis = null;
let heroBigCounterAnimated = false;
let heroSmallCountersAnimated = false;
window.__lenis = lenis; // добавь эту строку

document.addEventListener('DOMContentLoaded', () => {
    initCoreLibs();
    initHeroScene();
    initHeroArrow();
    fetchFeaturedProjects().then(() => initPinnedPortfolio());
    initServiceRows();
    initAdvantagesParallax();
    initRevealSections();
});

function initCoreLibs() {
    if (!window.gsap || !window.ScrollTrigger) {
        console.error('GSAP или ScrollTrigger не подключены');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    if (!window.Lenis) {
        console.error('Lenis не подключен');
        return;
    }

    // На мобилке Lenis-smooth конфликтует с CSS sticky на тач-устройствах.
    // Нативный скролл работает без багов — Lenis не инициализируем.
    if (window.innerWidth <= 767) {
        /*
          ignoreMobileResize: true — встроенный GSAP-флаг специально для iOS/Android
          toolbar show/hide. Запрещает ScrollTrigger пересчитываться когда
          viewport меняется из-за тулбаров (< 25% изменения высоты).
          Без него каждый показ/скрытие тулбара вызывал rebuild → прыжки страницы.

          normalizeScroll убран — он перехватывал тач-события и создавал лаг.
        */
        ScrollTrigger.config({ ignoreMobileResize: true });
        return;
    }

    lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.05,
        infinite: false
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
}

/* главный экран */
function initHeroScene() {
    if (!window.gsap || !window.ScrollTrigger) return;

    const hero     = document.getElementById('mainHero');
    const stage    = hero?.querySelector('.main-stage');
    const leftPanel  = document.getElementById('heroLeftPanel');
    const rightPanel = document.getElementById('heroRightPanel');
    const heroMedia  = hero?.querySelector('.main-media img');

    if (!hero || !stage || !leftPanel) return;

    const headerEl = document.querySelector('.header');
    const headerH  = headerEl ? headerEl.offsetHeight : 0;

    // Fixed header выпал из потока — компенсируем отступом у <main>
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.style.paddingTop = headerH + 'px';

    // --header-h нужна для CSS calc(100svh - var(--header-h))
    document.documentElement.style.setProperty('--header-h', headerH + 'px');

    // При zoom на .page-wrapper задаём высоту сцены вручную
    // (CSS svh не учитывает zoom — только для 1920+ desktops)
    if (window.innerWidth >= 1920) {
        const zoom = window.innerWidth / 1920;
        const targetH = Math.round(window.innerHeight / zoom - headerH);
        stage.style.height = targetH + 'px';
    }
    // На мобилке/планшете НЕ переопределяем — CSS 100svh стабильна

    // Мобилка теперь имеет ту же структуру что и планшет — анимация одинаковая
    const isDesktop = window.innerWidth >= 1100;
    const isMobile  = window.innerWidth <= 767;

    // НЕ устанавливаем height на панелях принудительно —
    // панели начинают с естественной высоты контента (height: auto в CSS),
    // GSAP сам снимет текущее значение при старте анимации.

    const stageH = stage.offsetHeight || window.innerHeight;

    /*
      ПАРАЛЛАКС — замедленный:
      Левая: завершается на 1.5× дистанции сцены → ≈ 0.67× скорости страницы
      Правая: завершается на 1.0× → ≈ 1.0× скорости → правая быстрее левой
      (обе при этом медленнее чем было, правая всё равно опережает)
    */
    const leftSpeedFactor = window.innerWidth <= 1100 ? 0.7 : 1.5;

    const stCfgLeft = {
        trigger: stage,
        start: 'top top',
        end: `+=${stageH * leftSpeedFactor}`,   // левая — самая медленная
        scrub: 1.2,
        invalidateOnRefresh: true
    };

    // Левая панель — всегда анимируется (десктоп, планшет, мобилка)
    gsap.to(leftPanel, { height: stageH, ease: 'none', scrollTrigger: { ...stCfgLeft } });

    // Правая панель — только десктоп (на планшете/мобилке скрыта)
    if (isDesktop && rightPanel) {
        gsap.to(rightPanel, { height: stageH, ease: 'none', scrollTrigger: {
                trigger: stage,
                start: 'top top',
                end: `+=${stageH * 1.0}`,   // правая быстрее левой, но медленнее чем было
                scrub: 1.2,
                invalidateOnRefresh: true
            }});
    }

    if (heroMedia) {
        gsap.to(heroMedia, {
            yPercent: -20,              // чуть медленнее — глубина без агрессии
            ease: 'none',
            scrollTrigger: { ...stCfgLeft }
        });
    }

    initStatsAnimation();
}


function initStatsAnimation() {
    if (!window.gsap) return;

    const bigStat   = document.getElementById('heroStatBig');
    const midStat   = document.getElementById('heroStatMid');
    const smallStat = document.getElementById('heroStatSmall');

    if (!bigStat || !midStat || !smallStat) return;

    // Та же анимация что и на десктопе
    function animateStat(stat, delay) {
        const h3    = stat.querySelector('h3');
        const badge = stat.querySelector('.main-counter-badge');
        const p     = stat.querySelector('p');

        if (badge) gsap.to(badge, { opacity: 1, y: 0, duration: 0.45, delay, ease: 'power2.out' });

        if (h3) {
            const digits = h3.querySelectorAll('.digit');
            if (digits.length) {
                gsap.to(digits, {
                    clipPath: 'inset(0% 0 0 0)',
                    y: 0,
                    duration: 0.55,
                    stagger: 0.08,
                    delay: delay + 0.08,
                    ease: 'power3.out'
                });
            }
        }

        if (p) gsap.to(p, { opacity: 1, duration: 0.4, delay: delay + 0.5, ease: 'power2.out' });
    }

    function splitDigits(stat) {
        const h3 = stat.querySelector('h3');
        if (!h3 || h3.querySelector('.digit')) return;
        const text = h3.textContent.trim();
        h3.innerHTML = text.split('').map(ch =>
            `<span class="digit">${ch}</span>`
        ).join('');
        gsap.set(h3.querySelectorAll('.digit'), { clipPath: 'inset(110% 0 0 0)', y: 40 });
    }

    [bigStat, midStat, smallStat].forEach(stat => {
        splitDigits(stat);
        const badge = stat.querySelector('.main-counter-badge');
        const p     = stat.querySelector('p');
        gsap.set(stat, { opacity: 1 });
        if (badge) gsap.set(badge, { opacity: 0, y: 12 });
        if (p)     gsap.set(p, { opacity: 0 });
    });

    // На мобилке используем IntersectionObserver вместо ScrollTrigger —
    // он не зависит от прыгающего window.innerHeight в Safari iOS
    const isMobile = window.innerWidth <= 767;

    if (isMobile) {
        const fired = new Set();

        // На мобилке анимируем h3 целиком (не по цифрам) —
        // избегаем бага iOS с overflow:hidden + clip-path на inline-block спанах
        [bigStat, midStat, smallStat].forEach(stat => {
            const h3 = stat.querySelector('h3');
            // Убираем разбивку на .digit и сбрасываем GSAP inline-стили
            if (h3) {
                const text = Array.from(h3.querySelectorAll('.digit'))
                    .map(d => d.textContent).join('');
                if (text) h3.textContent = text; // возвращаем как обычный текст
                gsap.set(h3, { opacity: 0, y: 30 });
            }
        });

        function animateStatMobile(stat, delay) {
            const h3    = stat.querySelector('h3');
            const badge = stat.querySelector('.main-counter-badge');
            const p     = stat.querySelector('p');

            if (badge) gsap.to(badge, { opacity: 1, y: 0, duration: 0.4, delay, ease: 'power2.out' });
            if (h3)    gsap.to(h3,    { opacity: 1, y: 0, duration: 0.5, delay: delay + 0.1, ease: 'power3.out' });
            if (p)     gsap.to(p,     { opacity: 1,        duration: 0.4, delay: delay + 0.45, ease: 'power2.out' });
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting || fired.has(entry.target)) return;
                fired.add(entry.target);
                // Каждый элемент анимируется сам когда входит в viewport —
                // порядок определяется CSS (big→small→mid)
                animateStatMobile(entry.target, 0);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

        observer.observe(bigStat);
        observer.observe(smallStat);  // row 2 в CSS — входит 2-м
        observer.observe(midStat);    // row 3 в CSS — входит 3-м
        return;
    }

    // Десктоп / планшет — ScrollTrigger как прежде
    if (!window.ScrollTrigger) return;

    ScrollTrigger.create({
        trigger: bigStat,
        start: 'top 88%',
        once: true,
        onEnter: () => animateStat(bigStat, 0)
    });

    ScrollTrigger.create({
        trigger: midStat,
        start: 'top 92%',
        once: true,
        onEnter: () => {
            animateStat(midStat, 0);
            animateStat(smallStat, 0.25);
        }
    });
}

// Функции-заглушки — больше не используются, оставлены для совместимости
function animateBigCounter() {}
function animateCounter() {}
function animateSmallCounters() {}

function initHeroArrow() {
    const arrow = document.getElementById('mainScrollArrow');
    if (!arrow) return;

    arrow.addEventListener('click', () => {
        const nextSection = document.querySelector('.stats-section');
        if (nextSection && lenis) {
            lenis.scrollTo(nextSection, {
                offset: 0,
                duration: 1.2
            });
        } else if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    function updateArrow() {
        if (window.scrollY > 5) {
            arrow.classList.add('is-hidden');
        } else {
            arrow.classList.remove('is-hidden');
        }
    }

    window.addEventListener('scroll', updateArrow, { passive: true });
    window.addEventListener('resize', updateArrow);
    updateArrow();
}

/* pinned portfolio */
/* ——— Загружаем последние 4 проекта из API ——— */
async function fetchFeaturedProjects() {
    try {
        const res = await fetch('/api/projects');
        if (!res.ok) return;
        const all = await res.json();
        if (!all || !all.length) return;

        // sort_order ASC, потом по дате — уже отсортировано сервером
        const top4 = all.slice(0, 4);

        // Месяцы на русском
        const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                         'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

        function formatDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return `${MONTHS[d.getMonth()]} ${d.getFullYear()} г.`;
        }

        function esc(s) {
            return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        const section = document.getElementById('featuredPortfolio');
        if (!section) return;

        // Обновляем десктопные bg-slides
        const bgTrack = section.querySelector('.featured-portfolio__bg-track');
        if (bgTrack) {
            bgTrack.innerHTML = top4.map(p => `
                <div class="fp-bg-slide">
                    <img src="${esc(p.cover_image)}" alt="${esc(p.title)}">
                </div>
            `).join('');
        }

        // Обновляем preview slides
        const previewTrack = section.querySelector('.fp-card-preview__track');
        if (previewTrack) {
            previewTrack.innerHTML = top4.map(p => `
                <div class="fp-card-preview__slide">
                    <img src="${esc(p.cover_image)}" alt="${esc(p.title)}">
                </div>
            `).join('');
        }

        // Карточка — делаем ссылкой на первый проект, slug будет меняться при переключении
        const card = section.querySelector('.featured-portfolio__card');
        if (card) {
            card.dataset.projects = JSON.stringify(top4.map(p => ({
                title: p.title,
                subtitle: p.place || '',
                desc: p.short_desc || '',
                city: p.city || '',
                date: formatDate(p.published_at),
                slug: p.slug
            })));
            // Делаем карточку кликабельной
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const projects = JSON.parse(card.dataset.projects || '[]');
                const idx = parseInt(card.dataset.currentIndex || '0');
                const slug = projects[idx]?.slug;
                if (slug) window.location.href = `pages/project.html?slug=${slug}`;
            });
        }

        // Обновляем мобильную карточку
        const mobCard = section.querySelector('.featured-portfolio__mobile-card');
        if (mobCard && top4[0]) {
            const p = top4[0];
            const imgEl = mobCard.querySelector('.featured-portfolio__mobile-image img');
            const prevEl = mobCard.querySelector('.featured-portfolio__mobile-preview img');
            const titleEl = mobCard.querySelector('.featured-portfolio__mobile-meta h3');
            const subtitleEl = mobCard.querySelector('.featured-portfolio__mobile-meta span:first-child');
            const cityEl = mobCard.querySelector('.featured-portfolio__mobile-place span:first-child');
            const dateEl = mobCard.querySelector('.featured-portfolio__mobile-place span:last-child');
            const descEl = mobCard.querySelector('.featured-portfolio__mobile-inner > p');
            if (imgEl) imgEl.src = p.cover_image || '';
            if (prevEl) prevEl.src = p.cover_image || '';
            if (titleEl) titleEl.textContent = p.title || '';
            if (subtitleEl) subtitleEl.textContent = p.place || '';
            if (cityEl) cityEl.textContent = p.city || '';
            if (dateEl) dateEl.textContent = formatDate(p.published_at);
            if (descEl) descEl.textContent = p.short_desc || '';
            // Клик по мобильной карточке
            mobCard.style.cursor = 'pointer';
            mobCard.addEventListener('click', () => {
                if (p.slug) window.location.href = `pages/project.html?slug=${p.slug}`;
            });
        }

    } catch (e) {
        console.warn('Featured projects load failed:', e);
    }
}

function initPinnedPortfolio() {
    if (!window.gsap || !window.ScrollTrigger) return;

    const section = document.getElementById('featuredPortfolio');
    if (!section) return;

    const stage = section.querySelector('.featured-portfolio__stage');
    const media = section.querySelector('.featured-portfolio__media');
    const bgTrack = section.querySelector('.featured-portfolio__bg-track');
    const bgSlides = gsap.utils.toArray(section.querySelectorAll('.fp-bg-slide'));

    const previewViewport = section.querySelector('.fp-card-preview__viewport');
    const previewTrack = section.querySelector('.fp-card-preview__track');
    const previewSlides = gsap.utils.toArray(section.querySelectorAll('.fp-card-preview__slide'));

    const card = section.querySelector('.featured-portfolio__card');

    if (
        !stage ||
        !media ||
        !bgTrack ||
        !bgSlides.length ||
        !previewViewport ||
        !previewTrack ||
        !previewSlides.length ||
        !card
    ) return;

    const titleEl = card.querySelector('.fp-card-title');
    const subtitleEl = card.querySelector('.fp-card-subtitle');
    const descEl = card.querySelector('.fp-card-desc');
    const cityEl = card.querySelector('.fp-card-city');
    const dateEl = card.querySelector('.fp-card-date');

    // Данные из API (заполнены fetchFeaturedProjects) или fallback
    const apiData = card.dataset.projects ? JSON.parse(card.dataset.projects) : null;
    const projects = apiData || [
        { title: 'Nexus', subtitle: 'Аквилон', desc: 'Мы подготовили рендеры и ролик интерьера. Проект успешно прошёл презентацию — клиент привлёк инвестиции и запустил строительство.', city: 'Москва', date: 'Декабрь 2024 г.', slug: '' },
        { title: 'Forma', subtitle: 'MR Group', desc: 'Комплекс презентационных рендеров и визуальных материалов для маркетинга и продаж.', city: 'Москва', date: 'Ноябрь 2024 г.', slug: '' },
        { title: 'Solar', subtitle: 'Аквилон', desc: 'Подготовили визуализацию и анимационные материалы для продвижения жилого проекта.', city: 'Санкт-Петербург', date: 'Октябрь 2024 г.', slug: '' },
        { title: 'Riva', subtitle: 'Dogma', desc: 'Создали серию материалов для презентации объекта инвесторам и маркетинговой команды.', city: 'Казань', date: 'Сентябрь 2024 г.', slug: '' }
    ];

    let currentIndex = -1;
    let trigger = null;
    let resizeTimer = null;
    let lastWindowWidth = window.innerWidth;

    function getStableViewportHeight() {
        return window.visualViewport ? window.visualViewport.height : window.innerHeight;
    }

    function getZoomFactor() {
        const wrapper = document.querySelector('.page-wrapper');
        if (!wrapper) return 1;

        const inlineZoom = parseFloat(wrapper.style.zoom);
        if (!Number.isNaN(inlineZoom) && inlineZoom > 0) return inlineZoom;

        const computedZoom = parseFloat(window.getComputedStyle(wrapper).zoom);
        if (!Number.isNaN(computedZoom) && computedZoom > 0) return computedZoom;

        return 1;
    }

    function setCardContent(index, force = false) {
        const project = projects[index];
        if (!project) return;

        if (!force && index === currentIndex && titleEl.textContent.trim() === project.title) {
            return;
        }

        currentIndex = index;
        card.dataset.currentIndex = index; // для клика по карточке

        gsap.killTweensOf([titleEl, subtitleEl, descEl, cityEl, dateEl]);

        if (force) {
            titleEl.textContent = project.title;
            subtitleEl.textContent = project.subtitle;
            descEl.textContent = project.desc;
            cityEl.textContent = project.city;
            dateEl.textContent = project.date;

            gsap.set([titleEl, subtitleEl, descEl, cityEl, dateEl], {
                opacity: 1,
                y: 0
            });

            return;
        }

        gsap.timeline()
            .to([titleEl, subtitleEl, descEl, cityEl, dateEl], {
                opacity: 0,
                y: 8,
                duration: 0.14,
                stagger: 0.02,
                ease: 'power2.out'
            })
            .add(() => {
                titleEl.textContent = project.title;
                subtitleEl.textContent = project.subtitle;
                descEl.textContent = project.desc;
                cityEl.textContent = project.city;
                dateEl.textContent = project.date;
            })
            .to([titleEl, subtitleEl, descEl, cityEl, dateEl], {
                opacity: 1,
                y: 0,
                duration: 0.2,
                stagger: 0.02,
                ease: 'power2.out'
            });
    }

    function destroyPinnedPortfolio() {
        if (trigger) {
            trigger.kill();
            trigger = null;
        }

        gsap.killTweensOf([titleEl, subtitleEl, descEl, cityEl, dateEl]);

        gsap.set(bgTrack, { clearProps: 'transform,height' });
        gsap.set(previewTrack, { clearProps: 'transform,height' });
        gsap.set(bgSlides, { clearProps: 'height' });
        gsap.set(previewSlides, { clearProps: 'height' });

        stage.style.position = '';
        stage.style.top = '';
        stage.style.height = '';
        stage.style.width = '';
        stage.style.maxWidth = '';

        section.style.height = '';
    }

    function buildPinnedPortfolio() {
        destroyPinnedPortfolio();

        const slidesCount = bgSlides.length;
        const HOLD = 0.34;
        const MOVE = 0.72;
        const TOTAL = (slidesCount - 1) * (HOLD + MOVE) + HOLD;

        const zoomFactor = getZoomFactor();
        const headerH = document.querySelector('.header')?.offsetHeight || 0;
        const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const isDesktopScaled = window.innerWidth >= 1920 && zoomFactor !== 1;

        let stageCssPx;

        if (isDesktopScaled) {
            stageCssPx = Math.round(window.innerHeight / zoomFactor);
        } else if (isTouch) {
            stageCssPx = Math.round(stage.getBoundingClientRect().height);
        } else {
            stageCssPx = Math.round(window.innerHeight);
        }

        if (stageCssPx < 320) stageCssPx = 320;

        stage.style.width = '100%';
        stage.style.maxWidth = '100%';
        stage.style.height = `${stageCssPx}px`;
        stage.style.position = 'sticky';
        stage.style.top = '0';

        const mediaHeight = media.clientHeight;
        const previewHeight = previewViewport.clientHeight;

        gsap.set(bgSlides, { height: mediaHeight });
        gsap.set(bgTrack, { height: mediaHeight * slidesCount });

        gsap.set(previewSlides, { height: previewHeight });
        gsap.set(previewTrack, { height: previewHeight * slidesCount });

        section.style.height = `${Math.round(stageCssPx * (TOTAL + 1))}px`;

        setCardContent(0, true);

        const tl = gsap.timeline({ defaults: { ease: 'none' } });

        for (let i = 0; i < slidesCount - 1; i++) {
            const startAt = i * (HOLD + MOVE) + HOLD;

            tl.to(bgTrack, {
                y: -(i + 1) * mediaHeight,
                duration: MOVE
            }, startAt);

            tl.to(previewTrack, {
                y: -(i + 1) * previewHeight,
                duration: MOVE
            }, startAt);
        }

        tl.to({}, { duration: HOLD }, (slidesCount - 1) * (HOLD + MOVE));

        trigger = ScrollTrigger.create({
            animation: tl,
            trigger: section,
            start: 'top top',
            end: () => `+=${stageCssPx * TOTAL}`,
            scrub: 1,
            invalidateOnRefresh: false,
            onUpdate: () => {
                const y = Math.abs(Number(gsap.getProperty(bgTrack, 'y')) || 0);
                const index = Math.max(
                    0,
                    Math.min(slidesCount - 1, Math.round(y / mediaHeight))
                );
                setCardContent(index);
            }
        });

        ScrollTrigger.refresh();
    }

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {
            const widthChanged = Math.abs(window.innerWidth - lastWindowWidth) > 20;

            if (widthChanged) {
                lastWindowWidth = window.innerWidth;
                buildPinnedPortfolio();
            }
        }, 200);
    });

    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            lastWindowWidth = window.innerWidth;
            buildPinnedPortfolio();
        }, 350);
    });

    buildPinnedPortfolio();
}

/* услуги */


function initServiceRows() {
    const list = document.getElementById('servicesList');
    if (!list) return;

    const rows = Array.from(list.querySelectorAll('.service-row'));
    if (!rows.length) return;

    let activeIndex = 0;
    let resizeTimer = null;

    function isDesktop() {
        return window.innerWidth >= 1200;
    }

    function getHead(row) {
        return row.querySelector('.service-row__head');
    }

    function getBody(row) {
        return row.querySelector('.service-row__body');
    }

    function getContent(row) {
        return row.querySelector('.service-row__content');
    }

    function setAria(row, expanded) {
        const head = getHead(row);
        if (head) {
            head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
    }

    function openRow(row, immediate = false) {
        const body = getBody(row);
        const content = getContent(row);
        if (!body || !content) return;

        row.classList.add('is-active');
        setAria(row, true);

        const endHeight = content.scrollHeight;

        if (immediate) {
            body.classList.remove('is-opening');
            body.style.height = endHeight + 'px';
            return;
        }

        body.classList.add('is-opening');
        body.style.height = '0px';
        body.offsetHeight;
        body.style.height = endHeight + 'px';
    }

    function closeRow(row, immediate = false) {
        const body = getBody(row);
        if (!body) return;

        row.classList.remove('is-active');
        setAria(row, false);

        body.classList.remove('is-opening');

        if (immediate) {
            body.style.height = '0px';
            return;
        }

        body.style.height = '0px';
    }

    function setActive(index, immediate = false) {
        activeIndex = index;

        rows.forEach((row, i) => {
            if (i === index) {
                openRow(row, immediate);
            } else {
                closeRow(row, immediate);
            }
        });
    }

    function refreshActiveHeight() {
        const activeRow = rows[activeIndex];
        if (!activeRow) return;

        const body = getBody(activeRow);
        const content = getContent(activeRow);
        if (!body || !content) return;
        if (!activeRow.classList.contains('is-active')) return;

        body.style.height = content.scrollHeight + 'px';
    }

    rows.forEach((row, index) => {
        const head = getHead(row);
        if (!head) return;

        head.addEventListener('click', () => {
            if (isDesktop()) return;
            if (index === activeIndex) return;
            setActive(index);
        });

        row.addEventListener('mouseenter', () => {
            if (!isDesktop()) return;
            if (index === activeIndex) return;
            setActive(index);
        });
    });

    rows.forEach((row) => {
        const body = getBody(row);
        if (!body) return;

        body.addEventListener('transitionend', (e) => {
            if (e.propertyName !== 'height') return;

            if (row.classList.contains('is-active')) {
                const content = getContent(row);
                if (!content) return;
                body.classList.remove('is-opening');
                body.style.height = content.scrollHeight + 'px';
            }
        });
    });

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setActive(activeIndex, true);
            refreshActiveHeight();
        }, 120);
    });

    window.addEventListener('load', refreshActiveHeight);

    setActive(0, true);
}

/* преимущества */
function initAdvantagesParallax() {
    if (!window.gsap || !window.ScrollTrigger) return;

    const section = document.querySelector('.advantages');
    const cards = document.querySelectorAll('.adv-card');
    if (!section || !cards.length) return;

    if (window.innerWidth <= 1100) {
        return;
    }

    if (window.innerWidth <= 1919) {
        const shifts = [-20, -55, -30, -30];

        cards.forEach((card, index) => {
            gsap.to(card, {
                y: shifts[index] || 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        });

        return;
    }

    const shifts = [-180, -180, -180, -180];

    cards.forEach((card, index) => {
        gsap.to(card, {
            y: shifts[index] || 0,
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    });
}

/* reveal */
function initRevealSections() {
    if (!window.gsap || !window.ScrollTrigger) return;

    const items = [
        ...document.querySelectorAll('.subtitle-wrapper'),
        ...document.querySelectorAll('.services-title'),
        ...document.querySelectorAll('.adv-card'),
        ...document.querySelectorAll('.trust .subtitle')
    ];

    items.forEach(item => {
        gsap.fromTo(item,
            { opacity: 0, y: 40 },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    once: true
                }
            }
        );
    });
}
