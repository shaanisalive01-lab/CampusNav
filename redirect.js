// Old page addresses (bookmarks, shared links) open the matching screen of the app.
(function () {
    "use strict";

    const page = document.currentScript.dataset.page;
    const base = document.currentScript.dataset.base || "";
    const query = new URLSearchParams(location.search);
    let hash = page;

    // map.html?destination=a204&from=main-gate, and the older v2/index.html#/map?to=a204
    if (page === "map" || page === "v2") {
        const inner = new URLSearchParams(location.hash.split("?")[1] || "");
        const to = (query.get("destination") || inner.get("to") || "").trim().slice(0, 64);
        const from = (query.get("from") || inner.get("from") || "").trim().slice(0, 64);
        hash = to ? "go/" + encodeURIComponent(to) + (from ? "/" + encodeURIComponent(from) : "") : "map";
    }

    location.replace(base + "index.html#" + hash);
})();
