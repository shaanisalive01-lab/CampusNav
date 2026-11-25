// Theme switch: "System" follows the phone, "Light" and "Dark" stay put.
(function () {
    "use strict";

    const $ = selector => document.querySelector(selector);


    const THEME_KEY = "campusnav-theme";
    const themeButton = $("#themeBtn");
    const themeMenu = $("#themeMenu");
    const phoneIsDark = matchMedia("(prefers-color-scheme: dark)");
    const THEME_LOOK = { system: ["i-auto", "System"], light: ["i-sun", "Light"], dark: ["i-moon", "Dark"] };

    function savedTheme() {
        try {
            const saved = localStorage.getItem(THEME_KEY);
            return saved === "light" || saved === "dark" ? saved : "system";
        } catch (error) {
            return "system";
        }
    }

    function applyTheme(choice) {
        const root = document.documentElement;
        if (choice === "system") delete root.dataset.theme;
        else root.dataset.theme = choice;
        const dark = choice === "dark" || (choice === "system" && phoneIsDark.matches);
        // keeps the phone's status bar the same colour as the app
        $('meta[name="theme-color"]').setAttribute("content", dark ? "#0e1014" : "#e9ebef");
        $("#themeIcon").setAttribute("href", "#" + THEME_LOOK[choice][0]);
        themeButton.setAttribute("aria-label", "Theme: " + THEME_LOOK[choice][1]);
        themeMenu.querySelectorAll("button").forEach(button =>
            button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice)));
    }

    let theme = savedTheme();

    function toggleMenu(open) {
        themeMenu.hidden = !open;
        themeButton.setAttribute("aria-expanded", String(open));
    }

    themeButton.addEventListener("click", () => toggleMenu(themeMenu.hidden));

    themeMenu.addEventListener("click", event => {
        const button = event.target.closest("[data-theme-choice]");
        if (!button) return;
        theme = button.dataset.themeChoice;
        try {
            if (theme === "system") localStorage.removeItem(THEME_KEY);
            else localStorage.setItem(THEME_KEY, theme);
        } catch (error) {
            // storage blocked: the theme still changes for this visit
        }
        applyTheme(theme);
        toggleMenu(false);
        themeButton.focus();
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".theme")) toggleMenu(false);
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !themeMenu.hidden) {
            toggleMenu(false);
            themeButton.focus();
        }
    });
    phoneIsDark.addEventListener("change", () => applyTheme(theme));
    // a change made in another tab of the app
    addEventListener("storage", event => {
        if (event.key === THEME_KEY) { theme = savedTheme(); applyTheme(theme); }
    });
    applyTheme(theme);

    window.ThemeMenu = { close: () => toggleMenu(false), isOpen: () => !themeMenu.hidden };
})();
