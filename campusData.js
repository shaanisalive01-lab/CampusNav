/*
    =========================================
    CAMPUSNAV
    CAMPUS DATA + NAVIGATION GRAPH
    =========================================

    Prototype campus data.

    IMPORTANT:
    Location IDs are shared across:
    - Map
    - Timetable
    - Events
    - Groups
    - Search
    - Navigation

    The routing graph contains both:
    1. Real destinations
    2. Road/corridor nodes

    This makes the calculated route follow the
    visible campus paths instead of drawing
    random diagonal shortcuts.
*/


/* =========================================
   CAMPUS LOCATIONS
========================================= */

const campusLocations = {


    /* -----------------------------------------
       MAIN ENTRANCE
    ----------------------------------------- */

    "main-gate": {
        id: "main-gate",
        name: "Main Gate",
        building: "Campus Entrance",
        type: "entrance",
        floor: 0,
        description: "Main campus entrance"
    },


    /* -----------------------------------------
       BLOCK A
    ----------------------------------------- */

    "block-a": {
        id: "block-a",
        name: "Block A",
        building: "Block A",
        type: "building",
        floor: 0,
        description: "Main academic block"
    },


    "stairs-a": {
        id: "stairs-a",
        name: "Block A Stairs",
        building: "Block A",
        type: "stairs",
        floor: 0,
        description: "Main staircase connecting Block A floors"
    },


    "first-floor": {
        id: "first-floor",
        name: "Block A First Floor",
        building: "Block A",
        type: "floor",
        floor: 1,
        description: "First floor of Block A"
    },


    /* -----------------------------------------
       CLASSROOMS
    ----------------------------------------- */

    "a105": {
        id: "a105",
        name: "Room 105",
        building: "Block A",
        type: "classroom",
        floor: 0,
        description: "Ground floor classroom"
    },


    "a201": {
        id: "a201",
        name: "Room 201",
        building: "Block A",
        type: "classroom",
        floor: 1,
        description: "First floor classroom"
    },


    "a204": {
        id: "a204",
        name: "Room 204",
        building: "Block A",
        type: "classroom",
        floor: 1,
        description: "First floor classroom"
    },


    /* -----------------------------------------
       FACILITIES
    ----------------------------------------- */

    "library": {
        id: "library",
        name: "Library",
        building: "Library",
        type: "facility",
        floor: 0,
        description: "Campus library"
    },


    "cafeteria": {
        id: "cafeteria",
        name: "Cafeteria",
        building: "Cafeteria",
        type: "facility",
        floor: 0,
        description: "Campus cafeteria"
    }

};


/* =========================================
   ROUTING GRAPH
=========================================

   These nodes correspond to actual visible
   roads, paths, corridors and intersections.

   So the route renderer follows the graph.

========================================= */

const campusGraph = {


    /* =========================================
       MAIN CAMPUS ROAD
    ========================================= */

    "main-gate": {

        "main-road-bottom": 55

    },


    "main-road-bottom": {

        "main-gate": 55,
        "block-a": 55,
        "left-road-junction": 75,
        "right-road-junction": 75

    },


    /* =========================================
       BLOCK A
    ========================================= */

    "block-a": {

        "main-road-bottom": 55,
        "stairs-a": 30,
        "block-a-left-entry": 35,
        "block-a-right-entry": 35

    },


    /* =========================================
       ROOM 105
    ========================================= */

    "block-a-left-entry": {

        "block-a": 35,
        "a105": 35

    },


    "a105": {

        "block-a-left-entry": 35

    },


    /* =========================================
       STAIRS
    ========================================= */

    "stairs-a": {

        "block-a": 30,
        "first-floor-stairs": 15

    },


    /* =========================================
       FIRST FLOOR
    ========================================= */

    "first-floor-stairs": {

        "stairs-a": 15,
        "first-floor-corridor": 25

    },


    "first-floor-corridor": {

        "first-floor-stairs": 25,
        "first-floor-left-corridor": 35,
        "first-floor-right-corridor": 35

    },


    /* =========================================
       ROOM 201
    ========================================= */

    "first-floor-left-corridor": {

        "first-floor-corridor": 35,
        "a201": 30

    },


    "a201": {

        "first-floor-left-corridor": 30

    },


    /* =========================================
       ROOM 204
    ========================================= */

    "first-floor-right-corridor": {

        "first-floor-corridor": 35,
        "a204": 30

    },


    "a204": {

        "first-floor-right-corridor": 30

    },


    /* =========================================
       LEFT CAMPUS ROAD → LIBRARY
    ========================================= */

    "left-road-junction": {

        "main-road-bottom": 75,
        "left-road-mid": 70

    },


    "left-road-mid": {

        "left-road-junction": 70,
        "library-entrance": 60

    },


    "library-entrance": {

        "left-road-mid": 60,
        "library": 25

    },


    "library": {

        "library-entrance": 25,
        "cafeteria": 80

    },


    /* =========================================
       RIGHT CAMPUS ROAD → CAFETERIA
    ========================================= */

    "right-road-junction": {

        "main-road-bottom": 75,
        "right-road-mid": 70

    },


    "right-road-mid": {

        "right-road-junction": 70,
        "cafeteria-entrance": 60

    },


    "cafeteria-entrance": {

        "right-road-mid": 60,
        "cafeteria": 25

    },


    "cafeteria": {

        "cafeteria-entrance": 25,
        "library": 80

    }

};


/* =========================================
   VISUAL MAP COORDINATES
=========================================

   These coordinates now correspond to the
   routing graph.

========================================= */

const mapCoordinates = {


    /* -----------------------------------------
       MAIN ROAD
    ----------------------------------------- */

    "main-gate": {
        x: 400,
        y: 465
    },


    "main-road-bottom": {
        x: 400,
        y: 410
    },


    /* -----------------------------------------
       BLOCK A
    ----------------------------------------- */

    "block-a": {
        x: 400,
        y: 350
    },


    "block-a-left-entry": {
        x: 315,
        y: 350
    },


    "block-a-right-entry": {
        x: 485,
        y: 350
    },


    "stairs-a": {
        x: 400,
        y: 300
    },


    "first-floor-stairs": {
        x: 400,
        y: 250
    },


    "first-floor-corridor": {
        x: 400,
        y: 220
    },


    "first-floor-left-corridor": {
        x: 340,
        y: 220
    },


    "first-floor-right-corridor": {
        x: 460,
        y: 220
    },


    /* -----------------------------------------
       ROOMS
    ----------------------------------------- */

    "a105": {
        x: 260,
        y: 350
    },


    "a201": {
        x: 340,
        y: 260
    },


    "a204": {
        x: 460,
        y: 260
    },


    /* -----------------------------------------
       LEFT ROAD
    ----------------------------------------- */

    "left-road-junction": {
        x: 225,
        y: 410
    },


    "left-road-mid": {
        x: 150,
        y: 340
    },


    "library-entrance": {
        x: 130,
        y: 290
    },


    "library": {
        x: 130,
        y: 250
    },


    /* -----------------------------------------
       RIGHT ROAD
    ----------------------------------------- */

    "right-road-junction": {
        x: 575,
        y: 410
    },


    "right-road-mid": {
        x: 650,
        y: 340
    },


    "cafeteria-entrance": {
        x: 670,
        y: 290
    },


    "cafeteria": {
        x: 670,
        y: 250
    }

};