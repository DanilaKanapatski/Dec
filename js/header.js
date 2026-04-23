(() => {
    const menu = document.getElementById('mobile-menu');
    const burger = document.querySelector('.header-burger');
    const closeBtn = document.querySelector('.mobile-menu__close');
    const overlay = document.querySelector('.mobile-menu__overlay');

    if (!menu || !burger || !closeBtn || !overlay) return;

    const openMenu = () => {
        menu.classList.add('is-open');
        menu.setAttribute('aria-hidden', 'false');
        burger.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
    };

    const closeMenu = () => {
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    };

    burger.addEventListener('click', () => {
        if (menu.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
})();