const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';
const DEFAULT_QUEST_TITLE = 'Climb something sketchy';

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

async function fetchUserData() {
    try {
        const response = await fetch(`${API_URL}/fetch-user-info?userID=${userID}`);
        if (!response.ok) {
            throw new Error(`User request failed with ${response.status}`);
        }

        const user = await response.json();
        const title = xpTitleLookup(user.xp);
        const level = xpToLevel(user.xp)

        if (user) {
            document.getElementById('profile-name').textContent = `${userName}`;
            document.getElementById('profile-rank').textContent = `${title}`;
            document.getElementById('pill-xp').textContent = `${user.xp} XP`;
            document.getElementById('pill-level').textContent = `LV. ${level}`;
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
    }
}

function getQuestIDFromURL() {
    const search = window.location.search.slice(1).trim();
    if (!search) return null;

    const params = new URLSearchParams(window.location.search);
    return params.get('questID') || params.get('id') || decodeURIComponent(search.split('&')[0]);
}

function formatBadgeText(value) {
    return String(value)
        .replace(/[-_]/g, ' ')
        .trim()
        .toUpperCase();
}

function getDifficultyClass(badge) {
    const normalized = String(badge).toLowerCase();
    if (normalized.includes('easy')) return 'easy';
    if (normalized.includes('medium')) return 'medium';
    if (normalized.includes('hard')) return 'hard';
    return '';
}

function renderQuestBadges(badges = []) {
    const badgesContainer = document.getElementById('quest-badges');
    if (!badgesContainer) return;

    const questBadges = Array.isArray(badges) ? badges : [];
    badgesContainer.replaceChildren();

    questBadges.forEach((badge) => {
        const badgeElement = document.createElement('span');
        const difficultyClass = getDifficultyClass(badge);
        badgeElement.className = difficultyClass ? `diff-badge ${difficultyClass}` : 'cat-badge';
        badgeElement.textContent = formatBadgeText(badge);
        badgesContainer.appendChild(badgeElement);
    });
}

function renderQuestTags(tags = []) {
    const tagsContainer = document.getElementById('quest-tags');
    if (!tagsContainer) return;

    const questTags = Array.isArray(tags) ? tags : [];
    tagsContainer.replaceChildren();

    questTags.forEach((tag) => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = String(tag);
        tagsContainer.appendChild(tagElement);
    });
}

function renderQuest(quest) {
    const title = quest.title || DEFAULT_QUEST_TITLE;

    document.title = `Questure - ${title}`;
    document.getElementById('current').textContent = title;
    document.getElementById('quest-title').textContent = title;
    document.getElementById('banner-emoji').textContent = quest.banner || '⚡';
    document.getElementById('quest-desc').textContent = quest.description || 'No quest description available.';
    document.getElementById('xp-amount').textContent = `+${quest.baseXP || 0} XP`;
    renderQuestBadges(quest.badges);
    renderQuestTags(quest.tags);
}

function renderQuestError(message) {
    document.title = 'Questure - Quest unavailable';
    document.getElementById('current').textContent = 'Quest unavailable';
    document.getElementById('quest-title').textContent = 'Quest unavailable';
    document.getElementById('banner-emoji').textContent = '⚠️';
    document.getElementById('quest-desc').textContent = message;
    document.getElementById('xp-amount').textContent = '+0 XP';
    renderQuestBadges([]);
    renderQuestTags([]);
}

function updateUploadCount(count) {
    const label = count === 1 ? '1 uploaded' : `${count} uploaded`;
    document.getElementById('upload-count').textContent = label;
}

function renderQuestPhotos(photos = [], questID = getQuestIDFromURL()) {
    const gallery = document.getElementById('photo-gallery');
    const empty = document.getElementById('photo-gallery-empty');
    if (!gallery || !empty) return;

    gallery.replaceChildren();
    updateUploadCount(photos.length);

    if (!photos.length) {
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'photo-gallery-item';

        const link = document.createElement('a');
        link.className = 'photo-gallery-link';
        link.href = photo.photoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const image = document.createElement('img');
        image.src = photo.photoUrl;
        image.alt = `Quest proof photo ${index + 1}`;
        image.loading = 'lazy';

        const meta = document.createElement('span');
        meta.className = 'photo-gallery-meta';
        meta.textContent = photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : 'Uploaded';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'photo-remove-btn';
        removeButton.title = 'Remove photo';
        removeButton.setAttribute('aria-label', `Remove quest proof photo ${index + 1}`);
        removeButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
        removeButton.onclick = () => deleteQuestPhoto(photo._id, questID);

        link.append(image, meta);
        item.append(link, removeButton);
        gallery.appendChild(item);
    });
}

