
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fetch from "node-fetch";


const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index", {
    corrected: null,
    originalText: "",
  });
});

// OpenRouter API
app.post("/correct", async (req, res) => {
  const text = req.body.text.trim();

  if (!text) {
    return res.render("index", {
      corrected: "Please enter some text to correct.",
      originalText: text,
    });
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },

        body: JSON.stringify({
          model: "openai/gpt-4o-mini",

          messages: [
            {
              role: "system",
              content: "You are a grammar correction assistant.",
            },
            {
              role: "user",
              content: `Correct the grammar of this text: "${text}"`,
            },
          ],

          max_tokens: 100,
          temperature: 0.5,
        }),
      },
    );

    // Error handling
    if (!response.ok) {
        const errorText = await response.text();
        console.log("API ERROR:", errorText);

      return res.render("index", {
        corrected: "Error correcting text. Please try again later.",
        originalText: text,
      });
    }

    // Response data
    const data = await response.json();

    const correctedText = data.choices[0].message.content.trim();

    res.render("index", {
      corrected: correctedText,
      originalText: text,
    });
  } catch (error) {
    console.error("Error:", error);

    res.render("index", {
      corrected: "An error occurred while processing your request.",
      originalText: text,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});