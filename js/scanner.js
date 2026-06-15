let qrScanner = null;

async function startScanner(onDetect) {
    qrScanner = new Html5Qrcode('scanner-container');

    await qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
            const trackId = extractTrackId(text);
            if (trackId) {
                qrScanner.pause(true);
                onDetect(trackId);
            }
        },
        () => {}
    );
}

function extractTrackId(text) {
    const uri = text.match(/spotify:track:([A-Za-z0-9]+)/);
    if (uri) return uri[1];

    const url = text.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
    if (url) return url[1];

    return null;
}

function resumeScanner() {
    if (qrScanner) qrScanner.resume();
}

async function stopScanner() {
    if (qrScanner) {
        await qrScanner.stop();
        qrScanner = null;
    }
}
