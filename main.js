// ==UserScript==
// @name         GeoFS-liveries-that-has-not-been-updated
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  add some liveries
// @author       chatGPT＆CP8888
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let panel, listContainer, searchInput, filterSelect;
    let data;
    let lastAircraftId = null;
    let currentList = [];
    let displayType = "all"; // Default to showing all liveries

    const jsonUrl = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json"; // raw json URL

    // ===== Wait for GeoFS to load =====
    const wait = setInterval(() => {
        if (window.geofs && (window.LiverySelector || geofs.aircraft?.instance)) {
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
        // Avoid creating the panel multiple times
        if (panel && document.body.contains(panel)) return;

        // Create the container for the livery selection panel
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
            flexDirection: "column",
            overflowY: "auto"
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

        // Filter by type (Real or Virtual)
        filterSelect = document.createElement("select");
        filterSelect.innerHTML = `
            <option value="all">All Liveries</option>
            <option value="real">Real Liveries</option>
            <option value="virtual">Virtual Liveries</option>
        `;
        filterSelect.onchange = (e) => {
            displayType = e.target.value;
            filterList();
        };
        panel.appendChild(filterSelect);

        // List Container (Scroll Area)
        listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
            marginTop: "8px",
            overflowY: "auto",
            flex: "1"
        });
        panel.appendChild(listContainer);

        // Append panel to the body
        document.body.appendChild(panel);
    }

    // ===== Apply Livery (With Fallback) =====
    function applyLivery(livery) {
        const id = geofs.aircraft.instance.id;

        // If LiverySelector exists, use it
        if (window.LiverySelector) {
            const airplane = window.LiverySelector.liveryobj.aircrafts[id];
            if (airplane) {
                console.log("Applying with LiverySelector:", livery.name);
                window.LiverySelector.loadLivery(
                    livery.texture,
                    airplane.index,
                    airplane.parts,
                    livery.materials
                );
                return;
            }
        }

        // Fallback: Apply directly using THREE.js
        console.log("Applying without LiverySelector:", livery.name);
        const aircraft = geofs.aircraft.instance;
        if (!aircraft || !livery.texture) return;

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

    // ===== Gradient Effect (Shine) =====
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

    // ===== Render Livery List (With Filter) =====
    function renderList(list) {
        listContainer.innerHTML = "";

        const fragment = document.createDocumentFragment(); // ⭐ Improve performance

        list.forEach(livery => {
            // Avoid crashes if data is missing
            if (!livery || !livery.name || !livery.texture) return;

            // If filter is applied, only show selected liveries
            if (displayType !== "all" && data.livery_types[livery.type_id] !== displayType) return;

            const div = document.createElement("div");
            div.innerHTML = `
                <div>${livery.name}</div>
                <div style="font-size:10px;">by: ${livery.credits || "Unknown"}</div>
                <div style="font-size:10px; color: gray;">(${data.livery_types[livery.type_id] === 'real' ? 'Real' : 'Virtual'})</div>
            `;
            Object.assign(div.style, {
                cursor: "pointer",
                marginTop: "6px",
                padding: "6px",
                borderRadius: "6px"
            });

            div.onclick = () => applyLivery(livery);

            // Hover background effect
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
                return matchKeyword;
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
                filterList();
            }
        }, 1000);
    }

    // ===== Handle SHIFT Key (UI Toggle) =====
    document.addEventListener("keydown", (e) => {
        if (e.key === "Shift") {
            panel.style.display = panel.style.display === "none" ? "flex" : "none";
        }
    });

})();
