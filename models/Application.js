const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listingType: { type: String, enum: ["Internship", "Job"], required: true },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "listingType",
    },
    status: {
      type: String,
      enum: ["Under Review", "Shortlisted", "Rejected"],
      default: "Under Review",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);