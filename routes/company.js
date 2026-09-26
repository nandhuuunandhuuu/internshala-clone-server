const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const User = require("../models/User");

// Create a company (recruiter signup step)
router.post("/", async (req, res) => {
  try {
    const { firebaseUid, name, website, description, industry } = req.body;

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const company = new Company({
      name,
      website,
      description,
      industry,
      createdBy: user._id,
    });
    const savedCompany = await company.save();

    user.role = "recruiter";
    user.companyId = savedCompany._id;
    await user.save();

    res.status(201).json(savedCompany);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a company by ID
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: "Not found" });
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get company by the recruiter's firebaseUid
router.get("/by-user/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user || !user.companyId) return res.status(404).json({ error: "No company found" });
    const company = await Company.findById(user.companyId);
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a company
router.put("/:id", async (req, res) => {
  try {
    const updated = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all companies (admin use)
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: verify or unverify a company
router.patch("/:id/verify", async (req, res) => {
  try {
    const { verified } = req.body;
    const updated = await Company.findByIdAndUpdate(req.params.id, { verified }, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
module.exports = router;