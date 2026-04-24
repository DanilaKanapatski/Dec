(() => {
    // Компенсируем fixed header — отступ у <main>
    document.addEventListener('DOMContentLoaded', () => {
        const headerEl = document.querySelector('.header');
        const mainEl = document.querySelector('main');
        if (headerEl && mainEl) mainEl.style.paddingTop = headerEl.offsetHeight + 'px';
    });

    /* =============== ВСЁ СТАРОЕ UI-ПОВЕДЕНИЕ (селекты / поиск / toggle) =============== */
    const filters = document.getElementById('blog-filters');
    const toggleBtn = document.getElementById('blog-filter-toggle');
    const clearBtn = document.getElementById('filter-clear');

    const searchField = document.getElementById('blog-search-field');
    const searchInput = document.getElementById('blog-search-input');
    const searchIcon = searchField?.querySelector('.blog-search-icon');

    const selects = document.querySelectorAll('.filter-select');

    if (toggleBtn && filters) {
        toggleBtn.addEventListener('click', () => {
            filters.classList.toggle('is-hidden');
            toggleBtn.textContent = filters.classList.contains('is-hidden') ? 'Показать' : 'Скрыть';
        });
    }

    const closeAllSelects = () => {
        selects.forEach(select => select.classList.remove('is-open'));
    };

    /* =============== СОСТОЯНИЕ ФИЛЬТРОВ =============== */
    const state = {
        search: '',
        category: 'Все',
        date: 'За год' // дефолтное значение фильтра даты
    };

    let allNews = [];

    /* =============== UI СЕЛЕКТОВ =============== */
    selects.forEach(select => {
        const trigger = select.querySelector('.filter-select__trigger');
        const filterKey = select.dataset.filter;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = select.classList.contains('is-open');
            closeAllSelects();
            if (!isOpen) select.classList.add('is-open');
        });

        // Для date-селекта инициализируем опции сразу (они статичные)
        if (filterKey === 'date') {
            bindSelectOptions(select);
        }
        // category-селект инициализируется после загрузки данных в load()
    });

    document.addEventListener('click', (e) => {
        if (![...selects].some(select => select.contains(e.target))) {
            closeAllSelects();
        }
    });

    /* =============== ПОИСК =============== */
    if (searchField && searchInput && searchIcon) {
        searchIcon.addEventListener('click', () => {
            searchField.classList.add('is-active');
            searchInput.focus();
        });

        searchInput.addEventListener('focus', () => {
            searchField.classList.add('is-active');
        });

        searchInput.addEventListener('blur', () => {
            if (!searchInput.value.trim()) searchField.classList.remove('is-active');
        });

        // debounce для live-поиска
        let searchTimer;
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim()) {
                searchField.classList.add('is-filled', 'is-active');
            } else {
                searchField.classList.remove('is-filled');
            }

            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.search = searchInput.value.trim().toLowerCase();
                applyFilters();
            }, 150);
        });
    }

    /* =============== ОЧИСТКА ФИЛЬТРОВ =============== */
    clearBtn?.addEventListener('click', () => {
        if (searchInput && searchField) {
            searchInput.value = '';
            searchField.classList.remove('is-active', 'is-filled');
        }

        selects.forEach(select => {
            const valueEl = select.querySelector('.filter-select__value');
            const defaultValue = valueEl.dataset.default;
            const options = select.querySelectorAll('.filter-select__option');

            valueEl.textContent = defaultValue;
            select.classList.remove('is-open', 'is-filled');
            options.forEach(opt => opt.classList.remove('is-active'));

            const defaultOption = [...options].find(opt => opt.dataset.value === defaultValue);
            if (defaultOption) defaultOption.classList.add('is-active');
        });

        state.search = '';
        state.category = 'Все';
        state.date = 'За год';
        applyFilters();
    });

    // Установить активные опции по дефолту
    selects.forEach(select => {
        const valueEl = select.querySelector('.filter-select__value');
        const defaultValue = valueEl.dataset.default;
        const options = select.querySelectorAll('.filter-select__option');
        const defaultOption = [...options].find(opt => opt.dataset.value === defaultValue);
        if (defaultOption) defaultOption.classList.add('is-active');
    });

    // Универсальная привязка опций к селекту
    function bindSelectOptions(select) {
        const valueEl = select.querySelector('.filter-select__value');
        const defaultValue = valueEl?.dataset.default;
        const filterKey = select.dataset.filter;
        const menu = select.querySelector('.filter-select__menu');
        if (!menu) return;

        // клонируем опции чтобы убрать старые listeners
        menu.querySelectorAll('.filter-select__option').forEach(option => {
            const fresh = option.cloneNode(true);
            option.replaceWith(fresh);
            fresh.addEventListener('click', () => {
                menu.querySelectorAll('.filter-select__option').forEach(o => o.classList.remove('is-active'));
                fresh.classList.add('is-active');

                const value = fresh.dataset.value;
                if (valueEl) valueEl.textContent = value;
                select.classList.remove('is-open');

                // is-filled → белый цвет выбранного значения
                if (value !== defaultValue) select.classList.add('is-filled');
                else select.classList.remove('is-filled');

                if (filterKey === 'category') state.category = value;
                if (filterKey === 'date') state.date = value;

                applyFilters();
            });
        });
    }

    /* =============== ВСПОМОГАТЕЛЬНЫЕ =============== */
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
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['января','февраля','марта','апреля','мая','июня',
                        'июля','августа','сентября','октября','ноября','декабря'];
        return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    // Получить Date из записи (published_at или created_at)
    function recordDate(item) {
        const s = item.published_at || item.created_at;
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    // Фильтр по диапазону дат
    function dateWithin(item, range) {
        const rec = recordDate(item);
        if (!rec) return true; // если даты нет — не режем

        const days = {
            'За последний месяц': 30,
            'За 3 месяца': 90,
            'За 6 месяцев': 180,
            'За год': 365
        }[range];

        if (!days) return true;

        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return rec >= cutoff;
    }

    // Извлечь простой текст из JSON-блоков для поиска
    function extractPlainText(contentJson) {
        try {
            const blocks = JSON.parse(contentJson || '[]');
            if (!Array.isArray(blocks)) return '';
            return blocks.map(b => {
                if (b.type === 'heading' || b.type === 'subheading' || b.type === 'text') return b.text || '';
                if (b.type === 'list') return (b.items || []).join(' ');
                return '';
            }).join(' ');
        } catch (e) { return ''; }
    }

    /* =============== РЕНДЕР КАРТОЧЕК =============== */
    const listEl = document.getElementById('blog-list');

    function renderCard(item) {
        const dateText = formatDate(item.published_at || item.created_at);
        const category = item.category || 'Статьи';
        const readingTime = item.reading_time || '';
        const url = `article.html?slug=${encodeURIComponent(item.slug)}`;

        return `
            <a href="${url}" class="blog-card-link">
                <div class="blog-block">
                    <div class="blog-tags">
                        <span>${esc(dateText)}</span>
                        <span>${esc(category)}</span>
                    </div>
                    <h3 class="blog-title">${esc(item.title)}</h3>
                    <div class="blog-info">
                        <span class="blog-info__time">${esc(readingTime)}</span>
                        <a href="${url}" class="blog-btn">
                            <span class="blog-btn__text-wrap">
                                <span class="blog-btn__text">ОТКРЫТЬ</span>
                                <span class="blog-btn__text">ОТКРЫТЬ</span>
                            </span>
                        </a>
                    </div>
                </div>
            </a>
        `;
    }

    function renderEmpty(message) {
        return `
            <div style="grid-column: 1 / -1; padding: 80px 20px; text-align: center; color: var(--color-text-secondary, #a8a8a8);">
                <p style="font-size: 18px;">${esc(message)}</p>
            </div>
        `;
    }

    function applyFilters() {
        if (!listEl) return;

        let filtered = allNews.slice();

        // Категория
        if (state.category && state.category !== 'Все') {
            filtered = filtered.filter(it => (it.category || '') === state.category);
        }

        // Дата
        if (state.date) {
            filtered = filtered.filter(it => dateWithin(it, state.date));
        }

        // Поиск (по title, preview и текстовым блокам)
        if (state.search) {
            const q = state.search;
            filtered = filtered.filter(it => {
                const haystack = [
                    it.title || '',
                    it.preview || '',
                    it.category || '',
                    extractPlainText(it.content)
                ].join(' ').toLowerCase();
                return haystack.includes(q);
            });
        }

        if (!filtered.length) {
            if (!allNews.length) {
                listEl.innerHTML = renderEmpty('Статей пока нет');
            } else {
                listEl.innerHTML = renderEmpty('По выбранным фильтрам ничего не найдено');
            }
            return;
        }

        listEl.innerHTML = filtered.map(renderCard).join('');
    }

    async function load() {
        if (!listEl) return;

        // Загружаем категории и новости параллельно
        const [newsRes, catsRes] = await Promise.allSettled([
            fetch('/api/news'),
            fetch('/api/news/categories')
        ]);

        // Категории — рендерим в меню динамически
        if (catsRes.status === 'fulfilled' && catsRes.value.ok) {
            try {
                const cats = await catsRes.value.json();
                const menu = document.getElementById('category-filter-menu');
                const catSelect = menu?.closest('.filter-select');
                if (menu && cats.length) {
                    cats.forEach(cat => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'filter-select__option';
                        btn.dataset.value = cat;
                        btn.textContent = cat;
                        menu.appendChild(btn);
                    });
                }
                // Привязываем все опции (включая «Все» + загруженные)
                if (catSelect) bindSelectOptions(catSelect);
            } catch (e) { console.error('cats error', e); }
        }

        // Новости
        try {
            if (newsRes.status !== 'fulfilled' || !newsRes.value.ok) throw new Error();
            allNews = await newsRes.value.json();
        } catch (e) {
            console.error('Ошибка загрузки новостей', e);
            listEl.innerHTML = renderEmpty('Не удалось загрузить статьи');
            return;
        }

        applyFilters();
    }
    load();




})();
