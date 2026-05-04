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

async function fetchUserData() {
    try {
        const response = await fetch(`${API_URL}/fetch-user-info?userID=${userID}`);
        const user = await response.json();
        const title = xpTitleLookup(user.xp);

        if (user) {
            document.getElementById('profile-name-topbar').textContent = `${userName}`;
            document.getElementById('profile-name').textContent = `${userName}`;
            document.getElementById('profile-rank').textContent = `${title}`;
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
    }
}

fetchUserData();