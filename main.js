// -------------------- CAMERA SETUP --------------------
const video = document.getElementById('camera');
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Kamera bekapcsolása
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error("Kamera hiba:", err));

// -------------------- CANVAS RESIZE --------------------
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// -------------------- GPS --------------------
let userLat = null, userLng = null;
navigator.geolocation.watchPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
}, err => console.error("GPS hiba:", err), { enableHighAccuracy: true });

// -------------------- GIROSZKÓP / ORIENTATION --------------------
let alpha = 0, beta = 0, gamma = 0;

const enableBtn = document.getElementById('enableOrientation');
enableBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    enableBtn.style.display = 'none';
                } else {
                    alert('Permission denied for Device Orientation');
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
        enableBtn.style.display = 'none';
    }
});

function handleOrientation(e) {
    alpha = e.alpha || 0;
    beta = e.beta || 0;
    gamma = e.gamma || 0;
}

// -------------------- OSM TILE HELPERS --------------------
const zoom = 16;
const tileSize = 256;
const tileRange = 1; // 3x3 tile
const tilesCache = {};

function latLngToTile(lat, lng, zoom) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
}

// -------------------- DRAW MULTI TILE + INFO --------------------
function drawTiles() {
    if (userLat === null || userLng === null) return;

    const centerTile = latLngToTile(userLat, userLng, zoom);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(-alpha * Math.PI / 180); // giroszkóp irány

    for (let dx = -tileRange; dx <= tileRange; dx++) {
        for (let dy = -tileRange; dy <= tileRange; dy++) {
            const xTile = centerTile.x + dx;
            const yTile = centerTile.y + dy;
            const key = `${zoom}_${xTile}_${yTile}`;
            let img = tilesCache[key];

            if (!img) {
                img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png?ts=${Date.now()}`;
                tilesCache[key] = img;
            }

            ctx.drawImage(img, dx * tileSize, dy * tileSize, tileSize, tileSize);
        }
    }
    ctx.restore();

    // -------------------- INFO KIÍRÁS --------------------
    ctx.save();
    ctx.font = `${16 * window.devicePixelRatio}px Arial`;
    ctx.fillStyle = "yellow";
    ctx.fillText(`Lat: ${userLat ? userLat.toFixed(6) : '...'}   Lng: ${userLng ? userLng.toFixed(6) : '...'}`, 10, 30 * window.devicePixelRatio);
    ctx.fillText(`Alpha (irány): ${alpha.toFixed(1)}°`, 10, 50 * window.devicePixelRatio);
    ctx.fillText(`Beta (előre/hátra): ${beta.toFixed(1)}°`, 10, 70 * window.devicePixelRatio);
    ctx.fillText(`Gamma (oldalirány): ${gamma.toFixed(1)}°`, 10, 90 * window.devicePixelRatio);
    ctx.restore();
}

// -------------------- ANIMATION LOOP --------------------
function loop() {
    drawTiles();
    requestAnimationFrame(loop);
}
loop();
