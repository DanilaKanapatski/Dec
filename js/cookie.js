(() => {
    const KEY = "cookieConsent";
    const el = document.getElementById("cookie");
    const overlay = el.querySelector(".cookie__overlay");

    overlay?.addEventListener("click", () => {
        setSaved("declined");
        close();
    });

    if (!el) return;

    const getSaved = () => {
        try {
            return localStorage.getItem(KEY);
        } catch {
            return null;
        }
    };

    const setSaved = (value) => {
        try {
            localStorage.setItem(KEY, value);
        } catch {}
    };

    const open = () => {
        el.classList.add("is-open");
        el.setAttribute("aria-hidden", "false");
    };

    const close = () => {
        el.classList.remove("is-open");
        el.setAttribute("aria-hidden", "true");
    };

    const saved = getSaved();
    if (!saved) open();

    el.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cookie]");
        if (!btn) return;

        const action = btn.dataset.cookie;

        if (action === "accept") {
            setSaved("accepted");
            close();
        }

        if (action === "decline" || action === "close") {
            setSaved("declined");
            close();
        }
    });
})();