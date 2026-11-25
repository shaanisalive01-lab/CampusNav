// Campus info: places and what they are for, emergency help and notices.
(function () {
    "use strict";

    const PLACES = [
        { id: "library", icon: "book", name: "Library", about: "Quiet study space, books and academic resources" },
        { id: "cafeteria", icon: "cup", name: "Cafeteria", about: "Food, breaks and a place to meet friends" },
        { id: "a105", icon: "flask", name: "Physics Lab", about: "Block A, Room 105" },
        { id: "block-a", icon: "building", name: "Block A", about: "Main academic block and classrooms" },
        { id: "science-block", icon: "building", name: "Science Block", about: "Sample position until the floor plan is added" },
        { id: "main-gate", icon: "gate", name: "Main Gate", about: "Campus entrance" }
    ];
    // carried over from the old page; they are samples, not real announcements
    const NOTICES = [
        { name: "Timetable updates", about: "Check your timetable before heading to your next class." },
        { name: "Campus facilities", about: "Find facilities and places through CampusNav." },
        { name: "Event updates", about: "See Events for upcoming student activities." }
    ];

    function show(ctx) {
        const row = (href, glyph, title, about, extra) => '<li><a class="line" href="' + href + '"' + (extra || "") + '><span class="tile">' +
            ctx.icon(glyph) + "</span><span><strong>" + escapeHTML(title) + "</strong><small>" + escapeHTML(about) + "</small></span>" +
            ctx.icon("next") + "</a></li>";
        const group = (title, rows) => '<div class="section-head spaced"><h2>' + title + '</h2></div><ul class="lines">' + rows + "</ul>";

        ctx.sheet.innerHTML = ctx.pageHead("Campus info") +
            group("Places", PLACES.map(p => (p.id === "main-gate"
                ? '<li><a class="line" href="#map"><span class="tile">' + ctx.icon(p.icon) + "</span><span><strong>" + p.name + "</strong><small>" +
                  p.about + "</small></span>" + ctx.icon("next") + "</a></li>"
                : row("#go/" + p.id, p.icon, p.name, p.about))).join("")) +
            group("Emergency", row("tel:112", "alert", "Call 112", "India's emergency number")) +
            '<p class="note">Campus emergency contacts have not been added yet.</p>' +
            group("People and tools",
                row("#profs", "people", "Professors and departments", "Rooms, email and clubs") +
                row("#groups", "star", "Clubs and groups", "Join one and find where it meets") +
                row("#cr", "edit", "Class rep", "Change a room or time, or cancel a class") +
                row("#club-admin", "edit", "Club admin", "Publish a club event")) +
            group('Notices <span class="sample-tag">Sample</span>', NOTICES.map(n => '<li><div class="line still"><span class="tile">' + ctx.icon("bell") + "</span><span><strong>" +
                escapeHTML(n.name) + "</strong><small>" + escapeHTML(n.about) + "</small></span></div></li>").join(""));
    }

    window.InfoScreen = { show };
})();
