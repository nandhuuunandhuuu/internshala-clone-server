const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    skills: [{ type: String }],
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);