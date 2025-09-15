const info = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const video = document.getElementById('camera');

let userLat = null, userLng = null;
let alpha = 0, beta = 0, gamma = 0;
const VERSION = "v1.0.0";

// ---------------- Kamera bekapcsolása ----------------
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        await video.play(); // iOS-nél explicit hívás szükséges
    } catch (err) {
        console.error("Kamera hiba:", err);
    }
}

// ---------------- Start GPS + Orientation ----------------
startBtn.addEventListener('click', async () => {

    await startCamera();

    // GPS indítása
    navigator.geolocation.watchPosition(
        pos => { 
            userLat = pos.coords.latitude; 
            userLng = pos.coords.longitude; 
            updateInfo(); 
        },
        err => console.error("GPS hiba:", err),
        { enableHighAccuracy: true }
    );

    // Giroszkóp indítása
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
                } else {
                    alert("Girosszkóp engedély megtagadva");
                }
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
});

// ---------------- Info frissítése ----------------
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
