const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4000;
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

app.use(cors());
app.use(bodyParser.json());

// Load bookings
function loadBookings() {
  if (!fs.existsSync(BOOKINGS_FILE)) return [];
  const data = fs.readFileSync(BOOKINGS_FILE);
  return JSON.parse(data);
}

// Save bookings
function saveBookings(bookings) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const bookings = loadBookings();
  res.json(bookings);
});

// Create new booking
app.post('/api/bookings', (req, res) => {
  const { name, phone, date, time } = req.body;
  if (!name || !phone || !date || !time) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const newBooking = {
    id: uuidv4(),
    name,
    phone,
    date,
    time,
    status: 'pending',
  };

  const bookings = loadBookings();
  bookings.push(newBooking);
  saveBookings(bookings);

  res.status(201).json({ message: 'Booking created', booking: newBooking });
});

// Approve/Reject booking
app.patch('/api/bookings/:id', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const bookings = loadBookings();
  const booking = bookings.find((b) => b.id === id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  booking.status = status;
  saveBookings(bookings);
  res.json({ message: `Booking ${status}`, booking });
});

app.listen(PORT, () => {
  console.log(`✅ SKFitness API running at http://localhost:${PORT}`);
});
