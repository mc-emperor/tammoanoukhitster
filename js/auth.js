const CLIENT_ID = '830804fd1d884fd980097f01b5eae210';
const SCOPES = 'streaming user-read-email user-read-private';

function getRedirectUri() {
    return 'https://mc-emperor.github.io/tammoanoukhitster/callback.html';
}

function generateVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function login() {
    const verifier = generateVerifier();
    const challenge = await generateChallenge(verifier);
    localStorage.setItem('pkce_verifier', verifier);

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: getRedirectUri(),
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: challenge,
    });

    window.location = `https://accounts.spotify.com/authorize?${params}`;
}

async function exchangeCode(code) {
    const verifier = localStorage.getItem('pkce_verifier');
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: getRedirectUri(),
            code_verifier: verifier,
        }),
    });

    if (!res.ok) throw new Error('Token exchange failed');
    storeTokens(await res.json());
}

function storeTokens({ access_token, refresh_token, expires_in }) {
    localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('token_expiry', Date.now() + expires_in * 1000);
}

async function getToken() {
    const expiry = parseInt(localStorage.getItem('token_expiry') || '0');
    if (Date.now() < expiry - 60_000) {
        return localStorage.getItem('access_token');
    }
    return refreshAccessToken();
}

async function refreshAccessToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) { logout(); return null; }

    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            grant_type: 'refresh_token',
            refresh_token: refresh,
        }),
    });

    if (!res.ok) { logout(); return null; }
    const data = await res.json();
    storeTokens(data);
    return data.access_token;
}

function logout() {
    ['access_token', 'refresh_token', 'token_expiry', 'pkce_verifier'].forEach(k =>
        localStorage.removeItem(k)
    );
}

function isLoggedIn() {
    return !!localStorage.getItem('refresh_token');
}
