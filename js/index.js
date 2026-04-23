let lenis = null;
let heroBigCounterAnimated = false;
let heroSmallCountersAnimated = false;

document.addEventListener('DOMContentLoaded', () => {
    initCoreLibs();
    initHeroScene();
    initHeroArrow();
    initPinnedPortfolio();
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
    const stCfgLeft = {
        trigger: stage,
        start: 'top top',
        end: `+=${stageH * 1.5}`,   // левая — самая медленная
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
    if (!window.gsap || !window.ScrollTrigger) return;

    const bigStat   = document.getElementById('heroStatBig');
    const midStat   = document.getElementById('heroStatMid');
    const smallStat = document.getElementById('heroStatSmall');

    if (!bigStat || !midStat || !smallStat) return;

    /*
      ПРАВИЛЬНАЯ логика появления (как в видео):
      — Отдельный ScrollTrigger на каждый стат-блок.
      — Срабатывает когда ЭТОТ конкретный блок входит в viewport (bottom 90%).
      — 1519 (строка 1 грида) появляется первым.
      — 211 и 57 (строка 2 грида) появляются позже при скролле,
        211 — сразу, 57 — через 0.25s (sequential внутри одной строки).
      — Анимация: badge fade + clip-path reveal числа + fade подписи.
    */

    function animateStat(stat, delay) {
        const h3    = stat.querySelector('h3');
        const badge = stat.querySelector('.main-counter-badge');
        const p     = stat.querySelector('p');

        if (badge) gsap.to(badge, { opacity: 1, y: 0, duration: 0.45, delay, ease: 'power2.out' });

        if (h3) {
            // Разбиваем число на отдельные символы-спаны для поэффектного появления
            const digits = h3.querySelectorAll('.digit');
            if (digits.length) {
                gsap.to(digits, {
                    clipPath: 'inset(0% 0 0 0)',
                    y: 0,
                    duration: 0.55,
                    stagger: 0.08,   // каждая цифра с задержкой от предыдущей
                    delay: delay + 0.08,
                    ease: 'power3.out'
                });
            }
        }

        if (p) gsap.to(p, { opacity: 1, duration: 0.4, delay: delay + 0.5, ease: 'power2.out' });
    }

    // Разбиваем числа на <span class="digit"> до того как GSAP установит clipPath
    function splitDigits(stat) {
        const h3 = stat.querySelector('h3');
        if (!h3 || h3.querySelector('.digit')) return; // уже разбито
        const text = h3.textContent.trim();
        h3.innerHTML = text.split('').map(ch =>
            `<span class="digit">${ch}</span>`
        ).join('');
        // Скрываем все символы
        gsap.set(h3.querySelectorAll('.digit'), { clipPath: 'inset(110% 0 0 0)', y: 40 });
    }

    // Стартовое состояние — всё скрыто, числа разбиты на символы
    [bigStat, midStat, smallStat].forEach(stat => {
        splitDigits(stat);   // разбиваем цифру на span-символы
        const badge = stat.querySelector('.main-counter-badge');
        const p     = stat.querySelector('p');
        gsap.set(stat, { opacity: 1 });
        if (badge) gsap.set(badge, { opacity: 0, y: 12 });
        if (p)     gsap.set(p, { opacity: 0 });
    });

    // 1519 — свой триггер, появляется когда он входит в viewport
    ScrollTrigger.create({
        trigger: bigStat,
        start: 'top 88%',
        once: true,
        onEnter: () => animateStat(bigStat, 0)
    });

    // 211 — триггер когда ОН входит в viewport (строка 2 грида — ниже 1519)
    ScrollTrigger.create({
        trigger: midStat,
        start: 'top 92%',
        once: true,
        onEnter: () => {
            animateStat(midStat, 0);          // 211 — сразу
            animateStat(smallStat, 0.25);     // 57  — через 0.25s
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
        const nextSection = document.querySelector('.featured-portfolio');
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

    const projects = [
        {
            title: 'Nexus',
            subtitle: 'Аквилон',
            desc: 'Мы подготовили рендеры и ролик интерьера. Проект успешно прошёл презентацию — клиент привлёк инвестиции и запустил строительство.',
            city: 'Москва',
            date: 'Декабрь 2024 г.'
        },
        {
            title: 'Forma',
            subtitle: 'MR Group',
            desc: 'Комплекс презентационных рендеров и визуальных материалов для маркетинга и продаж.',
            city: 'Москва',
            date: 'Ноябрь 2024 г.'
        },
        {
            title: 'Solar',
            subtitle: 'Аквилон',
            desc: 'Подготовили визуализацию и анимационные материалы для продвижения жилого проекта.',
            city: 'Санкт-Петербург',
            date: 'Октябрь 2024 г.'
        },
        {
            title: 'Riva',
            subtitle: 'Dogma',
            desc: 'Создали серию материалов для презентации объекта инвесторам и маркетинговой команды.',
            city: 'Казань',
            date: 'Сентябрь 2024 г.'
        }
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
        const shifts = [-20, -55, -30, -70];

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

    const shifts = [-180, -180, -180, 0];

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
