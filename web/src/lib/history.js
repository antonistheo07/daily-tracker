// History calculations. Only reads `data`, never the page.
// (The old renderHistory() is now JSX in App.jsx.)
import { dateKeyFrom } from "./habits.js";
import { getElapsed } from "./timer.js";

// n = 0 -> today, 1 -> yesterday, ...
export function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKeyFrom(d);
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// A habit only counts for days on or after the day it was created
// (its id is the timestamp of when it was made)
export function habitsForDay(data, key) {
  return data.habits.filter(h => dateKeyFrom(new Date(h.id)) <= key);
}

export function dayStats(data, key) {
  const habits = habitsForDay(data, key);
  let done = 0;
  let seconds = 0;

  habits.forEach(habit => {
    const log = data.logs.find(l => l.habitId === habit.id && l.date === key);
    if (!log) return;
    const elapsed = getElapsed(log);
    seconds += Math.min(elapsed, habit.targetSeconds);
    if (elapsed >= habit.targetSeconds) done++;
  });

  return { total: habits.length, done: done, seconds: seconds };
}

// A day is complete when every habit that existed that day reached its target
export function isDayComplete(stats) {
  return stats.total > 0 && stats.done === stats.total;
}