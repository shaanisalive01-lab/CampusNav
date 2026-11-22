// ==========================================
// CAMPUSNAV HOME
// Interactive parts of the Today screen:
//   up-next hero with a live countdown and a mini route map,
//   quick destination chips, search with live suggestions,
//   a Today / Tomorrow switch for the class board.
//
// Needs utils.js, campusData.js, timetableData.js, timetable.js
// and eventsData.js to be loaded first.
// ==========================================

(function () {

    const DAY_NAMES = [
        "Sunday", "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday"
    ];

    const $ = id => document.getElementById(id);


    // ------------------------------------------
    // Greeting and clock
    // ------------------------------------------

    function greeting() {

        const hour = new Date().getHours();

        if (hour < 12) {
            return "Good morning";
        }

        return hour < 17 ? "Good afternoon" : "Good evening";
    }


    function updateClock() {

        const clock = $("clockChip");

        if (clock) {
            clock.textContent = new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit"
            });
        }
    }


    // ------------------------------------------
    // Time helpers
    // ------------------------------------------

    function atTime(date, time) {

        const result = new Date(date.getTime());

        result.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);

        return result;
    }


    // When the given class starts (or started, if it is on now).
    function startOf(classItem, status) {

        const now = new Date();

        const ahead = (DAY_NAMES.indexOf(classItem.day) - now.getDay() + 7) % 7;

        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);

        const start = atTime(day, classItem.startTime);

        if (status !== "current" && start < now) {
            start.setDate(start.getDate() + 7);
        }

        return start;
    }


    function pad(number) {

        return String(number).padStart(2, "0");
    }


    function whenLabel(start) {

        const days = Math.round(
            (new Date(start.getFullYear(), start.getMonth(), start.getDate()) -
                new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())) / 86400000
        );

        const time = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

        if (days === 0) {
            return "Today, " + time;
        }

        if (days === 1) {
            return "Tomorrow, " + time;
        }

        return DAY_NAMES[start.getDay()] + ", " + time;
    }


    // ------------------------------------------
    // Mini map: the campus roads, the route and the destination
    // ------------------------------------------

    // The campus graph lists some roads in one direction only, so every
    // road is made two-way first (the same thing the v2 map does).
    const roadsTwoWay = (function () {

        const adjacent = {};

        Object.keys(campusGraph).forEach(a => {

            Object.keys(campusGraph[a]).forEach(b => {

                adjacent[a] = adjacent[a] || {};
                adjacent[b] = adjacent[b] || {};

                adjacent[a][b] = campusGraph[a][b];
                adjacent[b][a] = campusGraph[a][b];
            });
        });

        return adjacent;
    })();


    // Shortest path over the campus roads (Dijkstra).
    function findPath(from, to) {

        if (!roadsTwoWay[from] || !roadsTwoWay[to]) {
            return null;
        }

        const dist = { [from]: 0 };

        const previous = {};

        const open = new Set([from]);

        while (open.size) {

            let current = null;

            open.forEach(id => {
                if (current === null || dist[id] < dist[current]) {
                    current = id;
                }
            });

            open.delete(current);

            if (current === to) {
                break;
            }

            Object.keys(roadsTwoWay[current]).forEach(next => {

                const length = dist[current] + roadsTwoWay[current][next];

                if (dist[next] === undefined || length < dist[next]) {
                    dist[next] = length;
                    previous[next] = current;
                    open.add(next);
                }
            });
        }

        if (dist[to] === undefined) {
            return null;
        }

        const path = [to];

        while (path[0] !== from) {
            path.unshift(previous[path[0]]);
        }

        return path;
    }


    const MAP_LABELS = {
        "main-gate": "Main Gate",
        "block-a": "Block A",
        "library": "Library",
        "cafeteria": "Cafeteria"
    };


    function miniMapSVG(destinationId) {

        const point = id => mapCoordinates[id];

        let roads = "";

        Object.keys(roadsTwoWay).forEach(a => {

            Object.keys(roadsTwoWay[a]).forEach(b => {

                if (a < b && point(a) && point(b)) {
                    roads +=
                        '<line class="mm-road" x1="' + point(a).x + '" y1="' + point(a).y +
                        '" x2="' + point(b).x + '" y2="' + point(b).y + '"/>';
                }
            });
        });

        const path = findPath("main-gate", destinationId);

        const route = path
            ? '<polyline class="mm-route" points="' +
              path.filter(id => point(id)).map(id => point(id).x + "," + point(id).y).join(" ") +
              '"/>'
            : "";

        const labelled = Object.assign({}, MAP_LABELS);

        if (destinationId && point(destinationId) && !labelled[destinationId]) {
            labelled[destinationId] = roomLabel(destinationId);
        }

        let dots = "";

        Object.keys(labelled).forEach(id => {

            if (!point(id)) {
                return;
            }

            const isDestination = id === destinationId;

            dots +=
                '<circle class="mm-dot' + (isDestination ? " mm-dest" : "") + '" cx="' +
                point(id).x + '" cy="' + point(id).y + '" r="' + (isDestination ? 11 : 8) + '"/>' +
                '<text class="mm-label" x="' + point(id).x + '" y="' + (point(id).y + (id === "main-gate" ? 34 : -18)) +
                '" text-anchor="middle">' + escapeHTML(labelled[id]) + "</text>";
        });

        const ring = destinationId && point(destinationId)
            ? '<circle class="mm-ring" cx="' + point(destinationId).x + '" cy="' + point(destinationId).y + '" r="11"/>'
            : "";

        return (
            '<svg viewBox="70 170 660 335" role="img" aria-label="Route from the main gate to ' +
            escapeHTML(destinationId ? roomLabel(destinationId) : "campus") + '">' +
            roads + route + ring + dots + "</svg>"
        );
    }


    // ------------------------------------------
    // Up-next hero
    // ------------------------------------------

    let hero = null;


    function renderHero() {

        const container = $("hero");

        if (!container) {
            return;
        }

        const result = getNextClassAcrossWeek();

        if (result.status === "none") {

            hero = null;

            container.innerHTML =
                '<div class="hero-main"><h2>No classes scheduled</h2>' +
                '<p class="hero-when">Your timetable is empty. A class rep can add classes.</p>' +
                '<div class="hero-actions"><a class="cn-btn" href="map.html">Open the map</a></div></div>';

            return;
        }

        const classItem = result.classItem;

        const start = startOf(classItem, result.status);

        const end = atTime(start, classItem.endTime);

        hero = { status: result.status, classItem, start, end, key: result.status + classItem.id };

        const location = getLocation(classItem.location);

        const floorOne = location && location.floor === 1;

        const url = "map.html?destination=" + encodeURIComponent(classItem.location);

        container.innerHTML =
            '<div class="hero-main">' +
                '<span class="pill" id="heroPill"></span>' +
                "<h2>" + escapeHTML(classItem.subject) + "</h2>" +
                '<p class="hero-when">' + escapeHTML(
                    DAY_NAMES[start.getDay()] + " · " +
                    formatTime(classItem.startTime) + " – " + formatTime(classItem.endTime)
                ) + "</p>" +
                '<p class="hero-where">' + escapeHTML(placeLine(classItem.location)) + "</p>" +
                '<a class="hero-room" href="' + escapeHTML(url) + '" aria-label="Navigate to ' +
                    escapeHTML(roomLabel(classItem.location)) + '">' + escapeHTML(roomLabel(classItem.location)) + "</a>" +
                (result.status === "current"
                    ? '<div class="progress" role="progressbar" aria-label="Class progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="heroProgress"><i></i></div>'
                    : "") +
                '<div class="hero-actions">' +
                    '<a class="cn-btn" href="' + escapeHTML(url) + '">Navigate</a>' +
                    '<a class="cn-btn quiet" href="timetable.html">Week</a>' +
                "</div>" +
            "</div>" +
            '<a class="mini-map" href="' + escapeHTML(url) + '" aria-label="Open the route to ' +
                escapeHTML(roomLabel(classItem.location)) + ' on the map">' +
                (floorOne ? '<span class="mini-badge">Level 1</span>' : "") +
                miniMapSVG(classItem.location) +
                '<span class="mini-open">Open map</span>' +
            "</a>";

        tick();
    }


    function tick() {

        updateClock();

        if (!hero) {
            return;
        }

        const now = new Date();

        const pill = $("heroPill");

        if (!pill) {
            return;
        }

        if (hero.status === "current") {

            if (now >= hero.end) {
                refreshAll();
                return;
            }

            const left = Math.max(1, Math.ceil((hero.end - now) / 60000));

            pill.textContent = "Now · " + left + " min left";

            pill.classList.add("live");

            const percent = Math.min(100, Math.max(0, ((now - hero.start) / (hero.end - hero.start)) * 100));

            const bar = $("heroProgress");

            if (bar) {
                bar.setAttribute("aria-valuenow", String(Math.round(percent)));
                bar.firstElementChild.style.width = percent + "%";
            }

            return;
        }

        if (now >= hero.start) {
            refreshAll();
            return;
        }

        const diff = hero.start - now;

        const minutes = Math.floor(diff / 60000);

        pill.classList.toggle("live", minutes < 60);

        if (minutes < 60) {
            pill.textContent =
                "Starts in " + pad(minutes) + ":" + pad(Math.floor((diff % 60000) / 1000));
        } else if (diff < 86400000 && hero.start.getDate() === now.getDate()) {
            pill.textContent =
                "Starts in " + Math.floor(minutes / 60) + " h " + pad(minutes % 60) + " min";
        } else {
            pill.textContent = whenLabel(hero.start);
        }
    }


    function refreshAll() {

        refreshTimetable(true);

        renderHero();

        renderTomorrow();
    }


    // ------------------------------------------
    // Today / Tomorrow switch
    // ------------------------------------------

    function renderTomorrow() {

        const container = $("tomorrowBoard");

        if (!container) {
            return;
        }

        const tomorrow = DAY_NAMES[(new Date().getDay() + 1) % 7];

        const classes = timetable
            .filter(classItem => classItem.day === tomorrow)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

        container.innerHTML = classes.length
            ? '<ol class="board">' + classes.map(c => classRowHTML(c, "")).join("") + "</ol>"
            : emptyHTML("No classes tomorrow", "Nothing is scheduled for " + tomorrow + ".");
    }


    function setupDaySwitch() {

        const buttons = Array.from(document.querySelectorAll("#daySwitch button"));

        buttons.forEach(button => {

            button.addEventListener("click", () => {

                buttons.forEach(item =>
                    item.setAttribute("aria-pressed", String(item === button))
                );

                const showTomorrow = button.dataset.day === "tomorrow";

                $("todayBoard").hidden = showTomorrow;

                $("tomorrowBoard").hidden = !showTomorrow;
            });
        });
    }


    // ------------------------------------------
    // Search with live suggestions
    // ------------------------------------------

    function allPlaces() {

        return Object.keys(campusLocations).map(id => ({
            id,
            name: campusLocations[id].name,
            sub: placeLine(id),
            text: (
                campusLocations[id].name + " " + id + " " +
                (campusLocations[id].building || "")
            ).toLowerCase()
        }));
    }


    function setupSearch() {

        const form = $("homeSearchForm");

        const input = $("homeSearch");

        const list = $("suggestions");

        if (!form || !input || !list) {
            return;
        }

        const places = allPlaces();

        let matches = [];

        let active = -1;


        function close() {

            list.hidden = true;

            input.setAttribute("aria-expanded", "false");

            active = -1;
        }


        function paint() {

            Array.from(list.children).forEach((item, index) => {
                item.firstElementChild.setAttribute("aria-selected", String(index === active));
            });
        }


        function open() {

            const query = input.value.trim().toLowerCase();

            matches = query
                ? places.filter(place => place.text.includes(query)).slice(0, 6)
                : [];

            if (!matches.length) {
                close();
                return;
            }

            list.innerHTML = matches.map(place =>
                '<li role="presentation"><a role="option" aria-selected="false" href="map.html?destination=' +
                encodeURIComponent(place.id) + '"><span>' + escapeHTML(place.name) +
                "</span><small>" + escapeHTML(place.sub) + "</small></a></li>"
            ).join("");

            list.hidden = false;

            input.setAttribute("aria-expanded", "true");

            active = -1;
        }


        input.addEventListener("input", open);

        input.addEventListener("focus", open);

        input.addEventListener("keydown", event => {

            if (event.key === "ArrowDown" && matches.length) {
                event.preventDefault();
                active = (active + 1) % matches.length;
                paint();
            } else if (event.key === "ArrowUp" && matches.length) {
                event.preventDefault();
                active = (active - 1 + matches.length) % matches.length;
                paint();
            } else if (event.key === "Escape") {
                close();
            }
        });

        document.addEventListener("click", event => {

            if (!form.parentElement.contains(event.target)) {
                close();
            }
        });

        form.addEventListener("submit", event => {

            event.preventDefault();

            const text = input.value.trim();

            if (!text) {
                return;
            }

            // the highlighted suggestion, else the first one, else the typed text
            const choice = matches[active] || matches[0];

            window.location.href =
                "map.html?destination=" +
                encodeURIComponent(choice ? choice.id : text.slice(0, 64));
        });
    }


    // ------------------------------------------
    // Start
    // ------------------------------------------

    function start() {

        const title = $("greeting");

        if (title) {
            title.textContent = greeting();
        }

        const label = $("todayLabel");

        if (label) {
            label.textContent = new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long"
            });
        }

        renderHero();

        renderTomorrow();

        setupDaySwitch();

        setupSearch();

        const events = $("homeEvents");

        if (events) {
            events.innerHTML = getAllEvents().slice(0, 3).map(eventRowHTML).join("");
        }

        setInterval(tick, 1000);
    }

    // timetable.js renders its boards on DOMContentLoaded; run after it.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})();
