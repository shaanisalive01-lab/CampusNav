// "Know your prof": search by name, department or club; go to their room; email them.
(function () {
    "use strict";

    const people = () => window.PROFESSORS || [];

    function find(text) {
        const query = text.trim().toLowerCase();
        if (!query) return [];
        return people().filter(p => [p.name, p.department].concat(p.clubs).some(v => v.toLowerCase().includes(query)));
    }

    const initials = name => name.replace(/^(prof|dr|mr|mrs|ms)\.?\s+/i, "").split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase();

    function row(ctx, p, open) {
        const mapped = ctx.isPlace(p.room);
        const fact = (glyph, words) => "<li>" + ctx.icon(glyph) + escapeHTML(words) + "</li>";
        return '<li class="prof"><details' + (open ? " open" : "") + ">" +
            '<summary><span class="avatar" aria-hidden="true">' + escapeHTML(initials(p.name)) + "</span>" +
            "<span><strong>" + escapeHTML(p.name) + "</strong><small>" + escapeHTML(p.department) + "</small></span></summary>" +
            '<div class="prof-body"><ul class="facts">' +
            fact("door", mapped ? ctx.shortName(p.room) : "Room not mapped") +
            p.clubs.map(club => fact("star", "Leads " + club)).join("") +
            '<li><button type="button" class="copy" data-email="' + escapeHTML(p.email) + '" aria-label="Copy ' + escapeHTML(p.email) + '">' +
            ctx.icon("mail") + escapeHTML(p.email) + "<small>Copy</small></button></li></ul>" +
            '<div class="prof-actions">' +
            (mapped ? '<a class="btn primary" href="#go/' + encodeURIComponent(p.room) + '">' + ctx.icon("pin") + "Go to room</a>" : "") +
            '<a class="btn" href="mailto:' + encodeURIComponent(p.email).replace("%40", "@") + '">' + ctx.icon("mail") + "Email</a>" +
            "</div></div></details></li>";
    }

    // what was last typed, so it is still there after visiting a room
    let typed = "";

    function copy(ctx, email) {
        const failed = () => ctx.toast("Could not copy. Press and hold the address instead.");
        if (!navigator.clipboard) return failed();
        navigator.clipboard.writeText(email).then(() => ctx.toast("Email copied"), failed);
    }

    function show(ctx, selected) {
        ctx.sheet.innerHTML =
            '<h1 class="title">Professors</h1>' +
            '<input type="search" class="filter" aria-label="Search professors" placeholder="Name, department or club" autocomplete="off">' +
            '<ul class="people" id="profList"></ul>' +
            (window.PROFESSORS_ARE_SAMPLES ? '<p class="note">Sample entries, not real people</p>' : "");
        const filter = ctx.sheet.querySelector(".filter");
        const list = ctx.sheet.querySelector("#profList");
        // a professor picked from search must not be hidden by an old filter
        if (selected) typed = "";
        filter.value = typed;
        list.addEventListener("click", event => {
            const button = event.target.closest(".copy");
            if (button) copy(ctx, button.dataset.email);
        });
        const paint = () => {
            const shown = filter.value.trim() ? find(filter.value) : people();
            list.innerHTML = shown.map(p => row(ctx, p, p.id === selected)).join("") ||
                '<li class="empty">No professor found</li>';
        };
        filter.addEventListener("input", () => { typed = filter.value; paint(); });
        paint();
        if (selected) {
            setTimeout(() => {
                const open = list.querySelector("details[open]");
                if (open) open.scrollIntoView({ block: "center" });
            }, 0);
        }
    }

    window.ProfScreen = { show, find };
})();
