const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';

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