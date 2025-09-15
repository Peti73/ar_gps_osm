const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const startBtn = document.getElementById('startBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let userLat = null, userLng = null;
let alpha = 0, beta = 0, gamma = 0;
const VERSION = "v1.0.4";

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
                        alpha = e.alpha || 0;
                        beta = e.beta || 0;
                        gamma = e.gamma || 0;
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

// ---------------- LatLng -> Web Mercator pixel ----------------
function latLngToPixelWebMercator(lat, lng, zoom) {
    const scale = tileSize * Math.pow(2, zoom);
    const x = (lng + 180)/360 * scale;
    const y = (1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 * scale;
    return {x, y};
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

    // --------- AR orientáció ---------
    const alphaRad = (alpha - 180) * Math.PI/180;
    const betaRad = beta * Math.PI/180;
    const gammaRad = gamma * Math.PI/180;

    ctx.rotate(-alphaRad);
    ctx.transform(1, Math.tan(-betaRad), Math.tan(gammaRad), 1, 0, 0);

    // Felhasználó pixel koordinátája
    const userPixel = latLngToPixelWebMercator(userLat, userLng, zoom);

    // Tile környezet: ±1 tile
    const centerX = Math.floor(userPixel.x / tileSize);
    const centerY = Math.floor(userPixel.y / tileSize);

    for(let dx=-1; dx<=1; dx++){
        for(let dy=-1; dy<=1; dy++){
            const tile = getTile(centerX+dx, centerY+dy, zoom);
            const tileX = (centerX+dx) * tileSize;
            const tileY = (centerY+dy) * tileSize;
            ctx.drawImage(tile, Math.round(tileX - userPixel.x), Math.round(tileY - userPixel.y), tileSize, tileSize);
        }
    }

    // POI rajzolása
    POIs.forEach(poi=>{
        const p = latLngToPixelWebMercator(poi.lat, poi.lng, zoom);
        const dx = p.x - userPixel.x;
        const dy = p.y - userPixel.y;
        ctx.beginPath();
        ctx.arc(Math.round(dx), Math.round(dy), 8, 0, 2*Math.PI);
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
