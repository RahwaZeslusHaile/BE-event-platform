import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import crypto from "crypto";
import Stripe from "stripe";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json()); 

const USERS_FILE = path.join(process.cwd(), "server", "users.json");
function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    return [];
  }
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function generateToken(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing authorization" });
  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/signup", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

  const users = readUsers();
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: crypto.randomUUID(), email, password: hashed, role: role || "member" };
  users.push(newUser);
  writeUsers(users);

  const token = generateToken(newUser);
  res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/events", async (req, res) => {
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events?apikey=${process.env.TICKETMASTER_API_KEY}&keyword=music&locale=*&startDateTime=2025-10-09T00:00:00Z&city=MANCHESTER`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch from Ticketmaster");

    const data = await response.json();
    const events = data._embedded?.events || [];

    const simplifiedEvents = events.map((event) => {
      const hash = crypto.createHash("md5").update(event.id).digest("hex");
      const basePrice = parseInt(hash.slice(0, 2), 16) % 3;
      let priceType, price;

      if (basePrice === 0) {
        priceType = "Free";
        price = 0;
      } else if (basePrice === 1) {
        priceType = "Paid";
        price = 10 + (event.id.charCodeAt(1) % 10);
      } else {
        priceType = "Pay as you feel";
        price = null;
      }

      return {
        id: event.id,
        title: event.name,
        description: event.info || event.pleaseNote || null,
        date: event.dates?.start?.localDate || "Unknown Date",
        venue: event._embedded?.venues?.[0]?.name || "Unknown Venue",
        category: event.classifications?.[0]?.segment?.name || "Uncategorized",
        priceType,
        price,
        image: event.images?.[0]?.url || "https://via.placeholder.com/300x200?text=No+Image",
      };
    });

    const mockEvents = [
      {
        id: "local1",
        title: "Community Coding Workshop",
        description: "A hands-on workshop for beginners to learn HTML, CSS, and JS.",
        date: "2025-10-25",
        venue: "Tech Space Manchester",
        category: "Education",
        priceType: "Free",
        price: 0,
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6Py-2KvvPBcjzIFzUswsxeB4FyMl3_GOpRw&s",
      },
      {
        id: "local2",
        title: "Fundraising Dinner Night",
        description: "Enjoy food and music while supporting local charities.",
        date: "2025-11-05",
        venue: "The Hive Hall",
        category: "Charity",
        priceType: "Paid",
        price: 25,
        image: "https://assets.partywizz.com/blog/20230313084320/gala-1060382_1920.jpg",
      },
    ];

    res.json([...mockEvents, ...simplifiedEvents]);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { title, price } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({ error: "Invalid price" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: title },
            unit_amount: price * 100, 
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:5173/success", 
      cancel_url: "http://localhost:5173/cancel",
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ error: "Payment failed" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
