(() => {
    const modal = document.getElementById('contact-modal');
    if (!modal) return;

    const closeEls = modal.querySelectorAll('[data-modal-close]');
    const dialog = modal.querySelector('.modal__dialog');

    let lastActiveEl = null;

    function openModal(e) {
        if (e) e.preventDefault();

        lastActiveEl = document.activeElement;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');

        if (window.innerWidth <= 1100) {
            document.body.classList.add('modal-open');
            document.documentElement.classList.add('modal-open');
        }

        const closeBtn = modal.querySelector('.modal__close');
        if (closeBtn) closeBtn.focus();

        window.addEventListener('keydown', onKeyDown);
    }

    function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');

        if (window.innerWidth <= 1100) {
            document.body.classList.remove('modal-open');
            document.documentElement.classList.remove('modal-open');
        }

        window.removeEventListener('keydown', onKeyDown);

        if (lastActiveEl) {
            lastActiveEl.focus();
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    }

    // Делегирование — работает и для кнопок, добавленных динамически
    document.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-modal-open="contact"]');
        if (opener) {
            openModal(e);
        }
    });

    closeEls.forEach(el => {
        el.addEventListener('click', closeModal);
    });

    dialog.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Выставляем в window на случай, если нужно открывать программно
    window.openContactModal = openModal;
})();

(() => {
    const form = document.getElementById("modal-form");
    if (!form) return;

    const nameInput = form.querySelector('input[name="name"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    const agreeInput = form.querySelector('input[name="agree"]');
    const submitBtn = form.querySelector(".modal__submit");

    const nameField = nameInput.closest(".modal__field");
    const phoneField = phoneInput.closest(".modal__field");
    const checkboxField = agreeInput.closest(".modal__agree");

    const setError = (field, message) => {
        field.classList.add("is-error");
        const error = field.querySelector(".modal__error");
        if (error) error.textContent = message;
    };

    const clearError = (field) => {
        field.classList.remove("is-error");
    };

    const toggleFilled = (input) => {
        const field = input.closest(".modal__field");

        if (input.value.trim()) {
            field.classList.add("is-filled");
        } else {
            field.classList.remove("is-filled");
        }
    };

    const validateName = () => {
        const value = nameInput.value.trim();

        clearError(nameField);

        if (!value) {
            setError(nameField, "Заполните поле");
            return false;
        }

        if (value.length < 2) {
            setError(nameField, "Минимум 2 символа");
            return false;
        }

        return true;
    };

    const validatePhone = () => {
        const value = phoneInput.value.trim();

        clearError(phoneField);

        if (!value) {
            setError(phoneField, "Заполните поле");
            return false;
        }

        const digits = value.replace(/\D/g, "");

        if (digits.length < 10) {
            setError(phoneField, "Введите корректный телефон");
            return false;
        }

        return true;
    };

    const validateCheckbox = () => {
        checkboxField.classList.remove("is-error");

        if (!agreeInput.checked) {
            checkboxField.classList.add("is-error");
            return false;
        }

        return true;
    };

    nameInput.addEventListener("input", () => {
        toggleFilled(nameInput);
        if (nameField.classList.contains("is-error")) validateName();
    });

    phoneInput.addEventListener("input", () => {
        toggleFilled(phoneInput);
        if (phoneField.classList.contains("is-error")) validatePhone();
    });

    nameInput.addEventListener("blur", validateName);
    phoneInput.addEventListener("blur", validatePhone);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const validName = validateName();
        const validPhone = validatePhone();
        const validCheckbox = validateCheckbox();

        if (!validName || !validPhone || !validCheckbox) return;

        submitBtn.disabled = true;

        try {
            await fetch("/api/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: nameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    source: "Модальное окно"
                })
            });
        } catch (err) {
            console.error("Request send error:", err);
        }

        form.reset();
        submitBtn.disabled = false;
        nameField.classList.remove("is-filled");
        phoneField.classList.remove("is-filled");
        alert("Заявка отправлена");
    });

})();

(function () {
    const hash = window.location.hash;
    if (!hash) return;

    history.replaceState(null, '', window.location.pathname);
    window.scrollTo(0, 0);

    // Плавная анимация скролла вручную (работает везде включая iOS Safari)
    function smoothScrollTo(target, duration) {
        const startY = window.pageYOffset;
        const endY = target.getBoundingClientRect().top + startY;
        const startTime = performance.now();

        function easeInOut(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, startY + (endY - startY) * easeInOut(progress));
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    window.addEventListener('load', () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const target = document.querySelector(hash);
                    if (!target) return;

                    if (window.__lenis) {
                        // Десктоп — через Lenis
                        window.__lenis.scrollTo(target, {
                            duration: 1.5,
                            easing: t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t
                        });
                    } else {
                        // Мобилка — ручная плавная анимация 1.2 сек
                        smoothScrollTo(target, 1600);
                    }
                }, 500);
            });
        });
    });
})();