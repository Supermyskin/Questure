const http = require('http');

const questData = {
  questID: "QST00002",
  title: "Order in a language you don't speak",
  banner: "☕️",
  description: "Find a café, restaurant, or food stall. Order something using zero English (or your native language) and strike up a conversation with the server. No Google Translate allowed. Whatever happens, happens.",
  tags: ["social", "food", "communication", "awkward"],
  badges: ["easy", "solo", "group"],
  baseXP: 120
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
