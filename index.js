// File: skfitness-backend/index.js

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const BOOKINGS_JSON = "bookings.json";
const BOOKINGS_CSV = "bookings.csv";

// Initialize files if missing
if (!fs.existsSync(BOOKINGS_JSON)) fs.writeFileSync(BOOKINGS_JSON, "[]");
if (!fs.existsSync(BOOKINGS_CSV)) fs.writeFileSync(BOOKINGS_CSV, "id,name,phone,date,time,status\n");

// Email Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_EMAIL@gmail.com",      // <-- replace this
    pass: "YOUR_APP_PASSWORD",         // <-- replace this
  },
});

// Utils
const getBookings = () => JSON.parse(fs.readFileSync(BOOKINGS_JSON));
const saveBookings = (data) => fs.writeFileSync(BOOKINGS_JSON, JSON.stringify(data, null, 2));

// Routes
app.get("/api/bookings", (req, res) => {
  res.json(getBookings());
});

app.post("/api/bookings", (req, res) => {
  const { name, phone, date, time } = req.body;
  const id = uuid();
  const booking = { id, name, phone, date, time, status: "pending" };

  const bookings = getBookings();
  bookings.push(booking);
  saveBookings(bookings);

  // Append to CSV
  fs.appendFileSync(BOOKINGS_CSV, `${id},${name},${phone},${date},${time},pending\n`);

  // Send Email
  transporter.sendMail({
    from: '"SKFitness" <YOUR_EMAIL@gmail.com>',
    to: "YOUR_EMAIL@gmail.com",
    subject: "📅 New Booking Received",
    text: `Name: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}`,
  });

  res.status(201).json({ success: true });
});

app.patch("/api/bookings/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const bookings = getBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  booking.status = status;
  saveBookings(bookings);

  res.json({ success: true });
});

app.listen(4000, () => {
  console.log("✅ SKFitness API running at http://localhost:4000");
});
