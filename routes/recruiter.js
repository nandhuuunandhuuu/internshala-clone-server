const express = require("express");
const router = express.Router();
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");

router.get("/:firebaseUid/listings", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const internships = await Internship.find({ postedBy: user._id });
    const jobs = await Job.find({ postedBy: user._id });

    const combined = [
      ...internships.map((i) => ({ ...i.toObject(), listingType: "Internship" })),
      ...jobs.map((j) => ({ ...j.toObject(), listingType: "Job" })),
    ];

    const withCounts = await Promise.all(
      combined.map(async (post) => {
        const count = await Application.countDocuments({ listing: post._id });
        return { ...post, applicantCount: count };
      })
    );

    res.json(withCounts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;