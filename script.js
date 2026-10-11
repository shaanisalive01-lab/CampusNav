/* =========================================================
   CAMPUSNAV
   MAP + ROUTING ENGINE
   ========================================================= */


/* =========================================================
   ROUTE STATE
   ========================================================= */

let currentRoute = [];
let currentDestination = null;
let currentFloor = "ground";


/* =========================================================
   GRAPH NODES HIDDEN FROM HUMAN ROUTE STEPS
   ========================================================= */

const hiddenRouteNodes = new Set([

    "main-road-bottom",

    "block-a-left-entry",
    "block-a-right-entry",

    "first-floor-stairs",
    "first-floor-corridor",
    "first-floor-left-corridor",
    "first-floor-right-corridor",

    "left-road-junction",
    "left-road-mid",
    "library-entrance",

    "right-road-junction",
    "right-road-mid",
    "cafeteria-entrance"

]);


/* =========================================================
   MAP ENGINE
   ========================================================= */

const mapState = {

    scale: 1,

    minScale: 0.75,

    maxScale: 3.5,

    translateX: 0,

    translateY: 0,

    isDragging: false,

    dragStartX: 0,

    dragStartY: 0,

    startTranslateX: 0,

    startTranslateY: 0,

    lastTouchDistance: null

};


/* =========================================================
   DOM HELPERS
   ========================================================= */

function getMapSVG() {

    return document.getElementById(
        "campusMap"
    );

}


function getMapContainer() {

    return document.querySelector(
        ".map-container"
    );

}


function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}


/* =========================================================
   MAP SCENE
   ========================================================= */

function setupMapScene() {

    const svg =
        getMapSVG();

    if (!svg) return;

    const scene =
        document.getElementById(
            "mapScene"
        );

    if (!scene) return;

    applyMapTransform();

}


/* =========================================================
   APPLY MAP TRANSFORM
   ========================================================= */

function applyMapTransform(
    animate = false
) {

    const scene =
        document.getElementById(
            "mapScene"
        );

    if (!scene) return;


    scene.style.transition =
        animate
            ? "transform 180ms cubic-bezier(.2,.8,.2,1)"
            : "none";


    scene.setAttribute(
        "transform",

        `translate(${mapState.translateX} ${mapState.translateY}) scale(${mapState.scale})`
    );


    updateZoomDisplay();

}


/* =========================================================
   ZOOM
   ========================================================= */

function zoomMap(
    amount,
    centerX = 400,
    centerY = 250
) {

    const oldScale =
        mapState.scale;


    const newScale =
        clamp(
            oldScale + amount,
            mapState.minScale,
            mapState.maxScale
        );


    if (
        newScale === oldScale
    ) {
        return;
    }


    const ratio =
        newScale / oldScale;


    /*
        Keep the point under the mouse
        roughly fixed while zooming.
    */

    mapState.translateX =
        centerX -
        (
            centerX -
            mapState.translateX
        ) * ratio;


    mapState.translateY =
        centerY -
        (
            centerY -
            mapState.translateY
        ) * ratio;


    mapState.scale =
        newScale;


    constrainMap();

    applyMapTransform(true);

}


function zoomIn() {

    zoomMap(
        0.25,
        400,
        250
    );

}


function zoomOut() {

    zoomMap(
        -0.25,
        400,
        250
    );

}


/* =========================================================
   WHEEL ZOOM
   ========================================================= */

function handleWheelZoom(
    event
) {

    event.preventDefault();


    const svg =
        getMapSVG();

    if (!svg) return;


    const rect =
        svg.getBoundingClientRect();


    const x =
        (
            (event.clientX - rect.left)
            /
            rect.width
        ) * 800;


    const y =
        (
            (event.clientY - rect.top)
            /
            rect.height
        ) * 500;


    const amount =
        event.deltaY < 0
            ? 0.20
            : -0.20;


    zoomMap(
        amount,
        x,
        y
    );

}


/* =========================================================
   DOUBLE CLICK ZOOM
   ========================================================= */

