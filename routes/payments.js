const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const { PLANS, isWithinPaymentWindow } = require("../utils/plans");
const nodemailer = require("nodemailer");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Step 1: create a Razorpay order (checks time window first)
router.post("/create-order", async (req, res) => {
  try {
    if (!isWithinPaymentWindow()) {
      return res.status(403).json({
        error: "Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try again during that window.",
      });
    }

    const { planKey } = req.body;

    let plan;
    if (planKey === "resume_50") {
      plan = { label: "Resume Creation", price: 50, limit: null };
    } else {
      plan = PLANS[planKey];
    }

    if (!plan || plan.price === 0) {
      return res.status(400).json({ error: "Invalid plan selected." });
    }

    const order = await razorpay.orders.create({
      amount: plan.price * 100, // paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    res.json({ order, keyId: process.env.RAZORPAY_KEY_ID, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: verify payment signature and activate plan
router.post("/verify", async (req, res) => {
  try {
    if (!isWithinPaymentWindow()) {
      return res.status(403).json({
        error: "Payments are only allowed between 10:00 AM and 11:00 AM IST.",
      });
    }

    const {
      firebaseUid,
      planKey,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed." });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found." });

    user.plan = planKey;
    user.planRenewedAt = new Date();
    user.applicationsThisMonth = 0;
    await user.save();

    const plan = PLANS[planKey];

    await transporter.sendMail({
      from: `"CareerLaunch" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: "Your CareerLaunch subscription invoice",
      html: `
        <h2>Payment Successful</h2>
        <p>Thank you for subscribing to the <strong>${plan.label}</strong> plan.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
          <tr><td style="padding:6px 0;">Plan</td><td style="padding:6px 0;"><strong>${plan.label}</strong></td></tr>
          <tr><td style="padding:6px 0;">Amount Paid</td><td style="padding:6px 0;">₹${plan.price}</td></tr>
          <tr><td style="padding:6px 0;">Applications/month</td><td style="padding:6px 0;">${plan.limit === Infinity ? "Unlimited" : plan.limit}</td></tr>
          <tr><td style="padding:6px 0;">Payment ID</td><td style="padding:6px 0;">${razorpay_payment_id}</td></tr>
          <tr><td style="padding:6px 0;">Date</td><td style="padding:6px 0;">${new Date().toLocaleString()}</td></tr>
        </table>
        <p style="margin-top:16px;">This plan renews monthly.</p>
      `,
    });

    res.json({ message: "Payment verified and plan activated.", plan: planKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current plan info
router.get("/plan/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      plan: user.plan,
      applicationsThisMonth: user.applicationsThisMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;