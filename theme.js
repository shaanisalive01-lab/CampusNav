// ==========================================
// CAMPUSNAV SHARED THEME (dark / light)
//
// Load in <head> so the saved theme is applied before the page paints.
// Needs a button with id="themeToggle" (optional).
//
// Two page styles exist:
//   - default:                 sets <html data-theme="light|dark">, dark is the default
//   - <html data-theme-mode="body">: toggles class "dark" on <body>, light is the default
// ==========================================

(function () {

    const THEME_KEY = "campusnav-theme";

    const root = document.documentElement;

    const bodyMode = root.dataset.themeMode === "body";


    function getSavedTheme() {

        try {

            const theme = localStorage.getItem(THEME_KEY);

            return theme === "dark" || theme === "light" ? theme : null;

        } catch (error) {

            return null;
        }
    }


    function saveTheme(theme) {

        try {

            localStorage.setItem(THEME_KEY, theme);

        } catch (error) {

            // storage blocked: the theme still changes for this visit
        }
    }


    // Pages that opt in with data-theme-default="system" follow the
    // phone's light/dark setting until the user picks one.
    function getSystemTheme() {

        if (root.dataset.themeDefault !== "system") {
            return "dark";
        }

        try {

            return window.matchMedia("(prefers-color-scheme: light)").matches
                ? "light"
                : "dark";

        } catch (error) {

            return "dark";
        }
    }


    function getCurrentTheme() {

        const saved = getSavedTheme();

        if (bodyMode) {
            return saved === "dark" ? "dark" : "light";
        }

        return saved || getSystemTheme();
    }


    function applyTheme(theme) {

        if (bodyMode) {

            if (document.body) {
                document.body.classList.toggle("dark", theme === "dark");
            }

            return;
        }

        root.dataset.theme = theme;

        // status bar / browser chrome colour follows the in-app theme
        const meta = document.querySelector('meta[name="theme-color"]');

        if (meta) {
            meta.setAttribute("content", theme === "dark" ? "#080b12" : "#f4f6fa");
        }
    }


    function updateButton() {

        const button = document.getElementById("themeToggle");

        if (!button) {
            return;
        }

        const theme = getCurrentTheme();

        // icon buttons (SVG sun/moon) are switched by CSS, not by text
        if (button.hasAttribute("data-icon-button")) {

            button.setAttribute(
                "aria-label",
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
            );

            return;
        }

        if (bodyMode) {

            // shows the theme you would switch to
            button.textContent = theme === "dark" ? "☀" : "☾";

        } else {

            // shows the theme you are in
            button.textContent = theme === "light" ? "☀️" : "🌙";
        }

        button.setAttribute(
            "aria-label",
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        );
    }


    function toggleTheme() {

        const next = getCurrentTheme() === "dark" ? "light" : "dark";

        saveTheme(next);

        applyTheme(next);

        updateButton();
    }


    // 1. Before first paint: restore a saved choice.
    //    (Without a saved choice, each page keeps its own CSS default.)
    if (!bodyMode && (getSavedTheme() || root.dataset.themeDefault === "system")) {
        applyTheme(getCurrentTheme());
    }


    // 2. Once the page exists: body class, button icon, click handler.
    function init() {

        if (bodyMode) {
            applyTheme(getCurrentTheme());
        }

        updateButton();

        const button = document.getElementById("themeToggle");

        if (button) {
            button.addEventListener("click", toggleTheme);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.toggleTheme = toggleTheme;

})();