function handleDoubleClick(
    event
) {

    event.preventDefault();


    const svg =
        getMapSVG();

    if (!svg) return;


    const rect =
        svg.getBoundingClientRect();


    const x =
        (
            (event.clientX - rect.left)
            /
            rect.width
        ) * 800;


    const y =
        (
            (event.clientY - rect.top)
            /
            rect.height
        ) * 500;


    zoomMap(
        0.45,
        x,
        y
    );

}


/* =========================================================
   MAP DRAG START
   ========================================================= */

function startMapDrag(
    event
) {

    if (
        event.target.closest(
            ".map-controls"
        )
    ) {
        return;
    }


    if (
        event.target.closest(
            ".floor-controls"
        )
    ) {
        return;
    }


    mapState.isDragging =
        true;


    mapState.dragStartX =
        event.clientX;


    mapState.dragStartY =
        event.clientY;


    mapState.startTranslateX =
        mapState.translateX;


    mapState.startTranslateY =
        mapState.translateY;


    const container =
        getMapContainer();


    if (container) {

        container.classList.add(
            "is-dragging"
        );

    }

}


/* =========================================================
   MAP DRAG
   ========================================================= */

function dragMap(
    event
) {

    if (
        !mapState.isDragging
    ) {
        return;
    }


    const svg =
        getMapSVG();

    if (!svg) return;


    const rect =
        svg.getBoundingClientRect();


    const scaleX =
        800 / rect.width;


    const scaleY =
        500 / rect.height;


    const dx =
        (
            event.clientX -
            mapState.dragStartX
        ) * scaleX;


    const dy =
        (
            event.clientY -
            mapState.dragStartY
        ) * scaleY;


    mapState.translateX =
        mapState.startTranslateX +
        dx;


    mapState.translateY =
        mapState.startTranslateY +
        dy;


    constrainMap();

    applyMapTransform();

}


/* =========================================================
   STOP DRAG
   ========================================================= */

function stopMapDrag() {

    if (
        !mapState.isDragging
    ) {
        return;
    }


    mapState.isDragging =
        false;


    const container =
        getMapContainer();


    if (container) {

        container.classList.remove(
            "is-dragging"
        );

    }

}


/* =========================================================
   MAP BOUNDS
   ========================================================= */

function constrainMap() {

    const scale =
        mapState.scale;


    const maxX =
        400 * (scale - 1) + 180;


    const maxY =
        250 * (scale - 1) + 120;


    mapState.translateX =
        clamp(
            mapState.translateX,
            -maxX,
            maxX
        );


    mapState.translateY =
        clamp(
            mapState.translateY,
            -maxY,
            maxY
        );

}


/* =========================================================
   RECENTER
   ========================================================= */

function recenterMap() {

    mapState.scale =
        1;


    mapState.translateX =
        0;


    mapState.translateY =
        0;


    applyMapTransform(true);

}


/* =========================================================
   ZOOM DISPLAY
   ========================================================= */

function updateZoomDisplay() {

    const element =
        document.getElementById(
            "zoomLevel"
        );


    if (!element) {
        return;
    }


    element.textContent =
        `${Math.round(
            mapState.scale * 100
        )}%`;

}


/* =========================================================
   DIJKSTRA SHORTEST PATH
   ========================================================= */

function findShortestPath(
    graph,
    start,
    target
) {

    const distances = {};

    const previous = {};

    const unvisited =
        new Set(
            Object.keys(graph)
        );


    Object.keys(graph).forEach(
        node => {

            distances[node] =
                Infinity;

            previous[node] =
                null;

        }
    );


    distances[start] =
        0;


    while (
        unvisited.size > 0
    ) {

        let current =
            null;


        let shortestDistance =
            Infinity;


        unvisited.forEach(
            node => {

                if (
                    distances[node] <
                    shortestDistance
                ) {

                    shortestDistance =
                        distances[node];

                    current =
                        node;

                }

            }
        );


        if (
            current === null
        ) {
            break;
        }


        if (
            current === target
        ) {
            break;
        }


        unvisited.delete(
            current
        );


        const neighbours =
            graph[current] || {};


        Object.entries(
            neighbours
        ).forEach(
            ([neighbour, weight]) => {

                if (
                    !unvisited.has(
                        neighbour
                    )
                ) {
                    return;
                }


                const newDistance =
                    distances[current] +
                    weight;


                if (
                    newDistance <
                    distances[neighbour]
                ) {

                    distances[neighbour] =
                        newDistance;

                    previous[neighbour] =
                        current;

                }

            }
        );

    }


    if (
        start !== target &&
        previous[target] === null
    ) {

        return null;

    }


    const path = [];

    let current =
        target;


    while (
        current !== null
    ) {

        path.unshift(
            current
        );

        current =
            previous[current];

    }


    return {

        path,

        distance:
            distances[target]

    };

}


