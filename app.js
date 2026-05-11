
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fetch from "node-fetch";
import session from "express-session";

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// Middleware
// ======================

app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 5 * 60 * 1000, // 5 minutes
      httpOnly: true,
    },
  }),
);

app.set("view engine", "ejs");

// ======================
// Routes
// ======================

app.get("/", (req, res) => {
  const { corrected = null, originalText = "" } = req.session;

  // Clear session messages after rendering
  req.session.corrected = null;
  req.session.originalText = "";

  res.render("index", {
    corrected,
    originalText,
  });
});

app.post("/correct", async (req, res) => {
  const text = req.body.text?.trim();

  // Validate input
  if (!text) {
    req.session.corrected = "Please enter text.";
    req.session.originalText = "";
    return res.redirect("/");
  }

  // Prevent huge requests
  if (text.length > 1000) {
    req.session.corrected =
      "Text is too long. Maximum 1000 characters allowed.";
    req.session.originalText = text;
    return res.redirect("/");
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "AI Grammar Corrector",
        },

        body: JSON.stringify({
          model: "openai/gpt-4o-mini",

          messages: [
            {
              role: "system",
              content:
                "You are a professional grammar correction assistant. Correct grammar, spelling, punctuation, and sentence clarity only.",
            },
            {
              role: "user",
              content: text,
            },
          ],

          max_tokens: 150,
          temperature: 0.3,
        }),
      },
    );

    // Handle API errors
    if (!response.ok) {
      const errorText = await response.text();

      console.error("OPENROUTER ERROR:", errorText);

      req.session.corrected = "Unable to process request right now.";
      req.session.originalText = text;

      return res.redirect("/");
    }

    const data = await response.json();

    const correctedText =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No correction available.";

    req.session.corrected = correctedText;
    req.session.originalText = text;

    res.redirect("/");
  } catch (error) {
    console.error("SERVER ERROR:", error.message);

    req.session.corrected = "Server error occurred. Please try again.";

    req.session.originalText = text;

    res.redirect("/");
  }
});

// ======================
// Start Server
// ======================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});