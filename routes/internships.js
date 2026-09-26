const express = require("express");
const router = express.Router();
const Internship = require("../models/Internship");

 /*GET all internships
router.get("/", async (req, res) => {
  try {
    const internships = await Internship.find().sort({ createdAt: -1 });
    res.json(internships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

// GET single internship by ID
router.get("/:id", async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ error: "Not found" });
    res.json(internship);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); 
router.get("/", async (req, res) => {
  try {
    const Application = require("../models/Application");
    const internships = await Internship.find().sort({ createdAt: -1 });
    const withCounts = await Promise.all(
      internships.map(async (i) => {
        const count = await Application.countDocuments({ listing: i._id });
        return { ...i.toObject(), applicantCount: count };
      })
    );
    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new internship
router.post("/", async (req, res) => {
  try {
    const internship = new Internship(req.body);
    const saved = await internship.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update an internship
router.put("/:id", async (req, res) => {
  try {
    const updated = await Internship.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete an internship
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Internship.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;