const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';

let friendsState = {
    friends: [],
    incomingRequests: [],
    outgoingRequests: []
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
    if (xp < 250) return "Beginner";
    else if (xp < 600) return "Newcomer";
    else if (xp < 1250) return "Explorer";
    else if (xp < 2250) return "Adventurer";
    else if (xp < 3500) return "Regular";
    else if (xp < 5000) return "Experienced";
    else if (xp < 7000) return "Advanced";
    else if (xp < 9500) return "Expert";
    else if (xp < 12500) return "Veteran";
    else return "Elite";
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

function escapeHTML(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function pluralize(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(await getErrorMessage(response, `Request failed with ${response.status}`));
    }

    return response.json();
}

async function fetchUserData() {
    try {
        const user = await fetchJSON(`${API_URL}/fetch-user-info?userID=${encodeURIComponent(userID)}`);
        const title = xpTitleLookup(user.xp);
        const level = xpToLevel(user.xp);

        setText('profile-emoji', user.emoji || '❔');
        setText('profile-name', userName || user.name);
        setText('profile-rank', title);
        setText('pill-xp', `${user.xp || 0} XP`);
        setText('pill-level', `LV. ${level}`);
    } catch (err) {
        console.error("Error fetching user data:", err);
    }
}

function renderUserSummary(user, metaText, actionsHTML, itemClass = 'friend-item') {
    const level = xpToLevel(user.xp || 0);

    return `
        <div class="${itemClass}" data-user-id="${escapeHTML(user.userId)}">
            <div class="${itemClass === 'request-item' ? 'request-avatar' : 'friend-avatar'}">${escapeHTML(user.emoji || '❔')}</div>
            <div class="${itemClass === 'request-item' ? 'request-info' : 'friend-info'}">
                <div class="${itemClass === 'request-item' ? 'request-name' : 'friend-name'}">${escapeHTML(user.name)}</div>
                <div class="${itemClass === 'request-item' ? 'request-meta' : 'friend-stats'}">${escapeHTML(metaText || `LV.${level} · ${user.xp || 0} XP`)}</div>
            </div>
            ${actionsHTML}
        </div>
    `;
}

function renderRequests() {
    const requestsList = document.getElementById('requests-list');
    if (!requestsList) return;

    setText('requests-count', friendsState.incomingRequests.length === 0 ? 'Empty' : pluralize(friendsState.incomingRequests.length, 'request'));

    if (friendsState.incomingRequests.length === 0) {
        requestsList.innerHTML = '<div class="list-empty">No pending friend requests.</div>';
        return;
    }

    requestsList.innerHTML = friendsState.incomingRequests.map((requester) => renderUserSummary(
        requester,
        'Wants to be your friend',
        `
            <div class="request-actions">
                <button class="btn-accept" data-action="accept-request" data-user-id="${escapeHTML(requester.userId)}">Accept</button>
                <button class="btn-deny" data-action="deny-request" data-user-id="${escapeHTML(requester.userId)}">Deny</button>
            </div>
        `,
        'request-item'
    )).join('');
}

function getFilteredFriends() {
    const filter = (document.getElementById('friend-filter')?.value || '').trim().toLowerCase();
    if (!filter) return friendsState.friends;

    return friendsState.friends.filter((friend) => friend.name.toLowerCase().includes(filter));
}

function renderFriends() {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;

    setText('friends-count', pluralize(friendsState.friends.length, 'friend'));
    const filteredFriends = getFilteredFriends();

    if (friendsState.friends.length === 0) {
        friendsList.innerHTML = '<div class="list-empty">You have not added any friends yet.</div>';
        return;
    }

    if (filteredFriends.length === 0) {
        friendsList.innerHTML = '<div class="list-empty">No friends match that search.</div>';
        return;
    }

    friendsList.innerHTML = filteredFriends.map((friend) => renderUserSummary(
        friend,
        null,
        `
            <div class="friend-actions">
                <button class="btn-sm-ghost" data-action="view-profile" data-user-id="${escapeHTML(friend.userId)}">Profile</button>
                <button class="btn-sm-ghost btn-sm-danger" data-action="remove-friend" data-user-id="${escapeHTML(friend.userId)}">Remove</button>
            </div>
        `
    )).join('');
}

async function fetchFriendsData() {
    try {
        friendsState = await fetchJSON(`${API_URL}/friends?userID=${encodeURIComponent(userID)}`);
        renderRequests();
        renderFriends();
        updateNotificationDot();
    } catch (err) {
        console.error("Error fetching friends:", err);
        const message = escapeHTML(err.message || 'Could not load friends.');
        document.getElementById('requests-list').innerHTML = `<div class="list-empty">${message}</div>`;
        document.getElementById('friends-list').innerHTML = `<div class="list-empty">${message}</div>`;
    }
}

function updateNotificationDot() {
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.hidden = friendsState.incomingRequests.length === 0;
}

async function getErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        return data.message || fallback;
    } catch (err) {
        return fallback;
    }
}

