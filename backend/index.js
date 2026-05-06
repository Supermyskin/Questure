require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer();

const userSchema = new mongoose.Schema({
  userId: { type: String, default: () => uuidv4(), unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  xp: { type: Number, default: 0 },
  activeQuests: { type: [String], default: [] },
  doneQuests: { type: [String], default: [] }
});

const questSchema = new mongoose.Schema({
  questID: { type: String, required: true, unique: true, length: 8 },
  title: { type: String, required: true },
  banner: { type: String, required: true },
  description: { type: String, required: true },
  tags: { type: [String], default: [] },
  badges: { type: [String], default: [] },
  baseXP: { type: Number, required: true, min: 0 }
});

const questSubmissionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questID: { type: String, required: true },
  photoUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Quest = mongoose.model('Quest', questSchema);
const QuestSubmission = mongoose.model('QuestSubmission', questSubmissionSchema);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: "Registration successful", token, userId: newUser.userId, name: newUser.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: "Login successful", token, userId: user.userId, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/fetch-user-info', async (req, res) => {
  try {
    const userId = req.query.userID;
    if (!userId) {
      return res.status(400).json({ message: "UserID is required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      name: user.name,
      email: user.email,
      xp: user.xp || 0,
      activeQuests: user.activeQuests || [],
      doneQuests: user.doneQuests || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/fetch-quest-info', async (req, res) => {
  try {
    const questID = req.query.questID || req.query.id;
    if (!questID) {
      return res.status(400).json({ message: "QuestID is required" });
    }

    const quest = await Quest.findOne({ questID });
    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    res.json(quest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/create-quest', async (req, res) => {
  try {
    const newQuest = new Quest(req.body);
    await newQuest.save();
    res.status(201).json({ message: "Quest created successfully", quest: newQuest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating quest", error: err.message });
  }
});

app.post('/accept-quest', async (req, res) => {
  try {
    const { userId, questID } = req.body;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.activeQuests.includes(questID) || user.doneQuests.includes(questID)) {
      return res.status(400).json({ message: "Quest already accepted or completed" });
    }

    user.activeQuests.push(questID);
    await user.save();
    res.json({ message: "Quest accepted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    const { userId, questID } = req.body;
    if (!userId || !questID || !req.file) {
      return res.status(400).json({ message: "UserID, QuestID, and photo are required" });
    }

    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req);

    const submission = new QuestSubmission({
      userId,
      questID,
      photoUrl: result.secure_url
    });
    await submission.save();

    res.json({ message: "Photo uploaded successfully", url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
