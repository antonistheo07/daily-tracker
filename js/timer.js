// Seconds done today for a log, including the currently running stretch
function getElapsed(log) {
  let seconds = log.secondsDone;
  if (log.startedAt) {
    seconds += (Date.now() - log.startedAt) / 1000;
  }
  return Math.floor(seconds);
}

// 3725 -> "01:02:05"
function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

// Stop a running timer, adding the time since it started
function pauseLog(log, stopAt = Date.now()) {
  if (!log.startedAt) return;
  log.secondsDone += Math.max(0, (stopAt - log.startedAt) / 1000);
  log.startedAt = null;
}

function pauseAllTimers(data) {
  data.logs.forEach(log => pauseLog(log));
}

function startTimer(data, habitId) {
  pauseAllTimers(data);                 // only one timer at a time
  const log = getTodayLog(data, habitId);
  log.startedAt = Date.now();
}

function pauseTimer(data, habitId) {
  pauseLog(getTodayLog(data, habitId));
}

// If a timer was left running past midnight, stop it at the end of its day
function settleStaleTimers(data) {
  const today = todayKey();
  data.logs.forEach(log => {
    if (log.startedAt && log.date !== today) {
      const [y, m, d] = log.date.split("-").map(Number);
      const endOfThatDay = new Date(y, m - 1, d + 1).getTime();
      pauseLog(log, Math.min(Date.now(), endOfThatDay));
    }
  });
}