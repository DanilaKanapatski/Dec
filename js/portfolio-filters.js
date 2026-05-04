(() => {
    const filters = document.getElementById('portfolio-filters');
    const toggleBtn = document.getElementById('portfolio-filter-toggle');
    const clearBtn = document.getElementById('portfolio-filter-clear');
    const searchField = document.getElementById('portfolio-search-field');
    const searchInput = document.getElementById('portfolio-search-input');
    const searchIcon = searchField?.querySelector('.portfolio-search-icon');

    const SERVICE_PANEL_MAP = {
        'Все':                                    null,
        'Рендеры экстерьера':                     'renders',
        'Рендеры интерьера':                      'renders',
        '3D-ролики':                              'video',
        '3D-туры':                                null,
        'Интерактивные презентации на Unreal':    null,
    };

    const state = {
        service: 'Все',
        city: 'Все',
        seasons: [],
        years: [],
        time_of_day: [],
        video_duration: 'Все',
        search: ''
    };
    window.__portfolioFilters = state;

    function triggerFilters() {
        if (typeof window.__applyPortfolioFilters === 'function') {
            window.__applyPortfolioFilters();
        }
    }

    function resetSelect(select) {
        const valueEl = select.querySelector('.filter-select__value');
        if (!valueEl) return;
        const def = valueEl.dataset.default || 'Все';
        valueEl.textContent = def;
        select.classList.remove('is-open', 'is-filled');
        select.querySelectorAll('.filter-select__option').forEach(o => o.classList.remove('is-active'));
        const defOpt = select.querySelector(`[data-value="${def}"]`);
        if (defOpt) defOpt.classList.add('is-active');
    }

    // При смене услуги — сбросить ВСЕ остальные фильтры кроме услуги
    function resetAllExceptService() {
        // Сброс город
        const citySelect = document.querySelector('.filter-select[data-filter="city"]');
        if (citySelect) resetSelect(citySelect);
        state.city = 'Все';

        // Сброс год
        document.querySelectorAll('.filter-tags[data-filter-group="year"] .filter-tag').forEach(t => t.classList.remove('is-active'));
        state.years = [];

        // Сброс скрытых фильтров (время суток, сезон, продолжительность)
        document.querySelectorAll('[data-filter-visible]').forEach(el => {
            el.querySelectorAll('.filter-tag.is-active').forEach(t => t.classList.remove('is-active'));
            if (el.classList.contains('filter-select')) resetSelect(el);
        });
        state.seasons = [];
        state.time_of_day = [];
        state.video_duration = 'Все';
    }

    function updatePanels(service) {
        const panelKey = SERVICE_PANEL_MAP[service] ?? null;
        document.querySelectorAll('[data-filter-visible]').forEach(el => {
            el.style.display = el.dataset.filterVisible === panelKey ? '' : 'none';
        });
    }

    /* ── TOGGLE ── */
    if (toggleBtn && filters) {
        toggleBtn.addEventListener('click', () => {
            filters.classList.toggle('is-hidden');
            toggleBtn.textContent = filters.classList.contains('is-hidden') ? 'Показать' : 'Скрыть';
        });
    }

    /* ── СЕЛЕКТЫ: используем onclick (перезаписывается при повторном initSelect) ── */
    const closeAllSelects = () => {
        document.querySelectorAll('.filter-select').forEach(s => s.classList.remove('is-open'));
    };

    function initSelect(select) {
        const trigger = select.querySelector('.filter-select__trigger');
        const valueEl = select.querySelector('.filter-select__value');
        if (!trigger || !valueEl) return;

        const defaultValue = valueEl.dataset.default || 'Все';
        const filterKey = select.dataset.filter;

        // onclick перезаписывается — не дублируется при повторном вызове
        trigger.onclick = (e) => {
            e.stopPropagation();
            const isOpen = select.classList.contains('is-open');
            closeAllSelects();
            if (!isOpen) select.classList.add('is-open');
        };

        select.querySelectorAll('.filter-select__option').forEach(option => {
            option.onclick = () => {
                select.querySelectorAll('.filter-select__option').forEach(o => o.classList.remove('is-active'));
                option.classList.add('is-active');
                const val = option.dataset.value;
                valueEl.textContent = val;
                select.classList.remove('is-open');
                select.classList.toggle('is-filled', val !== defaultValue);

                if (filterKey === 'service') {
                    state.service = val;
                    resetAllExceptService();
                    updatePanels(val);
                }
                if (filterKey === 'city')           state.city = val;
                if (filterKey === 'video_duration') state.video_duration = val;

                triggerFilters();
            };
        });

        if (!select.querySelector('.filter-select__option.is-active')) {
            const defOpt = select.querySelector(`[data-value="${defaultValue}"]`);
            if (defOpt) defOpt.classList.add('is-active');
        }
    }

    document.querySelectorAll('.filter-select').forEach(initSelect);
    window.__initFilterSelect = initSelect;

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-select')) closeAllSelects();
    });

    /* ── ТЕГИ: onclick перезаписывается ── */
    function bindTagGroup(group) {
        group.querySelectorAll('.filter-tag').forEach(tag => {
            tag.onclick = () => {
                tag.classList.toggle('is-active');
                const key = group.dataset.filterGroup;
                const active = [...group.querySelectorAll('.filter-tag.is-active')].map(t => t.dataset.value);
                if (key === 'season')      state.seasons = active;
                if (key === 'year')        state.years = active;
                if (key === 'time_of_day') state.time_of_day = active;
                triggerFilters();
            };
        });
    }
    document.querySelectorAll('[data-filter-group]').forEach(bindTagGroup);
    window.__bindTagGroup = bindTagGroup;

    /* ── ПОИСК ── */
    if (searchField && searchInput) {
        searchIcon?.addEventListener('click', () => {
            searchField.classList.toggle('is-active');
            if (searchField.classList.contains('is-active')) searchInput.focus();
            else { searchInput.value = ''; state.search = ''; triggerFilters(); }
        });
        searchInput.addEventListener('blur', () => {
            if (!searchInput.value.trim()) searchField.classList.remove('is-active');
        });
        let searchTimer;
        searchInput.addEventListener('input', () => {
            searchField.classList.toggle('is-filled', !!searchInput.value.trim());
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => { state.search = searchInput.value.trim(); triggerFilters(); }, 150);
        });
    }

    /* ── ОЧИСТКА ── */
    clearBtn?.addEventListener('click', () => {
        if (searchInput && searchField) {
            searchInput.value = '';
            searchField.classList.remove('is-active', 'is-filled');
        }
        document.querySelectorAll('.filter-select').forEach(resetSelect);
        document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('is-active'));
        document.querySelectorAll('[data-filter-visible]').forEach(el => { el.style.display = 'none'; });

        state.service = 'Все';
        state.city = 'Все';
        state.seasons = [];
        state.years = [];
        state.time_of_day = [];
        state.video_duration = 'Все';
        state.search = '';
        triggerFilters();
    });
})();
