import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Limit to 5 requests per minute
const limiter = rateLimit({ windowMs: 60 * 1000, max: 5 });
app.use("/otp/", limiter);

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, PORT } = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Health check
app.get("/", (req, res) => {
  res.json({ ok: true, service: "OTP", time: new Date().toISOString() });
});

// Send OTP
app.post("/otp/send", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone required" });

    const verification = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: "sms" });

    res.json({ status: verification.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
app.post("/otp/verify", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "phone and code required" });

    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    res.json({ status: check.status, valid: check.status === "approved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
