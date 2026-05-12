const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'https://questure.onrender.com';
const discoverState = {
    quests: [],
    filter: 'all',
    search: ''
};

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
    if (xp < 1200) return "Newcomer";
    if (xp < 2500) return "Explorer";
    if (xp < 4500) return "Adventurer";
    if (xp < 7000) return "Regular";
    if (xp < 10000) return "Experienced";
    if (xp < 14000) return "Advanced";
    if (xp < 19000) return "Expert";
    if (xp < 25000) return "Veteran";
    return "Elite";
}

function xpToLevel(xp) {
    const last = thresholds[thresholds.length - 1];
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (xp >= thresholds[i].xp) {
            if (i === thresholds.length - 1) {
                return last.level + Math.floor((xp - last.xp) / 8000);
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
        throw new Error(`Request failed with ${response.status}`);
    }

    return response.json();
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

function getQuestTerms(quest) {
    return [
        ...(Array.isArray(quest.tags) ? quest.tags : []),
        ...(Array.isArray(quest.badges) ? quest.badges : [])
    ].map((term) => String(term).trim().toLowerCase());
}

function getDifficulty(quest) {
    const terms = getQuestTerms(quest);
    return terms.find((term) => ['easy', 'medium', 'hard'].includes(term)) || 'quest';
}

function questMatchesFilter(quest) {
    if (discoverState.filter === 'all') return true;
    return getQuestTerms(quest).includes(discoverState.filter);
}

function questMatchesSearch(quest) {
    const search = discoverState.search.trim().toLowerCase();
    if (!search) return true;

    const searchable = [
        quest.questID,
        quest.title,
        quest.description,
        ...(Array.isArray(quest.tags) ? quest.tags : []),
        ...(Array.isArray(quest.badges) ? quest.badges : [])
    ].join(' ').toLowerCase();

    return searchable.includes(search);
}

function renderDiscoverQuests() {
    const grid = document.getElementById('discover-grid');
    if (!grid) return;

    const quests = discoverState.quests.filter((quest) => questMatchesFilter(quest) && questMatchesSearch(quest));
    safeSet('discover-quests-count', discoverState.quests.length);

    if (quests.length === 0) {
        grid.innerHTML = '<div class="discover-empty">No quests match these filters.</div>';
        return;
    }

    grid.innerHTML = quests.map((quest) => {
        const difficulty = getDifficulty(quest);
        const badges = getQuestTerms(quest)
            .filter((term) => ['easy', 'medium', 'hard', 'social', 'solo', 'group'].includes(term))
            .slice(0, 4);

        return `
            <article class="discover-card" data-quest-id="${escapeHTML(quest.questID)}" tabindex="0">
                <span class="dc-emoji">${escapeHTML(quest.banner || '❔')}</span>
                <div class="dc-title">${escapeHTML(quest.title || 'Untitled quest')}</div>
                <p class="dc-desc">${escapeHTML(quest.description || 'No quest description available.')}</p>
                <div class="dc-badges">
                    ${badges.map((badge) => `<span class="dc-badge">${escapeHTML(badge)}</span>`).join('')}
                </div>
                <div class="dc-meta">
                    <span class="dc-xp">+${Number(quest.baseXP) || 0} XP</span>
                    <span class="dc-diff ${escapeHTML(difficulty)}">${escapeHTML(difficulty)}</span>
                </div>
            </article>
        `;
    }).join('');

    document.querySelectorAll('.discover-card').forEach((card) => {
        const openQuest = () => {
            const questID = card.getAttribute('data-quest-id');
            if (questID) window.location.href = `../pages/quest.html?questID=${encodeURIComponent(questID)}`;
        };

        card.addEventListener('click', openQuest);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openQuest();
            }
        });
    });
}

async function fetchAndRenderDiscoverQuests() {
    const grid = document.getElementById('discover-grid');
    if (grid) grid.innerHTML = '<div class="discover-empty">Loading quests...</div>';

    try {
        const data = await fetchJSON(`${API_URL}/fetch-quests`);
        const quests = Array.isArray(data.quests) ? data.quests : [];
        discoverState.quests = quests
            .slice()
            .sort((a, b) => String(a.questID || '').localeCompare(String(b.questID || '')))
            .slice(1);
        renderDiscoverQuests();
    } catch (err) {
        console.error("Error fetching quests:", err);
        if (grid) grid.innerHTML = '<div class="discover-empty">Could not load quests.</div>';
    }
}

function bindDiscoverFilters() {
    document.querySelectorAll('.filter-pill').forEach((button) => {
        button.addEventListener('click', () => {
            discoverState.filter = button.getAttribute('data-filter') || 'all';
            document.querySelectorAll('.filter-pill').forEach((pill) => {
                pill.classList.toggle('active', pill === button);
            });
            renderDiscoverQuests();
        });
    });

    const searchInput = document.getElementById('quest-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            discoverState.search = searchInput.value;
            renderDiscoverQuests();
        });
    }
}

bindDiscoverFilters();
fetchUserData();
fetchAndRenderDiscoverQuests();