async function sendFriendRequest(targetUserId) {
    await fetchJSON(`${API_URL}/send-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userID, targetUserId })
    });
    await fetchFriendsData();
    await searchUsers();
}

async function respondToRequest(requesterId, action) {
    await fetchJSON(`${API_URL}/respond-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userID, requesterId, action })
    });
    await fetchFriendsData();
    await searchUsers();
}

async function removeFriend(friendId) {
    const friend = friendsState.friends.find((item) => item.userId === friendId);
    if (!confirm(`Remove ${friend?.name || 'this friend'} from your friends?`)) return;

    await fetchJSON(`${API_URL}/friends/${encodeURIComponent(friendId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userID })
    });
    await fetchFriendsData();
    await searchUsers();
}

function getSearchStatusLabel(status) {
    if (status === 'friend') return 'Already friends';
    if (status === 'incoming') return 'Request received';
    if (status === 'outgoing') return 'Request sent';
    return 'Can be added';
}

function renderSearchResults(users) {
    const results = document.getElementById('user-search-results');
    if (!results) return;

    if (users.length === 0) {
        results.innerHTML = '<div class="list-empty">No users found.</div>';
        return;
    }

    results.innerHTML = users.map((user) => {
        const canAdd = user.status === 'none';
        const canAccept = user.status === 'incoming';
        let actionHTML = `<button class="btn-sm-ghost" disabled>${getSearchStatusLabel(user.status)}</button>`;

        if (canAdd) {
            actionHTML = `<button class="btn-sm-ghost" data-action="send-request" data-user-id="${escapeHTML(user.userId)}">Add friend</button>`;
        } else if (canAccept) {
            actionHTML = `<button class="btn-accept" data-action="accept-request" data-user-id="${escapeHTML(user.userId)}">Accept</button>`;
        }

        return renderUserSummary(user, getSearchStatusLabel(user.status), `<div class="friend-actions">${actionHTML}</div>`);
    }).join('');
}

async function searchUsers() {
    const input = document.getElementById('user-search');
    const query = (input?.value || '').trim();
    const results = document.getElementById('user-search-results');

    if (!results) return;
    if (query.length < 2) {
        setText('search-status', 'Search by name or email');
        results.innerHTML = '<div class="list-empty">Type at least 2 characters to search.</div>';
        return;
    }

    try {
        setText('search-status', 'Searching...');
        const data = await fetchJSON(`${API_URL}/search-users?userID=${encodeURIComponent(userID)}&q=${encodeURIComponent(query)}`);
        renderSearchResults(data.users || []);
        setText('search-status', pluralize((data.users || []).length, 'result'));
    } catch (err) {
        console.error("Error searching users:", err);
        setText('search-status', 'Search failed');
        results.innerHTML = `<div class="list-empty">${escapeHTML(err.message || 'Could not search users.')}</div>`;
    }
}

function debounce(callback, delay = 250) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
    };
}

function bindEvents() {
    document.getElementById('friend-filter')?.addEventListener('input', renderFriends);
    document.getElementById('user-search')?.addEventListener('input', debounce(searchUsers));

    document.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;

        const action = button.getAttribute('data-action');
        const targetUserId = button.getAttribute('data-user-id');
        if (!targetUserId) return;

        button.disabled = true;

        try {
            if (action === 'send-request') {
                await sendFriendRequest(targetUserId);
            } else if (action === 'accept-request') {
                await respondToRequest(targetUserId, 'accept');
            } else if (action === 'deny-request') {
                await respondToRequest(targetUserId, 'deny');
            } else if (action === 'remove-friend') {
                await removeFriend(targetUserId);
            } else if (action === 'view-profile') {
                window.location.href = `./profile.html?userID=${encodeURIComponent(targetUserId)}`;
            }
        } catch (err) {
            alert(err.message || 'Action failed.');
            console.error(err);
        } finally {
            button.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    fetchUserData();
    fetchFriendsData();
});
