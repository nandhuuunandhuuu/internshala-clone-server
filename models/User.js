const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    education: { type: String },
    skills: [{ type: String }],
    resumeUrl: { type: String, default: "" },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    role: { type: String, enum: ["user", "admin", "recruiter"], default: "user" },
    suspended: { type: Boolean, default: false },
    lastPasswordResetAt: { type: Date, default: null },
    resetCode: { type: String, default: null },
    resetCodeExpires: { type: Date, default: null },  
    plan: { type: String, enum: ["free", "bronze", "silver", "gold"], default: "free" },
    planRenewedAt: { type: Date, default: null },
    applicationsThisMonth: { type: Number, default: 0 },  
    generatedResumeUrl: { type: String, default: "" },
    resumeOtp: { type: String, default: null },
    resumeOtpExpires: { type: Date, default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);