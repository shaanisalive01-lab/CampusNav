// ==========================================
// CAMPUSNAV SMART TIMETABLE V0.6
// ==========================================


// ==========================================
// LOCATION
// ==========================================

// escapeHTML() now lives in utils.js

function getLocation(locationId) {

    if (typeof campusLocations === "undefined") {
        return null;
    }

    return campusLocations[locationId] || null;
}


// ==========================================
// TIME HELPERS
// ==========================================

function timeToMinutes(time) {

    const [hours, minutes] =
        time.split(":").map(Number);

    return hours * 60 + minutes;
}


function getCurrentDay() {

    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    return days[new Date().getDay()];
}


function getCurrentTimeInMinutes() {

    const now = new Date();

    return (
        now.getHours() * 60 +
        now.getMinutes()
    );
}


function formatTime(time) {

    const [hours, minutes] =
        time.split(":").map(Number);

    const date = new Date();

    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
    });
}


// ==========================================
// TODAY'S CLASSES
// ==========================================

function getTodaysClasses() {

    const today = getCurrentDay();

    return timetable
        .filter(classItem =>
            classItem.day === today
        )
        .sort((a, b) =>
            timeToMinutes(a.startTime) -
            timeToMinutes(b.startTime)
        );
}


// ==========================================
// NEXT CLASS ACROSS THE WEEK
// ==========================================

function getNextClassAcrossWeek() {

    const now = new Date();

    const currentDayIndex =
        now.getDay();

    const currentTime =
        getCurrentTimeInMinutes();

    const dayOrder = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];


    // offset 7 = today again, next week
    for (let offset = 0; offset <= 7; offset++) {

        const dayIndex =
            (currentDayIndex + offset) % 7;

        const day =
            dayOrder[dayIndex];


        const classes =
            timetable
                .filter(classItem =>
                    classItem.day === day
                )
                .sort((a, b) =>
                    timeToMinutes(a.startTime) -
                    timeToMinutes(b.startTime)
                );


        for (const classItem of classes) {

            if (classItem.cancelled) {
                continue;
            }

            const start =
                timeToMinutes(
                    classItem.startTime
                );

            const end =
                timeToMinutes(
                    classItem.endTime
                );


            if (offset === 0) {

                if (
                    currentTime >= start &&
                    currentTime < end
                ) {
                    return {
                        status: "current",
                        classItem
                    };
                }


                if (start > currentTime) {

                    return {
                        status: "next",
                        classItem
                    };
                }

            } else {

                return {
                    status: "next",
                    classItem
                };
            }
        }
    }


    return {
        status: "none",
        classItem: null
    };
}


// ==========================================
// BOARD ROWS (the CampusNav signature)
// ==========================================

// "A204" for rooms, otherwise the place name ("Library").
function roomLabel(locationId) {

    const location = getLocation(locationId);

    if (!location) {
        return "Campus";
    }

    if (/^[a-z]\d{2,3}$/i.test(locationId)) {
        return locationId.toUpperCase();
    }

    return location.name;
}


// "Block A · Floor 1"
function placeLine(locationId) {

    const location = getLocation(locationId);

    if (!location) {
        return "Campus";
    }

    const parts = [location.building || "Campus"];

    if (typeof location.floor === "number" && location.floor > 0) {
        parts.push("Floor " + location.floor);
    }

    return parts.join(" · ");
}


function splitTime(time) {

    // "10:00 AM" -> ["10:00", "AM"]
    const parts = formatTime(time).split(" ");

    return [parts[0], parts[1] || ""];
}


// state: "now" (lit), "past" (dimmed) or "" (normal)
function classRowHTML(classItem, state, extraMeta) {

    const [clock, period] = splitTime(classItem.startTime);

    const room = roomLabel(classItem.location);

    const meta = [
        placeLine(classItem.location),
        "Ends " + formatTime(classItem.endTime)
    ];

    if (extraMeta) {
        meta.unshift(extraMeta);
    }

    if (classItem.cancelled) {
        meta.unshift("Cancelled");
    }

    const className =
        "board-row" +
        (state === "now" ? " is-now" : "") +
        (state === "past" ? " is-past" : "") +
        (classItem.cancelled ? " is-cancelled" : "");

    return (
        '<li class="' + className + '">' +
            '<span class="when">' + escapeHTML(clock) + "<b>" + escapeHTML(period) + "</b></span>" +
            '<span class="what">' +
                '<span class="name">' + escapeHTML(classItem.subject) + "</span>" +
                '<span class="leader" aria-hidden="true"></span>' +
            "</span>" +
            '<a class="where" href="map.html?destination=' + encodeURIComponent(classItem.location) +
                '" aria-label="Navigate to ' + escapeHTML(room) + '">' + escapeHTML(room) + "</a>" +
            '<span class="meta">' + escapeHTML(meta.join(" · ")) + "</span>" +
        "</li>"
    );
}


const PIN_ICON =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/>' +
    '<circle cx="12" cy="10" r="2.4"/></svg>';


function emptyHTML(title, text) {

    return (
        '<div class="cn-empty"><strong>' + escapeHTML(title) + "</strong>" +
        escapeHTML(text) + "</div>"
    );
}


// ==========================================
// TODAY BOARD (home page)
// ==========================================