/* =========================================================
   VISIBLE ROUTE NODES
   ========================================================= */

function getVisibleRouteNodes(
    path
) {

    if (!path) {
        return [];
    }


    return path.filter(
        node =>
            !hiddenRouteNodes.has(
                node
            )
    );

}


/* =========================================================
   DRAW ROUTE
   ========================================================= */

function drawRoute(
    path
) {

    const routeLayer =
        document.getElementById(
            "routeLayer"
        );


    if (!routeLayer) {
        return;
    }


    routeLayer.innerHTML =
        "";


    if (
        !path ||
        path.length < 2
    ) {

        return;

    }


    const points =
        path
            .map(
                node =>
                    mapCoordinates[node]
            )
            .filter(
                Boolean
            );


    if (
        points.length < 2
    ) {
        return;
    }


    /*
        Route shadow
    */

    const shadow =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polyline"
        );


    shadow.setAttribute(
        "points",

        points
            .map(
                point =>
                    `${point.x},${point.y}`
            )
            .join(" ")
    );


    shadow.setAttribute(
        "fill",
        "none"
    );


    shadow.setAttribute(
        "stroke",
        "rgba(15, 23, 42, 0.20)"
    );


    shadow.setAttribute(
        "stroke-width",
        "12"
    );


    shadow.setAttribute(
        "stroke-linecap",
        "round"
    );


    shadow.setAttribute(
        "stroke-linejoin",
        "round"
    );


    routeLayer.appendChild(
        shadow
    );


    /*
        Main route
    */

    const route =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polyline"
        );


    route.setAttribute(
        "points",

        points
            .map(
                point =>
                    `${point.x},${point.y}`
            )
            .join(" ")
    );


    route.setAttribute(
        "fill",
        "none"
    );


    route.setAttribute(
        "stroke",
        "#2563eb"
    );


    route.setAttribute(
        "stroke-width",
        "7"
    );


    route.setAttribute(
        "stroke-linecap",
        "round"
    );


    route.setAttribute(
        "stroke-linejoin",
        "round"
    );


    routeLayer.appendChild(
        route
    );


    /*
        Start marker
    */

    const start =
        points[0];


    const startMarker =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );


    startMarker.setAttribute(
        "cx",
        start.x
    );


    startMarker.setAttribute(
        "cy",
        start.y
    );


    startMarker.setAttribute(
        "r",
        "9"
    );


    startMarker.setAttribute(
        "fill",
        "#ffffff"
    );


    startMarker.setAttribute(
        "stroke",
        "#2563eb"
    );


    startMarker.setAttribute(
        "stroke-width",
        "5"
    );


    routeLayer.appendChild(
        startMarker
    );


    /*
        Destination marker
    */

    const destination =
        points[
            points.length - 1
        ];


    const destinationMarker =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );


    destinationMarker.setAttribute(
        "cx",
        destination.x
    );


    destinationMarker.setAttribute(
        "cy",
        destination.y
    );


    destinationMarker.setAttribute(
        "r",
        "11"
    );


    destinationMarker.setAttribute(
        "fill",
        "#2563eb"
    );


    destinationMarker.setAttribute(
        "stroke",
        "#ffffff"
    );


    destinationMarker.setAttribute(
        "stroke-width",
        "4"
    );


    routeLayer.appendChild(
        destinationMarker
    );

}


/* =========================================================
   ROUTE STEPS
   ========================================================= */

