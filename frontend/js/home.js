const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'https://questure.onrender.com';

const thresholds = [
    { level: 1, xp: 0 },
    { level: 2, xp: 500 },
    { level: 3, xp: 1200 },
    { level: 4, xp: 2500 },
    { level: 5, xp: 4500 },
    { level: 6, xp: 7000 },
    { level: 7, xp: 10000 },
    { level: 8, xp: 14000 },
    { level: 9, xp: 19000 },
    { level: 10, xp: 25000 },
];

function xpTitleLookup(xp) {
    if (xp < 500) return "Beginner";
    else if (xp < 1200) return "Newcomer";
    else if (xp < 2500) return "Explorer";
    else if (xp < 4500) return "Adventurer";
    else if (xp < 7000) return "Regular";
    else if (xp < 10000) return "Experienced";
    else if (xp < 14000) return "Advanced";
    else if (xp < 19000) return "Expert";
    else if (xp < 25000) return "Veteran";
    else return "Elite";
}

function xpToLevel(xp) {
    const last = thresholds[thresholds.length - 1];
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (xp >= thresholds[i].xp) {
            if (i === thresholds.length - 1) {
                const extraXp = xp - last.xp;
                const extraLevels = Math.floor(extraXp / 8000);
                return last.level + extraLevels;
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

async function getErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        return data.message || fallback;
    } catch (err) {
        return fallback;
    }
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, `Request failed with ${response.status}`));
    }

    return response.json();
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

async function getCityCountry() {
    try {
        const position = await getUserLocation();
        const { latitude, longitude } = position.coords;
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
        const res = await fetch(url);
        const data = await res.json();
        const city =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.municipality;
        const countryCode = data.address.country_code?.toUpperCase();
        return `${city}, ${countryCode}`;
    } catch (err) {
        console.error(err);
        return "Unknown location";
    }
}

async function fetchUserData() {
    try {
        const response = await fetch(`${API_URL}/fetch-user-info?userID=${userID}`);
        const user = await response.json();
        const title = xpTitleLookup(user.xp);
        const level = xpToLevel(user.xp)
        const user_location = await getCityCountry()
        if (user) {
            const safeSet = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };
            safeSet('profile-emoji', user.emoji);
            safeSet('profile-name-topbar', `${userName}`);
            safeSet('profile-name', `${userName}`);
            safeSet('profile-rank', `${title}`);
            safeSet('pill-xp', `${user.xp} XP`);
            safeSet('pill-level', `LV. ${level}`);
            safeSet('active-quests-count', user.activeQuests.length);
            safeSet('current-location', user_location);
        }
        return user;
    } catch (err) {
        console.error("Error fetching user data:", err);
        return null;
    }
}

async function getPhotoCount(userID, questID) {
    try {
        const response = await fetch(`${API_URL}/fetch-quest-photos?userID=${encodeURIComponent(userID)}&questID=${encodeURIComponent(questID)}`);
        if (!response.ok) return 0;
        const data = await response.json();
        return data.photos ? data.photos.length : 0;
    } catch (err) {
        console.error("Error fetching photo count:", err);
        return 0;
    }
}

function renderQuestInvites(invites = []) {
    const invitesList = document.getElementById('quest-invites-list');
    const dot = document.querySelector('.notif-dot');
    if (!invitesList) return;

    if (dot) dot.hidden = invites.length === 0;

    if (invites.length === 0) {
        invitesList.innerHTML = '<div class="feed-empty">No quest invites right now.</div>';
        return;
    }

    invitesList.innerHTML = invites.map((invite) => {
        const quest = invite.quest || {};
        const inviter = invite.inviter || {};
        return `
            <div class="feed-item">
                <div class="feed-avatar">${escapeHTML(inviter.emoji || '❔')}</div>
                <div class="feed-content">
                    <p class="feed-text">
                        <strong>${escapeHTML(inviter.name || 'Friend')}</strong> invited you to
                        <span class="quest-name">"${escapeHTML(quest.title || 'Quest')}"</span>
                    </p>
                    <div class="feed-text">+${quest.baseXP || 0} XP base reward</div>
                </div>
                <button class="btn-sm-primary accept-quest-invite-btn"
                    data-quest-id="${escapeHTML(invite.questID)}"
                    data-session-id="${escapeHTML(invite.sessionId || '')}"
                    data-inviter-id="${escapeHTML(inviter.userId)}">Join</button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.accept-quest-invite-btn').forEach((button) => {
        button.addEventListener('click', () => acceptQuestInvite(button));
    });
}

async function fetchQuestInvites() {
    try {
        const data = await fetchJSON(`${API_URL}/quest-invite-requests?userID=${encodeURIComponent(userID)}`);
        renderQuestInvites(data.invites || []);
    } catch (err) {
        console.error("Error fetching quest invites:", err);
        const invitesList = document.getElementById('quest-invites-list');
        if (invitesList) {
            invitesList.innerHTML = `<div class="feed-empty">${escapeHTML(err.message || 'Could not load quest invites.')}</div>`;
        }
    }
}

async function acceptQuestInvite(button) {
    const questID = button.getAttribute('data-quest-id');
    const inviterId = button.getAttribute('data-inviter-id');
    const sessionId = button.getAttribute('data-session-id');
    if (!questID || !inviterId) return;

    button.disabled = true;
    button.textContent = 'Joining...';

    try {
        await fetchJSON(`${API_URL}/accept-quest-invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userID, questID, inviterId, sessionId })
        });

        button.closest('.feed-item')?.remove();
        await fetchAndDisplayActiveQuests();
        await fetchQuestInvites();
    } catch (err) {
        console.error("Error accepting quest invite:", err);
        alert(err.message || 'Could not accept quest invite.');
        button.disabled = false;
        button.textContent = 'Join';
    }
}

