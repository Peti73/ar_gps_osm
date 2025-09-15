const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const startBtn = document.getElementById('startBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let userLat = null, userLng = null;
let alpha = 0, beta = 0, gamma = 0;
const VERSION = "v1.0.44";

const zoom = 16;
const tileSize = 256;
const tiles = {}; // cache

// POI példa
const POIs = [
    { lat: 47.4979, lng: 19.0402 },
    { lat: 47.4985, lng: 19.0390 }
];

// ---------------- Kamera ----------------
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        await video.play();
    } catch (err) {
        console.error("Kamera hiba:", err);
    }
}

// ---------------- GPS + Giroszkóp ----------------
function startSensors() {
    // GPS
    navigator.geolocation.watchPosition(
        pos => { 
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            updateInfo();
        },
        err => console.error("GPS hiba:", err),
        { enableHighAccuracy: true }
    );

    // Giroszkóp
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(state => {
                if(state==='granted'){
                    window.addEventListener('deviceorientation', e => {
                        alpha = e.alpha || 0;   // compass
                        beta = e.beta || 0;     // pitch
                        gamma = e.gamma || 0;   // roll
                        updateInfo();
                    });
                    startBtn.style.display = 'none';
                } else alert("Girosszkóp engedély megtagadva");
            }).catch(console.error);
    } else {
        window.addEventListener('deviceorientation', e => {
            alpha = e.alpha || 0;
            beta = e.beta || 0;
            gamma = e.gamma || 0;
            updateInfo();
        });
        startBtn.style.display = 'none';
    }
}

// ---------------- Info frissítés ----------------
function updateInfo() {
    info.innerHTML = `
        Lat: ${userLat !== null ? userLat.toFixed(6) : '...'}<br>
        Lng: ${userLng !== null ? userLng.toFixed(6) : '...'}<br>
        Alpha: ${alpha.toFixed(1)}°<br>
        Beta: ${beta.toFixed(1)}°<br>
        Gamma: ${gamma.toFixed(1)}°<br>
        Version: ${VERSION}
    `;
}

// ---------------- Tile koordináták ----------------
function long2tile(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat, zoom) { 
    return Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 * Math.pow(2, zoom));
}

// ---------------- Tile betöltés ----------------
function getTile(x, y, z) {
    const key = `${z}_${x}_${y}`;
    if(tiles[key]) return tiles[key];
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    tiles[key] = img;
    return img;
}

// ---------------- GPS -> pixel ----------------
function latLngToPixel(lat, lng, centerLat, centerLng) {
    const dx = (lng - centerLng) * 111320 * Math.cos(centerLat*Math.PI/180);
    const dy = (lat - centerLat) * 110540;
    return { x: dx, y: -dy };
}

// ---------------- Rajzolás ----------------
function drawARMap() {
    if(userLat===null || userLng===null){
        requestAnimationFrame(drawARMap);
        return;
    }

    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);

    // --------- Helyes orientáció ---------
    const alphaRad = (alpha - 180) * Math.PI/180; // 180° = észak
    const gammaRad = gamma * Math.PI/180;         // roll

    ctx.rotate(-alphaRad);                 // forgatás horizont síkban
    ctx.transform(1, 0, Math.tan(gammaRad), 1, 0, 0); // oldalirányú dőlés

    // Középső tile koordináták
    const centerX = long2tile(userLng, zoom);
    const centerY = lat2tile(userLat, zoom);

    // 3x3 tile környezet
    for(let dx=-1; dx<=1; dx++){
        for(let dy=-1; dy<=1; dy++){
            const tile = getTile(centerX+dx, centerY+dy, zoom);
            const latTile = (180/Math.PI)*Math.atan(Math.sinh(Math.PI*(1-2*(centerY+dy)/Math.pow(2,zoom))));
            const lngTile = (centerX+dx)/Math.pow(2,zoom)*360-180;
            const p = latLngToPixel(latTile, lngTile, userLat, userLng);
            ctx.drawImage(tile, p.x - tileSize/2, p.y - tileSize/2, tileSize, tileSize);
        }
    }

    // POI rajzolása
    POIs.forEach(poi=>{
        const p = latLngToPixel(poi.lat, poi.lng, userLat, userLng);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, 2*Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(drawARMap);
}

// ---------------- Start ----------------
startBtn.addEventListener('click', async () => {
    await startCamera();
    startSensors();
    drawARMap();
});
