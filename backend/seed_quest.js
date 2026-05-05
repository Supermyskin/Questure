const http = require('http');

const questData = {
  questID: "QST00001",
  title: "Welcome Traveler",
  banner: "✨",
  description: "Complete your first mission to earn XP.",
  tags: ["tutorial", "beginner"],
  badges: ["easy"],
  baseXP: 100
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
