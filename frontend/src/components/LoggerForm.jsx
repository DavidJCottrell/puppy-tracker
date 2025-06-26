import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Stack,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import { logEvent, getLogs, deleteLog } from "../utils/api";

const activityTypes = [
  { label: "Meal", emoji: "🥣" },
  { label: "Poop", emoji: "💩" },
  { label: "Wee", emoji: "🚽" },
  { label: "Walk (start)", emoji: "🐾" },
  { label: "Walk (end)", emoji: "🐾" },
  { label: "Nap (start)", emoji: "😴" },
  { label: "Nap (end)", emoji: "😴" },
  { label: "Awake", emoji: "🌞" },
];

export default function LoggerForm() {
  const [selectedType, setSelectedType] = useState("");
  const [overrideTime, setOverrideTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getLogs().then(setLogs);
  }, []);

  const handleLog = async () => {
    if (!selectedType) return;
    const time = overrideTime
      ? new Date(overrideTime).toISOString()
      : new Date().toISOString();

    await logEvent({
      type: selectedType,
      time,
      notes,
    });

    setLogs(await getLogs());
    setSelectedType("");
    setOverrideTime(new Date());
    setNotes("");
  };

  function groupLogsByDate(logs) {
    const groups = {};

    logs.forEach((log) => {
      const d = new Date(log.time);
      const dateKey = d.toISOString().split("T")[0]; // e.g., '2025-06-26'

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return groups;
  }

  function extractNapSessions(logs) {
    const sorted = [...logs].sort((a, b) => new Date(a.time) - new Date(b.time));
    const sessions = [];
    let lastStart = null;

    sorted.forEach((log) => {
      const time = new Date(log.time);

      if (log.type === "Nap (start)") {
        lastStart = time;
      }

      if (log.type === "Nap (end)" && lastStart && time > lastStart) {
        sessions.push({ start: lastStart, end: time });
        lastStart = null; // reset after pairing
      }
    });

    return sessions;
  }

  function getDaySummary(dayLogs, napSessions, dayKey) {
    const mealCount = dayLogs.filter((log) => log.type === "Meal").length;
    const poopCount = dayLogs.filter((log) => log.type === "Poop").length;

    const startOfDay = new Date(dayKey + "T00:00:00");
    const endOfDay = new Date(dayKey + "T23:59:59");

    let totalNapMs = 0;

    napSessions.forEach(({ start, end }) => {
      const napStart = start < startOfDay ? startOfDay : start;
      const napEnd = end > endOfDay ? endOfDay : end;

      if (napStart < napEnd) {
        totalNapMs += napEnd - napStart;
      }
    });

    const totalNapMins = Math.round(totalNapMs / 60000);
    const napHours = Math.floor(totalNapMins / 60);
    const napMins = totalNapMins % 60;

    return {
      mealCount,
      poopCount,
      napDuration: `${napHours}h ${napMins}m`,
    };
  }

  const groupedLogs = groupLogsByDate(logs);
  const allNapSessions = extractNapSessions(logs);

  console.log(allNapSessions)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Stack spacing={2} direction="row" flexWrap="wrap">
        {activityTypes.map(({ label, emoji }) => (
          <Button
            key={label}
            variant={selectedType === label ? "contained" : "outlined"}
            onClick={() => setSelectedType(label)}
          >
            {emoji} {label}
          </Button>
        ))}
      </Stack>

      <MobileTimePicker
        label="Override Time"
        value={overrideTime}
        onChange={(newValue) => setOverrideTime(newValue)}
        slotProps={{ textField: { fullWidth: true, sx: { mt: 2 } } }}
      />

      <TextField
        fullWidth
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{ mt: 2 }}
      />

      <Button variant="contained" fullWidth onClick={handleLog} sx={{ mt: 2 }}>
        Log Entry
      </Button>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h6">Activity Log</Typography>
      <Stack spacing={2} sx={{ mt: 2 }}>
        {Object.entries(
          [...logs].sort((a, b) => new Date(b.time) - new Date(a.time)).reduce((acc, log) => {
            const dateKey = new Date(log.time).toISOString().split("T")[0];
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(log);
            return acc;
          }, {})
        ).map(([date, dayLogs]) => {
          const summary = getDaySummary(dayLogs, allNapSessions, date);

          return (
            <div key={date}>
              <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: "bold" }}>
                🗓 {new Date(date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                🍽️ Meals: {summary.mealCount} — 💩 Poops: {summary.poopCount} — 💤 Nap Time: {summary.napDuration}
              </Typography>

              <Stack spacing={1}>
                {dayLogs.map((log) => (
                  <Stack
                    key={log.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      sx={{ fontWeight: log.type === "Meal" ? "bold" : "normal" }}
                    >
                      {new Date(log.time).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}{" "}
                      — {log.type}
                      {log.notes ? ` (${log.notes})` : ""}
                    </Typography>
                    <IconButton
                      onClick={async () => {
                        await deleteLog(log.id);
                        setLogs(await getLogs());
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </div>
          );
        })}
      </Stack>
    </LocalizationProvider>
  );
}