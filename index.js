const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const internshipRoutes = require("./routes/internships");
const jobRoutes = require("./routes/jobs");
const userRoutes = require("./routes/users");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admin");
const companyRoutes = require("./routes/company");
const recruiterRoutes = require("./routes/recruiter");
const skillsRoutes = require("./routes/skills");
const friendRoutes = require("./routes/friends");
const postRoutes = require("./routes/posts");
const passwordResetRoutes = require("./routes/passwordReset");
const paymentRoutes = require("./routes/payments");
const resumeBuilderRoutes = require("./routes/resumeBuilder");
const languageVerifyRoutes = require("./routes/languageVerify");
const loginTrackingRoutes = require("./routes/loginTracking");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CareerLaunch API is running");
});

app.use("/api/internships", internshipRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/resume-builder", resumeBuilderRoutes);
app.use("/api/language", languageVerifyRoutes);
app.use("/api/login-tracking", loginTrackingRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});