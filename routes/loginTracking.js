const express = require("express");
const router = express.Router();
const User = require("../models/User");
const LoginHistory = require("../models/LoginHistory");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isMobileLoginWindowOpen() {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + istOffset) % (24 * 60);
  const istHour = Math.floor(istMinutes / 60);
  return istHour >= 10 && istHour < 13; // 10:00 AM - 12:59 PM IST
}

// Step 1: check login environment BEFORE granting access
router.post("/check", async (req, res) => {
  try {
    const { firebaseUid, browser, os, deviceType } = req.body;
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "Unknown";    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (deviceType === "mobile" && !isMobileLoginWindowOpen()) {
      return res.status(403).json({
        error: "Mobile login is only allowed between 10:00 AM and 1:00 PM IST.",
      });
    }

    if (browser.toLowerCase().includes("chrome")) {
      const otp = generateOtp();
      user.resetCode = otp;
      user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

            try {
        await resend.emails.send({
          from: "CareerLaunch <onboarding@resend.dev>",
          to: user.email,
          subject: "Verify your Chrome login - CareerLaunch",
          html: `<p>Your login verification code is: <strong>${otp}</strong></p><p>Expires in 10 minutes.</p>`,
        });
      } catch (mailErr) {
        console.error("Email send failed:", mailErr);
        return res.status(502).json({ error: "Failed to send OTP email. Please try again." });
      }

      return res.json({ requiresOtp: true, message: "OTP sent to your email." });
    }

    // No OTP needed - log the login directly
    await LoginHistory.create({ user: user._id, browser, os, deviceType, ipAddress });
    res.json({ requiresOtp: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: verify OTP for Chrome logins, then log it
router.post("/verify", async (req, res) => {
  try {
    const { firebaseUid, otp, browser, os, deviceType } = req.body;
    const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "Unknown";

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.resetCode || user.resetCode !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }
    if (new Date() > new Date(user.resetCodeExpires)) {
      return res.status(400).json({ error: "OTP expired." });
    }

    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    await LoginHistory.create({ user: user._id, browser, os, deviceType, ipAddress });
    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get login history for a user
router.get("/history/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const history = await LoginHistory.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
