const express = require("express");
const router = express.Router();
const Application = require("../models/Application");
const User = require("../models/User");
const { computeMatch } = require("../utils/matching");
const { getMonthlyLimit, resetIfNewMonth } = require("../utils/plans");

// Create a new application
router.post("/", async (req, res) => {
  try {
    const { firebaseUid, listingType, listingId } = req.body;

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });
     if (user.role !== "user") {
    return res.status(403).json({ error: "Only students can apply to listings" });
    }
    if (user.suspended) {
  return res.status(403).json({ error: "Your account has been suspended." });
    }
    resetIfNewMonth(user);
    const limit = getMonthlyLimit(user.plan);
    if (user.applicationsThisMonth >= limit) {
    return res.status(403).json({
    error: `You've reached your ${user.plan} plan limit (${limit === Infinity ? "unlimited" : limit} application${limit !== 1 ? "s" : ""}/month). Upgrade your plan to apply for more.`,
    });
    }

    // Check if already applied
    const existing = await Application.findOne({
      user: user._id,
      listing: listingId,
      listingType,
    });
    if (existing) {
      return res.status(409).json({ error: "Already applied to this listing" });
    }

    const application = new Application({
      user: user._id,
      listingType,
      listing: listingId,
    });

    const saved = await application.save();
    user.applicationsThisMonth += 1;
    await user.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all applications for a specific user
router.get("/user/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const applications = await Application.find({ user: user._id })
      .populate("listing")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/recruiter/:firebaseUid", async (req, res) => {
  try {
    const recruiterUser = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!recruiterUser) return res.status(404).json({ error: "User not found" });

    const applications = await Application.find()
      .populate("user", "name email skills")
      .populate("listing")
      .sort({ createdAt: -1 });

    // Filter to only this recruiter's listings
    const filtered = applications.filter(
      (app) => app.listing && String(app.listing.postedBy) === String(recruiterUser._id)
    );

    const withMatch = filtered.map((app) => {
      const match = computeMatch(app.user?.skills || [], app.listing?.skills || []);
      return {
        ...app.toObject(),
        matchScore: match.score,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
      };
    });

    withMatch.sort((a, b) => b.matchScore - a.matchScore);

    res.json(withMatch);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// Get all applicants across all listings (for admin)
router.get("/admin/all", async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("user", "name email")
      .populate("listing")
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update application status (admin)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/check/:firebaseUid/:listingId", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.json({ applied: false });

    const existing = await Application.findOne({
      user: user._id,
      listing: req.params.listingId,
    });

    res.json({ applied: !!existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});