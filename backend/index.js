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
const QUEST_INVITE_BONUS_XP = 25;

const emojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
  '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
  '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
  '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤥', '😶',
  '🫥', '😐', '🫤', '😑', '😬', '🙄', '😯', '😦', '😧', '😮',
  '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮',
  '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺',
  '🤡', '💀', '☠️', '👻', '👽', '🤖', '🎃', '😺', '😸', '😹',
  '😻', '😼', '😽', '🙀', '😿', '😾', '🐵', '🙈', '🙉', '🙊',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐲', '🦄', '🐙', '🦋', '🐝', '🦖',
  '🔥', '⚡', '🌈', '💎', '🌟', '🚀', '🎮', '🎨', '🧩', '💡'
];

const userSchema = new mongoose.Schema({
  userId: { type: String, default: () => uuidv4(), unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emoji: { type: String, required: true },
  xp: { type: Number, default: 0 },
  friends: { type: [String], default: [] },
  incomingFriendRequests: { type: [String], default: [] },
  outgoingFriendRequests: { type: [String], default: [] },
  activeQuests: { type: [String], default: [] },
  doneQuests: { type: [String], default: [] },
  questCooldowns: {
    type: [{
      questID: { type: String, required: true },
      completedAt: { type: Date, required: true },
      cooldownUntil: { type: Date, required: true }
    }],
    default: []
  },
  questInvites: {
    type: [{
      questID: { type: String, required: true },
      invitedUserIds: { type: [String], default: [] }
    }],
    default: []
  }
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
  publicId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Quest = mongoose.model('Quest', questSchema);
const QuestSubmission = mongoose.model('QuestSubmission', questSubmissionSchema);

function toPublicUser(user) {
  return {
    userId: user.userId,
    name: user.name,
    emoji: user.emoji || '❔',
    xp: user.xp || 0
  };
}

async function getPublicUsersByIds(userIds) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const users = await User.find({ userId: { $in: uniqueIds } })
    .select('userId name emoji xp');
  const usersById = new Map(users.map((user) => [user.userId, toPublicUser(user)]));
  return uniqueIds.map((userId) => usersById.get(userId)).filter(Boolean);
}

async function getPublicUsersByIdMap(userIds) {
  const users = await getPublicUsersByIds(userIds);
  return new Map(users.map((user) => [user.userId, user]));
}

function getQuestInviteEntry(user, questID) {
  return (user.questInvites || []).find((invite) => invite.questID === questID);
}

function getQuestInviteIds(user, questID) {
  const invite = getQuestInviteEntry(user, questID);
  return [...new Set((invite?.invitedUserIds || []).filter(Boolean))];
}

function setQuestInviteIds(user, questID, invitedUserIds) {
  const uniqueInvitedUserIds = [...new Set((invitedUserIds || []).filter(Boolean))];
  user.questInvites = (user.questInvites || []).filter((invite) => invite.questID !== questID);

  if (uniqueInvitedUserIds.length > 0) {
    user.questInvites.push({ questID, invitedUserIds: uniqueInvitedUserIds });
  }
}

async function getQuestInviterIds(userId, questID) {
  const inviters = await User.find({
    userId: { $ne: userId },
    questInvites: {
      $elemMatch: {
        questID,
        invitedUserIds: userId
      }
    }
  }).select('userId');

  return inviters.map((user) => user.userId);
}

async function getQuestPhotoParticipantIds(userId, questID) {
  const user = await User.findOne({ userId });
  if (!user) return null;

  const isOwnQuest = (user.activeQuests || []).includes(questID) || (user.doneQuests || []).includes(questID);
  const invitedByIds = await getQuestInviterIds(userId, questID);
  const invitedUserIds = getQuestInviteIds(user, questID);

  if (!isOwnQuest && invitedByIds.length === 0 && invitedUserIds.length === 0) {
    return null;
  }

  return [...new Set([userId, ...invitedByIds, ...invitedUserIds])];
}

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
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      emoji: randomEmoji
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
      emoji: user.emoji || '🕵️‍♂️',
      xp: user.xp || 0,
      activeQuests: user.activeQuests || [],
      doneQuests: user.doneQuests || [],
      questCooldowns: user.questCooldowns || [],
      questInvites: user.questInvites || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/friends', async (req, res) => {
  try {
    const userId = req.query.userID || req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: "UserID is required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [friends, incomingRequests, outgoingRequests] = await Promise.all([
      getPublicUsersByIds(user.friends),
      getPublicUsersByIds(user.incomingFriendRequests),
      getPublicUsersByIds(user.outgoingFriendRequests)
    ]);

    res.json({ friends, incomingRequests, outgoingRequests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/search-users', async (req, res) => {
  try {
    const userId = req.query.userID || req.query.userId;
    const query = (req.query.q || '').trim();

    if (!userId) {
      return res.status(400).json({ message: "UserID is required" });
    }

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const currentUser = await User.findOne({ userId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      userId: { $ne: userId },
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } }
      ]
    })
      .select('userId name emoji xp')
      .limit(10);

    const friendIds = new Set(currentUser.friends || []);
    const incomingIds = new Set(currentUser.incomingFriendRequests || []);
    const outgoingIds = new Set(currentUser.outgoingFriendRequests || []);

    res.json({
      users: users.map((user) => {
        let status = 'none';
        if (friendIds.has(user.userId)) status = 'friend';
        else if (incomingIds.has(user.userId)) status = 'incoming';
        else if (outgoingIds.has(user.userId)) status = 'outgoing';

        return { ...toPublicUser(user), status };
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/send-friend-request', async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;
    if (!userId || !targetUserId) {
      return res.status(400).json({ message: "UserID and targetUserID are required" });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ message: "You cannot add yourself as a friend" });
    }

    const [user, targetUser] = await Promise.all([
      User.findOne({ userId }),
      User.findOne({ userId: targetUserId })
    ]);

    if (!user || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if ((user.friends || []).includes(targetUserId)) {
      return res.status(400).json({ message: "You are already friends" });
    }

    if ((user.incomingFriendRequests || []).includes(targetUserId)) {
      user.incomingFriendRequests = user.incomingFriendRequests.filter((id) => id !== targetUserId);
      targetUser.outgoingFriendRequests = (targetUser.outgoingFriendRequests || []).filter((id) => id !== userId);
      user.friends = [...new Set([...(user.friends || []), targetUserId])];
      targetUser.friends = [...new Set([...(targetUser.friends || []), userId])];
      await Promise.all([user.save(), targetUser.save()]);
      return res.json({ message: "Friend request accepted" });
    }

    if ((user.outgoingFriendRequests || []).includes(targetUserId)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    user.outgoingFriendRequests = [...new Set([...(user.outgoingFriendRequests || []), targetUserId])];
    targetUser.incomingFriendRequests = [...new Set([...(targetUser.incomingFriendRequests || []), userId])];

    await Promise.all([user.save(), targetUser.save()]);
    res.json({ message: "Friend request sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/respond-friend-request', async (req, res) => {
  try {
    const { userId, requesterId, action } = req.body;
    if (!userId || !requesterId || !['accept', 'deny'].includes(action)) {
      return res.status(400).json({ message: "UserID, requesterID, and valid action are required" });
    }

    const [user, requester] = await Promise.all([
      User.findOne({ userId }),
      User.findOne({ userId: requesterId })
    ]);

    if (!user || !requester) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!(user.incomingFriendRequests || []).includes(requesterId)) {
      return res.status(400).json({ message: "Friend request not found" });
    }

    user.incomingFriendRequests = user.incomingFriendRequests.filter((id) => id !== requesterId);
    requester.outgoingFriendRequests = (requester.outgoingFriendRequests || []).filter((id) => id !== userId);

    if (action === 'accept') {
      user.friends = [...new Set([...(user.friends || []), requesterId])];
      requester.friends = [...new Set([...(requester.friends || []), userId])];
    }

    await Promise.all([user.save(), requester.save()]);
    res.json({ message: action === 'accept' ? "Friend request accepted" : "Friend request denied" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete('/friends/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params;
    const { userId } = req.body;
    if (!userId || !friendId) {
      return res.status(400).json({ message: "UserID and friendID are required" });
    }

    const [user, friend] = await Promise.all([
      User.findOne({ userId }),
      User.findOne({ userId: friendId })
    ]);

    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    user.friends = (user.friends || []).filter((id) => id !== friendId);
    friend.friends = (friend.friends || []).filter((id) => id !== userId);
    user.incomingFriendRequests = (user.incomingFriendRequests || []).filter((id) => id !== friendId);
    user.outgoingFriendRequests = (user.outgoingFriendRequests || []).filter((id) => id !== friendId);
    friend.incomingFriendRequests = (friend.incomingFriendRequests || []).filter((id) => id !== userId);
    friend.outgoingFriendRequests = (friend.outgoingFriendRequests || []).filter((id) => id !== userId);

    await Promise.all([user.save(), friend.save()]);
    res.json({ message: "Friend removed" });
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

    if (user.activeQuests.includes(questID)) {
      return res.status(400).json({ message: "Quest already accepted" });
    }

    if ((user.doneQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest already completed" });
    }

    user.activeQuests.push(questID);
    await user.save();
    res.json({ message: "Quest accepted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/abandon-quest', async (req, res) => {
  try {
    const { userId, questID } = req.body;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.activeQuests.includes(questID)) {
      return res.status(400).json({ message: "Quest is not active" });
    }

    user.activeQuests = user.activeQuests.filter((activeQuestID) => activeQuestID !== questID);
    user.questInvites = (user.questInvites || []).filter((invite) => invite.questID !== questID);
    await user.save();

    res.json({ message: "Quest abandoned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/quest-invites', async (req, res) => {
  try {
    const userId = req.query.userID || req.query.userId;
    const questID = req.query.questID || req.query.id;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const invitedUserIds = getQuestInviteIds(user, questID).filter((invitedUserId) => {
      return (user.friends || []).includes(invitedUserId);
    });
    const [friends, invitedFriends] = await Promise.all([
      getPublicUsersByIds(user.friends),
      getPublicUsersByIds(invitedUserIds)
    ]);
    const invitedIdSet = new Set(invitedUserIds);

    res.json({
      bonusPerFriend: QUEST_INVITE_BONUS_XP,
      bonusXP: invitedUserIds.length * QUEST_INVITE_BONUS_XP,
      invitedFriends,
      availableFriends: friends.map((friend) => ({
        ...friend,
        invited: invitedIdSet.has(friend.userId)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/quest-invite-requests', async (req, res) => {
  try {
    const userId = req.query.userID || req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: "UserID is required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const inviters = await User.find({
      userId: { $ne: userId },
      questInvites: { $elemMatch: { invitedUserIds: userId } }
    }).select('userId name emoji xp questInvites activeQuests doneQuests');

    const activeQuestIds = new Set(user.activeQuests || []);
    const doneQuestIds = new Set(user.doneQuests || []);
    const requests = [];

    inviters.forEach((inviter) => {
      (inviter.questInvites || []).forEach((invite) => {
        if (!(invite.invitedUserIds || []).includes(userId)) return;
        if (activeQuestIds.has(invite.questID) || doneQuestIds.has(invite.questID)) return;
        if ((inviter.doneQuests || []).includes(invite.questID)) return;

        requests.push({
          questID: invite.questID,
          inviter: toPublicUser(inviter)
        });
      });
    });

    const questIds = [...new Set(requests.map((request) => request.questID))];
    const quests = await Quest.find({ questID: { $in: questIds } }).select('questID title banner baseXP tags badges');
    const questsById = new Map(quests.map((quest) => [quest.questID, quest]));

    res.json({
      invites: requests
        .map((request) => ({
          ...request,
          quest: questsById.get(request.questID)
        }))
        .filter((request) => request.quest)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/invite-friend-to-quest', async (req, res) => {
  try {
    const { userId, questID, friendId } = req.body;
    if (!userId || !questID || !friendId) {
      return res.status(400).json({ message: "UserID, QuestID, and friendID are required" });
    }

    if (userId === friendId) {
      return res.status(400).json({ message: "You cannot invite yourself" });
    }

    const [user, friend, quest] = await Promise.all([
      User.findOne({ userId }),
      User.findOne({ userId: friendId }),
      Quest.findOne({ questID })
    ]);

    if (!user || !friend) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    if ((user.doneQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest already completed" });
    }

    if (!(user.activeQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Accept the quest before inviting friends" });
    }

    if (!(user.friends || []).includes(friendId)) {
      return res.status(400).json({ message: "Only friends can be invited to quests" });
    }

    const invitedUserIds = getQuestInviteIds(user, questID);
    if (!invitedUserIds.includes(friendId)) {
      invitedUserIds.push(friendId);
      setQuestInviteIds(user, questID, invitedUserIds);
      await user.save();
    }

    res.json({
      message: "Friend invited to quest",
      invitedFriend: toPublicUser(friend),
      bonusXP: invitedUserIds.length * QUEST_INVITE_BONUS_XP,
      bonusPerFriend: QUEST_INVITE_BONUS_XP
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/accept-quest-invite', async (req, res) => {
  try {
    const { userId, questID, inviterId } = req.body;
    if (!userId || !questID || !inviterId) {
      return res.status(400).json({ message: "UserID, QuestID, and inviterID are required" });
    }

    const [user, inviter, quest] = await Promise.all([
      User.findOne({ userId }),
      User.findOne({ userId: inviterId }),
      Quest.findOne({ questID })
    ]);

    if (!user || !inviter) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    if ((user.doneQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest already completed" });
    }

    if ((user.activeQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest already accepted" });
    }

    const invitedUserIds = getQuestInviteIds(inviter, questID);
    if (!invitedUserIds.includes(userId)) {
      return res.status(400).json({ message: "Quest invite not found" });
    }

    if ((inviter.doneQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest invite is no longer active" });
    }

    user.activeQuests = [...new Set([...(user.activeQuests || []), questID])];
    await user.save();

    res.json({ message: "Quest invite accepted", quest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/submit-quest', async (req, res) => {
  try {
    const { userId, questID } = req.body;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if ((user.doneQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest already completed" });
    }

    if (!user.activeQuests.includes(questID)) {
      return res.status(400).json({ message: "Quest must be accepted before submitting" });
    }

    const quest = await Quest.findOne({ questID });
    if (!quest) {
      return res.status(404).json({ message: "Quest not found" });
    }

    const photoCount = await QuestSubmission.countDocuments({ userId, questID });
    if (photoCount < 1) {
      return res.status(400).json({ message: "Upload at least one photo before submitting" });
    }

    const invitedUserIds = getQuestInviteIds(user, questID).filter((invitedUserId) => {
      return (user.friends || []).includes(invitedUserId);
    });
    const baseXP = quest.baseXP || 0;
    const bonusXP = invitedUserIds.length * QUEST_INVITE_BONUS_XP;
    const awardedXP = baseXP + bonusXP;

    user.xp = (user.xp || 0) + awardedXP;
    user.activeQuests = user.activeQuests.filter((activeQuestID) => activeQuestID !== questID);
    user.questCooldowns = (user.questCooldowns || []).filter((questCooldown) => questCooldown.questID !== questID);
    user.questInvites = (user.questInvites || []).filter((invite) => invite.questID !== questID);
    user.doneQuests = user.doneQuests || [];
    if (!user.doneQuests.includes(questID)) {
      user.doneQuests.push(questID);
    }

    await user.save();

    res.json({
      message: "Quest submitted successfully",
      awardedXP,
      baseXP,
      bonusXP,
      invitedFriendCount: invitedUserIds.length,
      xp: user.xp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/debug-reset-quest-completion', async (req, res) => {
  try {
    const { userId, questID } = req.body;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.doneQuests = (user.doneQuests || []).filter((doneQuestID) => doneQuestID !== questID);
    user.activeQuests = (user.activeQuests || []).filter((activeQuestID) => activeQuestID !== questID);
    user.questCooldowns = (user.questCooldowns || []).filter((questCooldown) => questCooldown.questID !== questID);
    user.questInvites = (user.questInvites || []).filter((invite) => invite.questID !== questID);
    await user.save();

    res.json({ message: "Quest completion reset for debugging" });
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

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if ((user.doneQuests || []).includes(questID)) {
      return res.status(400).json({ message: "Quest already completed" });
    }

    if (!user.activeQuests.includes(questID)) {
      return res.status(400).json({ message: "Quest must be accepted before uploading photos" });
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
      photoUrl: result.secure_url,
      publicId: result.public_id
    });
    await submission.save();

    res.json({ message: "Photo uploaded successfully", url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete('/delete-photo/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { userId, questID } = req.body;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return res.status(400).json({ message: "Invalid photo ID" });
    }

    const submission = await QuestSubmission.findOne({ _id: submissionId, userId, questID });
    if (!submission) {
      return res.status(404).json({ message: "Photo not found" });
    }

    const publicId = submission.publicId || getCloudinaryPublicId(submission.photoUrl);
    if (publicId) {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok' && result.result !== 'not found') {
        return res.status(502).json({ message: "Could not delete photo from Cloudinary" });
      }
    }

    await QuestSubmission.deleteOne({ _id: submission._id });
    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get('/fetch-quest-photos', async (req, res) => {
  try {
    const userId = req.query.userID || req.query.userId;
    const questID = req.query.questID || req.query.id;
    if (!userId || !questID) {
      return res.status(400).json({ message: "UserID and QuestID are required" });
    }

    const participantIds = await getQuestPhotoParticipantIds(userId, questID);
    if (!participantIds) {
      return res.status(403).json({ message: "You do not have access to these quest photos" });
    }

    const submissions = await QuestSubmission.find({ userId: { $in: participantIds }, questID })
      .sort({ createdAt: -1 })
      .select('userId photoUrl createdAt');

    const usersById = await getPublicUsersByIdMap(participantIds);

    res.json({
      photos: submissions.map((submission) => ({
        _id: submission._id,
        userId: submission.userId,
        photoUrl: submission.photoUrl,
        createdAt: submission.createdAt,
        owner: usersById.get(submission.userId) || null,
        canDelete: submission.userId === userId
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

function getCloudinaryPublicId(photoUrl) {
  try {
    const url = new URL(photoUrl);
    const uploadPath = '/upload/';
    const uploadIndex = url.pathname.indexOf(uploadPath);
    if (uploadIndex === -1) return null;

    let publicPath = url.pathname.slice(uploadIndex + uploadPath.length);
    publicPath = publicPath.replace(/^v\d+\//, '');
    publicPath = publicPath.replace(/\.[^/.]+$/, '');
    return decodeURIComponent(publicPath);
  } catch (err) {
    return null;
  }
}
