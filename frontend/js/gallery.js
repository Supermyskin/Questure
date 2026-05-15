const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'https://questure.onrender.com';

const thresholds = [
    { level: 1, xp: 0 },
    { level: 2, xp: 250 },
    { level: 3, xp: 600 },
    { level: 4, xp: 1250 },
    { level: 5, xp: 2250 },
    { level: 6, xp: 3500 },
    { level: 7, xp: 5000 },
    { level: 8, xp: 7000 },
    { level: 9, xp: 9500 },
    { level: 10, xp: 12500 },
];

function xpTitleLookup(xp) {
    if (xp < 250) return "Beginner";
    if (xp < 600) return "Newcomer";
    if (xp < 1250) return "Explorer";
    if (xp < 2250) return "Adventurer";
    if (xp < 3500) return "Regular";
    if (xp < 5000) return "Experienced";
    if (xp < 7000) return "Advanced";
    if (xp < 9500) return "Expert";
    if (xp < 12500) return "Veteran";
    return "Elite";
}

function xpToLevel(xp) {
    const last = thresholds[thresholds.length - 1];
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (xp >= thresholds[i].xp) {
            if (i === thresholds.length - 1) {
                return last.level + Math.floor((xp - last.xp) / 4000);
            }
            return thresholds[i].level;
        }
    }
    return 1;
}

function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, `Request failed with ${response.status}`));
    }
    return response.json();
}

async function getErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        return data.message || fallback;
    } catch (err) {
        return fallback;
    }
}

function safeSet(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

async function fetchUserData() {
    if (!userID) return;
    try {
        const user = await fetchJSON(`${API_URL}/fetch-user-info?userID=${encodeURIComponent(userID)}`);
        const title = xpTitleLookup(user.xp || 0);
        const level = xpToLevel(user.xp || 0);
        safeSet('profile-emoji', user.emoji || '?');
        safeSet('profile-name-topbar', userName || user.name || 'Quests');
        safeSet('profile-name', userName || user.name || 'User');
        safeSet('profile-rank', title);
        safeSet('pill-xp', `${user.xp || 0} XP`);
        safeSet('pill-level', `LV. ${level}`);
        safeSet('active-quests-count', Array.isArray(user.activeQuests) ? user.activeQuests.length : 0);
    } catch (err) {
        console.error("Error fetching user data:", err);
    }
}

function formatDate(value) {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function renderGallery(photos = []) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    const validPhotos = photos.filter((photo) => photo && photo.photoUrl);
    safeSet('pictures-count', validPhotos.length);
    grid.replaceChildren();
    if (validPhotos.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'gallery-empty';
        empty.innerHTML = `
            <i class="fa-regular fa-images"></i>
            <span>No quest photos yet.</span>
        `;
        grid.appendChild(empty);
        return;
    }
    validPhotos.forEach((photo, index) => {
        const card = document.createElement('article');
        card.className = 'gallery-card';
        const link = document.createElement('a');
        link.className = 'gallery-image-link';
        link.href = photo.photoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const image = document.createElement('img');
        image.src = photo.photoUrl;
        image.alt = `${photo.quest?.title || 'Quest'} photo ${index + 1}`;
        image.loading = 'lazy';
        const badge = document.createElement('span');
        badge.className = 'gallery-quest-badge';
        badge.textContent = photo.quest?.banner || '⚡';
        link.append(image, badge);
        const meta = document.createElement('div');
        meta.className = 'gallery-meta';
        const name = document.createElement('span');
        name.textContent = photo.owner?.name || (photo.userId === userID ? 'You' : 'Unknown');
        const date = document.createElement('span');
        date.textContent = formatDate(photo.createdAt);
        const quest = document.createElement('a');
        quest.href = `../pages/quest.html?questID=${encodeURIComponent(photo.questID || '')}`;
        quest.textContent = photo.quest?.title || photo.questID || 'Quest';
        meta.append(name, document.createTextNode(' | '), date, document.createTextNode(' | '), quest);
        card.append(link, meta);
        grid.appendChild(card);
    });
}

async function fetchGalleryPhotos() {
    const grid = document.getElementById('gallery-grid');
    if (!userID) {
        renderGallery([]);
        return;
    }
    if (grid) {
        grid.innerHTML = '<div class="gallery-empty">Loading gallery...</div>';
    }
    try {
        const data = await fetchJSON(`${API_URL}/fetch-gallery-photos?userID=${encodeURIComponent(userID)}`);
        renderGallery(Array.isArray(data.photos) ? data.photos : []);
    } catch (err) {
        console.error("Error fetching gallery photos:", err);
        safeSet('pictures-count', 0);
        if (grid) {
            grid.innerHTML = `<div class="gallery-empty">${escapeHTML(err.message || 'Could not load gallery.')}</div>`;
        }
    }
}
document.getElementById('gallery-refresh')?.addEventListener('click', fetchGalleryPhotos);

fetchUserData();
fetchGalleryPhotos();
