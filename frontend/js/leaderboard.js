const API_URL = 'https://questure.onrender.com';
const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');

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

// Hardcoded friend IDs (used when filtering by friends)
const friendUserIds = ['u1', 'u2', 'u3', 'u5', 'u8'];

// Fallback player list (includes userId for client‑side filtering)
const fallbackPlayers = [
    { name: 'Ariana',  emoji: '🔥', xp: 15240, userId: 'u1' },
    { name: 'Mihail',  emoji: '⚡', xp: 13980, userId: 'u2' },
    { name: 'Nikol',   emoji: '🌟', xp: 12300, userId: 'u3' },
    { name: 'Gergana', emoji: '🛡️', xp: 11450, userId: 'u4' },
    { name: 'Petar',   emoji: '🧠', xp: 10930, userId: 'u5' },
    { name: 'Stella',  emoji: '✨', xp: 9800,  userId: 'u6' },
    { name: 'Veselin', emoji: '🏹', xp: 8750,  userId: 'u7' },
    { name: 'Lidia',   emoji: '🌙', xp: 7640,  userId: 'u8' },
    { name: 'Teodor',  emoji: '⚔️', xp: 6510,  userId: 'u9' },
    { name: 'Yana',    emoji: '🌿', xp: 5400,  userId: 'u10' }
];

const topCountInput = document.getElementById('top-count');
const updateBtn = document.getElementById('update-btn');
const friendsOnlyCheckbox = document.getElementById('friends-only');
const container = document.getElementById('leaderboardContainer');

function xpTitleLookup(xp) {
    if (xp < 250) return 'Beginner';
    if (xp < 600) return 'Newcomer';
    if (xp < 1250) return 'Explorer';
    if (xp < 2250) return 'Adventurer';
    if (xp < 3500) return 'Regular';
    if (xp < 5000) return 'Experienced';
    if (xp < 7000) return 'Advanced';
    if (xp < 9500) return 'Expert';
    if (xp < 12500) return 'Veteran';
    return 'Elite';
}

function xpToLevel(xp) {
    const last = thresholds[thresholds.length - 1];

    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (xp >= thresholds[i].xp) {
            if (i === thresholds.length - 1) {
                const extraXp = xp - last.xp;
                const extraLevels = Math.floor(extraXp / 4000);
                return last.level + extraLevels;
            }

            return thresholds[i].level;
        }
    }

    return 1;
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

async function fetchUserData() {
    if (!userID) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/fetch-user-info?userID=${encodeURIComponent(userID)}`);
        if (!response.ok) {
            throw new Error(`Request failed with ${response.status}`);
        }

        const user = await response.json();
        const xp = Number(user.xp) || 0;

        setText('profile-emoji', user.emoji || '?');
        setText('profile-name', userName || user.name || 'User');
        setText('profile-rank', xpTitleLookup(xp));
        setText('pill-xp', `${xp.toLocaleString()} XP`);
        setText('pill-level', `LV. ${xpToLevel(xp)}`);
    } catch (err) {
        console.error('Error fetching user data:', err);
    }
}

function showMessage(message) {
    container.innerHTML = '';
    const msg = document.createElement('div');
    msg.className = 'no-results';
    msg.innerText = message;
    container.appendChild(msg);
}

function normalizeCount() {
    const rawValue = topCountInput.value.trim();
    if (rawValue === '') {
        showMessage('Enter a number between 1 and 100.');
        return null;
    }

    let count = Number(rawValue);
    if (isNaN(count)) {
        count = 1;
    }

    count = Math.max(1, Math.min(100, count));
    topCountInput.value = count;
    return count;
}

function filterByFriends(players) {
    if (!friendsOnlyCheckbox.checked) {
        return players;
    }
    return players.filter(function(player) {
        if (player.userId) {
            return friendUserIds.indexOf(player.userId) !== -1;
        }
        return friendUserIds.indexOf(player.name) !== -1;
    });
}

function renderLeaderboard(players) {
    container.innerHTML = '';

    if (!players || players.length === 0) {
        showMessage('No players to display.');
        return;
    }

    players.forEach(function (player, index) {
        const card = document.createElement('article');
        card.classList.add('player-card');
        if (player.isCurrentUser) {
            card.classList.add('current-player');
        }

        const rankDiv = document.createElement('div');
        rankDiv.classList.add('player-rank');

        if (index === 0) {
            rankDiv.classList.add('gold');
        } else if (index === 1) {
            rankDiv.classList.add('silver');
        } else if (index === 2) {
            rankDiv.classList.add('bronze');
        }

        rankDiv.innerText = (player.rank || index + 1).toString();

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('player-name');
        nameDiv.innerText = (player.emoji || '⭐') + ' ' + (player.name || 'Unknown');

        const xpDiv = document.createElement('div');
        xpDiv.classList.add('player-xp');
        xpDiv.innerText = (Number(player.xp) || 0).toLocaleString() + ' XP';

        card.appendChild(rankDiv);
        card.appendChild(nameDiv);
        card.appendChild(xpDiv);

        container.appendChild(card);

        if (index === 2 && players.length > 3) {
            const separator = document.createElement('div');
            separator.classList.add('separator');
            container.appendChild(separator);
        }
    });
}

async function loadLeaderboard() {
    const count = normalizeCount();
    if (!count) {
        return;
    }

    showMessage('Loading leaderboard...');

    try {
        const params = new URLSearchParams({ limit: count });
        if (userID) {
            params.set('userID', userID);
        }

        const response = await fetch(`${API_URL}/leaderboard?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Request failed with ${response.status}`);
        }

        const data = await response.json();
        let leaderboardPlayers = data.players || [];

        leaderboardPlayers = filterByFriends(leaderboardPlayers);

        renderLeaderboard(leaderboardPlayers);
    } catch (err) {
        console.error('Error loading leaderboard:', err);
        let fallback = fallbackPlayers;
        fallback = filterByFriends(fallback);
        renderLeaderboard(fallback.slice(0, count));
    }
}

updateBtn.addEventListener('click', loadLeaderboard);

friendsOnlyCheckbox.addEventListener('change', loadLeaderboard);

fetchUserData();
loadLeaderboard();
