(() => {
    const filters = document.getElementById('portfolio-filters');
    const toggleBtn = document.getElementById('portfolio-filter-toggle');
    const clearBtn = document.getElementById('portfolio-filter-clear');

    const searchField = document.getElementById('portfolio-search-field');
    const searchInput = document.getElementById('portfolio-search-input');
    const searchIcon = searchField?.querySelector('.portfolio-search-icon');

    const selects = document.querySelectorAll('.filter-select');

    // Состояние — читается portfolio-load.js
    const state = {
        service: 'Все',
        city: 'Все',
        seasons: [],
        years: [],
        search: ''
    };
    window.__portfolioFilters = state;

    function triggerFilters() {
        if (typeof window.__applyPortfolioFilters === 'function') {
            window.__applyPortfolioFilters();
        }
    }

    if (toggleBtn && filters) {
        toggleBtn.addEventListener('click', () => {
            filters.classList.toggle('is-hidden');
            toggleBtn.textContent = filters.classList.contains('is-hidden') ? 'Показать' : 'Скрыть';
        });
    }

    const closeAllSelects = () => {
        selects.forEach(select => select.classList.remove('is-open'));
    };

    selects.forEach(select => {
        const trigger = select.querySelector('.filter-select__trigger');
        const valueEl = select.querySelector('.filter-select__value');
        const defaultValue = valueEl.dataset.default;
        const options = select.querySelectorAll('.filter-select__option');
        const filterKey = select.dataset.filter; // service / city

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = select.classList.contains('is-open');
            closeAllSelects();
            if (!isOpen) select.classList.add('is-open');
        });

        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('is-active'));
                option.classList.add('is-active');

                const val = option.dataset.value;
                valueEl.textContent = val;
                select.classList.remove('is-open');

                if (val !== defaultValue) select.classList.add('is-filled');
                else select.classList.remove('is-filled');

                if (filterKey === 'service') state.service = val;
                if (filterKey === 'city') state.city = val;

                triggerFilters();
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (![...selects].some(select => select.contains(e.target))) {
            closeAllSelects();
        }
    });

    /* ПОИСК */
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

        let searchTimer;
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim()) {
                searchField.classList.add('is-filled', 'is-active');
            } else {
                searchField.classList.remove('is-filled');
            }
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.search = searchInput.value.trim();
                triggerFilters();
            }, 150);
        });
    }

    /* ТЕГИ (сезон, год) — мульти-выбор */
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('is-active');

            // группа — ищем по родителю data-filter-group
            const group = tag.closest('[data-filter-group]');
            if (!group) return;
            const key = group.dataset.filterGroup; // season / year

            const activeValues = Array.from(group.querySelectorAll('.filter-tag.is-active'))
                .map(t => t.dataset.value);

            if (key === 'season') state.seasons = activeValues;
            if (key === 'year') state.years = activeValues;

            triggerFilters();
        });
    });

    /* ОЧИСТКА */
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

        document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('is-active'));

        state.service = 'Все';
        state.city = 'Все';
        state.seasons = [];
        state.years = [];
        state.search = '';

        triggerFilters();
    });

    // Проставляем активные варианты по дефолту
    selects.forEach(select => {
        const valueEl = select.querySelector('.filter-select__value');
        const defaultValue = valueEl.dataset.default;
        const options = select.querySelectorAll('.filter-select__option');
        const defaultOption = [...options].find(opt => opt.dataset.value === defaultValue);
        if (defaultOption) defaultOption.classList.add('is-active');
    });
})();
