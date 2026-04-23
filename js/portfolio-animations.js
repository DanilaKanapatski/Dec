(() => {
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    function initPortfolioAnimations(scope = document) {
        const cards = scope.querySelectorAll('.portfolio-block');

        cards.forEach((card) => {
            if (card.dataset.animated === 'true') return;
            card.dataset.animated = 'true';

            const image = card.querySelector('img');
            const content = card.querySelector('.portfolio-block__content');
            const tags = card.querySelector('.portfolio-tags__wrapper');
            const title = card.querySelector('.portfolio-block__title');
            const info = card.querySelector('.portfolio-block__info');

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom-=330',
                    once: true,
                    invalidateOnRefresh: true
                }
            });

            tl.fromTo(
                image,
                {
                    opacity: 0,
                    clipPath: 'inset(0 100% 0 0)',
                    rotationY: -18,
                    x: 40,
                    scale: 1.04,
                    transformPerspective: 1400
                },
                {
                    opacity: 1,
                    clipPath: 'inset(0 0% 0 0)',
                    rotationY: 0,
                    x: 0,
                    scale: 1,
                    duration: 1.15,
                    ease: 'power3.out'
                }
            );

            tl.fromTo(
                content,
                { y: 42, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
                0.15
            );

            tl.fromTo(
                [tags, title, info],
                { y: 18, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: 'power2.out' },
                0.25
            );

            gsap.to(image, {
                // yPercent: 6,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        });
    }

    window.initPortfolioAnimations = initPortfolioAnimations;
})();