const video = document.getElementById('camera');
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Kamera bekapcsolása
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => { video.srcObject = stream; })
  .catch(err => console.error("Kamera hiba:", err));

// Canvas méret beállítása retina kijelzőre
function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// GPS pozíció
let userLat = null, userLng = null;
navigator.geolocation.watchPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
}, err => console.error("GPS hiba:", err), { enableHighAccuracy: true });

// Giroszkóp / irány
let alpha = 0;
function setupOrientation() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
    }
}
function handleOrientation(e) {
    alpha = e.alpha || 0;
}
setupOrientation();

// OSM tile koordináták
function latLngToTile(lat, lng, zoom) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return { x, y };
}

const zoom = 16;

// Térkép rajzolása canvas-ra
function drawMap() {
    if (userLat === null || userLng === null) return; // GPS még nincs

    const tile = latLngToTile(userLat, userLng, zoom);
    const url = `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png?ts=${Date.now()}`; // cache bypass

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-alpha * Math.PI / 180); // irány a giroszkóptól
        const scale = canvas.width / img.width; // egyszerű lépték
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
    };
    img.src = url;
}

// Animációs loop
function loop() {
    drawMap();
    requestAnimationFrame(loop);
}
loop();
