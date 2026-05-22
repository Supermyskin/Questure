const http = require('http');

const questData = {
  questID: "QST00012",
  title: "Go to a competition you've never trained for.",
  banner: "⚽️",
  description: "There is always a competition happening. Why not join one you haven't trained for and try to get 1st place.",
  tags: ["performance", "awkward", "chaotic"],
  badges: ["medium", "group", "solo"],
  baseXP: 220
};

const data = JSON.stringify(questData);

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/create-quest',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
};

const req = http.request(options, (res) => {
  let response = '';
  res.on('data', (chunk) => response += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', response);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
