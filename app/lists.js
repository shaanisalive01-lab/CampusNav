// Pieces shared by the list screens, and the Events screen.
(function () {
    "use strict";

    window.ListScreens = icon => ({
        // the heading and the switch between Events and Groups
        switcher: current => '<h1 class="title">' + (current === "events" ? "Events" : "Groups") + "</h1>" +
            '<nav class="segment" aria-label="Events and groups">' + [["events", "Events"], ["groups", "Groups"]].map(([to, label]) =>
                '<a href="#' + to + '"' + (to === current ? ' aria-current="page"' : "") + ">" + label + "</a>").join("") + "</nav>",

        chips: (values, chosen, label) => '<div class="chips" role="group" aria-label="' + label + '">' + values.map(value =>
            '<button type="button" data-chip="' + value + '" aria-pressed="' + (value === chosen) + '">' +
            value[0].toUpperCase() + value.slice(1) + "</button>").join("") + "</div>",

        pageHead: title => '<div class="page-head"><a class="back" href="#home" aria-label="Back to Home" title="Back to Home">' +
            icon("back") + '</a><h1 class="title">' + title + "</h1></div>",

        eventHTML: event => {
            const date = new Date(event.ts);
            return '<li><a class="card" href="#go/' + encodeURIComponent(event.location) + '">' +
                '<div class="date"><b>' + date.getDate() + "</b><span>" +
                escapeHTML(date.toLocaleDateString("en-IN", { weekday: "short" }) + " " + date.toLocaleDateString("en-IN", { month: "short" })) + "</span></div>" +
                '<div class="card-text"><strong>' + escapeHTML(event.name) + "</strong>" +
                (event.description ? '<p class="about">' + escapeHTML(event.description) + "</p>" : "") + "<span>" +
                "<span>" + icon("day") + escapeHTML(event.time) + "</span><span>" + icon("pin") + escapeHTML(event.place) + "</span>" +
                (event.tag ? "<span>" + icon("people") + escapeHTML(event.tag) + "</span>" : "") + "</span></div></a></li>";
        }
    });

    window.ListScreens.onChip = (sheet, run) => {
        const row = sheet.querySelector(".chips");
        row.addEventListener("click", event => {
            const button = event.target.closest("[data-chip]");
            if (!button) return;
            row.querySelectorAll("button").forEach(other => other.setAttribute("aria-pressed", String(other === button)));
            run(button.dataset.chip);
        });
    };

    const TYPES = ["all", "academic", "technical", "social"];
    // kept while moving between screens
    let typed = "";
    let chosen = "all";

    function show(ctx) {
        ctx.sheet.innerHTML = ctx.switcher("events") +
            '<input type="search" class="filter" id="eventSearch" aria-label="Search events" placeholder="Search events" autocomplete="off">' +
            ctx.chips(TYPES, chosen, "Type of event") + '<ul class="cards" id="eventList"></ul>' +
            '<p class="note">Weekly events are samples. Club events are saved on this device only.</p>';
        const search = ctx.sheet.querySelector("#eventSearch");
        const list = ctx.sheet.querySelector("#eventList");
        const events = getAllEvents();
        const { eventHTML } = window.ListScreens(ctx.icon);
        const paint = () => {
            const query = typed.trim().toLowerCase();
            list.innerHTML = events.filter(e => (chosen === "all" || e.category === chosen) &&
                (!query || (e.name + " " + e.place + " " + e.day).toLowerCase().includes(query)))
                .map(eventHTML).join("") || '<li class="empty">No event matches</li>';
        };
        search.value = typed;
        search.addEventListener("input", () => { typed = search.value; paint(); });
        ctx.onChip(value => { chosen = value; paint(); });
        paint();
    }

    window.EventScreen = { show };
})();
