// --- IMPORTATIONS ELECTRON & NODE.JS ---
const { spawn, exec } = require('child_process');
const { shell } = require('electron'); // Pour ouvrir le navigateur vers GitHub

// --- CONSTANTES & VARIABLES SYSTÈME ---
const APP_VERSION = "2.0.0"; // La version de ton app (à changer à chaque maj)
const GITHUB_OWNER = "mechkilla"; // ⚠️ À MODIFIER
const GITHUB_REPO = "simple_spoofer";       // ⚠️ À MODIFIER

let tunnelProcess = null;
let iphoneIP = null;
let iphonePort = null;
let isConnected = false;
let latestReleaseUrl = "";

// Variables Modes & Position
let currentMode = 'classic'; // 'classic', 'route', ou 'joystick'
let currentLat = 43.4385; // Fos-sur-Mer
let currentLon = 4.9451;

// Variables Trajet
let pointA = null;
let pointB = null;
let markerA = null;
let markerB = null;
let routeLine = null;
let isRouting = false;
let realRoutePoints = [];

// Variables Favoris
let favorites = JSON.parse(localStorage.getItem('fs_favorites')) || [];

document.addEventListener("DOMContentLoaded", () => {
    
    // --- CONNEXION UI ---
    const btnConnect = document.getElementById('btnConnect');
    const btnReset = document.getElementById('btnReset');
    const btnModeClassic = document.getElementById('btnModeClassic');
    const btnModeRoute = document.getElementById('btnModeRoute');
    const btnModeJoystick = document.getElementById('btnModeJoystick');
    
    const panelRoute = document.getElementById('panelRoute');
    const panelFavorites = document.getElementById('panelFavorites');
    const panelJoystick = document.getElementById('panelJoystick');
    
    const btnStartRoute = document.getElementById('btnStartRoute');
    const btnClearRoute = document.getElementById('btnClearRoute');
    const btnAddFav = document.getElementById('btnAddFav');
    const favoritesList = document.getElementById('favoritesList');
    const terminal = document.getElementById('terminal');
    
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const speedSliderJoy = document.getElementById('speedSliderJoy');
    const speedValueJoy = document.getElementById('speedValueJoy');

    const updateModal = document.getElementById('updateModal');
    const btnDownloadUpdate = document.getElementById('btnDownloadUpdate');
    const btnCloseUpdate = document.getElementById('btnCloseUpdate');

    function logMsg(msg, color="white") {
        terminal.innerHTML += `<br><span class="terminal-prefix">></span> <span style="color:${color}">${msg}</span>`;
        terminal.scrollTop = terminal.scrollHeight;
    }

    // --- CARTE LEAFLET ---
    var map = L.map('map', { zoomControl: false }).setView([currentLat, currentLon], 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var customIcon = L.divIcon({ className: '', html: "<div class='gps-marker'></div>", iconSize: [20, 20], iconAnchor: [10, 10] });
    var marker = L.marker([currentLat, currentLon], {icon: customIcon, zIndexOffset: 1000}).addTo(map);
    const iconA = L.divIcon({ className: '', html: "<div style='background:#2ecc71; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px #2ecc71;'></div>", iconSize: [16, 16], iconAnchor: [8, 8] });
    const iconB = L.divIcon({ className: '', html: "<div style='background:#e74c3c; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px #e74c3c;'></div>", iconSize: [16, 16], iconAnchor: [8, 8] });

    routeLine = L.polyline([], {color: '#c5a059', weight: 5, opacity: 0.8}).addTo(map);
    setTimeout(() => { map.invalidateSize(); }, 500);
    renderFavorites();

    // --- MOTEUR 1 : CONNEXION ---
    btnConnect.addEventListener('click', () => {
        btnConnect.disabled = true;
        btnConnect.innerText = "⏳ Analyse USB...";
        logMsg("Démarrage du tunnel sécurisé...", "yellow");

        tunnelProcess = spawn('python', ['-u', '-m', 'pymobiledevice3', 'remote', 'tunneld']);

        function handleTunnelOutput(data) {
            const output = data.toString();
            const match = output.match(/--rsd\s+([a-fA-F0-9:]+)\s+(\d+)/);
            
            if (match && !isConnected) {
                iphoneIP = match[1];
                iphonePort = match[2];
                isConnected = true;

                logMsg(`IP: ${iphoneIP} | Port: ${iphonePort}`, "#00ff00");
                exec(`python -m pymobiledevice3 mounter auto-mount --rsd ${iphoneIP} ${iphonePort}`, (error, stdout, stderr) => {
                    logMsg("🟢 Appareil Connecté !", "#00ff00");
                    btnConnect.style.display = "none"; 
                });
            }
        }
        tunnelProcess.stdout.on('data', handleTunnelOutput);
        tunnelProcess.stderr.on('data', handleTunnelOutput);
    });

    // --- MOTEUR 2 : GESTION DES MODES ---
    btnModeClassic.addEventListener('click', () => {
        currentMode = 'classic';
        btnModeClassic.classList.add('active'); btnModeRoute.classList.remove('active'); btnModeJoystick.classList.remove('active');
        panelRoute.style.display = 'none'; panelJoystick.style.display = 'none'; panelFavorites.style.display = 'block';
        clearRoute();
        logMsg("📍 Mode Classique : Clic gauche pour téléportation directe.", "gray");
    });

    btnModeRoute.addEventListener('click', () => {
        currentMode = 'route';
        btnModeRoute.classList.add('active'); btnModeClassic.classList.remove('active'); btnModeJoystick.classList.remove('active');
        panelRoute.style.display = 'block'; panelFavorites.style.display = 'none'; panelJoystick.style.display = 'none';
        logMsg("🛣️ Mode Trajet : Clic 1 = Départ (A), Clic 2 = Arrivée (B).", "gray");
    });

    btnModeJoystick.addEventListener('click', () => {
        currentMode = 'joystick';
        btnModeJoystick.classList.add('active'); btnModeClassic.classList.remove('active'); btnModeRoute.classList.remove('active');
        panelJoystick.style.display = 'block'; panelRoute.style.display = 'none'; panelFavorites.style.display = 'none';
        clearRoute();
        logMsg("🕹️ Mode Joystick : Utilisez ZQSD ou les flèches du clavier.", "var(--fs-accent-gold)");
    });

    // Animation Jauges
    speedSlider.addEventListener('input', (e) => {
        let val = e.target.value;
        let icon = val > 100 ? "✈️" : val > 40 ? "🚗" : val > 10 ? "🚴" : "🚶";
        speedValue.innerText = `${icon} ${val} km/h`;
    });
    
    speedSliderJoy.addEventListener('input', (e) => {
        let val = e.target.value;
        let icon = val > 100 ? "✈️" : val > 40 ? "🚗" : val > 10 ? "🚴" : "🚶";
        speedValueJoy.innerText = `${icon} ${val} km/h`;
    });

    // --- MOTEUR 3 : CLIC SUR CARTE ---
    map.on('click', async function(e) {
        if (currentMode === 'classic') {
            currentLat = e.latlng.lat;
            currentLon = e.latlng.lng;
            marker.setLatLng(e.latlng);
            map.panTo(e.latlng);
            
            if (isConnected) {
                logMsg(`🚀 Téléportation vers ${currentLat.toFixed(4)}...`, "yellow");
                exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${currentLat} ${currentLon}`);
            } else {
                logMsg(`📍 Clic: ${currentLat.toFixed(4)}, ${currentLon.toFixed(4)}`);
            }
        } 
        else if (currentMode === 'route') {
            if (isRouting) return logMsg("❌ Trajet en cours, impossible de modifier.", "red");

            if (!pointA || (pointA && pointB)) {
                clearRoute();
                pointA = e.latlng;
                markerA = L.marker(pointA, {icon: iconA}).addTo(map);
                logMsg(`📍 Point de Départ (A) placé.`, "#2ecc71");
            } 
            else if (!pointB) {
                pointB = e.latlng;
                markerB = L.marker(pointB, {icon: iconB}).addTo(map);
                logMsg(`📍 Point d'Arrivée (B) placé. Calcul de la route...`, "yellow");
                
                try {
                    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pointA.lng},${pointA.lat};${pointB.lng},${pointB.lat}?geometries=geojson`);
                    const data = await response.json();
                    
                    if (data.routes && data.routes.length > 0) {
                        realRoutePoints = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                        routeLine.setLatLngs(realRoutePoints);
                        let distanceKm = (data.routes[0].distance / 1000).toFixed(2);
                        logMsg(`🛣️ Route trouvée ! Distance réelle : ${distanceKm} km.`, "#c5a059");
                    } else {
                        logMsg("❌ Aucune route trouvée. (Océan ?)", "red");
                        pointB = null;
                        map.removeLayer(markerB);
                    }
                } catch(err) {
                    logMsg("❌ Erreur du serveur OSRM.", "red");
                }
            }
        }
        else if (currentMode === 'joystick') {
            // En mode joystick, un clic téléporte aussi (pratique pour se placer avant de marcher)
            currentLat = e.latlng.lat;
            currentLon = e.latlng.lng;
            marker.setLatLng(e.latlng);
            map.panTo(e.latlng);
            if (isConnected) {
                exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${currentLat} ${currentLon}`);
            }
        }
    });

    // --- MOTEUR 4 : TRAJET ---
    function clearRoute() {
        isRouting = false;
        if (markerA) map.removeLayer(markerA);
        if (markerB) map.removeLayer(markerB);
        pointA = null; pointB = null;
        realRoutePoints = [];
        routeLine.setLatLngs([]);
        btnStartRoute.innerText = "▶️ Démarrer Trajet";
        btnStartRoute.style.background = "#c5a059";
    }

    btnClearRoute.addEventListener('click', () => { clearRoute(); logMsg("🗑️ Itinéraire annulé.", "gray"); });

    btnStartRoute.addEventListener('click', async () => {
        if (!isConnected) return logMsg("❌ Connecte d'abord l'iPhone !", "red");
        if (realRoutePoints.length === 0) return logMsg("❌ Calcule d'abord une route (Points A et B).", "red");
        
        if (isRouting) {
            isRouting = false;
            btnStartRoute.innerText = "▶️ Reprendre";
            btnStartRoute.style.background = "#c5a059";
            logMsg("⏸️ Trajet en pause.", "yellow");
            return;
        }

        isRouting = true;
        btnStartRoute.innerText = "⏸️ Pause Trajet";
        btnStartRoute.style.background = "#e67e22";

        marker.setLatLng(pointA);
        map.panTo(pointA);
        exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${pointA.lat} ${pointA.lng}`);

        setTimeout(async () => {
            if (!isRouting) return;
            logMsg("🚶‍♂️ En route ! (Suivi des rues en temps réel)", "#3498db");

            for (let i = 1; i < realRoutePoints.length; i++) {
                if (!isRouting) break;
                
                let curLat = marker.getLatLng().lat;
                let curLon = marker.getLatLng().lng;
                let destLat = realRoutePoints[i][0];
                let destLon = realRoutePoints[i][1];

                await moveToPoint(curLat, curLon, destLat, destLon);
            }
            
            if(isRouting) {
                isRouting = false;
                btnStartRoute.innerText = "▶️ Démarrer Trajet";
                btnStartRoute.style.background = "#c5a059";
                logMsg("🏁 Arrivé à destination !", "#00ff00");
                marker.setLatLng(pointB);
                currentLat = pointB.lat;
                currentLon = pointB.lng;
            }
        }, 2000);
    });

    function getDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; 
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function moveToPoint(startLat, startLon, endLat, endLon) {
        return new Promise((resolve) => {
            let distKm = getDistanceKm(startLat, startLon, endLat, endLon);
            if (distKm < 0.001) return resolve(); 

            let speedKmh = parseFloat(speedSlider.value); 
            let timeSeconds = distKm / (speedKmh / 3600); 
            let fps = 10; 
            let totalFrames = Math.max(1, Math.floor(timeSeconds * fps));

            let dLat = (endLat - startLat) / totalFrames;
            let dLon = (endLon - startLon) / totalFrames;

            let frame = 0;
            let lastPythonUpdate = 0;
            let curLat = startLat;
            let curLon = startLon;

            function step() {
                if (!isRouting) return resolve(); 

                curLat += dLat;
                curLon += dLon;

                marker.setLatLng([curLat, curLon]);
                map.panTo([curLat, curLon], {animate: false});

                let now = Date.now();
                if (now - lastPythonUpdate > 3000) { 
                    lastPythonUpdate = now;
                    exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${curLat} ${curLon}`);
                }

                frame++;
                if (frame < totalFrames) {
                    setTimeout(step, 1000 / fps);
                } else {
                    exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${endLat} ${endLon}`);
                    resolve();
                }
            }
            step(); 
        });
    }

    // --- MOTEUR 5 : FAVORIS ---
    function renderFavorites() {
        favoritesList.innerHTML = '';
        if (favorites.length === 0) {
            favoritesList.innerHTML = '<span style="color:gray; font-size:11px;">Aucun favori enregistré.</span>';
            return;
        }

        favorites.forEach((fav, index) => {
            let div = document.createElement('div');
            div.className = 'fav-item';
            div.innerHTML = `<span class="fav-name">📍 ${fav.name}</span> <span class="fav-delete">X</span>`;
            
            div.querySelector('.fav-name').addEventListener('click', () => {
                if(currentMode !== 'classic') btnModeClassic.click();
                currentLat = fav.lat;
                currentLon = fav.lon;
                marker.setLatLng([fav.lat, fav.lon]);
                map.panTo([fav.lat, fav.lon]);
                if(isConnected) {
                    logMsg(`⭐ Téléportation vers favori: ${fav.name}...`, "yellow");
                    exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${fav.lat} ${fav.lon}`);
                }
            });

            div.querySelector('.fav-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                favorites.splice(index, 1);
                localStorage.setItem('fs_favorites', JSON.stringify(favorites));
                renderFavorites();
                logMsg("🗑️ Favori supprimé.", "gray");
            });

            favoritesList.appendChild(div);
        });
    }

    btnAddFav.addEventListener('click', () => {
        let name = prompt("Nom de ce favori (ex: Maison, Tour Eiffel) :");
        if (name) {
            favorites.push({ name: name, lat: currentLat, lon: currentLon });
            localStorage.setItem('fs_favorites', JSON.stringify(favorites));
            renderFavorites();
            logMsg(`⭐ Favori "${name}" enregistré !`, "#c5a059");
        }
    });

    // --- MOTEUR 6 : RESET ---
    btnReset.addEventListener('click', () => {
        if (!isConnected) return;
        clearRoute();
        logMsg("⏳ Restauration du GPS...", "yellow");
        exec(`python -m pymobiledevice3 developer dvt simulate-location clear --rsd ${iphoneIP} ${iphonePort}`, (error) => {
            if (!error) logMsg(`🟢 Signal GPS réel restauré.`, "#00ff00");
        });
    });

    // --- MOTEUR 7 : CHECKER DE MISE À JOUR GITHUB ---
    async function checkForUpdates() {
        logMsg("Vérification des serveurs French-Studio...", "gray");
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
            if (!response.ok) throw new Error("Aucune release trouvée");
            const data = await response.json();
            
            const serverVersion = data.tag_name.replace('v', '');
            
            if (serverVersion !== APP_VERSION) {
                logMsg(`✨ Mise à jour v${serverVersion} disponible sur GitHub !`, "var(--fs-accent-gold)");
                document.getElementById('newVersionNumber').innerText = "v" + serverVersion;
                latestReleaseUrl = data.html_url; 
                if (updateModal) updateModal.style.display = 'flex'; 
            } else {
                logMsg("✔️ French-Studio est à la dernière version.", "#2ecc71");
            }
        } catch (error) {
            logMsg("⚠️ Serveur de mise à jour injoignable.", "gray");
        }
    }

    if (updateModal) {
        setTimeout(checkForUpdates, 2000); 
        btnCloseUpdate.addEventListener('click', () => { updateModal.style.display = 'none'; });
        btnDownloadUpdate.addEventListener('click', () => {
            if (latestReleaseUrl) shell.openExternal(latestReleaseUrl); 
            updateModal.style.display = 'none';
        });
    }

    // --- MOTEUR 8 : JOYSTICK CLAVIER ---
    const METERS_PER_DEGREE_LAT = 111320; 
    let activeKeys = { up: false, down: false, left: false, right: false };
    let joystickLoop = null;
    let lastJoystickUpdate = 0;

    window.addEventListener('keydown', (e) => {
        if (currentMode !== 'joystick' || e.target.tagName === 'INPUT') return;
        const key = e.key.toLowerCase();
        
        if (['w', 'z', 'arrowup'].includes(key)) activeKeys.up = true;
        if (['s', 'arrowdown'].includes(key)) activeKeys.down = true;
        if (['a', 'q', 'arrowleft'].includes(key)) activeKeys.left = true;
        if (['d', 'arrowright'].includes(key)) activeKeys.right = true;

        if (!joystickLoop && (activeKeys.up || activeKeys.down || activeKeys.left || activeKeys.right)) {
            startJoystickLoop();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (currentMode !== 'joystick') return;
        const key = e.key.toLowerCase();
        
        if (['w', 'z', 'arrowup'].includes(key)) activeKeys.up = false;
        if (['s', 'arrowdown'].includes(key)) activeKeys.down = false;
        if (['a', 'q', 'arrowleft'].includes(key)) activeKeys.left = false;
        if (['d', 'arrowright'].includes(key)) activeKeys.right = false;

        if (!activeKeys.up && !activeKeys.down && !activeKeys.left && !activeKeys.right) {
            stopJoystickLoop();
        }
    });

    function startJoystickLoop() {
        joystickLoop = setInterval(() => {
            let speedKmh = parseFloat(speedSliderJoy.value);
            let speedMs = speedKmh / 3.6; 
            let stepMeters = speedMs * 0.1; 

            let dLat = 0;
            let dLon = 0;
            let metersPerDegreeLon = Math.cos(currentLat * Math.PI / 180) * 111320;

            if (activeKeys.up) dLat += stepMeters / METERS_PER_DEGREE_LAT;
            if (activeKeys.down) dLat -= stepMeters / METERS_PER_DEGREE_LAT;
            if (activeKeys.right) dLon += stepMeters / metersPerDegreeLon;
            if (activeKeys.left) dLon -= stepMeters / metersPerDegreeLon;

            if (dLat !== 0 || dLon !== 0) {
                currentLat += dLat;
                currentLon += dLon;
                
                marker.setLatLng([currentLat, currentLon]);
                map.panTo([currentLat, currentLon], {animate: false});

                let now = Date.now();
                if (now - lastJoystickUpdate > 3000 && isConnected) {
                    lastJoystickUpdate = now;
                    exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${currentLat} ${currentLon}`);
                }
            }
        }, 100);
    }

    function stopJoystickLoop() {
        clearInterval(joystickLoop);
        joystickLoop = null;
        if (isConnected) {
            exec(`python -m pymobiledevice3 developer dvt simulate-location set --rsd ${iphoneIP} ${iphonePort} ${currentLat} ${currentLon}`);
            lastJoystickUpdate = Date.now();
        }
    }
});