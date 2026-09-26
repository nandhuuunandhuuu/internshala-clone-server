const express = require("express");
const router = express.Router();
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

// Send a friend request
router.post("/request", async (req, res) => {
  try {
    const { fromFirebaseUid, toUserId } = req.body;
    const fromUser = await User.findOne({ firebaseUid: fromFirebaseUid });
if (!fromUser) return res.status(404).json({ error: "User not found" });
if (fromUser.role !== "user") {
  return res.status(403).json({ error: "Only students can send friend requests" });
}

const toUser = await User.findById(toUserId);
if (!toUser || toUser.role !== "user") {
  return res.status(403).json({ error: "Can only add students as friends" });
}
    if (String(fromUser._id) === String(toUserId)) {
      return res.status(400).json({ error: "Cannot friend yourself" });
    }

    const existing = await FriendRequest.findOne({
      from: fromUser._id,
      to: toUserId,
      status: "pending",
    });
    if (existing) return res.status(409).json({ error: "Request already sent" });

    const request = new FriendRequest({ from: fromUser._id, to: toUserId });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get incoming pending requests for a user
router.get("/requests/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const requests = await FriendRequest.find({ to: user._id, status: "pending" })
      .populate("from", "name email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Respond to a friend request
router.patch("/request/:id", async (req, res) => {
  try {
    const { action } = req.body; // "accept" or "reject"
    const request = await FriendRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Not found" });

    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();

    if (action === "accept") {
      await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
      await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    }

    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a user's friend list
router.get("/list/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid }).populate(
      "friends",
      "name email"
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users to add as friends (by name/email)
router.get("/search", async (req, res) => {
  try {
    const { q, excludeUid } = req.query;
    if (!q) return res.json([]);
    const excludeUser = await User.findOne({ firebaseUid: excludeUid });
    const results = await User.find({
      _id: { $ne: excludeUser?._id },
      role: "user",
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).select("name email").limit(10);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;