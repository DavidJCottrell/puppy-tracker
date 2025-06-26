const express = require("express");
const fs = require("fs");
const cors = require("cors");
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const LOG_FILE = "log.json";

// Load existing logs or initialize file
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, JSON.stringify([]));
}

app.get("/api/logs", (req, res) => {
  const logs = JSON.parse(fs.readFileSync(LOG_FILE));
  res.json(logs);
});

app.post("/api/logs", (req, res) => {
  const { type, time, notes } = req.body;
  const logs = JSON.parse(fs.readFileSync(LOG_FILE));
  logs.unshift({ type, time, notes, id: Date.now() });
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  res.status(201).json({ success: true });
});

app.delete("/api/logs/:id", (req, res) => {
  const logs = JSON.parse(fs.readFileSync(LOG_FILE));
  const updatedLogs = logs.filter((log) => log.id !== Number(req.params.id));
  fs.writeFileSync(LOG_FILE, JSON.stringify(updatedLogs, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
