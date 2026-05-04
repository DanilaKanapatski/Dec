/*
  portfolio-load.js — загрузка проектов из API + фильтрация.
  Полагается на portfolio-filters.js для UI селектов/тегов/поиска.
  Обменивается состоянием через window.__portfolioFilters.
*/
(() => {
    // Компенсируем fixed header — отступ у <main>
    const mainEl = document.querySelector('main');
    const headerEl = document.querySelector('.header');
    if (headerEl && mainEl) mainEl.style.paddingTop = headerEl.offsetHeight + 'px';

    const list = document.getElementById('portfolio-list');
    const trigger = document.getElementById('portfolio-load-trigger');
    const loader = document.getElementById('portfolio-loader');

    if (!list || !trigger || !loader) return;

    const PAGE_SIZE = 4;
    let allProjects = [];
    let filteredProjects = [];
    let renderedCount = 0;
    let isLoading = false;

    function esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function escAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

    function renderCard(item) {
        let services = [];
        try { services = JSON.parse(item.services || '[]'); } catch (e) {}

        const tagsHtml = services.map(tag => `<span>${esc(tag)}</span>`).join('');
        // В карточке — только полная дата из календаря. Год только в фильтрах.
        const dateText = item.published_at ? formatDate(item.published_at) : '';

        const url = `project.html?slug=${encodeURIComponent(item.slug)}`;

        return `
            <a class="portfolio-block-link" href="${url}">
                <div class="portfolio-block">
                    <img src="${escAttr(item.cover_image || '')}" alt="${escAttr(item.title || '')}">
                    <div class="portfolio-block__content">
                        <div class="portfolio-block__text">
                            <div class="portfolio-tags__wrapper">
                                <div class="portfolio-tags">${tagsHtml}</div>
                                <span class="portfolio-place">${esc(item.place || '')}</span>
                            </div>
                            <h3 class="portfolio-block__title">${esc(item.title || '')}</h3>
                        </div>
                        <div class="portfolio-block__info">
                            <span>${esc(dateText)}</span>
                            <span>${esc(item.city || '')}</span>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['января','февраля','марта','апреля','мая','июня',
                        'июля','августа','сентября','октября','ноября','декабря'];
        return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function appendChunk() {
        if (isLoading) return;
        if (renderedCount >= filteredProjects.length) {
            loader.classList.remove('is-visible');
            return;
        }

        isLoading = true;
        loader.classList.add('is-visible');

        setTimeout(() => {
            const slice = filteredProjects.slice(renderedCount, renderedCount + PAGE_SIZE);
            const temp = document.createElement('div');
            temp.innerHTML = slice.map(renderCard).join('');

            const newCards = [...temp.children];
            newCards.forEach(card => list.appendChild(card));

            if (window.initPortfolioAnimations) {
                window.initPortfolioAnimations(list);
                if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
            }

            renderedCount += slice.length;
            isLoading = false;
            loader.classList.remove('is-visible');
        }, 250);
    }

    function renderEmpty(message) {
        list.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 80px 20px; text-align: center; color: var(--color-text-secondary, #a8a8a8);">
                <p style="font-size: 18px;">${esc(message)}</p>
            </div>
        `;
    }

    function passesFilters(item, f) {
        // Услуга
        if (f.service && f.service !== 'Все') {
            let services = [];
            try { services = JSON.parse(item.services || '[]'); } catch (e) {}
            if (!services.includes(f.service)) return false;
        }

        // Город
        if (f.city && f.city !== 'Все') {
            if ((item.city || '') !== f.city) return false;
        }

        // Год (мульти-теги)
        if (f.years && f.years.length) {
            if (!f.years.includes(String(item.year))) return false;
        }

        // Время года (AND — оба условия должны совпасть если оба выбраны)
        if (f.seasons && f.seasons.length) {
            if (!f.seasons.includes(item.season || '')) return false;
        }

        // Время суток (AND с сезоном)
        if (f.time_of_day && f.time_of_day.length) {
            if (!f.time_of_day.includes(item.time_of_day || '')) return false;
        }

        // Продолжительность видео
        if (f.video_duration && f.video_duration !== 'Все') {
            if ((item.video_duration || '') !== f.video_duration) return false;
        }

        // Поиск
        if (f.search) {
            const q = f.search.toLowerCase();
            let services = [];
            try { services = JSON.parse(item.services || '[]'); } catch (e) {}

            const haystack = [
                item.title || '',
                item.place || '',
                item.city || '',
                item.about_text || '',
                services.join(' ')
            ].join(' ').toLowerCase();

            if (!haystack.includes(q)) return false;
        }

        return true;
    }

    function applyFilters() {
        const f = window.__portfolioFilters || { service: 'Все', city: 'Все', seasons: [], years: [], time_of_day: [], video_duration: 'Все', search: '' };
        filteredProjects = allProjects.filter(item => passesFilters(item, f));

        renderedCount = 0;
        list.innerHTML = '';

        if (!filteredProjects.length) {
            if (!allProjects.length) renderEmpty('Проектов пока нет');
            else renderEmpty('По выбранным фильтрам ничего не найдено');
            return;
        }

        appendChunk();
    }

    // Экспортируем для portfolio-filters.js
    window.__applyPortfolioFilters = applyFilters;

    // IntersectionObserver для бесконечной прокрутки
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) appendChunk();
        });
    }, { rootMargin: '0px 0px 200px 0px' });

    observer.observe(trigger);

    async function load() {
        try {
            const res = await fetch('/api/projects');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            allProjects = await res.json();
        } catch (e) {
            console.error('Ошибка загрузки проектов', e);
            renderEmpty('Не удалось загрузить проекты');
            return;
        }

        applyFilters();
        populateDynamicFilters(allProjects);
    }

    // Динамически заполняем фильтры по городу, году и продолжительности видео
    function populateDynamicFilters(projects) {
        // Города
        const cityMenuEl = document.querySelector('.filter-select[data-filter="city"] .filter-select__menu');
        if (cityMenuEl) {
            const cities = [...new Set(projects.map(p => p.city).filter(Boolean))].sort();
            // Оставляем только "Все", затем добавляем уникальные города
            const allBtn = cityMenuEl.querySelector('[data-value="Все"]');
            cityMenuEl.innerHTML = '';
            if (allBtn) cityMenuEl.appendChild(allBtn);
            cities.forEach(city => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'filter-select__option';
                btn.dataset.value = city;
                btn.textContent = city;
                btn.addEventListener('click', () => {
                    cityMenuEl.querySelectorAll('.filter-select__option').forEach(o => o.classList.remove('is-active'));
                    btn.classList.add('is-active');
                    const valueEl = document.querySelector('.filter-select[data-filter="city"] .filter-select__value');
                    if (valueEl) valueEl.textContent = city;
                    document.querySelector('.filter-select[data-filter="city"]').classList.remove('is-open');
                    document.querySelector('.filter-select[data-filter="city"]').classList.add('is-filled');
                    window.__portfolioFilters.city = city;
                    if (typeof window.__applyPortfolioFilters === 'function') window.__applyPortfolioFilters();
                });
                cityMenuEl.appendChild(btn);
            });
            // Восстанавливаем обработчик "Все"
            if (allBtn) {
                allBtn.addEventListener('click', () => {
                    cityMenuEl.querySelectorAll('.filter-select__option').forEach(o => o.classList.remove('is-active'));
                    allBtn.classList.add('is-active');
                    const valueEl = document.querySelector('.filter-select[data-filter="city"] .filter-select__value');
                    if (valueEl) valueEl.textContent = 'Все';
                    document.querySelector('.filter-select[data-filter="city"]').classList.remove('is-open', 'is-filled');
                    window.__portfolioFilters.city = 'Все';
                    if (typeof window.__applyPortfolioFilters === 'function') window.__applyPortfolioFilters();
                });
            }
        }

        // Годы (теги)
        const yearTagsEl = document.querySelector('.filter-tags[data-filter-group="year"]');
        if (yearTagsEl) {
            const years = [...new Set(projects.map(p => p.year).filter(y => y && parseInt(y)))].map(String).sort().reverse();
            yearTagsEl.innerHTML = '';
            years.forEach(year => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'filter-tag';
                btn.dataset.value = year;
                btn.textContent = year;
                yearTagsEl.appendChild(btn);
            });
            if (typeof window.__bindTagGroup === 'function') window.__bindTagGroup(yearTagsEl);
        }

        // Продолжительность видео (динамически из данных)
        const durMenuEl = document.querySelector('.filter-select[data-filter="video_duration"] .filter-select__menu');
        if (durMenuEl) {
            const durations = [...new Set(projects.map(p => p.video_duration).filter(Boolean))].sort();
            const allBtn = durMenuEl.querySelector('[data-value="Все"]');
            durMenuEl.innerHTML = '';
            if (allBtn) durMenuEl.appendChild(allBtn);
            durations.forEach(dur => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'filter-select__option';
                btn.dataset.value = dur;
                btn.textContent = dur;
                durMenuEl.appendChild(btn);
            });
            // Переинициализируем select после заполнения
            const durSelect = document.querySelector('.filter-select[data-filter="video_duration"]');
            if (durSelect && typeof window.__initFilterSelect === 'function') {
                window.__initFilterSelect(durSelect);
            }
        }
    }

    load();
})();
