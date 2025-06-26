export function extractNapSessions(logs) {
  const sorted = [...logs].sort((a, b) => new Date(a.time) - new Date(b.time));
  const sessions = [];
  let lastStart = null;

  sorted.forEach((log) => {
    const time = new Date(log.time);
    if (log.type === "Nap (start)") lastStart = time;
    if (log.type === "Nap (end)" && lastStart && time > lastStart) {
      sessions.push({ start: lastStart, end: time });
      lastStart = null;
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