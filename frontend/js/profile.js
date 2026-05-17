const loggedInUserID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';
const avatarChoices = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
];
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
                return last.level + Math.floor((xp - last.xp) / 8000);
            }
            return thresholds[i].level;
        }
    }
    return 1;
}

function getProfileUserIDFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('userID') || params.get('userId') || params.get('id') || loggedInUserID;
}

const profileUserID = getProfileUserIDFromURL();
const isOwnProfile = profileUserID === loggedInUserID;

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function updateBioCount() {
    const bioInput = document.getElementById('bio-input');
    setText('bio-count', (bioInput?.value || '').length);
}

function setHidden(id, hidden) {
    const element = document.getElementById(id);
    if (element) element.hidden = hidden;
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

function renderShellUser(user) {
    const xp = user.xp || 0;
    const level = xpToLevel(xp);
    const title = xpTitleLookup(xp);

    setText('profile-emoji', user.emoji || '❔');
    setText('profile-name', user.name || 'User');
    setText('profile-rank', title);
    setText('pill-level', `LV. ${level}`);
    setText('pill-xp', `${xp} XP`);
}

function selectAvatar(emoji) {
    setValue('emoji-input', emoji);
    setText('account-emoji', emoji);

    document.querySelectorAll('.avatar-option').forEach((button) => {
        const selected = button.dataset.emoji === emoji;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
}

function renderAvatarPicker(selectedEmoji) {
    const picker = document.getElementById('avatar-picker');
    if (!picker) return;

    const choices = avatarChoices.includes(selectedEmoji)
        ? avatarChoices
        : [selectedEmoji, ...avatarChoices].filter(Boolean);

    picker.innerHTML = choices.map((emoji) => `
        <button class="avatar-option" type="button" data-emoji="${escapeHTML(emoji)}" role="option" aria-selected="false">${escapeHTML(emoji)}</button>
    `).join('');

    picker.querySelectorAll('.avatar-option').forEach((button) => {
        button.addEventListener('click', () => selectAvatar(button.dataset.emoji));
    });

    selectAvatar(selectedEmoji || '😀');
}

function renderProfile(user) {
    const xp = user.xp || 0;
    const level = xpToLevel(xp);
    const title = xpTitleLookup(xp);
    const name = user.name || 'User';
    const emoji = user.emoji || '❔';

    setText('topbar-username', name);
    setText('account-emoji', emoji);
    setText('account-name', name);
    setText('account-title', `LV.${level} · ${title.toUpperCase()}`);
    setText('account-bio', user.bio || 'No bio yet.');
    setText('account-email', isOwnProfile ? (user.email || '') : `@${user.userId}`);

    setText('stat-level', level);
    setText('stat-xp', xp);
    setText('stat-active', (user.activeQuests || []).length);
    setText('stat-done', (user.doneQuests || []).length);

    setValue('name-input', name);
    setValue('email-input', user.email || '');
    setValue('bio-input', user.bio || '');
    updateBioCount();
    renderAvatarPicker(emoji);
}

function applyProfileMode() {
    setHidden('own-profile-actions', !isOwnProfile);
    setHidden('profile-edit-section', !isOwnProfile);
    setHidden('password-section', !isOwnProfile);
    setHidden('account-status', !isOwnProfile);

    const title = document.getElementById('profile-page-title');
    if (title) {
        title.innerHTML = `${isOwnProfile ? 'Account' : 'Profile'} <span id="topbar-username">${escapeHTML(document.getElementById('account-name')?.textContent || 'User')}</span>`;
    }

    if (isOwnProfile) {
        setText('profile-page-subtitle', '// manage profile and sign-in details');
        return;
    }

    setText('profile-page-subtitle', '// public profile');
    document.getElementById('account-form')?.querySelectorAll('input, button').forEach((element) => {
        element.disabled = true;
    });
}

async function loadProfile() {
    try {
        setText('account-status', 'Loading...');

        const profile = await fetchJSON(`${API_URL}/fetch-profile-info?userID=${encodeURIComponent(profileUserID)}&viewerID=${encodeURIComponent(loggedInUserID)}`);
        renderProfile(profile);
        applyProfileMode();
        setText('account-status', 'Ready');

        if (isOwnProfile) {
            renderShellUser(profile);
        } else {
            const viewer = await fetchJSON(`${API_URL}/fetch-profile-info?userID=${encodeURIComponent(loggedInUserID)}&viewerID=${encodeURIComponent(loggedInUserID)}`);
            renderShellUser(viewer);
        }
    } catch (err) {
        console.error("Error loading profile:", err);
        setText('account-status', err.message || 'Could not load');
        setText('account-bio', err.message || 'Could not load profile.');
    }
}

async function saveAccount(event) {
    event.preventDefault();
    if (!isOwnProfile) return;

    const button = document.getElementById('save-account-btn');
    button.disabled = true;
    setText('account-status', 'Saving...');

    try {
        const data = await fetchJSON(`${API_URL}/update-user-info`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: loggedInUserID,
                name: document.getElementById('name-input').value,
                email: document.getElementById('email-input').value,
                bio: document.getElementById('bio-input').value,
                emoji: document.getElementById('emoji-input').value
            })
        });

        localStorage.setItem('userName', data.user.name);
        renderProfile(data.user);
        renderShellUser(data.user);
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
    if (!isOwnProfile) return;

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
            body: JSON.stringify({ userId: loggedInUserID, currentPassword, newPassword })
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
    applyProfileMode();
    document.getElementById('account-form')?.addEventListener('submit', saveAccount);
    document.getElementById('password-form')?.addEventListener('submit', savePassword);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('bio-input')?.addEventListener('input', updateBioCount);
    loadProfile();
});
