(() => {
    // Компенсируем fixed header — отступ у <main>
    document.addEventListener('DOMContentLoaded', () => {
        const headerEl = document.querySelector('.header');
        const mainEl = document.querySelector('main');
        if (headerEl && mainEl) mainEl.style.paddingTop = headerEl.offsetHeight + 'px';
    });

    const wrapperEl = document.getElementById('article-wrapper');
    const breadcrumbEl = document.getElementById('article-breadcrumb');

    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');

    function esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function escAttr(s) {
        return String(s || '').replace(/"/g, '&quot;');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        // поддержка "YYYY-MM-DD" и ISO
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['января','февраля','марта','апреля','мая','июня',
                        'июля','августа','сентября','октября','ноября','декабря'];
        return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    // Текст абзаца — сохраняем переносы строк как <br>
    function renderTextParagraph(text) {
        return esc(text).replace(/\n/g, '<br>');
    }

    function renderBlock(block, index) {
        switch (block.type) {
            case 'heading':
                return `<div><h3 class="article-subtitle">${esc(block.text)}</h3></div>`;

            case 'subheading':
                return `<div><h4 class="article-text">${esc(block.text)}</h4></div>`;

            case 'text':
                return `<div><p class="article-desc">${renderTextParagraph(block.text)}</p></div>`;

            case 'list': {
                const items = (block.items || []).filter(Boolean);
                if (!items.length) return '';
                return `<div><ul class="article-list">${
                    items.map(it => `<li>${esc(it)}</li>`).join('')
                }</ul></div>`;
            }

            case 'image':
                if (!block.src) return '';
                return `<img class="article-img" src="${escAttr(block.src)}" alt="">`;

            case 'slider': {
                const imgs = (block.images || []).filter(Boolean);
                if (!imgs.length) return '';
                const slides = imgs.map(src =>
                    `<div class="swiper-slide"><img src="${escAttr(src)}" alt=""></div>`
                ).join('');
                return `
                <div class="article-slider" data-slider-index="${index}">
                    <div class="slider-wrapper">
                        <div class="swiper article-swiper">
                            <div class="swiper-wrapper">${slides}</div>
                        </div>
                        <div class="slider-controls">
                            <div class="slider-prev">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.5 5L7.5 10L12.5 15" stroke="white" stroke-linecap="square" />
                                </svg>
                            </div>
                            <div class="slider-next">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.5 5L12.5 10L7.5 15" stroke="white" stroke-linecap="square" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>`;
            }

            case 'group': {
                const children = (block.children || []);
                if (!children.length) return '';
                const inner = children
                    .map((ch, ci) => renderBlock(ch, `${index}-${ci}`))
                    .filter(Boolean)
                    .join('');
                if (!inner) return '';
                return `<div class="article-group">${inner}</div>`;
            }

            default:
                return '';
        }
    }

    function initSwipers() {
        document.querySelectorAll('.article-slider').forEach(wrapper => {
            const swiperEl = wrapper.querySelector('.swiper.article-swiper');
            const prevEl = wrapper.querySelector('.slider-prev');
            const nextEl = wrapper.querySelector('.slider-next');

            if (!swiperEl || swiperEl.swiper) return;

            const count = swiperEl.querySelectorAll('.swiper-slide').length;

            wrapper.classList.add(`article-slider--count-${count}`);

            // 1 фото — без Swiper, просто по центру
            if (count === 1) {
                if (prevEl) prevEl.style.display = 'none';
                if (nextEl) nextEl.style.display = 'none';
                return;
            }

            new Swiper(swiperEl, {
                // loop только для 4+
                loop: count >= 4,

                // desktop логика
                slidesPerView: 'auto',
                centeredSlides: true,

                // 2 фото → первая по центру, вторая справа
                // 3 фото → вторая по центру
                initialSlide: count === 3 ? 1 : 0,

                spaceBetween: 20,

                navigation: {
                    nextEl,
                    prevEl
                },

                breakpoints: {
                    // mobile
                    0: {
                        slidesPerView: 1,
                        centeredSlides: false,
                        spaceBetween: 0
                    },

                    // desktop
                    1100: {
                        slidesPerView: 'auto',
                        centeredSlides: true,
                        spaceBetween: 20
                    }
                }
            });
        });
    }

    function renderError(message) {
        wrapperEl.innerHTML = `
            <div style="padding: 80px 0; text-align: center; color: var(--color-text-secondary, #a8a8a8);">
                <h3 class="article-subtitle">${esc(message)}</h3>
                <p class="article-desc" style="margin-top: 24px;">
                    <a href="blog.html" style="color: var(--color-main-decard, #6b7cff); text-decoration: underline;">
                        Вернуться к списку статей
                    </a>
                </p>
            </div>
        `;
    }

    async function load() {
        if (!slug) {
            renderError('Статья не указана');
            return;
        }

        let item;
        try {
            const res = await fetch('/api/news/' + encodeURIComponent(slug));
            if (!res.ok) {
                renderError('Статья не найдена');
                return;
            }
            item = await res.json();
        } catch (e) {
            renderError('Ошибка загрузки статьи');
            return;
        }

        // Title и breadcrumb
        document.title = item.title + ' — Decard';
        if (breadcrumbEl) {
            breadcrumbEl.textContent = item.title;
            breadcrumbEl.setAttribute('title', item.title);
        }

        // Парсим content
        let blocks = [];
        try {
            const parsed = JSON.parse(item.content || '[]');
            if (Array.isArray(parsed)) blocks = parsed;
        } catch (e) { blocks = []; }

        // Шапка статьи: дата + заголовок
        const parts = [];
        parts.push(`
            <div>
                <span class="article-data">${esc(formatDate(item.published_at))}</span>
                <h2 class="article-title">${esc(item.title)}</h2>
            </div>
        `);

        // Обложка
        if (item.cover_image) {
            parts.push(`<img class="article-img" src="${escAttr(item.cover_image)}" alt="">`);
        }

        // Блоки
        blocks.forEach((b, i) => {
            parts.push(renderBlock(b, i));
        });

        wrapperEl.innerHTML = parts.join('\n');

        // Инициализируем Swiper после вставки
        if (typeof Swiper !== 'undefined') {
            initSwipers();
        } else {
            // Swiper ещё не загрузился — подождём
            const check = setInterval(() => {
                if (typeof Swiper !== 'undefined') {
                    clearInterval(check);
                    initSwipers();
                }
            }, 50);
            setTimeout(() => clearInterval(check), 5000);
        }
    }

    load();
})();
