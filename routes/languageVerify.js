const express = require("express");
const router = express.Router();
const User = require("../models/User");

const { BrevoClient } = require("@getbrevo/brevo");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/request-french-otp", async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = generateOtp();
    user.resetCode = otp; // reusing existing field to avoid another schema change
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

        try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: { name: "CareerLaunch", email: "careerlauch@gmail.com" },
        to: [{ email: user.email }],
        subject: "Verify to switch to French - CareerLaunch",
        htmlContent: `<p>Your verification code to enable French language is: <strong>${otp}</strong></p><p>Expires in 10 minutes.</p>`,
      });
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
      return res.status(502).json({ error: "Failed to send OTP. Please try again." });
    }

    res.json({ message: "OTP sent." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify-french-otp", async (req, res) => {
  try {
    const { firebaseUid, otp } = req.body;
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

    res.json({ verified: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;