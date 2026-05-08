const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';

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
            document.getElementById('profile-name-topbar').textContent = `${userName}`;
            document.getElementById('profile-name').textContent = `${userName}`;
            document.getElementById('profile-rank').textContent = `${title}`;
            document.getElementById('pill-xp').textContent = `${user.xp} XP`;
            document.getElementById('pill-level').textContent = `LV. ${level}`;
            document.getElementById('active-quests-count').textContent = user.activeQuests.length;
            document.getElementById('current-location').textContent = user_location;
        }
        return user;
    } catch (err) {
        console.error("Error fetching user data:", err);
        return null;
    }
}

function createQuestCard(quest) {
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
                <span>Ready to start</span>
            </div>
            <div class="aq-track">
                <div class="aq-fill" style="width:0%"></div>
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
    const user = await fetchUserData();
    if (!user || !user.activeQuests || user.activeQuests.length === 0) {
        document.getElementById('quests-list').innerHTML = '<p>No active quests. Accept quests to see them here.</p>';
        return;
    }
    const recentActiveQuests = user.activeQuests.slice(-3).reverse();
    const questsListContainer = document.getElementById('quests-list');
    questsListContainer.innerHTML = '';
    const questPromises = recentActiveQuests.map(questID =>
        fetch(`${API_URL}/fetch-quest-info?questID=${questID}`)
            .then(res => res.json())
            .catch(err => {
                console.error(`Failed to fetch quest ${questID}:`, err);
                return null;
            })
    );
    const quests = await Promise.all(questPromises);
    const validQuests = quests.filter(q => q !== null);
    if (validQuests.length === 0) {
        questsListContainer.innerHTML = '<p>Failed to load quests.</p>';
        return;
    }
    validQuests.forEach(quest => {
        const cardHTML = createQuestCard(quest);
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
