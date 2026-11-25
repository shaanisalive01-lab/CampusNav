// Class rep and club leader tools. Neither has a login, and both save to this browser only.
(function () {
    "use strict";

    const CLUB = "Robotics Club";
    const demoNote = '<p class="demo" role="note"><strong>Local demo.</strong> Saved in this browser only. Other students will not see it, and there is no login.</p>';

    const option = (value, label, selected) =>
        '<option value="' + escapeHTML(value) + '"' + (selected ? " selected" : "") + ">" + escapeHTML(label) + "</option>";
    const field = (label, control, wide) => '<label class="field' + (wide ? " full-row" : "") + '">' + label + control + "</label>";

    // ---------- class rep ----------

    function classCard(ctx, item, changed, open) {
        const rooms = ctx.rooms.map(room => option(room.id, room.name, room.id === item.location)).join("");
        return '<li><details class="change"' + (open ? " open" : "") + ' data-id="' + escapeHTML(item.id) + '">' +
            "<summary><span><strong" + (item.cancelled ? ' class="struck"' : "") + ">" + escapeHTML(item.subject) + "</strong><small>" +
            escapeHTML(item.day.slice(0, 3) + " " + ctx.clock(item.startTime) + " · " + ctx.shortName(item.location)) + "</small></span>" +
            (item.cancelled ? '<em class="tag">Cancelled</em>' : changed ? '<em class="tag">Changed</em>' : ctx.icon("next")) + "</summary>" +
            '<form class="change-form" novalidate>' +
            field("Room", '<select name="location">' + rooms + "</select>", true) +
            field("Starts", '<input type="time" name="startTime" value="' + escapeHTML(item.startTime) + '">') +
            field("Ends", '<input type="time" name="endTime" value="' + escapeHTML(item.endTime) + '">') +
            '<p class="problem full-row" role="alert"></p>' +
            '<button type="submit" class="btn primary full-row">Save changes</button>' +
            '<button type="button" class="btn" data-act="cancel">' + (item.cancelled ? "Bring back" : "Cancel class") + "</button>" +
            '<button type="button" class="btn" data-act="reset"' + (changed ? "" : " disabled") + ">Reset</button>" +
            "</form></details></li>";
    }

    function showClassRep(ctx, openId) {
        const overrides = loadOverrides();
        const classes = getEffectiveTimetable();
        ctx.sheet.innerHTML = ctx.pageHead("Class rep") + demoNote +
            (ctx.hasOwnTimetable() ? '<p class="demo">You are using your own scanned timetable, so these changes will not show in your day. They apply to the sample class timetable.</p>' : "") +
            '<ul class="changes">' + classes.map(item =>
                classCard(ctx, item, Boolean(overrides[item.id] && Object.keys(overrides[item.id]).length), item.id === openId)).join("") + "</ul>";

        // every change can be taken back from the message that reports it
        function apply(id, override, message) {
            const before = loadOverrides();
            const next = { ...before };
            if (override) next[id] = override;
            else delete next[id];
            const saved = saveOverrides(next);
            ctx.changed();
            showClassRep(ctx, id);
            if (!saved) return ctx.toast("This browser would not save that");
            ctx.toast(message, {
                label: "Undo",
                run: () => { saveOverrides(before); ctx.changed(); if (location.hash === "#cr") showClassRep(ctx, id); }
            });
        }

        ctx.sheet.querySelectorAll(".change").forEach(card => {
            const id = card.dataset.id;
            const item = classes.find(c => c.id === id);
            const form = card.querySelector("form");
            form.addEventListener("submit", event => {
                event.preventDefault();
                const value = name => form.elements[name].value;
                const startTime = value("startTime");
                const endTime = value("endTime");
                if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
                    form.querySelector(".problem").textContent = "The class must end after it starts.";
                    return;
                }
                apply(id, { ...loadOverrides()[id], location: value("location"), startTime, endTime }, item.subject + " updated");
            });
            card.querySelector('[data-act="cancel"]').addEventListener("click", () =>
                apply(id, { ...loadOverrides()[id], cancelled: !item.cancelled },
                    item.subject + (item.cancelled ? " is back on" : " cancelled")));
            card.querySelector('[data-act="reset"]').addEventListener("click", () => apply(id, null, item.subject + " reset"));
        });
    }

    // ---------- club admin ----------

    const today = () => {
        const d = new Date();
        return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, "0")).join("-");
    };

    function showClubAdmin(ctx) {
        const places = Object.keys(CLUB_EVENT_LOCATIONS);
        ctx.sheet.innerHTML = ctx.pageHead("Club admin") + '<p class="lead">' + CLUB + "</p>" + demoNote +
            '<form class="edit" id="newEvent" novalidate>' +
            field("Event name", '<input name="name" maxlength="80" autocomplete="off">', true) +
            field("Date", '<input type="date" name="date" min="' + today() + '">') +
            field("Time", '<input type="time" name="time">') +
            field("Place", '<select name="location">' + places.map(id => option(id, CLUB_EVENT_LOCATIONS[id], false)).join("") + "</select>", true) +
            field("Description (optional)", '<textarea name="description" maxlength="300" rows="3"></textarea>', true) +
            '<p class="problem full-row" role="alert"></p>' +
            '<button type="submit" class="btn primary full-row">Publish event</button></form>' +
            '<div class="section-head spaced"><h2>Your events</h2></div><ul class="lines" id="mineEvents"></ul>';

        const form = ctx.sheet.querySelector("#newEvent");
        const list = ctx.sheet.querySelector("#mineEvents");

        function paint() {
            const events = loadClubEvents();
            list.innerHTML = events.map(e => '<li><div class="line still"><span class="tile">' + ctx.icon("star") + "</span><span><strong>" +
                escapeHTML(e.name) + "</strong><small>" + escapeHTML(new Date(e.date + "T00:00:00").toLocaleDateString("en-IN",
                    { weekday: "short", day: "numeric", month: "short" }) + " · " + ctx.clock(e.time) + " · " + CLUB_EVENT_LOCATIONS[e.location]) +
                '</small></span><button type="button" class="drop" data-id="' + escapeHTML(String(e.id)) + '">Delete</button></div></li>').join("") ||
                '<li class="line still"><small>No events yet</small></li>';
        }

        form.addEventListener("submit", event => {
            event.preventDefault();
            const value = name => form.elements[name].value.trim();
            const item = {
                id: Date.now(), name: value("name"), date: value("date"), time: value("time"),
                location: value("location"), description: value("description"), club: CLUB
            };
            const problem = !item.name ? "Give the event a name."
                : !isValidDate(item.date) ? "Choose a date."
                    : !isValidTime(item.time) ? "Choose a time."
                    : !Object.hasOwn(CLUB_EVENT_LOCATIONS, item.location) ? "Choose a place."
                        : new Date(item.date + "T" + item.time + ":00") < new Date() ? "That time has already passed." : "";
            form.querySelector(".problem").textContent = problem;
            if (problem) return;
            if (!writeJSON(CLUB_EVENTS_KEY, loadClubEvents().concat(item))) {
                form.querySelector(".problem").textContent = "This browser would not save it.";
                return;
            }
            form.reset();
            paint();
            ctx.toast("Event published on this device");
        });

        list.addEventListener("click", event => {
            const button = event.target.closest(".drop");
            if (!button) return;
            const events = loadClubEvents();
            const gone = events.find(e => String(e.id) === button.dataset.id);
            if (!gone) return;
            writeJSON(CLUB_EVENTS_KEY, events.filter(e => e !== gone));
            paint();
            ctx.toast("Event deleted", {
                label: "Undo",
                run: () => { writeJSON(CLUB_EVENTS_KEY, loadClubEvents().concat(gone)); if (list.isConnected) paint(); }
            });
        });
        paint();
    }

    window.AdminScreen = { showClassRep, showClubAdmin };
})();
