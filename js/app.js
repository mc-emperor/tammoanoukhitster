const TIMER_OPTIONS = [20, 30, 45, 0];
let currentTimer = 30;
let countdownInterval = null;
const RING_CIRCUMFERENCE = 2 * Math.PI * 45;

async function init() {
    currentTimer = parseInt(localStorage.getItem('hitster_timer') ?? '30');

    if (!isLoggedIn()) {
        showScreen('login');
        return;
    }

    showScreen('loading');

    try {
        const token = await getToken();
        if (!token) { showScreen('login'); return; }

        showScreen('ready');
        updateTimerLabel();
    } catch (err) {
        console.error(err);
        showScreen('login');
    }
}

async function onStart() {
    await startScanner(onQRDetected);
    showScreen('scanner');
}

async function onQRDetected(trackId) {
    showScreen('playing');
    startCountdown(currentTimer);

    try {
        await playTrack(trackId, currentTimer, () => {
            stopCountdown();
            showScreen('scanner');
            resumeScanner();
        });
    } catch (err) {
        stopCountdown();
        showError(err.message || 'Could not play this track');
        console.error('Playback error:', err);
    }
}

function onStop() {
    stopPlayback();
    stopCountdown();
    showScreen('scanner');
    resumeScanner();
}

function cycleTimer() {
    const idx = TIMER_OPTIONS.indexOf(currentTimer);
    currentTimer = TIMER_OPTIONS[(idx + 1) % TIMER_OPTIONS.length];
    localStorage.setItem('hitster_timer', currentTimer);
    updateTimerLabel();
}

function updateTimerLabel() {
    document.getElementById('timer-label').textContent = currentTimer ? `${currentTimer}s` : '∞';
}

function startCountdown(seconds) {
    stopCountdown();
    const ring = document.getElementById('countdown-ring');
    const text = document.getElementById('countdown-text');

    if (!seconds) {
        ring.style.strokeDashoffset = 0;
        text.textContent = '♫';
        return;
    }

    let remaining = seconds;
    updateRing(ring, text, remaining, seconds);

    countdownInterval = setInterval(() => {
        remaining--;
        updateRing(ring, text, remaining, seconds);
        if (remaining <= 0) stopCountdown();
    }, 1000);
}

function updateRing(ring, text, remaining, total) {
    const fraction = Math.max(0, remaining / total);
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - fraction);
    text.textContent = remaining;
}

function stopCountdown() {
    clearInterval(countdownInterval);
    countdownInterval = null;
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${name}`).classList.add('active');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    showScreen('error');
}

document.addEventListener('DOMContentLoaded', init);
