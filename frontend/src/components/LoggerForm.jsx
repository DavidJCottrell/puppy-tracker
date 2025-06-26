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
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

const activityTypes = [
  { label: "Meal", emoji: "🥣" },
  { label: "Poop", emoji: "💩" },
  { label: "Wee", emoji: "💦" },
  { label: "Walk (start)", emoji: "🐾" },
  { label: "Walk (end)", emoji: "🏠" },
  { label: "Nap (start)", emoji: "😴" },
  { label: "Nap (end)", emoji: "🌞" },
];

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function LoggerForm() {
  const [selectedType, setSelectedType] = useState("");
  const [overrideTime, setOverrideTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    getLogs().then(setLogs);
  }, []);

  const handleLog = async () => {
    if (!selectedType) return;

    const time = overrideTime
      ? new Date(overrideTime).toISOString()
      : new Date().toISOString();

    await logEvent({ type: selectedType, time, notes });
    setLogs(await getLogs());
    setSelectedType("");
    setOverrideTime(new Date());
    setNotes("");
    setSnackbarOpen(true); // show toast
  };

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

    const startOfDay = new Date(`${dayKey}T00:00:00`);
    const endOfDay = new Date(`${dayKey}T23:59:59`);

    let totalNapMs = 0;
    let totalWalkMs = 0;

    // Calculate nap duration
    napSessions.forEach(({ start, end }) => {
      if (end >= startOfDay && start <= endOfDay) {
        const napStart = start < startOfDay ? startOfDay : start;
        const napEnd = end > endOfDay ? endOfDay : end;
        totalNapMs += napEnd - napStart;
      }
    });

    // Calculate walk duration
    const sorted = [...dayLogs].sort((a, b) => new Date(a.time) - new Date(b.time));
    let lastWalkStart = null;

    sorted.forEach((log) => {
      const time = new Date(log.time);
      if (log.type === "Walk (start)") {
        lastWalkStart = time;
      } else if (log.type === "Walk (end)" && lastWalkStart && time > lastWalkStart) {
        totalWalkMs += time - lastWalkStart;
        lastWalkStart = null;
      }
    });

    const totalNapMins = Math.round(totalNapMs / 60000);
    const napHours = Math.floor(totalNapMins / 60);
    const napMins = totalNapMins % 60;

    const totalWalkMins = Math.round(totalWalkMs / 60000);
    const walkHours = Math.floor(totalWalkMins / 60);
    const walkMins = totalWalkMins % 60;

    return {
      mealCount,
      poopCount,
      napDuration: `${napHours}h ${napMins}m`,
      walkDuration: `${walkHours}h ${walkMins}m`,
    };
  }

  const allNapSessions = extractNapSessions(logs);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        {activityTypes.map(({ label, emoji }) => (
          <Button
            key={label}
            variant={selectedType === label ? "contained" : "outlined"}
            onClick={() => setSelectedType(label)}
            sx={{
              whiteSpace: "nowrap",
              minWidth: "120px",
              flexGrow: 1,
            }}
          >
            {emoji} {label.toUpperCase()}
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

      {(() => {
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();
        const todayLogs = logs.filter(
          (log) => new Date(log.time).toISOString().split("T")[0] === today
        );

        const getTimeAgo = (type) => {
          const match = [...todayLogs]
            .filter((log) => log.type === type)
            .sort((a, b) => new Date(b.time) - new Date(a.time))[0];

          if (!match) return { label: "—", minutes: null };

          const diffMs = now - new Date(match.time);
          const minutes = Math.floor(diffMs / 60000);
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;

          return {
            label: `${hours > 0 ? `${hours}h ` : ""}${mins}m ago`,
            minutes,
          };
        };

        const lastWee = getTimeAgo("Wee");
        const lastPoop = getTimeAgo("Poop");
        const lastNap = getTimeAgo("Nap (end)");

        return (
          <Stack
            spacing={1}
            sx={{
              p: 2,
              backgroundColor: "#f5f8fb",
              borderRadius: 2,
              mb: 2,
              boxShadow: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                backgroundColor: lastWee.minutes > 90 ? "#ffe5e5" : "transparent",
                color: lastWee.minutes > 90 ? "error.main" : "inherit",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 500,
                display: "inline-block",
              }}
            >
              💦 Last Wee: {lastWee.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              💩 Last Poop: {lastPoop.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              😴 Last Nap: {lastNap.label}
            </Typography>
          </Stack>
        );
      })()}

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
              <Stack spacing={0.5} sx={{ mb: 1 }}>
                <Typography variant="body2">
                  🍽️ Meals: {summary.mealCount} — 💩 Poops: {summary.poopCount}
                </Typography>
                <Typography variant="body2">
                  💤 Nap Time: {summary.napDuration} — 🚶‍♂️ Walk Time: {summary.walkDuration}
                </Typography>
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={1}>
              {(() => {
                const getDurationLabel = (log) => {
                  const logTime = new Date(log.time);

                  if (log.type === "Nap (end)") {
                    const match = allNapSessions.find(
                      (s) => new Date(s.end).getTime() === logTime.getTime()
                    );
                    if (match) {
                      const duration = new Date(match.end) - new Date(match.start);
                      const mins = Math.round(duration / 60000);
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return ` — 🕒 ${h > 0 ? `${h}h ` : ""}${m}m`;
                    }
                  }

                  if (log.type === "Walk (end)") {
                    // Find the most recent walk start before this end time
                    const start = [...logs]
                      .filter((l) => l.type === "Walk (start)")
                      .map((l) => new Date(l.time))
                      .filter((t) => t < logTime)
                      .sort((a, b) => b - a)[0];

                    if (start) {
                      const duration = logTime - start;
                      const mins = Math.round(duration / 60000);
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return ` — 🕒 ${h > 0 ? `${h}h ` : ""}${m}m`;
                    }
                  }

                  return "";
                };

                const processed = [...dayLogs].reverse().map((log) => {
                  const durationLabel = getDurationLabel(log);

                  return {
                    ...log,
                    durationLabel,
                  };
                });

                return processed.reverse().map((log) => {
                  const logTime = new Date(log.time);

                  return (
                    <Stack
                      key={log.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        backgroundColor: "#f9f9f9",
                        borderRadius: 2,
                        padding: 1.5,
                        boxShadow: 1,
                      }}
                    >
                      <Stack spacing={0.25} alignItems="flex-start">
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            lineHeight: 1.2,
                            fontSize: "0.8rem",
                          }}
                        >
                          {logTime.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </Typography>
                        <Typography
                          sx={{
                            fontWeight: log.type === "Meal" ? "bold" : "normal",
                            fontSize: "1rem",
                            lineHeight: 1.3,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <span style={{ minWidth: "1.5em", textAlign: "center" }}>
                            {activityTypes.find((a) => a.label === log.type)?.emoji || ""}
                          </span>
                          {log.type}
                          {log.notes ? ` — ${log.notes}` : ""}
                          {log.durationLabel}
                        </Typography>
                      </Stack>
                      <IconButton
                        onClick={async () => {
                          await deleteLog(log.id);
                          setLogs(await getLogs());
                        }}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  );
                });
              })()}
              </Stack>
            </div>
          );
        })}
      </Stack>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: "100%" }}>
          Remy log created!
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
}