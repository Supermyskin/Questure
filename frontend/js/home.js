const userName = localStorage.getItem('userName');
const userID = localStorage.getItem('userID');
const API_URL = 'http://127.0.0.1:3000';

function xpTitleLookup(n) {
    if (n < 1000) return "Newbie";
    else return "Professional";
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