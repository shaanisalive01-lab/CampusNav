// CampusNav: home, map, directions and timetable screens, and the router for the rest.
// Preview any time of the week with ?now=Mon@10:35
(function () {
    "use strict";

    const $ = selector => document.querySelector(selector);
    const NS = "http://www.w3.org/2000/svg";
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const icon = name => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';

    // ---------- clock ----------

    const offset = (() => {
        const match = /^(\w{3})\w*@(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get("now") || "");
        const day = match ? DAYS.findIndex(name => name.startsWith(match[1])) : -1;
        if (day < 0) return 0;
        const target = new Date();
        target.setDate(target.getDate() - target.getDay() + day);
        target.setHours(Number(match[2]), Number(match[3]), 0, 0);
        return target - Date.now();
    })();
    const now = () => new Date(Date.now() + offset);
    const minutesOf = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const clock = time => {
        const hour = Number(time.slice(0, 2));
        return (hour % 12 || 12) + ":" + time.slice(3, 5);
    };
    const meridiem = time => (Number(time.slice(0, 2)) < 12 ? "AM" : "PM");

    // ---------- the student's own timetable (from a photo), else the sample one ----------

    const MINE_KEY = "campusnav-proto-timetable";
    const isClass = c => c !== null && typeof c === "object" && DAYS.includes(c.day) &&
        isValidTime(c.startTime) && isValidTime(c.endTime) && c.startTime < c.endTime &&
        typeof c.subject === "string" && c.subject.trim() !== "" && c.subject.length <= 60 &&
        typeof c.room === "string" && c.room.length <= 12 && typeof c.location === "string" && typeof c.id === "string";
    let mine = readJSON(MINE_KEY, null, value => Array.isArray(value) && value.length > 0 && value.every(isClass));
    // a timetable saved before a room was put on the map picks it up here
    // the sample timetable with any class rep changes
    let classTimetable = getEffectiveTimetable();
    const allClasses = () => (mine ? mine.map(c => (c.location ? c : { ...c, location: placeForRoom(c.room) })) : classTimetable);

    // pass null to go back to the sample timetable; false means the browser refused to save
    function setMine(list) {
        if (list === null) {
            try { localStorage.removeItem(MINE_KEY); } catch (error) { /* nothing saved to remove */ }
        } else if (!writeJSON(MINE_KEY, list)) {
            mine = list;
            return false;
        }
        mine = list;
        return true;
    }

    // minutes added to the walk so "leave by" is not cutting it fine
    const SPARE_MINUTES = 2;
    const asClock = total => {
        const time = String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
        return clock(time) + " " + meridiem(time);
    };

    function nextClass() {
        const t = now();
        const minute = t.getHours() * 60 + t.getMinutes();
        for (let ahead = 0; ahead <= 7; ahead++) {
            const day = DAYS[(t.getDay() + ahead) % 7];
            const found = allClasses()
                .filter(c => c.day === day && !c.cancelled && (ahead > 0 || minutesOf(c.endTime) > minute))
                .sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime))[0];
            if (found) {
                const until = minutesOf(found.startTime) - minute;
                let label = (ahead === 1 ? "Tomorrow" : day.slice(0, 3)) + " " + clock(found.startTime);
                if (ahead === 0 && until <= 0) label = "Now, " + (minutesOf(found.endTime) - minute) + " min left";
                else if (ahead === 0) label = until < 60 ? "In " + until + " min" : "Today " + clock(found.startTime);
                let live = ahead === 0 && until < 60;
                // time to act: when to leave, not only when the class starts
                const route = isPlace(found.location) ? findPath("main-gate", found.location) : null;
                if (ahead === 0 && until > 0 && until <= 180 && route) {
                    const leaveAt = minutesOf(found.startTime) - route.minutes - SPARE_MINUTES;
                    label = minute < leaveAt ? "Leave gate " + asClock(leaveAt).slice(0, -3) : "Leave gate now";
                    live = minute >= leaveAt - 10;
                }
                const minutesAway = ahead === 0 ? Math.max(until, 0) : null;
                return { item: found, label, live, until: minutesAway, ahead, day };
            }
        }
        return null;
    }

    // ---------- places ----------

    const PLACE_LOOK = {
        "library": "book",
        "cafeteria": "cup",
        "a105": "flask",
        "block-a": "building",
        "main-gate": "gate",
        "stairs-a": "stairs",
        "a201": "door",
        "a204": "door",
        "science-block": "building",
        "science-ground": "door",
        "science-first": "door"
    };
    // short enough for a map label and for a saved timetable's room (12 characters)
    const SHORT_NAMES = {
        "stairs-a": "Stairs",
        "science-block": "Sci Block",
        "science-ground": "Sci Ground",
        "science-first": "Sci Floor 1"
    };
    const PLACE_IDS = Object.keys(PLACE_LOOK);
    const isPlace = id => PLACE_IDS.includes(id);
    const shortName = id => (/^a\d{3}$/.test(id) ? id.toUpperCase()
        : SHORT_NAMES[id] || (campusLocations[id] ? campusLocations[id].name : id));
    const look = id => PLACE_LOOK[id] || "door";
    const aliasesOf = id => (campusLocations[id] && campusLocations[id].aliases) || [];
    // rooms known only by the floor they are on, such as B212
    const placeForRoom = room => PLACE_IDS.find(id => aliasesOf(id).includes(room)) || "";
    // a room number says more than the name of its floor; a scanned room may not be on the map at all
    const roomOf = c => (isPlace(c.location) && !/^[A-D]\d{3}$/.test(c.room) ? shortName(c.location) : c.room || "Room?");
    const SUBJECT_LOOK = subject => (/lab|physics|chem/i.test(subject) ? "flask" : "book");

    // everyday words for the tiles on the home screen
    const SEARCH_WORDS = { "cafeteria": ["food", "canteen", "coffee"], "a105": ["lab"], "library": ["books"] };

    function findPlaces(text) {
        const query = text.trim().toLowerCase();
        if (!query) return [];
        return PLACE_IDS.filter(id => [id, shortName(id), campusLocations[id].name]
            .concat(campusLocations[id].aliases || [], SEARCH_WORDS[id] || [])
            .some(value => value.toLowerCase().includes(query)));
    }

    // ---------- nearby: the same Google Maps searches as the original project ----------

    const NEARBY = [
        { name: "Cafes", icon: "cup", query: "cafes", words: ["cafe", "coffee", "tea"] },
        { name: "Restaurants", icon: "fork", query: "restaurants", words: ["restaurant", "food", "eat", "lunch"] },
        { name: "Hotels", icon: "bed", query: "hotels", words: ["hotel", "stay"] },
        { name: "Transport", icon: "bus", query: "transport", words: ["transport", "bus", "metro", "auto", "cab"] }
    ];
    const mapsURL = query => "https://www.google.com/maps/search/" + encodeURIComponent(query + " near SMVIT Bangalore");
    const EXTERNAL = 'target="_blank" rel="noopener noreferrer"';

    function findNearby(text) {
        const query = text.trim().toLowerCase();
        if (query.length < 2) return [];
        return NEARBY.filter(item => [item.name.toLowerCase()].concat(item.words).some(word => word.startsWith(query)));
    }

    // ---------- routing (routing.js) ----------

    const { roads, level, findPath } = CampusRoutes;
    const buildSteps = path => CampusRoutes.buildSteps(path, id => (isPlace(id) ? shortName(id) : ""));

    // where directions start, and whether they must avoid stairs
    const STEP_FREE_KEY = "campusnav-step-free";
    let startAt = "main-gate";
    let stepFree = readJSON(STEP_FREE_KEY, false, value => typeof value === "boolean");
    const START_IDS = PLACE_IDS.filter(id => id !== "stairs-a");

    // an id, a name or another name for a place: old links used all three
    function resolvePlace(text) {
        if (isPlace(text)) return text;
        const query = String(text).trim().toLowerCase();
        return PLACE_IDS.find(id => [campusLocations[id].name, shortName(id)].concat(aliasesOf(id))
            .some(value => value.toLowerCase() === query)) || "";
    }

    // ---------- map ----------

    const mapSVG = $("#map");
    // how much of the map is hidden under floating panels, so the route is framed in what is left
    const campus = CampusMap(mapSVG, {
        roads,
        places: PLACE_IDS,
        iconOf: id => look(id),
        nameOf: id => shortName(id),
        onPick: id => { location.hash = "go/" + id; },
        // offer a way back once the map has been moved by hand
        onMoved: moved => { $("#recenter").hidden = !moved || $("#app").classList.contains("full"); },
        padding: box => {
            const panel = $("#sheet");
            const wide = box.width >= 860;
            const banner = $("#banner");
            const top = (banner.hidden ? 66 : banner.offsetTop + banner.offsetHeight) + 62;
            return {
                top,
                left: wide ? panel.offsetLeft + panel.offsetWidth + 40 : 44,
                right: 44,
                bottom: wide ? 60 : Math.max(box.height - panel.offsetTop, 0) + 22
            };
        }
    });
    const drawRoute = (route, destination, step) => campus.draw(route, destination, step);
    const frame = (ids, wide) => campus.frame(ids, false, wide);
    new ResizeObserver(() => campus.reframe()).observe($("#sheet"));

    // ---------- screens ----------

    const app = $("#app");
    const sheet = $("#sheet");
    let stepIndex = 0;
    let chosenDay = null;

    // a ring that empties as the class gets closer (or, during class, as it runs out)
    function ringHTML(next) {
        let big;
        let small;
        let share = 1;
        const minute = now().getHours() * 60 + now().getMinutes();
        if (next.ahead === 0 && next.until === 0) {
            const left = minutesOf(next.item.endTime) - minute;
            big = left;
            small = "min left";
            share = left / (minutesOf(next.item.endTime) - minutesOf(next.item.startTime));
        } else if (next.ahead === 0 && next.until < 60) {
            big = next.until;
            small = "min";
            share = next.until / 60;
        } else {
            big = next.ahead === 0 ? clock(next.item.startTime) : next.day.slice(0, 3);
            small = next.ahead === 0 ? meridiem(next.item.startTime) : clock(next.item.startTime);
        }
        const around = 2 * Math.PI * 36;
        return '<div class="ring" role="img" aria-label="' + escapeHTML(big + " " + small) + '">' +
            '<svg viewBox="0 0 82 82" aria-hidden="true"><circle class="track" cx="41" cy="41" r="36"/>' +
            '<circle class="value" cx="41" cy="41" r="36" stroke-dasharray="' + (around * Math.max(0.03, Math.min(share, 1))).toFixed(1) + " " + around.toFixed(1) + '"/></svg>' +
            "<div><b>" + escapeHTML(String(big)) + "</b><small>" + escapeHTML(small) + "</small></div></div>";
    }

    const fact = (glyph, words, extra) => "<li" + (extra ? ' class="' + extra + '"' : "") + ">" + icon(glyph) + escapeHTML(words) + "</li>";

    // the next class and the route to it, shared by the home and map screens
    function upNext() {
        const next = nextClass();
        const destination = next && isPlace(next.item.location) ? next.item.location : null;
        return { next, destination, route: destination ? findPath("main-gate", destination) : null };
    }

    const placesHTML = () => '<nav class="places" aria-label="Popular places">' +
        [["library", "Library"], ["cafeteria", "Food"], ["a105", "Lab"], ["block-a", "Block A"]].map(([id, name]) =>
            '<a class="place" href="#go/' + id + '"><span class="tile">' + icon(look(id)) + "</span>" + name + "</a>"
        ).join("") + "</nav>";

    // made-up information is always marked, so nobody takes it for the real thing
    const sampleTag = words => '<span class="sample-tag">' + words + "</span>";
    const sampleTags = tags => {
        const wanted = tags.filter(Boolean);
        return wanted.length ? '<p class="sample-row">' + wanted.map(sampleTag).join("") + "</p>" : "";
    };
    // the Science Block is placed by guesswork until its floor plan arrives
    const isGuessed = id => String(id).startsWith("science-");

    const heading2 = (title, extra) => '<div class="section-head"><h2>' + title + "</h2>" + (extra || "") + "</div>";

    function heroHTML({ next, destination, route }) {
        if (!next) return '<div class="empty">' + icon("day") + "No classes ahead</div>";
        const room = roomOf(next.item);
        const leaving = /^Leave/.test(next.label);
        return sampleTags([!mine && "Sample timetable", isGuessed(destination) && "Sample location"]) +
            '<div class="next"><div class="next-info">' +
            '<p class="room' + (room.length > 5 ? " word" : "") + '">' + escapeHTML(room) + "</p>" +
            '<p class="subject">' + escapeHTML(next.item.subject) + "</p></div>" + ringHTML(next) + "</div>" +
            '<ul class="facts">' +
            (leaving ? fact("walk", next.label, "chip" + (next.live ? " live" : "")) : "") +
            fact("day", clock(next.item.startTime)) +
            (route && !leaving ? fact("walk", route.minutes + " min") : "") +
            (destination && level(destination) ? fact("stairs", "L1") : "") +
            "</ul>" +
            (destination
                ? '<a class="go" href="#go/' + encodeURIComponent(destination) + '" aria-label="Directions to ' + escapeHTML(room) + '">Go<i>' + icon("next") + "</i></a>"
                : '<p class="unmapped">Room not on the map yet</p>');
    }

    // what is left of today after the class already shown at the top
    function laterHTML(shown) {
        const t = now();
        const today = DAYS[t.getDay()];
        const minute = t.getHours() * 60 + t.getMinutes();
        const todays = allClasses().filter(c => c.day === today && !c.cancelled);
        const later = todays.filter(c => minutesOf(c.endTime) > minute && !(shown && shown.id === c.id))
            .sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
        const head = heading2("Later today" + (!mine && later.length ? " " + sampleTag("Sample") : ""), '<a href="#day">My day' + icon("next") + "</a>");
        if (!later.length) {
            const words = !todays.length ? "No classes today"
                : shown && shown.day === today && minutesOf(shown.endTime) > minute ? "Nothing after this" : "Done for today";
            return head + '<p class="quiet">' + icon("cup") + words + "</p>";
        }
        return head + '<ul class="later">' + later.slice(0, 3).map(c => {
            const inside = '<time datetime="' + c.startTime + '">' + clock(c.startTime) + "</time><b>" + escapeHTML(roomOf(c)) +
                "</b><span>" + escapeHTML(c.subject) + "</span>";
            return "<li>" + (isPlace(c.location)
                ? '<a href="#go/' + encodeURIComponent(c.location) + '">' + inside + icon("next") + "</a>"
                : "<div>" + inside + "</div>") + "</li>";
        }).join("") + "</ul>" +
            (later.length > 3 ? '<a class="more" href="#day">+' + (later.length - 3) + " more</a>" : "");
    }

    const { eventHTML, switcher, chips, pageHead } = ListScreens(icon);

    const screenTools = () => ({
        sheet, icon, toast, clock: time => clock(time) + " " + meridiem(time), shortName, switcher, chips, pageHead,
        onChip: run => ListScreens.onChip(sheet, run),
        rooms: PLACE_IDS.filter(id => id !== "stairs-a" && id !== "main-gate").map(id => ({ id, name: shortName(id) })),
        hasOwnTimetable: () => Boolean(mine),
        changed: () => { classTimetable = getEffectiveTimetable(); }
    });

    function showHome() {
        const state = upNext();
        const t = now();
        const hour = t.getHours();
        const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        const event = getAllEvents()[0];
        sheet.innerHTML = '<div class="home-screen">' +
            '<header class="hello"><p>' + escapeHTML(t.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })) +
            "</p><h1>" + hello + "</h1></header>" +
            '<section class="hero-card" aria-label="Next class">' + heroHTML(state) + "</section>" +
            "<section>" + laterHTML(state.next && state.next.item) + "</section>" +
            "<section>" + heading2("On campus", '<a href="#map">Map' + icon("next") + "</a>") + placesHTML() + "</section>" +
            "<section>" + heading2("Nearby", "<small>Google Maps" + icon("out") + "</small>") +
            '<nav class="places" aria-label="Nearby places on Google Maps">' + NEARBY.map(item =>
                '<a class="place" href="' + mapsURL(item.query) + '" ' + EXTERNAL + '><span class="tile soft">' + icon(item.icon) + "</span>" +
                item.name + '<span class="sr-only"> (opens Google Maps in a new tab)</span></a>').join("") + "</nav></section>" +
            "<section>" + heading2("More") + '<nav class="places" aria-label="More">' +
            [["groups", "people", "Groups"], ["info", "info", "Info"], ["cr", "edit", "Class rep"], ["club-admin", "bell", "Club admin"]]
                .map(([to, glyph, label]) => '<a class="place" href="#' + to + '"><span class="tile">' + icon(glyph) + "</span>" + label + "</a>").join("") +
            "</nav></section>" +
            (event ? "<section>" + heading2("Next event", '<a href="#events">All' + icon("next") + "</a>") +
                '<ul class="cards plain">' + eventHTML(event) + "</ul></section>" : "") +
            (mine ? "" : '<a class="btn wide" href="#scan">' + icon("camera") + "Scan my timetable</a>") +
            "</div>";
    }

    function showMap() {
        const { next, destination, route } = upNext();
        const row = next && destination
            ? '<a class="next-row" href="#go/' + encodeURIComponent(destination) + '"><span><small>' + escapeHTML(next.label) +
              "</small><b>" + escapeHTML(roomOf(next.item)) + "</b>" +
              sampleTags([!mine && "Sample timetable", isGuessed(destination) && "Sample location"]) +
              "</span><i>Go" + icon("next") + "</i></a>"
            : "";
        sheet.innerHTML = '<h1 class="sr-only">Campus map</h1>' + row + placesHTML();
        drawRoute(route, destination);
        frame(route ? route.path : PLACE_IDS);
    }

    const routeOptionsHTML = () => '<div class="route-opts"><label>From<select id="from">' +
        START_IDS.map(id => '<option value="' + id + '"' + (id === startAt ? " selected" : "") + ">" + escapeHTML(shortName(id)) + "</option>").join("") +
        '</select></label><button type="button" id="stepfree" aria-pressed="' + stepFree + '">' + icon("stairs") + "No stairs</button></div>";

    function bindRouteOptions(destination) {
        const from = $("#from");
        if (!from) return;
        const redo = focus => {
            stepIndex = 0;
            showDirections(destination);
            const again = $(focus);
            if (again) again.focus({ preventScroll: true });
        };
        from.addEventListener("change", () => { startAt = from.value; redo("#from"); });
        $("#stepfree").addEventListener("click", () => {
            stepFree = !stepFree;
            writeJSON(STEP_FREE_KEY, stepFree);
            redo("#stepfree");
        });
    }

    // a screen for when there is nothing to walk
    function showNoRoute(destination, glyph, words, canChange) {
        sheet.innerHTML = (canChange ? routeOptionsHTML() : "") + sampleTags([isGuessed(destination) && "Sample location"]) + '<div class="empty">' + icon(glyph) + escapeHTML(words) +
            '<a class="btn primary" style="padding:0 24px" href="' + escapeHTML(backTo) + '">Back</a></div>';
        bindRouteOptions(destination);
        keepAwake(false);
        drawRoute(null, destination || null);
        frame(destination ? [destination] : PLACE_IDS);
    }

    function showDirections(destination) {
        const banner = $("#banner");
        banner.hidden = true;
        app.classList.remove("nav");
        if (!destination) return showNoRoute("", "pin", "Place not found", false);
        if (destination === startAt) {
            return showNoRoute(destination, "pin", "You start here. Choose where you are now.", true);
        }
        const route = findPath(startAt, destination, stepFree);
        if (!route) {
            return showNoRoute(destination, "stairs", stepFree && findPath(startAt, destination)
                ? "No way without stairs. Turn off No stairs to see the route."
                : "No route between these places yet", true);
        }
        const steps = buildSteps(route.path);
        // one position past the last step is the arrival screen
        stepIndex = Math.max(0, Math.min(stepIndex, steps.length));
        const arrived = stepIndex === steps.length;
        const step = steps[Math.min(stepIndex, steps.length - 1)];
        const left = steps.length - stepIndex;
        // the screen stays on while there are steps left to walk
        keepAwake(!arrived);
        const name = shortName(destination);
        const move = by => {
            stepIndex += by;
            showDirections(destination);
            // keep keyboard focus on the control that was just used
            const again = $(by > 0 ? "#next" : "#prev:not([disabled])") || sheet.querySelector(".btn.primary");
            if (again) again.focus({ preventScroll: true });
        };

        if (arrived) {
            const next = nextClass();
            const here = next && next.item.location === destination ? next.item.subject + " at " + clock(next.item.startTime) : "";
            sheet.innerHTML =
                '<div class="arrived" role="status"><div class="tick">' + icon("check") + "</div>" +
                "<h1>You're here</h1>" +
                '<p class="arrived-room">' + escapeHTML(name) + "</p>" +
                (here ? "<p>" + escapeHTML(here) + "</p>" : "") +
                sampleTags([here && !mine && "Sample timetable", isGuessed(destination) && "Sample location"]) + "</div>" +
                '<div class="controls two"><button class="btn" id="prev" aria-label="Previous step" title="Previous step">' + icon("back") + "</button>" +
                '<a class="btn primary" href="#home">Done</a></div>';
            $("#prev").addEventListener("click", () => move(-1));
            drawRoute(route, destination, { from: route.path.length - 1, to: route.path.length - 1 });
            frame([destination]);
            return;
        }

        app.classList.add("nav");
        banner.hidden = false;
        banner.innerHTML = '<div class="step-icon">' + icon(step.kind) + "</div>" +
            '<div class="step-text"><strong>' + step.metres + "<em>m</em></strong>" +
            "<span>" + escapeHTML(step.word + (step.target ? " to " + step.target : "")) + "</span></div>";
        sheet.innerHTML =
            '<h1 class="sr-only">Directions to ' + escapeHTML(name) + "</h1>" +
            (stepIndex === 0 ? routeOptionsHTML() : "") +
            sampleTags([(isGuessed(destination) || isGuessed(startAt)) && "Sample location: don't follow on campus"]) +
            '<div class="progress-row"><div class="dots" aria-hidden="true">' +
            steps.map((_, i) => "<i" + (i <= stepIndex ? ' class="done"' : "") + "></i>").join("") + "</div>" +
            '<p class="left">' + (left === 1 ? "Last step" : left + " steps left") + "</p></div>" +
            '<div class="controls"><a class="btn" id="end" href="' + escapeHTML(backTo) + '" aria-label="End directions" title="End directions">' + icon("close") + "</a>" +
            '<button class="btn" id="prev" aria-label="Previous step" title="Previous step"' + (stepIndex === 0 ? " disabled" : "") + ">" + icon("back") + "</button>" +
            '<button class="btn primary" id="next">' + (left === 1 ? "I'm here" : "Next") + icon("next") + "</button></div>";
        $("#next").addEventListener("click", () => move(1));
        $("#prev").addEventListener("click", () => move(-1));
        bindRouteOptions(destination);
        drawRoute(route, destination, step);
        frame(route.path.slice(step.from, step.to + 1), true);
    }

    function showDay() {
        const today = DAYS[now().getDay()];
        const next = nextClass();
        const day = chosenDay || (next ? next.item.day : "Monday");
        const classes = allClasses().filter(c => c.day === day).sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
        let rows = "";
        classes.forEach((c, i) => {
            const free = i ? minutesOf(c.startTime) - minutesOf(classes[i - 1].endTime) : 0;
            if (free >= 30) {
                rows += '<li class="gap"><span></span><div>' + icon("cup") +
                    (free % 60 ? free + " min" : free / 60 + " h") + " free</div></li>";
            }
            const upNext = next && next.item.id === c.id;
            rows += "<li" + (upNext ? ' class="up"' : "") + '><time datetime="' + c.startTime + '">' + clock(c.startTime) +
                "<small>" + meridiem(c.startTime) + '</small></time><span class="node" aria-hidden="true"></span>' +
                (isPlace(c.location) ? '<a href="#go/' + encodeURIComponent(c.location) + '"' : "<div") +
                ' class="block' + (c.cancelled ? " off" : "") + '"><div><b>' +
                escapeHTML(roomOf(c)) + "</b><span>" + escapeHTML(c.subject) + (c.cancelled ? ", cancelled" : "") +
                "</span></div><i>" + icon(SUBJECT_LOOK(c.subject)) + "</i>" + (isPlace(c.location) ? "</a>" : "</div>") + "</li>";
        });
        sheet.innerHTML = '<h1 class="title">' + (day === today ? "Today" : day) + "</h1>" +
            sampleTags([!mine && "Sample timetable"]) +
            '<div class="days" role="group" aria-label="Day">' + DAYS.slice(1).map(name => {
                const count = allClasses().filter(c => c.day === name).length;
                return '<button type="button" data-day="' + name + '"' + (name === today ? ' class="today"' : "") +
                    ' aria-pressed="' + (name === day) + '" aria-label="' + name + (name === today ? ", today" : "") + ", " + count + ' classes">' +
                    name.slice(0, 3) + "<span>" + "<i></i>".repeat(Math.min(count, 4)) + "</span></button>";
            }).join("") + "</div>" +
            (classes.length ? '<ul class="rail">' + rows + "</ul>" : '<div class="empty">' + icon("cup") + "Free day</div>") +
            '<a class="btn primary wide" href="#scan">' + icon("camera") + (mine ? "Scan again" : "Scan my timetable") + "</a>" +
            (mine ? '<button type="button" class="btn wide" id="forget">Remove my timetable</button>' : "") +
            '<a class="btn plain wide" href="#cr">' + icon("edit") + "Class rep: change a class</a>";
        if ($("#forget")) $("#forget").addEventListener("click", () => {
            const removed = mine;
            setMine(null);
            chosenDay = null;
            showDay();
            // one tap, and one tap takes it back
            toast("Timetable removed", { label: "Undo", run: () => { setMine(removed); render(); } });
        });
        sheet.querySelectorAll("[data-day]").forEach(button => button.addEventListener("click", () => {
            chosenDay = button.dataset.day;
            showDay();
            sheet.querySelector('[data-day="' + chosenDay + '"]').focus({ preventScroll: true });
        }));
        drawRoute(null, null);
    }

    // the next or previous weekday on My day, for swipes and arrow keys
    function shiftDay(by) {
        const shown = sheet.querySelector('[data-day][aria-pressed="true"]');
        const week = DAYS.slice(1);
        const target = shown ? week[week.indexOf(shown.dataset.day) + by] : undefined;
        if (!target) return;
        chosenDay = target;
        showDay();
    }

    const input = $("#q");
    const results = $("#results");

    function closeResults() {
        results.hidden = true;
        results.innerHTML = "";
    }

    // ---------- small helpers ----------

    let toastTimer = 0;

    function toast(message, action) {
        const box = $("#toast");
        const hide = () => { box.hidden = true; box.textContent = ""; };
        clearTimeout(toastTimer);
        box.textContent = "";
        const words = document.createElement("span");
        words.textContent = message;
        box.appendChild(words);
        if (action) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = action.label;
            button.addEventListener("click", () => { hide(); action.run(); });
            box.appendChild(button);
        }
        box.hidden = false;
        // longer when there is something to tap
        toastTimer = setTimeout(hide, action ? 10000 : 2600);
    }

    let wakeLock = null;
    let wantsAwake = false;

    async function keepAwake(on) {
        wantsAwake = on;
        try {
            if (on && !wakeLock && navigator.wakeLock) {
                const lock = await navigator.wakeLock.request("screen");
                if (!wantsAwake || wakeLock) { await lock.release(); return; }
                wakeLock = lock;
                lock.addEventListener("release", () => { if (wakeLock === lock) wakeLock = null; });
            } else if (!on && wakeLock) {
                const lock = wakeLock;
                wakeLock = null;
                await lock.release();
            }
        } catch (error) {
            // low battery or an unsupported browser: the phone just sleeps as usual
        }
    }

    // ---------- router ----------

    let lastRoute = "";
    // where "close" on the directions goes: the screen they were opened from
    let backTo = "#home";
    const scrolled = new Map();
    const TITLES = { home: "Home", map: "Map", day: "My day", profs: "Professors", events: "Events" };
    const SCREEN_TITLES = { groups: "Groups", info: "Campus info", cr: "Class rep", "club-admin": "Club admin", scan: "Scan" };
    // screens without a tab of their own light up the tab they belong to
    const TAB_OF = { scan: "day", cr: "day", go: "map", groups: "events", "club-admin": "events", info: "home" };

    function render() {
        const [name, argument, origin] = location.hash.slice(1).split("/");
        const tab = TAB_OF[name] || (["map", "day", "events", "profs"].includes(name) ? name : "home");
        if (location.hash !== lastRoute) stepIndex = 0;
        const changed = location.hash !== lastRoute;
        const cameFromDirections = lastRoute.startsWith("#go/");
        if (changed) scrolled.set(lastRoute || "#home", sheet.scrollTop);
        lastRoute = location.hash;
        if (name !== "go") {
            keepAwake(false);
            if (name !== "scan") backTo = location.hash || "#home";
        }
        document.title = (name === "go" ? "Directions" : SCREEN_TITLES[name] || TITLES[tab]) + " | CampusNav";
        ThemeMenu.close();
        app.classList.toggle("full", tab !== "map");
        app.classList.toggle("home", tab === "home" && name !== "info");
        if (tab !== "map") $("#recenter").hidden = true;
        else $("#recenter").hidden = !campus.moved();
        closeResults();
        input.value = "";
        app.classList.remove("nav");
        $("#banner").hidden = true;
        document.querySelectorAll(".tabs a").forEach(link => {
            if (link.dataset.tab === tab) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
        });
        if (name === "scan") {
            drawRoute(null, null);
            ScanScreen.show({
                sheet, icon, toast,
                places: PLACE_IDS.filter(id => id !== "stairs-a" && id !== "main-gate")
                    .map(id => ({ id, name: shortName(id), rooms: aliasesOf(id) })),
                save: list => {
                    const stored = setMine(list);
                    chosenDay = null;
                    if (stored) toast("Timetable saved");
                    return stored;
                }
            });
        } else if (["groups", "info", "cr", "club-admin"].includes(name)) {
            drawRoute(null, null);
            if (name === "groups") GroupScreen.show(screenTools());
            else if (name === "info") InfoScreen.show(screenTools());
            else if (name === "cr") AdminScreen.showClassRep(screenTools());
            else AdminScreen.showClubAdmin(screenTools());
        } else if (tab === "profs") {
            drawRoute(null, null);
            ProfScreen.show({ sheet, icon, isPlace, shortName, toast }, argument || "");
        } else if (tab === "day") showDay();
        else if (tab === "events") {
            drawRoute(null, null);
            EventScreen.show(screenTools());
        }
        else if (name === "go") {
            const read = text => {
                try { return resolvePlace(decodeURIComponent(text || "")); } catch (error) { return ""; }
            };
            if (read(origin)) startAt = read(origin);
            showDirections(read(argument));
        } else if (tab === "map") showMap();
        else showHome();
        if (changed) {
            // coming back from directions returns to the same spot in the list
            sheet.scrollTop = cameFromDirections ? scrolled.get(location.hash || "#home") || 0 : 0;
            sheet.classList.add("enter");
            void sheet.offsetWidth;
            sheet.classList.remove("enter");
        }
    }

    // ---------- search ----------

    const placeRow = (id, words) => '<li><a href="#go/' + id + '">' + icon(look(id)) + escapeHTML(words || shortName(id)) + "</a></li>";

    // before anything is typed: the places most likely to be wanted
    function suggest() {
        const next = upNext();
        const first = next.destination ? [placeRow(next.destination, "Next class: " + roomOf(next.next.item))] : [];
        results.innerHTML = first.concat(["library", "cafeteria", "a105"]
            .filter(id => id !== next.destination).map(id => placeRow(id))).join("");
        results.hidden = false;
    }

    function search() {
        if (!input.value.trim()) return suggest();
        const found = findPlaces(input.value);
        const rows = found.slice(0, 5)
            .map(id => placeRow(id))
            .concat(findNearby(input.value).map(item =>
                '<li><a href="' + mapsURL(item.query) + '" ' + EXTERNAL + ">" + icon(item.icon) + item.name + " nearby" + icon("out") + "</a></li>"));
        const people = ProfScreen.find(input.value).slice(0, 3)
            .map(prof => '<li><a href="#profs/' + prof.id + '">' + icon("people") + escapeHTML(prof.name) + "</a></li>");
        results.innerHTML = rows.concat(people).join("") || '<li class="none">Nothing found. Try a room such as B212.</li>';
        results.hidden = false;
    }

    input.addEventListener("input", search);
    input.addEventListener("focus", search);

    // arrow keys walk the list, Escape closes it
    $(".top").addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeResults();
            input.blur();
            event.stopPropagation();
            return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const links = [...results.querySelectorAll("a")];
        if (!links.length) return;
        event.preventDefault();
        const at = links.indexOf(document.activeElement);
        const to = at + (event.key === "ArrowDown" ? 1 : -1);
        if (to < 0) input.focus();
        else links[Math.min(to, links.length - 1)].focus();
    });
    document.addEventListener("pointerdown", event => {
        if (!event.target.closest(".top")) closeResults();
    });
    $(".top").addEventListener("focusout", event => {
        if (event.relatedTarget && !event.relatedTarget.closest(".top")) closeResults();
    });
    results.addEventListener("click", event => {
        if (!event.target.closest("a")) return;
        input.value = "";
        input.blur();
        closeResults();
    });
    // Enter opens the first result, whatever kind it is
    $("#search").addEventListener("submit", event => {
        event.preventDefault();
        const first = input.value.trim() && results.querySelector("a");
        if (first) first.click();
    });

    // ---------- shortcuts that make moving around easier ----------

    function recentre() { campus.recentre(); }
    $("#recenter").addEventListener("click", recentre);

    // tapping the tab you are on, or the logo on Home, goes back to the top
    function backToTop() {
        const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
        sheet.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
    }

    document.addEventListener("click", event => {
        const link = event.target.closest("a");
        if (!link) return;
        const href = link.getAttribute("href");
        // a fresh visit to My day opens on the day of the next class
        if (href === "#day") chosenDay = null;
        if (!link.closest(".tabs, .logo") && !link.classList.contains("logo")) return;
        if (href !== (location.hash || "#home")) return;
        event.preventDefault();
        backToTop();
        if (href === "#day") showDay();
        if (href === "#map") recentre();
    });

    document.addEventListener("keydown", event => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest("input, select, textarea")) return;
        const onMap = !app.classList.contains("full");
        if (event.key === "/" && (onMap || app.classList.contains("home"))) {
            event.preventDefault();
            input.focus();
            return;
        }
        if (onMap && (event.key === "+" || event.key === "=" || event.key === "-")) {
            campus.zoom(event.key === "-" ? 0.8 : 1.25);
            return;
        }
        if (event.key === "Escape" && location.hash.startsWith("#go/") && !ThemeMenu.isOpen()) {
            location.hash = backTo;
            return;
        }
        const by = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (by) turnPage(by);
    });

    // forward or back: a direction step, or a day on My day
    function turnPage(by) {
        if (location.hash.startsWith("#go/")) {
            const button = $(by > 0 ? "#next" : "#prev:not([disabled])");
            if (button) button.click();
        } else if (location.hash === "#day") shiftDay(by);
    }

    // swipe left for the next one, right for the one before
    let swipe = null;
    [sheet, $("#banner")].forEach(area => {
        area.addEventListener("touchstart", event => {
            const touch = event.touches[0];
            swipe = event.touches.length === 1 && !event.target.closest("input, select, .days")
                ? { x: touch.clientX, y: touch.clientY } : null;
        }, { passive: true });
        area.addEventListener("touchend", event => {
            if (!swipe) return;
            const touch = event.changedTouches[0];
            const dx = touch.clientX - swipe.x;
            const dy = touch.clientY - swipe.y;
            swipe = null;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) turnPage(dx < 0 ? 1 : -1);
        }, { passive: true });
    });

    // class changes made in another tab of the app
    addEventListener("storage", event => {
        if (event.key !== TIMETABLE_OVERRIDES_KEY) return;
        classTimetable = getEffectiveTimetable();
        refresh();
    });

    addEventListener("hashchange", render);
    render();

    // refresh the countdown on the home and map screens, and never while the user is typing or focused there
    function refresh() {
        if (sheet.contains(document.activeElement)) return;
        if (location.hash === "#map") showMap();
        else if (location.hash === "" || location.hash === "#home") showHome();
    }
    setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) return;
        refresh();
        // the browser drops the wake lock when the app is hidden
        if (wantsAwake) keepAwake(true);
    });
})();
