// ==UserScript==
// @name         GeoFS-liveries-that-has-not-been-updated
// @match        *://*.geofs.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let panel, listContainer, searchInput, favoriteBtn;
    let data;
    let lastAircraftId = null;
    let currentList = [];
    let showFavoritesOnly = false;
    const favorites = {}; // {aircraftId: Set of livery names}

    const jsonUrl = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json"; // Make sure this is the raw URL

    // ===== Wait for GeoFS =====
    const wait = setInterval(() => {
        if (window.geofs && window.LiverySelector && geofs.aircraft?.instance) {
            clearInterval(wait);
            init();
        }
    }, 1000);

    async function init() {
        console.log("✅ Plugin Loaded");

        try {
            data = await fetch(jsonUrl).then(r => r.json());
        } catch (e) {
            console.error("JSON Loading Failed:", e);
            return;
        }

        createUI();
        startLoop();
    }

    // ===== Create UI =====
    function createUI() {
        if (panel && document.body.contains(panel)) return;

        panel = document.createElement("div");
        Object.assign(panel.style, {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "280px",
            height: "420px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "10px",
            borderRadius: "10px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column"
        });

        // Title
        const title = document.createElement("div");
        title.innerHTML = "<b>Liveries</b>";
        panel.appendChild(title);

        // Search Box
        searchInput = document.createElement("input");
        searchInput.placeholder = "Search...";
        Object.assign(searchInput.style, {
            marginTop: "6px",
            padding: "5px",
            borderRadius: "5px",
            border: "none"
        });
        searchInput.oninput = filterList;
        panel.appendChild(searchInput);

        // Favorites Toggle Button
        favoriteBtn = document.createElement("button");
        favoriteBtn.textContent = "Show Favorites: OFF";
        favoriteBtn.style.marginTop = "6px";
        favoriteBtn.onclick = () => {
            showFavoritesOnly = !showFavoritesOnly;
            favoriteBtn.textContent = `Show Favorites: ${showFavoritesOnly ? "ON" : "OFF"}`;
            filterList();
        };
        panel.appendChild(favoriteBtn);

        // List Container (Scroll Area)
        listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
            marginTop: "8px",
            overflowY: "auto",
            flex: "1"
        });
        panel.appendChild(listContainer);

        document.body.appendChild(panel);
    }

    // ===== Apply Livery (with Fallback) =====
    function applyLivery(livery) {

        const id = geofs.aircraft.instance.id;
        const airplane = window.LiverySelector?.liveryobj?.aircrafts[id];

        if (airplane) {
            // Official LiverySelector
            window.LiverySelector.loadLivery(
                livery.texture,
                airplane.index,
                airplane.parts,
                livery.materials
            );
            console.log("Official Apply");
        } else {
            // Fallback method
            console.log("Fallback Apply");
            const aircraft = geofs.aircraft.instance;

            let i = 0;
            aircraft.object3d.traverse((child) => {
                if (child.material && child.material.map && livery.texture[i]) {
                    const tex = new THREE.TextureLoader().load(livery.texture[i]);
                    child.material.map = tex;
                    child.material.needsUpdate = true;
                    i++;
                }
            });
        }
    }

    // ===== Gradient Effect =====
    function addShineEffect(el) {
        const shine = document.createElement("div");
        Object.assign(shine.style, {
            position: "absolute", top: "0", left: "0",
            width: "100%", height: "100%",
            pointerEvents: "none", opacity: "0", transition: "0.2s"
        });
        el.style.position = "relative";
        el.style.overflow = "hidden";
        el.appendChild(shine);
        el.addEventListener("mousemove", (e) => {
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            shine.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.5), transparent 60%)`;
        });
        el.onmouseenter = () => shine.style.opacity = "1";
        el.onmouseleave = () => shine.style.opacity = "0";
    }

    // ===== Render List =====
    function renderList(list) {
        listContainer.innerHTML = "";

        const fragment = document.createDocumentFragment(); // ⭐ Improve performance

        list.forEach(livery => {
            // Avoid crashes if data is missing
            if (!livery || !livery.name || !livery.texture) return;

            const div = document.createElement("div");
            div.innerHTML = `
                <div>${livery.name}</div>
                <div style="font-size:10px;">by: ${livery.credits || "Unknown"}</div>
            `;
            Object.assign(div.style, {
                cursor: "pointer",
                marginTop: "6px",
                padding: "6px",
                borderRadius: "6px"
            });

            div.onclick = () => applyLivery(livery);

            // Hover background
            div.onmouseenter = () => div.style.background = "rgba(255,255,255,0.1)";
            div.onmouseleave = () => div.style.background = "transparent";

            // Add gradient effect (only for a small number of liveries)
            if (list.length < 30) {
                addShineEffect(div);
            }

            // Add to fragment for better performance
            fragment.appendChild(div);
        });

        listContainer.appendChild(fragment);
    }

    // ===== Filter List (Search) =====
    function filterList() {
        const keyword = searchInput.value.toLowerCase();
        const id = geofs.aircraft.instance.id;
        const ac = data.aircrafts[id];
        if (!ac) return;

        currentList = ac.liveries
            .filter(l => {
                const matchKeyword = l.name.toLowerCase().includes(keyword) || (l.credits || "").toLowerCase().includes(keyword);
                const matchFav = !showFavoritesOnly || (favorites[id]?.has(l.name));
                return matchKeyword && matchFav;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        renderList(currentList);
    }

    // ===== Main Loop (for updates) =====
    function startLoop() {
        setInterval(() => {
            if (!panel || !document.body.contains(panel)) createUI();

            const id = geofs.aircraft.instance.id;
            if (id !== lastAircraftId) {
                lastAircraftId = id;
                searchInput.value = "";
                showFavoritesOnly = false;
                favoriteBtn.textContent = "Show Favorites: OFF";
                filterList();
            }
        }, 1000);
    }

    // ===== Handle ALT Key (UI Toggle) =====
    document.addEventListener("keydown", (e) => {
        if (e.key === "Alt") {
            panel.style.display = panel.style.display === "none" ? "flex" : "none";
        }
    });

})();
