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
                return last.level + Math.floor((xp - last.xp) / 8000);
            }
            return thresholds[i].level;
        }
    }
    return 1;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
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

function renderAccount(user) {
    const xp = user.xp || 0;
    const level = xpToLevel(xp);
    const title = xpTitleLookup(xp);
    const name = user.name || 'User';
    const emoji = user.emoji || '❔';

    setText('profile-emoji', emoji);
    setText('profile-name', name);
    setText('profile-rank', title);
    setText('topbar-username', name);
    setText('pill-level', `LV. ${level}`);
    setText('pill-xp', `${xp} XP`);

    setText('account-emoji', emoji);
    setText('account-name', name);
    setText('account-title', `LV.${level} · ${title.toUpperCase()}`);
    setText('account-email', user.email || '');

    setText('stat-level', level);
    setText('stat-xp', xp);
    setText('stat-active', (user.activeQuests || []).length);
    setText('stat-done', (user.doneQuests || []).length);

    setValue('name-input', name);
    setValue('email-input', user.email || '');
    setValue('emoji-input', emoji);
}

async function loadAccount() {
    try {
        setText('account-status', 'Loading...');
        const user = await fetchJSON(`${API_URL}/fetch-user-info?userID=${encodeURIComponent(userID)}`);
        renderAccount(user);
        setText('account-status', 'Ready');
    } catch (err) {
        console.error("Error loading account:", err);
        setText('account-status', err.message || 'Could not load');
    }
}

async function saveAccount(event) {
    event.preventDefault();

    const button = document.getElementById('save-account-btn');
    button.disabled = true;
    setText('account-status', 'Saving...');

    try {
        const data = await fetchJSON(`${API_URL}/update-user-info`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userID,
                name: document.getElementById('name-input').value,
                email: document.getElementById('email-input').value,
                emoji: document.getElementById('emoji-input').value
            })
        });

        localStorage.setItem('userName', data.user.name);
        renderAccount(data.user);
        setText('account-status', 'Saved');
    } catch (err) {
        console.error("Error saving account:", err);
        setText('account-status', err.message || 'Save failed');
    } finally {
        button.disabled = false;
    }
}

async function savePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('current-password-input').value;
    const newPassword = document.getElementById('new-password-input').value;
    if (!currentPassword || !newPassword) {
        setText('password-status', 'Fill both fields');
        return;
    }

    const button = document.getElementById('save-password-btn');
    button.disabled = true;
    setText('password-status', 'Saving...');

    try {
        await fetchJSON(`${API_URL}/update-user-info`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userID, currentPassword, newPassword })
        });

        document.getElementById('password-form').reset();
        setText('password-status', 'Updated');
    } catch (err) {
        console.error("Error updating password:", err);
        setText('password-status', err.message || 'Update failed');
    } finally {
        button.disabled = false;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userID');
    localStorage.removeItem('userName');
    window.location.href = './login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('account-form')?.addEventListener('submit', saveAccount);
    document.getElementById('password-form')?.addEventListener('submit', savePassword);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    loadAccount();
});
