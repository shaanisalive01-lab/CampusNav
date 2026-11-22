// ==========================================
// CAMPUSNAV ICONS
// Drawn line icons (24px grid, 2px stroke) used on list pages.
// iconSVG("book") returns an <svg> string; it is decorative (aria-hidden).
// ==========================================

const ICON_PATHS = {

    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M9 7h6"/>',

    cup: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/>',

    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',

    building: '<path d="M4 21V5l8-2 8 2v16M2 21h20M9 9h2M13 9h2M9 13h2M13 13h2M10 21v-4h4v4"/>',

    fork: '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.6-3.5 4.2-3.5 7.5V14H17"/>',

    bed: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12.5a1.5 1.5 0 1 0 0-.01"/>',

    bus: '<path d="M5 17V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10zM5 12h14M8 20v-3M16 20v-3M8.5 14.5h.01M15.5 14.5h.01"/>',

    cpu: '<path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2M7 7h10v10H7zM10 10h4v4h-4z"/>',

    users: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="17" cy="10" r="2.3"/><path d="M16.5 14.6c2.3.1 3.9 1.4 4.5 4"/>',

    cap: '<path d="M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/>',

    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',

    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',

    alert: '<path d="M12 3 2 20h20zM12 10v4M12 17.5v.01"/>',

    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',

    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>',

    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',

    game: '<path d="M6 8h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L15.5 14h-7l-1.1.8A3 3 0 0 1 2 13v-1a4 4 0 0 1 4-4zM8 10v3M6.5 11.5h3M16 11.2h.01M18 12.8h.01"/>',

    car: '<path d="M4 16v-4l2-5h12l2 5v4M3 16h18M4 16v2M20 16v2M7 12h.01M17 12h.01"/>',

    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',

    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',

    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',

    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',

    plus: '<path d="M12 5v14M5 12h14"/>',

    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',

    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
};


function iconSVG(name) {

    return (
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        (ICON_PATHS[name] || ICON_PATHS.pin) +
        "</svg>"
    );
}
