const express = require("express");
const router = express.Router();
const Internship = require("../models/Internship");
const Job = require("../models/Job");
const Application = require("../models/Application");
const User = require("../models/User");

router.get("/stats", async (req, res) => {
  try {
    const totalInternships = await Internship.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();
    const totalStudents = await User.countDocuments({ role: "user" });
    const totalRecruiters = await User.countDocuments({ role: "recruiter" });
    const totalCompanies = await Company.countDocuments();
    res.json({
      totalInternships,
      totalJobs,
      totalApplications,
      totalStudents,
      totalRecruiters,
      totalCompanies,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/recent-posts", async (req, res) => {
  try {
    const internships = await Internship.find().sort({ createdAt: -1 }).limit(5);
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(5);

    const combined = [
      ...internships.map((i) => ({ ...i.toObject(), listingType: "Internship" })),
      ...jobs.map((j) => ({ ...j.toObject(), listingType: "Job" })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    // attach applicant counts
    const withCounts = await Promise.all(
      combined.map(async (post) => {
        const count = await Application.countDocuments({ listing: post._id });
        return { ...post, applicantCount: count };
      })
    );

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { getListingFlags } = require("../utils/trustFlags");
const Company = require("../models/Company");

router.get("/companies", async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/listing-flags", async (req, res) => {
  try {
    const internships = await Internship.find();
    const jobs = await Job.find();

    const flagged = [
      ...internships.map((i) => ({ ...i.toObject(), listingType: "Internship" })),
      ...jobs.map((j) => ({ ...j.toObject(), listingType: "Job" })),
    ]
      .map((listing) => ({ ...listing, flags: getListingFlags(listing) }))
      .filter((listing) => listing.flags.length > 0);

    res.json(flagged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;