function createQuestCard(quest, photoCount) {
    const difficulty = quest.tags.find(t => t.toLowerCase().includes('easy') ||
        t.toLowerCase().includes('medium') ||
        t.toLowerCase().includes('hard')) ||
        quest.tags[0] || 'Unknown';
    const location = quest.tags.find(t => quest.tags[1] || 'Unknown');

    const capDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    const capLocation = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
    let diffIcon = '⚡';
    if (capDifficulty.toLowerCase().includes('easy')) diffIcon = '🟢';
    else if (capDifficulty.toLowerCase().includes('medium')) diffIcon = '🟡';
    else if (capDifficulty.toLowerCase().includes('hard')) diffIcon = '🔴';
    let locIcon = '📍';
    const progress = photoCount > 0 ? '50%' : '0%';
    const statusLabel = photoCount > 0 ? 'In progress' : 'Ready to start';

    const card = `
        <div class="active-quest" data-id="${quest.questID}">
            <div class="aq-top">
                <div class="aq-title">${quest.title}</div>
                <span class="aq-xp">+${quest.baseXP} XP</span>
            </div>
            <div class="aq-meta">
                <span class="aq-meta-item">${diffIcon} ${capDifficulty}</span>
                <span class="aq-meta-item">${locIcon} ${capLocation}</span>
            </div>
            <div class="aq-bar-label">
                <span>Progress</span>
                <span>${statusLabel}</span>
            </div>
            <div class="aq-track">
                <div class="aq-fill" style="width:${progress}"></div>
            </div>
            <div class="aq-actions">
                <button class="btn-sm-primary view-quest-btn" data-id="${quest.questID}">View quest</button>
                <button class="btn-sm-ghost upload-quest-btn" data-id="${quest.questID}">Upload photo</button>
            </div>
        </div>
    `;
    return card;
}
async function fetchAndDisplayActiveQuests() {
    const questsListContainer = document.getElementById('quests-list');
    if (!questsListContainer) return;

    const user = await fetchUserData();
    if (!user || !user.activeQuests || user.activeQuests.length === 0) {
        questsListContainer.innerHTML = '<span class="logo-sub">No active quests. Accept quests to see them here.</span>';
        return;
    }
    const recentActiveQuests = user.activeQuests.slice(-3).reverse();
    questsListContainer.innerHTML = '';

    const questDataPromises = recentActiveQuests.map(async questID => {
        const [questRes, photoCount] = await Promise.all([
            fetch(`${API_URL}/fetch-quest-info?questID=${questID}`).then(res => res.json()),
            getPhotoCount(userID, questID)
        ]);
        return { quest: questRes, photoCount };
    });

    const results = await Promise.all(questDataPromises);
    const validQuests = results.filter(r => r.quest !== null);

    if (validQuests.length === 0) {
        questsListContainer.innerHTML = '<p>Failed to load quests.</p>';
        return;
    }
    validQuests.forEach(({ quest, photoCount }) => {
        const cardHTML = createQuestCard(quest, photoCount);
        questsListContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    document.querySelectorAll('.view-quest-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questID = e.target.getAttribute('data-id');
            window.location.href = `../pages/quest.html?questID=${questID}`;
        });
    });
    document.querySelectorAll('.upload-quest-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const questID = e.target.getAttribute('data-id');
            window.location.href = `../pages/quest.html?questID=${questID}&openUpload=true`;
        });
    });
}

fetchAndDisplayActiveQuests();
fetchQuestInvites();
