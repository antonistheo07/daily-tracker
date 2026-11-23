// Timer functions. They only change `data`, never the page.
// Before, these used todayKey/getTodayLog as globals (habits.js had to load first).
// Now this line says exactly what this file needs:
import { todayKey, getTodayLog } from "./habits.js";

// Seconds done today for a log, including the currently running stretch
export function getElapsed(log) {
  let seconds = log.secondsDone;
  if (log.startedAt) {
    seconds += (Date.now() - log.startedAt) / 1000;
  }
  return Math.floor(seconds);
}

// 3725 -> "01:02:05"
export function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

// Stop a running timer, adding the time since it started
export function pauseLog(log, stopAt = Date.now()) {
  if (!log.startedAt) return;
  log.secondsDone += Math.max(0, (stopAt - log.startedAt) / 1000);
  log.startedAt = null;
}

export function pauseAllTimers(data) {
  data.logs.forEach(log => pauseLog(log));
}

export function startTimer(data, habitId) {
  pauseAllTimers(data);                 // only one timer at a time
  const log = getTodayLog(data, habitId);
  log.startedAt = Date.now();
}

export function pauseTimer(data, habitId) {
  pauseLog(getTodayLog(data, habitId));
}

// If a timer was left running past midnight, stop it at the end of its day
export function settleStaleTimers(data) {
  const today = todayKey();
  data.logs.forEach(log => {
    if (log.startedAt && log.date !== today) {
      const [y, m, d] = log.date.split("-").map(Number);
      const endOfThatDay = new Date(y, m - 1, d + 1).getTime();
      pauseLog(log, Math.min(Date.now(), endOfThatDay));
    }
  });
}

// Moved here from app.js: it's pure logic, so it belongs with the timer.
// It now takes `data` as a parameter instead of using the global.
// If the running timer has passed the target, stop it exactly at the target.
// Returns true when it stopped something.
export function stopIfTargetReached(data, habit) {
  const log = getTodayLog(data, habit.id);
  if (!log.startedAt) return false;
  if (getElapsed(log) < habit.targetSeconds) return false;

  const remaining = habit.targetSeconds - log.secondsDone;
  pauseLog(log, log.startedAt + remaining * 1000);
  if (log.secondsDone < habit.targetSeconds) {
    log.secondsDone = habit.targetSeconds;   // avoid tiny rounding gaps
  }
  return true;
}