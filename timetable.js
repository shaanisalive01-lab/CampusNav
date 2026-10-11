// ==========================================
// CAMPUSNAV SMART TIMETABLE V0.6
// ==========================================


// ==========================================
// LOCATION
// ==========================================

function getLocation(locationId) {

    if (typeof campusLocations === "undefined") {
        return null;
    }

    return campusLocations.find(
        location => location.id === locationId
    );
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


    for (let offset = 0; offset < 7; offset++) {

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
// DISPLAY SMART CLASS
// ==========================================

function displayNextClass() {

    const container =
        document.getElementById("nextClass");

    if (!container) {
        return;
    }


    const result =
        getNextClassAcrossWeek();


    if (result.status === "none") {

        container.innerHTML = `
            <div class="next-class-content">

                <span class="next-class-label">
                    SCHEDULE
                </span>

                <h3>
                    No classes scheduled
                </h3>

                <p>
                    Your timetable is currently empty.
                </p>

            </div>
        `;

        return;
    }


    const classItem =
        result.classItem;


    const location =
        getLocation(classItem.location);


    const building =
        location
            ? location.building || "Campus"
            : "Campus";


    const room =
        location
            ? location.name
            : "Unknown Room";


    let label =
        result.status === "current"
            ? "CURRENT CLASS"
            : "NEXT CLASS";


    let dayText =
        classItem.day;


    const currentDay =
        getCurrentDay();


    if (
        result.status === "next" &&
        classItem.day !== currentDay
    ) {

        dayText =
            classItem.day;
    }


    const navigateURL =
        `map.html?destination=${encodeURIComponent(
            classItem.location
        )}`;


    container.innerHTML = `

        <div class="next-class-content">

            <span class="next-class-label">
                ${label}
            </span>

            <h3>
                ${classItem.subject}
            </h3>

            <p>
                ${dayText} ·
                ${formatTime(classItem.startTime)}
                –
                ${formatTime(classItem.endTime)}
            </p>

            <p>
                ${building} · ${room}
            </p>

            <a
                href="${navigateURL}"
                class="navigate-btn"
            >
                Navigate →
            </a>

        </div>
    `;
}


// ==========================================
// DISPLAY FULL TIMETABLE
// ==========================================

function displayTimetable() {

    const container =
        document.getElementById(
            "timetableList"
        );

    if (!container) {
        return;
    }


    container.innerHTML = "";


    const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];


    days.forEach(day => {

        const dayClasses =
            timetable
                .filter(classItem =>
                    classItem.day === day
                )
                .sort((a, b) =>
                    timeToMinutes(a.startTime) -
                    timeToMinutes(b.startTime)
                );


        if (dayClasses.length === 0) {
            return;
        }


        const daySection =
            document.createElement("div");


        daySection.className =
            "timetable-day";


        daySection.innerHTML =
            `<h2>${day}</h2>`;


        dayClasses.forEach(classItem => {

            const location =
                getLocation(
                    classItem.location
                );


            const room =
                location
                    ? location.name
                    : "Unknown Room";


            const card =
                document.createElement("div");


            card.className =
                "class-card";


            card.innerHTML = `

                <div class="class-time">

                    ${formatTime(
                        classItem.startTime
                    )}

                    –

                    ${formatTime(
                        classItem.endTime
                    )}

                </div>


                <div class="class-info">

                    <h3>
                        ${classItem.subject}
                    </h3>

                    <p>
                        ${room}
                    </p>

                </div>


                <a
                    href="map.html?destination=${encodeURIComponent(
                        classItem.location
                    )}"
                    class="navigate-btn"
                >
                    Navigate →
                </a>

            `;


            daySection.appendChild(card);

        });


        container.appendChild(
            daySection
        );

    });
}


// ==========================================
// TIMETABLE REFRESH
// ==========================================

function startTimetableRefresh() {

    displayNextClass();


    setInterval(() => {

        displayNextClass();

    }, 60000);
}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        displayTimetable();

        startTimetableRefresh();

    }
);