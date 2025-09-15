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
