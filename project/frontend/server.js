/**
 * LCD-Vahid frontend server.
 *
 * Serves the original (visually untouched) HTML pages as static files.
 * All dynamic data comes from the Python backend API (http://localhost:5000),
 * called directly from the browser via fetch() inside the pages.
 */
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

app.use(express.static(PUBLIC_DIR));

// Serve the Main Page at the root URL.
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "main page.html"));
});

app.listen(PORT, () => {
  console.log(`LCD-Vahid frontend running at http://localhost:${PORT}`);
});
