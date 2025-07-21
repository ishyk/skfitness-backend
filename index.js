
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const nodemailer = require("nodemailer");
const {{ v4: uuid }} = require("uuid");
const app = express();

app.use(cors());
app.use(express.json());

const BOOKINGS_JSON = "bookings.json";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password123";

// Email Transporter
const transporter = nodemailer.createTransport({{
  service: "gmail",
  auth: {{
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }},
}});

// Ensure bookings file exists
if (!fs.existsSync(BOOKINGS_JSON)) fs.writeFileSync(BOOKINGS_JSON, "[]");

// Helpers
const getBookings = () => JSON.parse(fs.readFileSync(BOOKINGS_JSON));
const saveBookings = (data) => fs.writeFileSync(BOOKINGS_JSON, JSON.stringify(data, null, 2));
const isFuture = (date) => new Date(date) >= new Date();

// Admin login route
app.post("/api/admin/login", (req, res) => {{
  const {{ username, password }} = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {{
    res.status(200).json({{ success: true }});
  }} else {{
    res.status(401).json({{ error: "Invalid credentials" }});
  }}
}});

// Get only future bookings
app.get("/api/bookings", (req, res) => {{
  const bookings = getBookings().filter(b => isFuture(b.date));
  res.json(bookings);
}});

// Create new booking
app.post("/api/bookings", (req, res) => {{
  const {{ name, phone, date, time }} = req.body;
  if (!name || !phone || !date || !time) {{
    return res.status(400).json({{ error: "Missing fields" }});
  }}

  const newBooking = {{
    id: uuid(),
    name,
    phone,
    date,
    time,
    status: "pending",
  }};

  const bookings = getBookings();
  bookings.push(newBooking);
  saveBookings(bookings);

  transporter.sendMail({{
    from: process.env.EMAIL_USER,
    to: phone + "@example.com",
    subject: "Booking Received",
    text: `Thanks ${name}, your booking is received for ${date} at ${time}.`,
  }});

  res.status(201).json({{ success: true, message: "Booking created and email sent." }});
}});

// Admin approve/reject
app.post("/api/bookings/status", (req, res) => {{
  const {{ id, status }} = req.body;
  const bookings = getBookings();
  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({{ error: "Not found" }});

  booking.status = status;
  saveBookings(bookings);

  transporter.sendMail({{
    from: process.env.EMAIL_USER,
    to: booking.phone + "@example.com",
    subject: "Booking " + status,
    text: `Your booking for ${booking.date} at ${booking.time} has been ${status}.`,
  }});

  res.status(200).json({{ success: true }});
}});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Server running on", PORT));
