import React, { useState, useEffect } from "react";
import { Button, TextField, Stack, Typography, Divider } from "@mui/material";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { logEvent, getLogs, deleteLog } from "../utils/api";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

const activityTypes = [
  { label: "Meal", emoji: "🥣" },
  { label: "Poop", emoji: "💩" },
  { label: "Wee", emoji: "🚽" },
  { label: "Walk", emoji: "🐾" },
  { label: "Nap", emoji: "😴" },
  { label: "Awake", emoji: "🌞" },
];

export default function LoggerForm() {
  const [selectedType, setSelectedType] = useState("");
  const [overrideTime, setOverrideTime] = useState(null);
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
    setOverrideTime(null);
    setNotes("");
  };

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

      <Typography variant="h6">Today’s Log</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {logs.map((log) => (
          <Stack
            key={log.id}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography>
              {new Date(log.time).toLocaleTimeString()} — {log.type}
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
    </LocalizationProvider>
  );
}
