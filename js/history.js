function dateKeyFrom(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// n = 0 -> today, 1 -> yesterday, ...
function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKeyFrom(d);
}

function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// A habit only counts for days on or after the day it was created
// (its id is the timestamp of when it was made)
function habitsForDay(data, key) {
  return data.habits.filter(h => dateKeyFrom(new Date(h.id)) <= key);
}

function dayStats(data, key) {
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

function isDayComplete(stats) {
  return stats.total > 0 && stats.done === stats.total;
}

// Consecutive complete days. If today isn't finished yet, the streak
// keeps counting from yesterday instead of dropping to zero.
function calculateStreak(data) {
  let streak = 0;

  for (let n = 0; n < 365; n++) {
    const stats = dayStats(data, daysAgoKey(n));

    if (isDayComplete(stats)) {
      streak++;
    } else if (n === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function renderHistory(data) {
  const streakEl = document.getElementById("streak");
  const listEl = document.getElementById("historyList");

  const streak = calculateStreak(data);
  streakEl.textContent =
    streak > 0 ? `🔥 Streak: ${streak} day${streak === 1 ? "" : "s"}` : "No streak yet";

  listEl.innerHTML = "";

  for (let n = 0; n < 7; n++) {
    const key = daysAgoKey(n);
    const stats = dayStats(data, key);
    const complete = isDayComplete(stats);

    const li = document.createElement("li");
    li.className = "history-row" + (complete ? " complete" : "");

    const label = document.createElement("span");
    label.textContent = n === 0
      ? "Today"
      : keyToDate(key).toLocaleDateString(undefined, {
          weekday: "short", day: "numeric", month: "short"
        });

    const info = document.createElement("small");
    info.textContent = stats.total === 0
      ? "-"
      : `${stats.done}/${stats.total} done · ${formatDuration(stats.seconds)}`;

    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = complete ? "✓" : "";

    li.append(label, info, mark);
    listEl.appendChild(li);
  }
}