async function fetchQuestPhotos(questID) {
    if (!userID || !questID) {
        renderQuestPhotos([]);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/fetch-quest-photos?userID=${encodeURIComponent(userID)}&questID=${encodeURIComponent(questID)}`);
        if (!response.ok) {
            throw new Error(`Photo request failed with ${response.status}`);
        }

        const data = await response.json();
        renderQuestPhotos(Array.isArray(data.photos) ? data.photos : [], questID);
    } catch (err) {
        console.error("Error fetching quest photos:", err);
        renderQuestPhotos([]);
    }
}

function unlockPhotoUpload() {
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('upload-input-zone').style.display = 'flex';
}

function setupPhotoUpload(questID) {
    const photoInput = document.getElementById('photo-input');
    const uploadInputZone = document.getElementById('upload-input-zone');
    if (!photoInput || !uploadInputZone) return;

    uploadInputZone.onclick = () => photoInput.click();
    uploadInputZone.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            photoInput.click();
        }
    };
    photoInput.onchange = (event) => uploadPhoto(event, questID);
}

async function fetchQuestData() {
    const questID = getQuestIDFromURL();
    if (!questID) return;

    try {
        setupPhotoUpload(questID);
        fetchQuestPhotos(questID);
        const response = await fetch(`${API_URL}/fetch-quest-info?questID=${encodeURIComponent(questID)}`);
        if (!response.ok) {
            throw new Error(response.status === 404 ? 'Quest not found.' : `Quest request failed with ${response.status}`);
        }
        const quest = await response.json();
        renderQuest(quest);
        const userRes = await fetch(`${API_URL}/fetch-user-info?userID=${userID}`);
        const user = await userRes.json();
        const isAccepted = user.activeQuests.includes(questID);

        const acceptBtn = document.querySelector('.btn-complete');
        const acceptedBtn = document.querySelector('.btn-accepted');
        const abandonBtn = document.querySelector('.btn-abandon');
        if (isAccepted) {
            acceptBtn.style.display = 'none';
            acceptedBtn.style.display = 'block';
            abandonBtn.style.display = 'block';
            unlockPhotoUpload();
        }

        acceptBtn.onclick = () => acceptQuest(questID);
        abandonBtn.onclick = () => abandonQuest(questID);
    } catch (err) {

        console.error("Error fetching quest data:", err);
        renderQuestError(err.message || 'Could not load this quest.');
    }
}

async function uploadPhoto(e, questID) {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('upload-status');
    status.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('userId', userID);
    formData.append('questID', questID);

    try {
        const response = await fetch(`${API_URL}/upload-photo`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed.');
        }

        const data = await response.json();
        status.textContent = 'Upload successful!';
        e.target.value = '';
        await fetchQuestPhotos(questID);
    } catch (err) {
        console.error(err);
        status.textContent = 'Upload failed.';
    }
}

async function deleteQuestPhoto(submissionId, questID) {
    if (!submissionId || !questID) return;
    if (!confirm('Remove this photo from the quest?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/delete-photo/${encodeURIComponent(submissionId)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userID, questID })
        });

        if (!response.ok) {
            throw new Error(await getErrorMessage(response, 'Failed to remove photo.'));
        }

        await fetchQuestPhotos(questID);
    } catch (err) {
        console.error("Error deleting photo:", err);
        alert(err.message);
    }
}

async function acceptQuest(questID) {
    try {
        const response = await fetch(`${API_URL}/accept-quest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userID, questID: questID })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to accept quest.');
        }

        alert('Quest accepted!');
        location.reload();
    } catch (err) {
        console.error("Error accepting quest:", err);
        alert(err.message);
    }
}

async function getErrorMessage(response, fallback) {
    try {
        const data = await response.json();
        return data.message || fallback;
    } catch (err) {
        return fallback;
    }
}

async function abandonQuest(questID) {
    if (!confirm('Are you sure you want to abandon this quest?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/abandon-quest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userID, questID: questID })
        });

        if (!response.ok) {
            throw new Error(await getErrorMessage(response, 'Failed to abandon quest.'));
        }

        alert('Quest abandoned!');
        location.reload();
    } catch (err) {
        console.error("Error abandoning quest:", err);
        alert(err.message);
    }
}

fetchUserData();
fetchQuestData();
