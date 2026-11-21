/* Run:  node --test v2/test     (Node 18+, no dependencies) */
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

/* Load the browser-style data files into one sandbox. */
const ctx = vm.createContext({ localStorage: { getItem: () => null }, console });
vm.runInContext(read("campusData.js") + "\n" + read("mapdata.js") + "\n" + read("timetableData.js") +
  "\n;this.__d={campusLocations,campusGraph,mapCoordinates,campusMapConfig,baseTimetable};", ctx);
const { campusLocations, campusGraph, mapCoordinates, campusMapConfig: MAP, baseTimetable } = ctx.__d;
const { createRouter } = require("../routing.js");

const levelOf = id => MAP.nodeLevel[id] ?? 0;
const label = id => campusLocations[id]?.name || MAP.nodeLabels[id] || id;
const isNamed = id => !!campusLocations[id] && id !== "first-floor";
const r = createRouter({
  graph: campusGraph, coords: mapCoordinates, levelOf, label, isNamed, levelName: l => MAP.levels.find(x => x.id === l).name,
  ignoredEdges: MAP.ignoredEdges, metresPerUnit: MAP.metresPerUnit, walkSpeed: MAP.walkSpeed, stairPenaltySeconds: MAP.stairPenaltySeconds
});

test("gate -> library follows the left road", () => {
  const x = r.route("main-gate", "library");
  assert.deepEqual(x.path, ["main-gate", "main-road-bottom", "left-road-junction", "left-road-mid", "library-entrance", "library"]);
  assert.equal(x.metres, 285);
});

test("unknown places return null instead of hanging (regression)", () => {
  assert.equal(r.route("main-gate", "foo"), null);
  assert.equal(r.route("nowhere", "library"), null);
  assert.equal(r.route("main-gate", "first-floor"), null);
});

test("same start and end is a zero-length route", () => {
  const x = r.route("library", "library");
  assert.deepEqual(x.path, ["library"]); assert.equal(x.metres, 0);
});

test("routes are symmetric", () => {
  for (const [a, b] of [["main-gate", "a204"], ["a105", "cafeteria"], ["library", "a201"]]) {
    assert.equal(r.route(a, b).metres, r.route(b, a).metres, `${a} <-> ${b}`);
  }
});

test("Library <-> Cafeteria has no shortcut (no road exists)", () => {
  const x = r.route("library", "cafeteria");
  assert.ok(x.path.includes("main-gate") || x.path.includes("main-road-bottom"), x.path.join(">"));
  assert.ok(x.metres > 160);
});

test("level 1 needs stairs; step-free refuses it but allows ground rooms", () => {
  const up = r.route("main-gate", "a204");
  assert.equal(up.levels, 1);
  assert.equal(r.route("main-gate", "a204", { stepFree: true }), null);
  assert.ok(r.route("main-gate", "a105", { stepFree: true }));
});

test("stairs add the configured time penalty", () => {
  const up = r.route("main-gate", "a204");
  assert.equal(Math.round(up.seconds), Math.round(up.metres / MAP.walkSpeed + MAP.stairPenaltySeconds));
});

test("directions add up and end at the destination", () => {
  for (const to of ["library", "cafeteria", "a105", "a201", "a204"]) {
    const x = r.route("main-gate", to), steps = r.buildSteps(x.path);
    assert.equal(Math.round(steps.reduce((s, t) => s + t.m, 0)), Math.round(x.metres), to);
    assert.equal(steps.at(-1).kind, "flag", to);
    assert.match(steps.at(-1).text, new RegExp(label(to)), to);
    assert.equal(steps[0].from, 0);
  }
  assert.ok(r.buildSteps(r.route("main-gate", "a204").path).some(s => s.kind === "stairs"));
});

/* ---------- data integrity ---------- */
test("every graph node has map coordinates and every edge target exists", () => {
  for (const [a, nb] of Object.entries(campusGraph)) {
    assert.ok(mapCoordinates[a], `no coordinates for ${a}`);
    for (const b of Object.keys(nb)) assert.ok(campusGraph[b], `${a} -> ${b} points at a missing node`);
  }
});

test("every timetable room exists and is reachable from the main gate", () => {
  for (const c of baseTimetable) {
    assert.ok(campusLocations[c.location], `${c.id}: unknown room ${c.location}`);
    assert.ok(r.route("main-gate", c.location), `${c.id}: ${c.location} unreachable`);
    assert.ok(c.startTime < c.endTime, `${c.id}: ends before it starts`);
  }
});

test("timetable has no room double-bookings", () => {
  for (const a of baseTimetable) for (const b of baseTimetable) {
    if (a.id >= b.id || a.day !== b.day || a.location !== b.location) continue;
    assert.ok(a.endTime <= b.startTime || b.endTime <= a.startTime, `${a.id} clashes with ${b.id}`);
  }
});

test("map config only references real nodes", () => {
  for (const id of [...Object.keys(MAP.nodeLevel), ...MAP.roadNodes, ...Object.keys(MAP.labelOffsets)]) assert.ok(campusGraph[id], id);
});

test("v2 data files have not drifted from the originals in the repo root", () => {
  for (const f of ["campusData.js", "timetableData.js"]) {
    assert.equal(read(f), fs.readFileSync(path.join(root, "..", f), "utf8"), `${f}: v2 copy differs from root — re-copy it`);
  }
});
