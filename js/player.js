let activeTimer = null;

async function playTrack(trackId, durationSeconds, onEnded) {
    clearTimer();
    const token = await getToken();

    const deviceId = await getPhoneDeviceId(token);
    if (!deviceId) throw new Error('No Spotify device found. Open the Spotify app, play any song briefly, then try again.');

    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    });

    if (!res.ok && res.status !== 204) throw new Error(`Playback error (${res.status})`);

    scheduleStop(durationSeconds, onEnded);
}

async function getPhoneDeviceId(token) {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const devices = data.devices || [];

    // Prefer smartphone, fall back to any available device
    const phone = devices.find(d => d.type === 'Smartphone') || devices[0];
    return phone?.id || null;
}

function stopPlayback() {
    clearTimer();
    pauseSpotify();
}

async function pauseSpotify() {
    const token = await getToken();
    if (!token) return;
    try {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch (e) {}
}

function scheduleStop(seconds, onEnded) {
    if (!seconds) return;
    activeTimer = setTimeout(async () => {
        clearTimer();
        await pauseSpotify();
        if (onEnded) onEnded();
    }, seconds * 1000);
}

function clearTimer() {
    if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
}