function displayTodayBoard() {

    const container = document.getElementById("todayBoard");

    if (!container) {
        return;
    }

    const classes = getTodaysClasses();

    const result = getNextClassAcrossWeek();

    const now = getCurrentTimeInMinutes();


    if (classes.length === 0) {

        if (result.status === "none") {

            container.innerHTML = emptyHTML(
                "No classes today",
                "Your timetable is empty. A class rep can add classes."
            );

            return;
        }

        const next = result.classItem;

        container.innerHTML =
            emptyHTML("No classes today", "Enjoy it. Your next class is below.") +
            '<ol class="board" style="margin-top:16px">' +
            classRowHTML(next, "now", next.day) +
            "</ol>";

        return;
    }


    // one lit row: the current class, else the next one today
    const litId =
        result.classItem && result.classItem.day === getCurrentDay()
            ? result.classItem.id
            : null;

    const rows = classes.map(classItem => {

        if (classItem.id === litId) {
            return classRowHTML(classItem, "now");
        }

        const ended = timeToMinutes(classItem.endTime) <= now;

        return classRowHTML(classItem, ended ? "past" : "");
    }).join("");


    let note = "";

    if (result.classItem) {

        const target = result.classItem;

        const verb = result.status === "current" ? "Now" : "Next";

        note =
            '<div class="cn-note">' + PIN_ICON +
            "<p><strong>" + verb + ":</strong> " +
            escapeHTML(target.subject) + ", " +
            escapeHTML(placeLine(target.location)) + "</p>" +
            '<a class="cn-btn" href="map.html?destination=' +
            encodeURIComponent(target.location) + '">Navigate</a></div>';
    }

    container.innerHTML = '<ol class="board">' + rows + "</ol>" + note;
}


// ==========================================
// UP NEXT (timetable page)
// ==========================================

function displayNextClass() {

    const container = document.getElementById("nextClass");

    if (!container) {
        return;
    }

    const result = getNextClassAcrossWeek();

    if (result.status === "none") {

        container.innerHTML = emptyHTML(
            "No classes scheduled",
            "Your timetable is currently empty."
        );

        return;
    }

    const classItem = result.classItem;

    const label = result.status === "current" ? "Now" : classItem.day;

    container.innerHTML =
        '<ol class="board">' + classRowHTML(classItem, "now", label) + "</ol>" +
        '<div class="cn-note">' + PIN_ICON +
        "<p>Walking route to " + escapeHTML(roomLabel(classItem.location)) + "</p>" +
        '<a class="cn-btn" href="map.html?destination=' +
        encodeURIComponent(classItem.location) + '">Navigate</a></div>';
}


// ==========================================
// DAY BOARD (timetable page)
// ==========================================

const TIMETABLE_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];


function getDefaultDay() {

    const today = getCurrentDay();

    return TIMETABLE_DAYS.includes(today) ? today : "Monday";
}


function displayTimetable(day) {

    const container = document.getElementById("timetableList");

    if (!container) {
        return;
    }

    const selected = TIMETABLE_DAYS.includes(day) ? day : getDefaultDay();

    const classes = timetable
        .filter(classItem => classItem.day === selected)
        .sort((a, b) =>
            timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
        );

    if (classes.length === 0) {

        container.innerHTML = emptyHTML(
            "No classes on " + selected,
            "Nothing is scheduled for this day yet."
        );

        return;
    }

    const isToday = selected === getCurrentDay();

    const now = getCurrentTimeInMinutes();

    const result = getNextClassAcrossWeek();

    const litId =
        isToday && result.classItem && result.classItem.day === selected
            ? result.classItem.id
            : null;

    container.innerHTML =
        '<ol class="board">' +
        classes.map(classItem => {

            if (classItem.id === litId) {
                return classRowHTML(classItem, "now");
            }

            const ended = isToday && timeToMinutes(classItem.endTime) <= now;

            return classRowHTML(classItem, ended ? "past" : "");

        }).join("") +
        "</ol>";
}


// ==========================================
// TIMETABLE REFRESH
// ==========================================

let selectedTimetableDay = null;


function setTimetableDay(day) {

    selectedTimetableDay = day;

    displayTimetable(day);
}


let lastRenderKey = "";


// Something visible changes only when the day, the lit class or the
// number of finished classes changes. Redrawing otherwise would replay
// the lit-row animation every minute and drop keyboard focus.
function getRenderKey() {

    const result = getNextClassAcrossWeek();

    const now = getCurrentTimeInMinutes();

    return [
        getCurrentDay(),
        result.status,
        result.classItem ? result.classItem.id : "",
        getTodaysClasses().filter(classItem =>
            timeToMinutes(classItem.endTime) <= now
        ).length
    ].join("|");
}


function refreshTimetable(force) {

    const key = getRenderKey();

    if (!force && key === lastRenderKey) {
        return;
    }

    lastRenderKey = key;

    displayNextClass();

    displayTodayBoard();

    if (document.getElementById("timetableList")) {
        displayTimetable(selectedTimetableDay);
    }
}


function startTimetableRefresh() {

    refreshTimetable(true);

    setInterval(() => refreshTimetable(false), 60000);
}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener("DOMContentLoaded", startTimetableRefresh);