function createRouteSteps(
    path
) {

    const visibleNodes =
        getVisibleRouteNodes(
            path
        );


    if (
        visibleNodes.length === 0
    ) {
        return [];
    }


    return visibleNodes.map(
        (node, index) => {

            const location =
                campusLocations[node];


            const name =
                location?.name ||
                node;


            if (
                index === 0
            ) {

                return {

                    icon: "📍",

                    text:
                        `Start at ${name}`

                };

            }


            if (
                index ===
                visibleNodes.length - 1
            ) {

                return {

                    icon: "📌",

                    text:
                        `Arrive at ${name}`

                };

            }


            return {

                icon: "→",

                text:
                    `Continue to ${name}`

            };

        }
    );

}


/* =========================================================
   ROUTE INFO
   ========================================================= */

function showRouteInfo(
    destination,
    distance,
    path
) {

    const routeInfo =
        document.getElementById(
            "routeInfo"
        );


    if (!routeInfo) {
        return;
    }


    const location =
        campusLocations[
            destination
        ];


    const destinationName =
        location?.name ||
        destination;


    const steps =
        createRouteSteps(
            path
        );


    routeInfo.innerHTML = `

        <div class="route-card">

            <div class="route-card-top">

                <div>

                    <span class="route-eyebrow">
                        ROUTE FOUND
                    </span>

                    <h3>
                        ${destinationName}
                    </h3>

                    <p>
                        From Main Gate
                    </p>

                </div>


                <div class="route-distance">

                    <strong>
                        ${Math.round(distance)} m
                    </strong>

                    <span>
                        walking route
                    </span>

                </div>

            </div>


            <div class="route-steps">

                ${

                    steps
                        .map(
                            step => `

                                <div class="route-step">

                                    <span class="route-step-icon">
                                        ${step.icon}
                                    </span>

                                    <span>
                                        ${step.text}
                                    </span>

                                </div>

                            `
                        )
                        .join("")

                }

            </div>

        </div>

    `;

}


/* =========================================================
   FIND LOCATION
   ========================================================= */

function findLocation(
    query
) {

    if (!query) {
        return null;
    }


    const normalized =
        query
            .trim()
            .toLowerCase();


    const entries =
        Object.entries(
            campusLocations
        );


    /*
        Exact ID
    */

    const exactId =
        entries.find(
            ([id]) =>
                id.toLowerCase() ===
                normalized
        );


    if (exactId) {
        return exactId[0];
    }


    /*
        Exact name
    */

    const exactName =
        entries.find(
            ([, location]) =>
                location.name &&
                location.name
                    .toLowerCase() ===
                normalized
        );


    if (exactName) {
        return exactName[0];
    }


    /*
        Partial name
    */

    const partial =
        entries.find(
            ([, location]) =>
                location.name &&
                location.name
                    .toLowerCase()
                    .includes(
                        normalized
                    )
        );


    if (partial) {
        return partial[0];
    }


    /*
        Useful aliases
    */

    const aliases = {

        "105": "a105",

        "room 105": "a105",

        "201": "a201",

        "room 201": "a201",

        "204": "a204",

        "room 204": "a204",

        "block a": "block-a",

        "library": "library",

        "cafeteria": "cafeteria",

        "main gate": "main-gate"

    };


    return (
        aliases[normalized] ||
        null
    );

}


/* =========================================================
   SEARCH
   ========================================================= */

