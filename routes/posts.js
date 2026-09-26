const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const { getDailyPostLimit } = require("../utils/postingLimits");

// Create a post (enforces daily limit based on friend count)
router.post("/", async (req, res) => {
  try {
    const { firebaseUid, mediaUrl, mediaType, caption } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const friendCount = user.friends?.length || 0;
    const limit = getDailyPostLimit(friendCount);

    if (limit === 0) {
      return res.status(403).json({
        error: "You need at least 1 friend to post in the Public Space.",
      });
    }

    if (limit !== Infinity) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const postsToday = await Post.countDocuments({
        user: user._id,
        createdAt: { $gte: startOfDay },
      });
      if (postsToday >= limit) {
        return res.status(403).json({
          error: `Daily post limit reached (${limit} post${limit > 1 ? "s" : ""}/day with ${friendCount} friend${friendCount > 1 ? "s" : ""}). Add more friends to unlock more posts.`,
        });
      }
    }

    const post = new Post({ user: user._id, mediaUrl, mediaType, caption });
    const saved = await post.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get the public feed
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "name")
      .populate("comments.user", "name")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like / unlike a post
router.patch("/:id/like", async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });

    const alreadyLiked = post.likes.some((id) => String(id) === String(user._id));
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== String(user._id));
    } else {
      post.likes.push(user._id);
    }
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add a comment
router.post("/:id/comment", async (req, res) => {
  try {
    const { firebaseUid, text } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });

    post.comments.push({ user: user._id, text });
    await post.save();
    const updated = await Post.findById(req.params.id)
      .populate("user", "name")
      .populate("comments.user", "name");
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get current user's remaining posts for today (for UI display)
router.get("/limit/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const friendCount = user.friends?.length || 0;
    const limit = getDailyPostLimit(friendCount);

    let postsToday = 0;
    if (limit !== Infinity && limit !== 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      postsToday = await Post.countDocuments({
        user: user._id,
        createdAt: { $gte: startOfDay },
      });
    }

    res.json({
      friendCount,
      limit: limit === Infinity ? "unlimited" : limit,
      postsToday,
      canPost: limit === Infinity || postsToday < limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;