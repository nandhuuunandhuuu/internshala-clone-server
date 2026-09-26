const express = require("express");
const router = express.Router();
const User = require("../models/User");
const admin = require("../firebaseAdmin");
const { generatePassword } = require("../utils/passwordGenerator");
const { BrevoClient } = require("@getbrevo/brevo");
const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

// Step 1: request a code
router.post("/request", async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.status(404).json({ error: "No account found with that email or phone number." });
    }

    if (user.lastPasswordResetAt) {
      const last = new Date(user.lastPasswordResetAt);
      const now = new Date();
      const isSameDay =
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();

      if (isSameDay) {
        return res.status(429).json({ error: "You can use this option only once per day." });
      }
    }

    const code = generateCode();
    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

        try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: { name: "CareerLaunch", email: "your_verified_brevo_sender@email.com" },
        to: [{ email: user.email }],
        subject: "Your CareerLaunch password reset code",
        htmlContent: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (mailErr) {
      console.error("Email send failed:", mailErr);
      return res.status(502).json({ error: "Failed to send verification code. Please try again." });
    }

    res.json({ message: "Verification code sent to your email." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: verify code + reset password (auto-generated or user-chosen)
router.post("/confirm", async (req, res) => {
  try {
    const { identifier, code, customPassword } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) return res.status(404).json({ error: "Account not found." });

    if (!user.resetCode || user.resetCode !== code) {
      return res.status(400).json({ error: "Invalid verification code." });
    }
    if (new Date() > new Date(user.resetCodeExpires)) {
      return res.status(400).json({ error: "Code expired. Please request a new one." });
    }

    const newPassword = customPassword && customPassword.length >= 6
      ? customPassword
      : generatePassword(10);

    await admin.auth().updateUser(user.firebaseUid, { password: newPassword });

    user.lastPasswordResetAt = new Date();
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({
      message: "Password reset successful.",
      newPassword: customPassword ? null : newPassword, // only show if auto-generated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;