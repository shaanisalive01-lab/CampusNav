/* CampusNav routing — pure functions, no DOM. Loaded by the app and by test/routing.test.js. */
const CampusRouting = (() => {
  class MinHeap {
    constructor() { this.a = []; }
    push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
    get size() { return this.a.length; }
  }

  const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  /** Make the (possibly one-way) source graph undirected, dropping edges that don't exist in reality. */
  function buildAdjacency(graph, ignoredEdges = []) {
    const skip = new Set(ignoredEdges.flatMap(([a, b]) => [a + "|" + b, b + "|" + a]));
    const adj = {};
    const add = (a, b, w) => { (adj[a] ||= {})[b] = Math.min(w, adj[a]?.[b] ?? Infinity); };
    for (const [a, nb] of Object.entries(graph)) {
      adj[a] ||= {};
      for (const [b, w] of Object.entries(nb)) { if (skip.has(a + "|" + b)) continue; add(a, b, w); add(b, a, w); }
    }
    return adj;
  }

  function createRouter({ graph, coords, levelOf, label, isNamed, levelName, ignoredEdges, metresPerUnit = 1, walkSpeed = 1.3, stairPenaltySeconds = 20 }) {
    const adj = buildAdjacency(graph, ignoredEdges);
    const isStairEdge = (a, b) => levelOf(a) !== levelOf(b);
    const toMetres = u => u * metresPerUnit;

    function route(from, to, { stepFree = false } = {}) {
      if (!adj[from] || !adj[to]) return null;
      const dist = { [from]: 0 }, prev = {}, heap = new MinHeap(); heap.push(0, from);
      while (heap.size) {
        const [d, u] = heap.pop();
        if (d > dist[u]) continue;
        if (u === to) break;
        for (const v in adj[u]) {
          const stairs = isStairEdge(u, v);
          if (stepFree && stairs) continue;
          const nd = d + adj[u][v] + (stairs ? stairPenaltySeconds * walkSpeed / metresPerUnit : 0);
          if (nd < (dist[v] ?? Infinity)) { dist[v] = nd; prev[v] = u; heap.push(nd, v); }
        }
      }
      if (!(to in dist)) return null;
      const path = [to]; while (path[0] !== from) path.unshift(prev[path[0]]);
      let units = 0, levels = 0;
      for (let i = 1; i < path.length; i++) { units += adj[path[i - 1]][path[i]]; if (isStairEdge(path[i - 1], path[i])) levels++; }
      const metres = toMetres(units);
      return { path, metres, levels, seconds: metres / walkSpeed + levels * stairPenaltySeconds };
    }

    const walkSeconds = (a, b) => route(a, b)?.seconds ?? 0;

    function buildSteps(path) {
      const P = id => coords[id];
      const hd = (a, b) => Math.atan2(P(b).y - P(a).y, P(b).x - P(a).x);
      const dirName = r => ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"][Math.round(((r * 180 / Math.PI) + 360) % 360 / 45) % 8];
      const steps = []; let start = 0, acc = 0, prevHeading = null;
      for (let i = 1; i < path.length; i++) {
        acc += adj[path[i - 1]][path[i]];
        const last = i === path.length - 1;
        const floorChange = isStairEdge(path[i - 1], path[i]);
        const nextFloorChange = !last && isStairEdge(path[i], path[i + 1]);
        const turn = !last && Math.abs(norm(hd(path[i], path[i + 1]) - hd(path[i - 1], path[i]))) > 0.5;
        if (!(last || isNamed(path[i]) || floorChange || nextFloorChange || turn)) continue;
        const a = path[start], b = path[i], m = toMetres(acc);
        if (floorChange) {
          const up = levelOf(b) > levelOf(a);
          steps.push({ kind: "stairs", text: `Take the stairs ${up ? "up" : "down"} to ${levelName(levelOf(b))}`, sub: `${label(a)} → ${label(b)}`, m, from: start, to: i });
        } else {
          const h = hd(path[start], path[start + 1]);
          let kind = "up", verb;
          if (prevHeading === null) verb = `Head ${dirName(h)}`;
          else {
            const d = norm(h - prevHeading);
            if (Math.abs(d) < 0.4) verb = "Continue straight";
            else if (Math.abs(d) > 2.5) { kind = "left"; verb = "Turn around"; }
            else { kind = d > 0 ? "right" : "left"; verb = `${Math.abs(d) < 0.9 ? "Bear" : "Turn"} ${kind}`; }
          }
          steps.push(last
            ? { kind: "flag", text: `${verb}, then arrive at ${label(b)}`, sub: "Destination", m, from: start, to: i }
            : { kind, text: `${verb} toward ${label(b)}`, sub: "", m, from: start, to: i });
          prevHeading = hd(path[i - 1], path[i]);
        }
        start = i; acc = 0;
      }
      return steps;
    }

    return { adj, route, walkSeconds, buildSteps, isStairEdge };
  }

  return { createRouter, buildAdjacency, MinHeap };
})();
if (typeof module !== "undefined") module.exports = CampusRouting;
