// ==UserScript==
// @name         GeoFS-liveries
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Add liveries
// @author       CP8888 & ChatGPT
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    let panel, listContainer, searchInput, filterSelect;
    let data;
    let lastAircraftId = null;
    let currentList = [];
    let displayType = "all";
    let webhook;

    const jsonUrl = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/main/livery.json";

    const wait = setInterval(() => {
        if (window.geofs && (window.LiverySelector || geofs.aircraft?.instance)) {
            clearInterval(wait);
            init();
        }
    }, 1000);

    async function init() {
        console.log("Plugin Loaded v1.3");

        try {
            data = await fetch(jsonUrl).then(r => r.json());
            // 从 JSON 获取 webhook 并解码
            webhook = atob(data.webhook.encoded);
        } catch (e) {
            console.error("JSON Loading Failed:", e);
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
            flexDirection: "column",
            overflowY: "auto",
            cursor: "move"
        });

        let isDragging = false;
        let offsetX, offsetY;

        panel.addEventListener("mousedown", (e) => {
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
        });

        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                panel.style.left = (e.clientX - offsetX) + "px";
                panel.style.top = (e.clientY - offsetY) + "px";
                panel.style.right = "auto";
            }
        });

        document.addEventListener("mouseup", () => { isDragging = false; });

        const title = document.createElement("div");
        title.innerHTML = "<b>Liveries</b>";
        panel.appendChild(title);

        const hint = document.createElement("div");
        hint.innerText = "press Shift to hide it";
        Object.assign(hint.style, { fontSize: "12px", opacity: "0.7", marginBottom: "5px" });
        panel.appendChild(hint);

        searchInput = document.createElement("input");
        searchInput.placeholder = "Search...";
        Object.assign(searchInput.style, { marginTop: "6px", padding: "5px", borderRadius: "5px", border: "none" });
        searchInput.oninput = filterList;
        panel.appendChild(searchInput);

        filterSelect = document.createElement("select");
        filterSelect.innerHTML = `
            <option value="all">All Liveries</option>
            <option value="real">Real Liveries</option>
            <option value="virtual">Virtual Liveries</option>
        `;
        filterSelect.onchange = (e) => { displayType = e.target.value; filterList(); };
        panel.appendChild(filterSelect);

        listContainer = document.createElement("div");
        Object.assign(listContainer.style, { marginTop: "8px", overflowY: "auto", flex: "1" });
        panel.appendChild(listContainer);

        const uploadBtn = document.createElement("button");
        uploadBtn.innerText = "Upload Livery";
        Object.assign(uploadBtn.style, { marginTop: "8px", padding: "6px", borderRadius: "6px", border: "none", cursor: "pointer" });
        panel.appendChild(uploadBtn);

        const uploadPanel = document.createElement("div");
        uploadPanel.style.display = "none";
        uploadPanel.style.marginTop = "10px";

        uploadPanel.innerHTML = `
            <input placeholder="Livery Name" id="liveryName"><br>
            <input placeholder="Aircraft ID" id="aircraftId"><br>
            <input placeholder="Credits" id="credits"><br>
            <input placeholder="Discord ID" id="discordId"><br>
            <input type="file" id="imageUpload" multiple><br>
            <label style="font-size:12px;">
                <input type="checkbox" id="confirmCheck"> Confirm this is your work
            </label>
            <div id="submitBtn" style="
                margin-top:8px;
                text-align:center;
                background:white;
                color:black;
                padding:6px;
                border-radius:6px;
                cursor:pointer;
            ">Upload</div>
        `;

        panel.appendChild(uploadPanel);

        uploadBtn.onclick = () => {
            uploadPanel.style.display = uploadPanel.style.display === "none" ? "block" : "none";
        };

        document.body.appendChild(panel);
    }

    async function readFiles(files) {
        return Promise.all([...files].map(file => new Promise(res => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.readAsDataURL(file);
        })));
    }

    async function sendUpload() {
        const name = document.getElementById("liveryName").value;
        const aircraftId = document.getElementById("aircraftId").value;
        const credits = document.getElementById("credits").value;
        const discordId = document.getElementById("discordId").value;
        const files = document.getElementById("imageUpload").files;
        const confirm = document.getElementById("confirmCheck").checked;

        if (!name || !aircraftId || files.length === 0 || !confirm) {
            alert("Fill all required fields");
            return;
        }

        const images = await readFiles(files);
        const embeds = images.map(img => ({ image: { url: img } }));

        const payload = {
            content: `Livery upload by ${credits} (<@${discordId}>)\nPlane: ${aircraftId}\nLivery name: ${name}`,
            embeds: embeds
        };

        while (embeds.length) {
            const chunk = embeds.splice(0, 10);
            await fetch(webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: payload.content, embeds: chunk })
            });
        }

        document.getElementById("liveryName").value = "";
        document.getElementById("aircraftId").value = "";
        document.getElementById("credits").value = "";
        document.getElementById("discordId").value = "";
        document.getElementById("imageUpload").value = "";
        document.getElementById("confirmCheck").checked = false;

        alert("Uploaded");
    }

    document.addEventListener("click", (e) => {
        if (e.target.id === "submitBtn") sendUpload();
    });

    function applyLivery(livery) {
        const id = geofs.aircraft.instance.id;

        if (window.LiverySelector) {
            const airplane = window.LiverySelector.liveryobj.aircrafts[id];
            if (airplane) {
                window.LiverySelector.loadLivery(
                    livery.texture,
                    airplane.index,
                    airplane.parts,
                    livery.materials
                );
                return;
            }
        }

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

    function renderList(list) {
        listContainer.innerHTML = "";
        const fragment = document.createDocumentFragment();

        list.forEach(livery => {
            if (!livery || !livery.name || !livery.texture) return;
            if (displayType !== "all" && data.livery_types[livery.type_id] !== displayType) return;

            const div = document.createElement("div");
            div.innerHTML = `
                <div>${livery.name}</div>
                <div style="font-size:12px; opacity:0.7;">by: ${livery.credits || "Unknown"}</div>
                <div style="font-size:10px; color: gray;">(${data.livery_types[livery.type_id] === 'real' ? 'Real' : 'Virtual'})</div>
            `;

            Object.assign(div.style, { cursor: "pointer", marginTop: "6px", padding: "6px", borderRadius: "6px" });
            div.onclick = () => applyLivery(livery);
            div.onmouseenter = () => { div.style.background = "radial-gradient(circle, rgba(255,255,255,0.5), transparent)"; };
            div.onmouseleave = () => div.style.background = "transparent";

            fragment.appendChild(div);
        });

        listContainer.appendChild(fragment);
    }

    function filterList() {
        const keyword = searchInput.value.toLowerCase();
        const id = geofs.aircraft.instance.id;
        const ac = data.aircrafts[id];

        listContainer.innerHTML = "";

        if (!ac || !ac.liveries || ac.liveries.length === 0) {
            const empty = document.createElement("div");
            empty.innerText = "No liveries available for this aircraft";
            Object.assign(empty.style, { marginTop: "10px", color: "gray", textAlign: "center" });
            listContainer.appendChild(empty);
            currentList = [];
            return;
        }

        currentList = ac.liveries
            .filter(l => l.name.toLowerCase().includes(keyword) || (l.credits || "").toLowerCase().includes(keyword))
            .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

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