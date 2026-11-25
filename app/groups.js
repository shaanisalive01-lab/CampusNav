// Clubs and study groups: search, filter, join, and find where each one meets.
(function () {
    "use strict";

    // The same entries and storage key as the old Groups page, so what a student joined carries over.
    // Member counts are samples until clubs share a real list.
    const GROUPS = [
        { id: "robotics", name: "Robotics Club", category: "technical", about: "Build, experiment and work on robotics projects together.", members: 42, location: "block-a", joined: true },
        { id: "maths", name: "Engineering Maths Study Group", category: "academic", about: "Work through problems, revise and survive mathematics together.", members: 18, location: "library", joined: true },
        { id: "cad", name: "CAD & Design", category: "technical", about: "Design, CAD modelling and engineering projects.", members: 27, location: "a204" },
        { id: "f1", name: "F1 & Motorsport", category: "social", about: "Motorsport discussions, racing and car culture.", members: 31, location: "library" },
        { id: "sih", name: "SIH & Innovation", category: "technical", about: "Hackathons, prototypes and student innovation projects.", members: 24, location: "block-a" },
        { id: "gaming", name: "Campus Gaming", category: "social", about: "Games, tournaments and casual gaming sessions.", members: 36, location: "cafeteria" },
        { id: "media", name: "Photography & Media", category: "social", about: "Photography, video, editing and campus content.", members: 21, location: "main-gate" },
        { id: "startup", name: "Entrepreneurship Hub", category: "academic", about: "Ideas, startups, business and student-led projects.", members: 19, location: "block-a" }
    ];
    const JOINED_KEY = "campusnav-joined-groups";
    const FILTERS = ["all", "academic", "technical", "social"];
    const KNOWN = GROUPS.map(group => group.id);

    const loadJoined = () => readJSON(JOINED_KEY, GROUPS.filter(g => g.joined).map(g => g.id),
        value => Array.isArray(value) && value.every(id => KNOWN.includes(id)));

    let typed = "";
    let chosen = "all";

    const initials = name => name.split(/\s+/).filter(word => /^[A-Za-z0-9]/.test(word)).map(word => word[0]).slice(0, 2).join("").toUpperCase();

    function show(ctx) {
        let joined = loadJoined();
        ctx.sheet.innerHTML = ctx.switcher("groups") +
            '<p class="sample-row"><span class="sample-tag">Sample groups and member counts</span></p>' +
            '<input type="search" class="filter" id="groupSearch" aria-label="Search groups" placeholder="Search groups" autocomplete="off">' +
            ctx.chips(FILTERS, chosen, "Type of group") +
            '<div id="groupList"></div>' +
            '<a class="btn wide" href="#club-admin">' + ctx.icon("edit") + "Lead a club? Add an event</a>" +
            '<p class="note">Joining is saved on this device only.</p>';
        const search = ctx.sheet.querySelector("#groupSearch");
        const list = ctx.sheet.querySelector("#groupList");
        search.value = typed;

        const card = group => {
            const mine = joined.includes(group.id);
            return '<li class="club"><span class="avatar" aria-hidden="true">' + escapeHTML(initials(group.name)) + "</span>" +
                '<div class="club-text"><strong>' + escapeHTML(group.name) + "</strong><span>" +
                group.members + " members · " + escapeHTML(ctx.shortName(group.location)) + "</span></div>" +
                '<p class="club-about">' + escapeHTML(group.about) + "</p>" +
                '<div class="club-actions"><button type="button" class="btn' + (mine ? "" : " primary") + '" data-join="' + group.id +
                '" aria-pressed="' + mine + '">' + (mine ? ctx.icon("check") + "Joined" : "Join") + "</button>" +
                '<a class="btn" href="#go/' + group.location + '" aria-label="Directions to ' + escapeHTML(group.name) + '">' +
                ctx.icon("pin") + "Go</a></div></li>";
        };

        function paint() {
            const query = typed.trim().toLowerCase();
            const visible = GROUPS.filter(g => (chosen === "all" || g.category === chosen) &&
                (!query || (g.name + " " + g.about + " " + ctx.shortName(g.location)).toLowerCase().includes(query)));
            const section = (title, items) => (items.length
                ? '<div class="section-head spaced"><h2>' + title + '</h2></div><ul class="clubs">' + items.map(card).join("") + "</ul>" : "");
            list.innerHTML = section("Your groups", visible.filter(g => joined.includes(g.id))) +
                section("Find a group", visible.filter(g => !joined.includes(g.id))) ||
                '<p class="empty">No group matches</p>';
        }

        search.addEventListener("input", () => { typed = search.value; paint(); });
        ctx.onChip(value => { chosen = value; paint(); });
        list.addEventListener("click", event => {
            const button = event.target.closest("[data-join]");
            if (!button) return;
            const id = button.dataset.join;
            const leaving = joined.includes(id);
            joined = leaving ? joined.filter(item => item !== id) : joined.concat(id);
            const saved = writeJSON(JOINED_KEY, joined);
            paint();
            const again = list.querySelector('[data-join="' + id + '"]');
            if (again) again.focus({ preventScroll: true });
            const name = GROUPS.find(g => g.id === id).name;
            ctx.toast(saved ? (leaving ? "Left " : "Joined ") + name : "This browser would not save that");
        });
        paint();
    }

    window.GroupScreen = { show };
})();
