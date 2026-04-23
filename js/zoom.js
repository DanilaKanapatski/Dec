/* масштаб страницы на экранах шире 1920px */
function initPageScale() {
    const wrapper = document.querySelector('.page-wrapper');
    if (!wrapper) return;

    function apply() {
        if (window.innerWidth >= 1920) {
            const scale = window.innerWidth / 1920;
            wrapper.style.width = '1920px';
            wrapper.style.zoom  = scale;
            // НЕ вызываем ScrollTrigger.refresh() — это сбивает Lenis
            // и ломает pinSpacer у featured-portfolio (блок уходит вниз).
        } else {
            wrapper.style.width = '';
            wrapper.style.zoom  = '';
        }
    }

    apply();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(apply, 150);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initPageScale();   // ← первым: устанавливает zoom до любых GSAP-расчётов
});