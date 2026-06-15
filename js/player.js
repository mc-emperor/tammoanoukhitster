let deviceId = null;
let sdkPlayer = null;
let isPremium = false;
let activeTimer = null;

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

async function initPlayer() {
    if (isMobile) return;

    await loadSDK();

    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 8000);

        sdkPlayer = new Spotify.Player({
            name: 'Hitster',
            getOAuthToken: cb => getToken().then(cb),
            volume: 1.0,
        });

        sdkPlayer.addListener('ready', ({ device_id }) => {
            clearTimeout(timeout);
            deviceId = device_id;
            isPremium = true;
            resolve(true);
        });

        sdkPlayer.addListener('account_error', () => {
            clearTimeout(timeout);
            isPremium = false;
            resolve(false);
        });

        sdkPlayer.addListener('authentication_error', () => {
            clearTimeout(timeout);
            resolve(false);
        });

        sdkPlayer.connect();
    });
}

function loadSDK() {
    return new Promise((resolve) => {
        if (window.Spotify) { resolve(); return; }
        window.onSpotifyWebPlaybackSDKReady = resolve;
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        document.head.appendChild(script);
    });
}

async function playTrack(trackId, durationSeconds, onEnded) {
    stopPlayback();
    const token = await getToken();

    if (isPremium && deviceId) {
        try {
            await playViaSdk(trackId, token);
        } catch (e) {
            console.warn('SDK playback failed, falling back to preview', e);
            await playViaPreview(trackId, token);
        }
    } else {
        await playViaPreview(trackId, token);
    }

    scheduleStop(durationSeconds, onEnded);
}

async function playViaSdk(trackId, token) {
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    });
    if (!res.ok && res.status !== 204) {
        const body = await res.text();
        throw new Error(`SDK ${res.status}: ${body}`);
    }
}

async function playViaPreview(trackId, token) {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.preview_url) throw new Error('No preview available for this track');

    const audio = document.getElementById('preview-audio');
    audio.src = data.preview_url;
    await audio.play();
}

function stopPlayback() {
    clearTimer();
    if (sdkPlayer) sdkPlayer.pause();
    const audio = document.getElementById('preview-audio');
    if (audio) { audio.pause(); audio.src = ''; }
}

function scheduleStop(seconds, onEnded) {
    if (!seconds) return;
    activeTimer = setTimeout(() => {
        stopPlayback();
        if (onEnded) onEnded();
    }, seconds * 1000);
}

function clearTimer() {
    if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
}
