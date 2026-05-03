const express = require('express');
const app = express();
app.use(express.json());

app.post('/register', (req, res) => {
    // Basic registration logic stub
    res.status(201).json({ message: 'User registered' });
});

app.post('/login', (req, res) => {
    // Basic login logic stub
    res.status(200).json({ message: 'Logged in' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
