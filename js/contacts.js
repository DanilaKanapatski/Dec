    (() => {
        // Компенсируем fixed header — отступ у <main>
        document.addEventListener('DOMContentLoaded', () => {
            const headerEl = document.querySelector('.header');
            const mainEl = document.querySelector('main');
            if (headerEl && mainEl) mainEl.style.paddingTop = headerEl.offsetHeight + 'px';
        });
    const form = document.getElementById("request-form");
    if (!form) return;

    const nameInput = form.querySelector('input[name="name"]');
    const phoneInput = form.querySelector('input[name="phone"]');
    const agreeInput = form.querySelector('input[name="agree"]');
    const submitBtn = form.querySelector(".request-btn");

    const nameField = nameInput.closest(".request-field");
    const phoneField = phoneInput.closest(".request-field");
    const checkboxField = agreeInput.closest(".request-checkbox");

    const setError = (field, message) => {
    field.classList.add("is-error");
    const error = field.querySelector(".request-error");
    if (error && message) error.textContent = message;
};

    const clearError = (field) => {
    field.classList.remove("is-error");
};

    const toggleFilled = (input) => {
    const field = input.closest(".request-field");
    if (!field) return;

    if (input.value.trim()) {
    field.classList.add("is-filled");
} else {
    field.classList.remove("is-filled");
}
};

    const sanitizeName = (value) => {
    return value
    .replace(/[^A-Za-zА-Яа-яЁё\s-]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 50);
};

    const sanitizePhone = (value) => {
    let cleaned = value.replace(/[^\d+]/g, "");

    if (cleaned.includes("+")) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
}

    return cleaned.slice(0, 18);
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

    if (!/^[A-Za-zА-Яа-яЁё\s-]+$/.test(value)) {
    setError(nameField, "Только буквы");
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

    const digitsCount = value.replace(/\D/g, "").length;

    if (digitsCount < 10) {
    setError(phoneField, "Введите корректный телефон");
    return false;
}

    if (!/^\+?\d+$/.test(value)) {
    setError(phoneField, "Только цифры и +");
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
    nameInput.value = sanitizeName(nameInput.value);
    toggleFilled(nameInput);
    if (nameField.classList.contains("is-error")) validateName();
});

    phoneInput.addEventListener("input", () => {
    phoneInput.value = sanitizePhone(phoneInput.value);
    toggleFilled(phoneInput);
    if (phoneField.classList.contains("is-error")) validatePhone();
});

    nameInput.addEventListener("blur", validateName);
    phoneInput.addEventListener("blur", validatePhone);

    agreeInput.addEventListener("change", () => {
    if (agreeInput.checked) {
    checkboxField.classList.remove("is-error");
}
});

    form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const isNameValid = validateName();
    const isPhoneValid = validatePhone();
    const isCheckboxValid = validateCheckbox();

    if (!isNameValid || !isPhoneValid || !isCheckboxValid) return;

    submitBtn.disabled = true;

    try {
    const response = await fetch("/api/request", {
    method: "POST",
    headers: {
    "Content-Type": "application/json"
},
    body: JSON.stringify({
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    source: "Страница контактов"
})
});

    const data = await response.json();

    if (!response.ok || !data.success) {
    alert(data.error || "Ошибка отправки");
    submitBtn.disabled = false;
    return;
}

    form.reset();
    nameField.classList.remove("is-filled");
    phoneField.classList.remove("is-filled");
    checkboxField.classList.remove("is-error");

    alert("Заявка отправлена");
} catch (error) {
    alert("Ошибка отправки");
} finally {
    submitBtn.disabled = false;
}
});
})();
