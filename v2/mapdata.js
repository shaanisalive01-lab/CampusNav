/* CampusNav map configuration — everything the map needs that isn't in campusData.js.
   Edit this file (not app.js) to add buildings, floors or label tweaks. */
const campusMapConfig = {
  viewBox: { w: 800, h: 520 },

  /* Graph weights in campusData.js are unitless. Set metresPerUnit once someone has measured
     a real distance (e.g. gate -> Block A) so the walk times become trustworthy. */
  metresPerUnit: 1,
  walkSpeed: 1.3,            // metres / second
  stairPenaltySeconds: 20,   // extra time per level change

  levels: [{ id: 0, name: "Ground" }, { id: 1, name: "Level 1" }],

  /* Nodes not listed here are on level 0. */
  nodeLevel: {
    "first-floor-stairs": 1, "first-floor-corridor": 1, "first-floor-left-corridor": 1,
    "first-floor-right-corridor": 1, "a201": 1, "a204": 1
  },

  /* Nodes joined by these edges are drawn as outdoor roads; all other edges are indoor halls. */
  roadNodes: ["main-gate", "main-road-bottom", "block-a", "left-road-junction", "left-road-mid", "library-entrance", "library",
    "right-road-junction", "right-road-mid", "cafeteria-entrance", "cafeteria"],

  /* Edges present in campusGraph that have no real path on the ground. */
  ignoredEdges: [["library", "cafeteria"]],

  buildings: [
    { name: "Block A · Ground", level: 0, x: 236, y: 316, w: 328, h: 70 },
    { name: "Library", level: 0, x: 84, y: 210, w: 92, h: 66 },
    { name: "Cafeteria", level: 0, x: 624, y: 210, w: 92, h: 66 },
    { name: "Block A · Level 1", level: 1, x: 296, y: 192, w: 208, h: 102 }
  ],

  /* Wording for graph nodes that aren't in campusLocations (junctions, doors, corridors). */
  nodeLabels: {
    "main-road-bottom": "the main road", "left-road-junction": "the left junction", "left-road-mid": "the left road",
    "library-entrance": "the Library entrance", "right-road-junction": "the right junction", "right-road-mid": "the right road",
    "cafeteria-entrance": "the Cafeteria entrance", "block-a-left-entry": "the west door", "block-a-right-entry": "the east door",
    "first-floor-stairs": "Level 1 landing", "first-floor-corridor": "the Level 1 corridor",
    "first-floor-left-corridor": "the west corridor", "first-floor-right-corridor": "the east corridor"
  },

  /* [dx, dy, text-anchor] for pin labels that would otherwise collide. Default is [0, 22, "middle"]. */
  labelOffsets: { "block-a": [14, 4, "start"], "stairs-a": [-14, 4, "end"], "first-floor-stairs": [14, 4, "start"] }
};