function searchLocation() {

    const input =
        document.getElementById(
            "locationSearch"
        );


    if (!input) {
        return;
    }


    const query =
        input.value.trim();


    const destination =
        findLocation(
            query
        );


    if (!destination) {

        const routeInfo =
            document.getElementById(
                "routeInfo"
            );


        if (routeInfo) {

            routeInfo.innerHTML = `

                <div class="route-card route-error">

                    <strong>
                        Location not found
                    </strong>

                    <span>
                        Try a room number,
                        building or campus location.
                    </span>

                </div>

            `;

        }

        return;

    }


    navigateToLocation(
        destination
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function navigateToLocation(
    destination
) {

    const start =
        "main-gate";


    if (
        !campusGraph[start]
    ) {
        return;
    }


    const result =
        findShortestPath(
            campusGraph,
            start,
            destination
        );


    if (!result) {

        const routeInfo =
            document.getElementById(
                "routeInfo"
            );


        if (routeInfo) {

            routeInfo.innerHTML = `

                <div class="route-card route-error">

                    <strong>
                        Route unavailable
                    </strong>

                    <span>
                        No connected route exists
                        to this location yet.
                    </span>

                </div>

            `;

        }

        return;

    }


    currentDestination =
        destination;


    currentRoute =
        result.path;


    drawRoute(
        result.path
    );


    showRouteInfo(
        destination,
        result.distance,
        result.path
    );


    highlightDestination(
        destination
    );


    switchToDestinationFloor(
        destination
    );

}


/* =========================================================
   DESTINATION HIGHLIGHT
   ========================================================= */

function highlightDestination(
    destination
) {

    document
        .querySelectorAll(
            ".destination-highlight"
        )
        .forEach(
            element =>
                element.remove()
        );


    const coordinates =
        mapCoordinates[
            destination
        ];


    if (!coordinates) {
        return;
    }


    const routeLayer =
        document.getElementById(
            "routeLayer"
        );


    if (!routeLayer) {
        return;
    }


    const ring =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );


    ring.setAttribute(
        "class",
        "destination-highlight"
    );


    ring.setAttribute(
        "cx",
        coordinates.x
    );


    ring.setAttribute(
        "cy",
        coordinates.y
    );


    ring.setAttribute(
        "r",
        "18"
    );


    ring.setAttribute(
        "fill",
        "none"
    );


    ring.setAttribute(
        "stroke",
        "#2563eb"
    );


    ring.setAttribute(
        "stroke-width",
        "3"
    );


    ring.setAttribute(
        "opacity",
        "0.7"
    );


    routeLayer.appendChild(
        ring
    );

}


/* =========================================================
   CLEAR ROUTE
   ========================================================= */

function clearRoute() {

    currentRoute =
        [];

    currentDestination =
        null;


    const routeLayer =
        document.getElementById(
            "routeLayer"
        );


    if (routeLayer) {

        routeLayer.innerHTML =
            "";

    }


    const routeInfo =
        document.getElementById(
            "routeInfo"
        );


    if (routeInfo) {

        routeInfo.innerHTML =
            "";

    }


    const search =
        document.getElementById(
            "locationSearch"
        );


    if (search) {

        search.value =
            "";

    }

}


/* =========================================================
   ENTER KEY
   ========================================================= */

function handleSearchKey(
    event
) {

    if (
        event.key === "Enter"
    ) {

        searchLocation();

    }

}


/* =========================================================
   FLOOR SWITCHING
   ========================================================= */

function switchFloor(
    floor
) {

    currentFloor =
        floor;


    document
        .querySelectorAll(
            ".floor-btn"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",

                    button.dataset.floor ===
                    floor
                );

            }
        );


    /*
        Current prototype keeps all
        map geometry visible.

        We still track the active floor
        so room-level floor filtering can
        be added later without rebuilding
        the navigation engine.
    */

}


/* =========================================================
   DESTINATION FLOOR
   ========================================================= */

function switchToDestinationFloor(
    destination
) {

    const firstFloorLocations = [

        "a201",

        "a204",

        "first-floor",

        "first-floor-stairs"

    ];


    if (
        firstFloorLocations.includes(
            destination
        )
    ) {

        switchFloor(
            "first"
        );

    } else {

        switchFloor(
            "ground"
        );

    }

}


/* =========================================================
   URL DESTINATION
   ========================================================= */

function loadDestinationFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const destination =
        params.get(
            "destination"
        );


    if (!destination) {
        return;
    }


    const input =
        document.getElementById(
            "locationSearch"
        );


    if (input) {

        const location =
            campusLocations[
                destination
            ];


        input.value =
            location?.name ||
            destination;

    }


    navigateToLocation(
        destination
    );

}


/* =========================================================
   TOUCH HELPERS
   ========================================================= */

