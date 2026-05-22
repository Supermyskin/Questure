const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';

const myQuestState = {
    user: null,
    quests: [],
    filter: 'active',
    search: ''
};

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

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }
    return response.json();
}

function safeSet(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function getQuestTerms(quest) {
    return [
        ...(Array.isArray(quest.tags) ? quest.tags : []),
        ...(Array.isArray(quest.badges) ? quest.badges : [])
    ].filter(Boolean);
}

function getQuestStatus(questID) {
    const activeQuests = new Set(myQuestState.user?.activeQuests || []);
    const doneQuests = new Set(myQuestState.user?.doneQuests || []);

    if (doneQuests.has(questID)) return 'completed';
    if (activeQuests.has(questID)) return 'active';
    return 'unknown';
}

function questMatchesFilter(quest) {
    const status = getQuestStatus(quest.questID);
    if (myQuestState.filter === 'all') return status !== 'unknown';
    return status === myQuestState.filter;
}

function questMatchesSearch(quest) {
    const search = myQuestState.search.trim().toLowerCase();
    if (!search) return true;

    const searchable = [
        quest.questID,
        quest.title,
        quest.description,
        ...getQuestTerms(quest)
    ].join(' ').toLowerCase();

    return searchable.includes(search);
}

function updateUserChrome(user) {
    const xp = user.xp || 0;
    const level = xpToLevel(xp);
    const activeCount = Array.isArray(user.activeQuests) ? user.activeQuests.length : 0;
    const doneCount = Array.isArray(user.doneQuests) ? user.doneQuests.length : 0;

    safeSet('profile-emoji', user.emoji || '?');
    safeSet('profile-name', userName || user.name || 'User');
    safeSet('profile-rank', xpTitleLookup(xp));
    safeSet('pill-xp', `${xp} XP`);
    safeSet('pill-level', `LV. ${level}`);
    safeSet('active-quests-count', activeCount);
    safeSet('done-quests-count', doneCount);
    safeSet('stat-active', activeCount);
    safeSet('stat-completed', doneCount);
    safeSet('stat-xp', xp);
}

function renderMyQuests() {
    const list = document.getElementById('my-quests-list');
    if (!list) return;

    const quests = myQuestState.quests
        .filter((quest) => questMatchesFilter(quest) && questMatchesSearch(quest))
        .sort((a, b) => {
            const statusOrder = { active: 0, completed: 1, unknown: 2 };
            return statusOrder[getQuestStatus(a.questID)] - statusOrder[getQuestStatus(b.questID)]
                || String(a.title || '').localeCompare(String(b.title || ''));
        });

    if (quests.length === 0) {
        const emptyText = myQuestState.filter === 'completed'
            ? 'No completed quests yet.'
            : myQuestState.filter === 'active'
                ? 'No active quests. Find one in Discover.'
                : 'No quests match this search.';
        list.innerHTML = `<div class="quest-empty">${emptyText}</div>`;
        return;
    }

    list.innerHTML = quests.map((quest) => {
        const status = getQuestStatus(quest.questID);
        const badges = getQuestTerms(quest).slice(0, 4);
        const statusLabel = status === 'completed' ? 'Completed' : 'Active';
        const primaryText = status === 'completed' ? 'View proof' : 'Continue';

        return `
            <article class="my-quest-card ${escapeHTML(status)}">
                <div class="quest-emoji">${escapeHTML(quest.banner || '⚡')}</div>
                <div class="quest-copy">
                    <div class="quest-title-row">
                        <h2 class="quest-title">${escapeHTML(quest.title || 'Untitled quest')}</h2>
                        <span class="quest-status ${escapeHTML(status)}">${escapeHTML(statusLabel)}</span>
                    </div>
                    <p class="quest-desc">${escapeHTML(quest.description || 'No quest description available.')}</p>
                    <div class="quest-badges">
                        ${badges.map((badge) => `<span class="quest-badge">${escapeHTML(badge)}</span>`).join('')}
                    </div>
                </div>
                <div class="quest-actions">
                    <span class="quest-xp">+${Number(quest.baseXP) || 0} XP</span>
                    <a class="btn-sm-primary" href="./quest.html?questID=${encodeURIComponent(quest.questID)}">${primaryText}</a>
                    ${status === 'active'
                ? `<a class="btn-sm-ghost" href="./quest.html?questID=${encodeURIComponent(quest.questID)}&openUpload=true">Upload</a>`
                : '<a class="btn-sm-ghost" href="./gallery.html">Gallery</a>'}
                </div>
            </article>
        `;
    }).join('');
}

async function fetchMyQuests() {
    const list = document.getElementById('my-quests-list');
    if (list) list.innerHTML = '<div class="quest-empty">Loading your quests...</div>';

    try {
        const [user, questData] = await Promise.all([
            fetchJSON(`${API_URL}/fetch-user-info?userID=${encodeURIComponent(userID)}`),
            fetchJSON(`${API_URL}/fetch-quests`)
        ]);

        myQuestState.user = user;
        updateUserChrome(user);

        const ownedQuestIds = new Set([
            ...(Array.isArray(user.activeQuests) ? user.activeQuests : []),
            ...(Array.isArray(user.doneQuests) ? user.doneQuests : [])
        ]);

        myQuestState.quests = (Array.isArray(questData.quests) ? questData.quests : [])
            .filter((quest) => ownedQuestIds.has(quest.questID));

        renderMyQuests();
    } catch (err) {
        console.error('Error loading my quests:', err);
        if (list) list.innerHTML = '<div class="quest-empty">Could not load your quests.</div>';
    }
}

function bindQuestFilters() {
    document.querySelectorAll('.quest-tab').forEach((button) => {
        button.addEventListener('click', () => {
            myQuestState.filter = button.getAttribute('data-filter') || 'active';
            document.querySelectorAll('.quest-tab').forEach((tab) => {
                tab.classList.toggle('active', tab === button);
            });
            renderMyQuests();
        });
    });

    const searchInput = document.getElementById('my-quest-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            myQuestState.search = searchInput.value;
            renderMyQuests();
        });
    }
}

bindQuestFilters();
fetchMyQuests();
