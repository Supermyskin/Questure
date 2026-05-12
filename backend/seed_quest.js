const http = require('http');

const questData = {
  questID: "QST00007",
  title: "Go to a retro arcade.",
  banner: "🕹️",
  description: "Go back a couple of decades and visit a retro arcade (if there is still one left in your city). Drag your friends along to see if they are up for the throwback to the past.",
  tags: ["chaotic", "explore"],
  badges: ["medium", "solo", "group"],
  baseXP: 180
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
