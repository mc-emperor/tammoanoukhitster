let activeTimer = null;

async function initPlayer() {
    // Spotify Connect needs no SDK — playback goes through the Spotify app
}

async function playTrack(trackId, durationSeconds, onEnded) {
    clearTimer();
    const token = await getToken();

    const res = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    });

    if (res.status === 404) throw new Error('Open the Spotify app on this phone first, then try again');
    if (!res.ok && res.status !== 204) throw new Error(`Playback error (${res.status})`);

    scheduleStop(durationSeconds, onEnded);
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

async function unlockAudio() {
    // Not needed for Spotify Connect
}