function getTouchDistance(
    touches
) {

    const dx =
        touches[0].clientX -
        touches[1].clientX;


    const dy =
        touches[0].clientY -
        touches[1].clientY;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


/* =========================================================
   TOUCH START
   ========================================================= */

function handleTouchStart(
    event
) {

    if (
        event.touches.length === 2
    ) {

        mapState.lastTouchDistance =
            getTouchDistance(
                event.touches
            );

        return;

    }


    if (
        event.touches.length === 1
    ) {

        const touch =
            event.touches[0];


        startMapDrag({

            clientX:
                touch.clientX,

            clientY:
                touch.clientY,

            target:
                event.target

        });

    }

}


/* =========================================================
   TOUCH MOVE
   ========================================================= */

function handleTouchMove(
    event
) {

    event.preventDefault();


    if (
        event.touches.length === 2
    ) {

        const distance =
            getTouchDistance(
                event.touches
            );


        if (
            mapState.lastTouchDistance
        ) {

            const difference =
                distance -
                mapState.lastTouchDistance;


            const amount =
                difference *
                0.003;


            const rect =
                getMapSVG()
                    .getBoundingClientRect();


            const x =
                (
                    (
                        event.touches[0].clientX -
                        rect.left
                    )
                    /
                    rect.width
                ) * 800;


            const y =
                (
                    (
                        event.touches[0].clientY -
                        rect.top
                    )
                    /
                    rect.height
                ) * 500;


            zoomMap(
                amount,
                x,
                y
            );

        }


        mapState.lastTouchDistance =
            distance;


        return;

    }


    if (
        event.touches.length === 1
    ) {

        const touch =
            event.touches[0];


        dragMap({

            clientX:
                touch.clientX,

            clientY:
                touch.clientY

        });

    }

}


/* =========================================================
   TOUCH END
   ========================================================= */

function handleTouchEnd() {

    mapState.lastTouchDistance =
        null;


    stopMapDrag();

}


/* =========================================================
   MAP CONTROLS
   ========================================================= */

function setupMapControls() {

    const zoomInButton =
        document.getElementById(
            "zoomIn"
        );


    const zoomOutButton =
        document.getElementById(
            "zoomOut"
        );


    const recenterButton =
        document.getElementById(
            "recenterMap"
        );


    const compassButton =
        document.getElementById(
            "compass"
        );


    if (zoomInButton) {

        zoomInButton.addEventListener(
            "click",
            zoomIn
        );

    }


    if (zoomOutButton) {

        zoomOutButton.addEventListener(
            "click",
            zoomOut
        );

    }


    if (recenterButton) {

        recenterButton.addEventListener(
            "click",
            recenterMap
        );

    }


    if (compassButton) {

        compassButton.addEventListener(
            "click",
            recenterMap
        );

    }

}


/* =========================================================
   MAP INTERACTIONS
   ========================================================= */

function setupMapInteractions() {

    const svg =
        getMapSVG();


    if (!svg) {
        return;
    }


    /*
        Mouse wheel zoom
    */

    svg.addEventListener(
        "wheel",
        handleWheelZoom,
        {
            passive: false
        }
    );


    /*
        Double-click zoom
    */

    svg.addEventListener(
        "dblclick",
        handleDoubleClick
    );


    /*
        Drag
    */

    svg.addEventListener(
        "mousedown",
        startMapDrag
    );


    window.addEventListener(
        "mousemove",
        dragMap
    );


    window.addEventListener(
        "mouseup",
        stopMapDrag
    );


    /*
        Touch
    */

    svg.addEventListener(
        "touchstart",
        handleTouchStart,
        {
            passive: false
        }
    );


    svg.addEventListener(
        "touchmove",
        handleTouchMove,
        {
            passive: false
        }
    );


    svg.addEventListener(
        "touchend",
        handleTouchEnd
    );


    /*
        Stop browser from treating
        SVG as draggable content.
    */

    svg.addEventListener(
        "dragstart",
        event =>
            event.preventDefault()
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupMapScene();

        setupMapControls();

        setupMapInteractions();

        updateZoomDisplay();

        switchFloor(
            "ground"
        );

        loadDestinationFromURL();

    }
);