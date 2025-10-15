import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch"; 

import crypto from "crypto";


dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());

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
        image: "data:image/png;base64,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",
      },
    ];


    const allEvents = [...mockEvents, ...simplifiedEvents];

    res.json(allEvents);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
