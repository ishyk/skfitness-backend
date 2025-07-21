// File: skfitness-backend/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { v4: uuid } = require("uuid");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const BOOKINGS_JSON = path.join(__dirname, "bookings.json");

// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function getBookings() {
  if (!fs.existsSync(BOOKINGS_JSON)) return [];
  return JSON.parse(fs.readFileSync(BOOKINGS_JSON));
}

function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_JSON, JSON.stringify(bookings, null, 2));
}

// Admin login route
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Get upcoming bookings only
app.get("/api/bookings", (req, res) => {
  const now = new Date();
  const bookings = getBookings().filter((b) => new Date(b.date) >= now);
  res.json(bookings);
});

// Create new booking
app.post("/api/bookings", (req, res) => {
  const { name, phone, date, time } = req.body;
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const booking = {
    id: uuid(),
    name,
    phone,
    date,
    time,
    status: "pending",
  };
  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: "New Booking Received",
    text: `New booking by ${name} on ${date} at ${time}`,
  });

  res.json({ success: true });
});

// Approve or reject booking
app.post("/api/bookings/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const bookings = getBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return res.status(404).json({ error: "Not found" });

  booking.status = status;
  saveBookings(bookings);

  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `Booking ${status}`,
    text: `Booking for ${booking.name} on ${booking.date} at ${booking.time} has been ${status}`,
  });

  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
