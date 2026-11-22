// ==========================================
// CAMPUSNAV SHELL
// One header (desktop nav + theme switch) and one bottom tab bar
// (phones and wrapped Android / iOS apps) shared by every page.
//
// Usage: <body data-page="home|map|timetable|events|groups">
//        <script src="shell.js"></script> as the first thing in <body>.
// ==========================================

(function () {

    const ICONS = {

        home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',

        map: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',

        timetable: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',

        events: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',

        groups: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="17" cy="10" r="2.3"/><path d="M16.5 14.6c2.3.1 3.9 1.4 4.5 4"/>',

        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',

        moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'
    };

    const PAGES = [
        { id: "home", label: "Today", href: "index.html" },
        { id: "map", label: "Map", href: "map.html" },
        { id: "timetable", label: "Timetable", href: "timetable.html" },
        { id: "events", label: "Events", href: "events.html" },
        { id: "groups", label: "Groups", href: "groups.html" }
    ];


    // Reachable from the desktop menu and from Home, but not in the tab bar.
    const EXTRA_PAGES = [
        { id: "explore", label: "Explore", href: "explore.html" },
        { id: "info", label: "Info", href: "campus-info.html" }
    ];


    function icon(name) {

        return (
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            ICONS[name] +
            "</svg>"
        );
    }


    function build() {

        const current = document.body.dataset.page || "";

        const header = document.createElement("header");

        header.className = "cn-header";

        header.innerHTML =
            '<a class="cn-logo" href="index.html" aria-label="CampusNav home">Campus<span>Nav</span></a>' +
            '<nav class="cn-nav" aria-label="Main">' +
            PAGES.concat(EXTRA_PAGES).map(page =>
                '<a href="' + page.href + '"' +
                (page.id === current ? ' aria-current="page"' : "") +
                ">" + page.label + "</a>"
            ).join("") +
            "</nav>" +
            '<button class="cn-theme" id="themeToggle" type="button" data-icon-button aria-label="Switch theme">' +
            icon("sun").replace('class="icon"', 'class="icon icon-sun"') +
            icon("moon").replace('class="icon"', 'class="icon icon-moon"') +
            "</button>";

        document.body.insertBefore(header, document.body.firstChild);

        const buildTabbar = () => {
        const tabbar = document.createElement("nav");

        tabbar.className = "cn-tabbar";

        tabbar.setAttribute("aria-label", "Main");

        tabbar.innerHTML = PAGES.map(page =>
            '<a href="' + page.href + '"' +
            (page.id === current ? ' aria-current="page"' : "") +
            ">" + icon(page.id) + "<span>" + page.label + "</span></a>"
        ).join("");

        document.body.appendChild(tabbar);
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", buildTabbar);
        } else {
            buildTabbar();
        }
    }


    build();

})();
