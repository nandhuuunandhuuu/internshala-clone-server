const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const User = require("../models/User");
const { isWithinPaymentWindow } = require("../utils/plans");

const { BrevoClient } = require("@getbrevo/brevo");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Step 1: request OTP (only for premium/paid-plan users)
router.post("/request-otp", async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.plan === "free") {
      return res.status(403).json({
        error: "Resume creation is available on paid plans only. Please upgrade to continue.",
      });
    }

    const otp = generateOtp();
    user.resumeOtp = otp;
    user.resumeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

        try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: { name: "CareerLaunch", email: "careerlauch@gmail.com" },
        to: [{ email: user.email }],
        subject: "Your CareerLaunch Resume Payment OTP",
        htmlContent: `<p>Your OTP to confirm resume creation payment is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
      return res.status(502).json({ error: "Failed to send OTP. Please try again." });
    }

    res.json({ message: "OTP sent to your registered email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { firebaseUid, otp } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.resumeOtp || user.resumeOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }
    if (new Date() > new Date(user.resumeOtpExpires)) {
      return res.status(400).json({ error: "OTP expired. Please request a new one." });
    }

    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 3: save generated resume URL after successful payment + generation
router.post("/save", async (req, res) => {
  try {
    const { firebaseUid, resumeUrl } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.generatedResumeUrl = resumeUrl;
    user.resumeUrl = resumeUrl; // also updates the main resume shown on profile
    user.resumeOtp = null;
    user.resumeOtpExpires = null;
    await user.save();

    res.json({ message: "Resume saved to your profile." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;