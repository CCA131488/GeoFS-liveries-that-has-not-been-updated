// ==UserScript==
// @name         GeoFS liveries that has not been updated
// @author       CP8888
// @match        https://geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let panel, listContainer, searchInput;
    let data;
    let lastAircraftId = null;
    let currentList = [];

    const jsonUrl = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries-that-has-not-been-updated/main/livery.json";

    const wait = setInterval(() => {
        if (window.geofs && window.LiverySelector && geofs.aircraft?.instance) {
            clearInterval(wait);
            init();
        }
    }, 1000);

    async function init() {
        console.log("✅ Ultimate Plugin Loaded");
        try {
            data = await fetch(jsonUrl).then(r => r.json());
        } catch (e) {
            console.error("Failed to load JSON", e);
            return;
        }
        createUI();
        startLoop();
    }

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

        const title = document.createElement("div");
        title.innerHTML = "<b>Liveries</b>";
        panel.appendChild(title);

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

        listContainer = document.createElement("div");
        Object.assign(listContainer.style, {
            marginTop: "8px",
            overflowY: "auto",
            flex: "1"
        });
        panel.appendChild(listContainer);

        document.body.appendChild(panel);
    }

    function applyLivery(livery) {
        const id = geofs.aircraft.instance.id;
        const airplane = window.LiverySelector.liveryobj.aircrafts[id];
        if (!airplane) return;
        window.LiverySelector.loadLivery(
            livery.texture,
            airplane.index,
            airplane.parts,
            livery.materials
        );
        console.log("Applied livery:", livery.name);
    }

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

    function renderList(list) {
        listContainer.innerHTML = "";
        list.forEach(livery => {
            const div = document.createElement("div");
            div.innerHTML = `
                <div>${livery.name}</div>
                <div style="font-size:10px;">by: ${livery.credits}</div>
            `;
            Object.assign(div.style, {
                cursor: "pointer",
                marginTop: "6px",
                padding: "6px",
                borderRadius: "6px"
            });

            div.onclick = () => applyLivery(livery);
            div.onmouseenter = () => div.style.background = "rgba(255,255,255,0.1)";
            div.onmouseleave = () => div.style.background = "transparent";

            addShineEffect(div);

            listContainer.appendChild(div);
        });
    }

    function filterList() {
        const keyword = searchInput.value.toLowerCase();
        const id = geofs.aircraft.instance.id;
        const ac = data.aircrafts[id];
        if (!ac) return;

        currentList = ac.liveries
            .filter(l => l.name.toLowerCase().includes(keyword) || (l.credits || "").toLowerCase().includes(keyword))
            .sort((a, b) => a.name.localeCompare(b.name));

        renderList(currentList);
    }

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

    document.addEventListener("keydown", (e) => {
        if (e.key === "Shift") {
            panel.style.display = panel.style.display === "none" ? "flex" : "none";
        }
    });

})();