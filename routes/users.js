const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { computeMatch } = require("../utils/matching");
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const Application = require("../models/Application");

// Create a new user (called right after Firebase signup)
router.post("/", async (req, res) => {
  try {
    const user = new User(req.body);
    const saved = await user.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a user by their Firebase UID
router.get("/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user role by firebaseUid
router.get("/role/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.json({ role: "user" });
    res.json({ role: user.role, suspended: user.suspended });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMPORARY: create-or-promote a user to admin by firebaseUid (remove after use)
router.post("/make-admin", async (req, res) => {
  try {
    const { firebaseUid, email, name } = req.body;
    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { firebaseUid, email, name: name || "Admin", role: "admin" },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
router.put("/:firebaseUid", async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get personalized opportunities for a student, ranked by skill match
router.get("/:firebaseUid/recommendations", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const internships = await Internship.find();
    const jobs = await Job.find();

    const combined = [
      ...internships.map((i) => ({ ...i.toObject(), listingType: "Internship" })),
      ...jobs.map((j) => ({ ...j.toObject(), listingType: "Job" })),
    ];

    const withMatch = combined.map((listing) => {
      const match = computeMatch(user.skills || [], listing.skills || []);
      return {
        ...listing,
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

// Career readiness score + roadmap suggestions
router.get("/:firebaseUid/readiness", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Profile completeness (out of 40)
    let profileScore = 0;
    if (user.name) profileScore += 8;
    if (user.phone) profileScore += 8;
    if (user.education) profileScore += 8;
    if (user.resumeUrl) profileScore += 8;
    if (user.skills && user.skills.length > 0) profileScore += 8;

    // Skills breadth (out of 30) - caps at 6 skills
    const skillsScore = Math.min((user.skills?.length || 0) * 5, 30);

    // Activity: applications made (out of 30) - caps at 3 applications
    const applicationCount = await Application.countDocuments({ user: user._id });
    const activityScore = Math.min(applicationCount * 10, 30);

    const totalScore = profileScore + skillsScore + activityScore;

    // Roadmap suggestions - simple rule-based tips
    const tips = [];
    if (!user.resumeUrl) tips.push("Upload your resume to strengthen your profile.");
    if (!user.skills || user.skills.length < 3)
      tips.push("ADD_SKILLS_PROMPT");
    if (!user.education) tips.push("Add your education details.");
    if (applicationCount === 0)
      tips.push("Apply to your first internship or job to start building experience.");
    if (applicationCount > 0 && applicationCount < 3)
      tips.push("Keep applying - aim for at least 3 active applications.");
    if (tips.length === 0)
      tips.push("Great work! Keep your skills updated as you learn new things.");

    res.json({
      totalScore,
      breakdown: { profileScore, skillsScore, activityScore },
      tips,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list all users
router.get("/admin/all", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/:id/suspend", async (req, res) => {
  try {
    const { suspended } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { suspended },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:firebaseUid", async (req, res) => {
  try {
    const admin = require("../firebaseAdmin");
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    await admin.auth().deleteUser(req.params.firebaseUid);
    await User.findByIdAndDelete(user._id);

    res.json({ message: "Account deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:firebaseUid/email", async (req, res) => {
  try {
    const admin = require("../firebaseAdmin");
    const { newEmail } = req.body;

    await admin.auth().updateUser(req.params.firebaseUid, { email: newEmail });

    const updated = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { email: newEmail },
      { new: true }
    );

    res.json({ message: "Email updated successfully.", user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;