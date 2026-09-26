const express = require("express");
const router = express.Router();
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    const internships = await Internship.find({}, "skills");
    const jobs = await Job.find({}, "skills");
    const users = await User.find({}, "skills");

    const allSkills = [
      ...internships.flatMap((i) => i.skills || []),
      ...jobs.flatMap((j) => j.skills || []),
      ...users.flatMap((u) => u.skills || []),
    ];

    const unique = Array.from(
      new Set(allSkills.map((s) => s.trim()).filter(Boolean))
    ).sort();

    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;