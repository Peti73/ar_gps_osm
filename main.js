const video = document.getElementById('camera');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const startBtn = document.getElementById('startBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let userLat = null, userLng = null;
let alpha = 0, beta = 0, gamma = 0;
const VERSION = "v1.0.31";

// POI példa
const POIs = [
    { lat: 47.4979, lng: 19.0402 }, // Budapest példa
    { lat: 47.4985, lng: 19.0390 }
];

// Tile méretezés
const tileSize = 256;
const zoom = 16;
const metersPerTile = 150; // approx zoom16
const metersPerPixel = metersPerTile / tileSize;

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

// ---------------- Térkép koordináta -> pixel ----------------
function latLngToPixel(lat, lng) {
    const dxMeters = (lng - userLng) * 111320 * Math.cos(userLat * Math.PI/180);
    const dyMeters = (lat - userLat) * 110540;
    return { x: dxMeters / metersPerPixel, y: -dyMeters / metersPerPixel };
}

// ---------------- Rajzolás ----------------
function drawARMap() {
    if(userLat===null || userLng===null) {
        requestAnimationFrame(drawARMap);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);

    // Giroszkóp forgatás (alpha = irány, beta/pitch, gamma/roll)
    const alphaRad = (alpha||0) * Math.PI/180;
    const betaRad = (beta||0) * Math.PI/180;
    const gammaRad = (gamma||0) * Math.PI/180;

    ctx.rotate(-alphaRad); // az irány ellenkezője
    ctx.transform(1, Math.tan(-betaRad), Math.tan(-gammaRad), 1, 0, 0);

    // POI rajzolása
    POIs.forEach(poi=>{
        const p = latLngToPixel(poi.lat, poi.lng);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, 2*Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
    });

    ctx.restore();
    requestAnimationFrame(drawARMap);
}

// ---------------- Start gomb ----------------
startBtn.addEventListener('click', async () => {
    await startCamera();
    startSensors();
    drawARMap();
});
