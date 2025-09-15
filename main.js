const info = document.getElementById('info');
const enableBtn = document.getElementById('enableOrientation');

let userLat = null, userLng = null;
let alpha = 0, beta = 0, gamma = 0;

// ---------------- GPS ----------------
navigator.geolocation.watchPosition(
    pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        updateInfo();
    },
    err => console.error("GPS hiba:", err),
    { enableHighAccuracy: true }
);

// ---------------- Giroszkóp ----------------
enableBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    enableBtn.style.display = 'none';
                } else {
                    alert("Permission denied for device orientation");
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
    updateInfo();
}

// ---------------- Info frissítése ----------------
function updateInfo() {
    info.innerHTML = `
        Lat: ${userLat ? userLat.toFixed(6) : '...'}<br>
        Lng: ${userLng ? userLng.toFixed(6) : '...'}<br>
        Alpha: ${alpha.toFixed(1)}°<br>
        Beta: ${beta.toFixed(1)}°<br>
        Gamma: ${gamma.toFixed(1)}°
    `;
}
