const video = document.getElementById('camera');
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Kamera bekapcsolása
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
  .then(stream => { video.srcObject = stream; })
  .catch(err => console.error("Kamera hiba:", err));

// GPS lekérése
let userLat = 0, userLng = 0;
navigator.geolocation.watchPosition(pos => {
  userLat = pos.coords.latitude;
  userLng = pos.coords.longitude;
}, err => console.error(err), { enableHighAccuracy: true });

// Giroszkóp / orientáció
let alpha = 0, beta = 0, gamma = 0;
window.addEventListener('deviceorientation', e => {
  alpha = e.alpha; // compass direction
  beta = e.beta;
  gamma = e.gamma;
});

function latLngToTile(lat, lng, zoom) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180)) / Math.PI)/2 * Math.pow(2, zoom));
    return {x, y};
}

const zoom = 16; // kezdő zoom
function drawMap() {
    const tile = latLngToTile(userLat, userLng, zoom);
    const url = `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        ctx.rotate(-alpha * Math.PI / 180); // irányítás
        ctx.drawImage(img, -img.width/2, -img.height/2);
        ctx.restore();
    };
    img.src = url;
}

setInterval(drawMap, 1000); // frissítés 1s-ként
