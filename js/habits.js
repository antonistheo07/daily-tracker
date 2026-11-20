// "2026-11-20" in the user's LOCAL time
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function addHabit(data, title, targetMinutes) {
  data.habits.push({
    id: Date.now(),
    title: title,
    targetSeconds: targetMinutes * 60,
    active: true
  });
}

function deleteHabit(data, habitId) {
  data.habits = data.habits.filter(h => h.id !== habitId);
  data.logs = data.logs.filter(l => l.habitId !== habitId);
}

// Finds today's log for a habit, or creates it if it's a new day
function getTodayLog(data, habitId) {
  const date = todayKey();
  let log = data.logs.find(l => l.habitId === habitId && l.date === date);

  if (!log) {
    log = {
      id: `${habitId}-${date}`,
      habitId: habitId,
      date: date,
      secondsDone: 0,
      startedAt: null
    };
    data.logs.push(log);
  }
  return log;
}

function ensureTodayLogs(data) {
  data.habits.forEach(h => getTodayLog(data, h.id));
}

function addSeconds(data, habitId, seconds) {
  const log = getTodayLog(data, habitId);
  log.secondsDone += seconds;
}