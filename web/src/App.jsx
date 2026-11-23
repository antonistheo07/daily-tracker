import { useEffect, useReducer, useState } from "react";
import { getTodayLog, formatDuration } from "./lib/habits.js";
import {
  getElapsed, formatClock, startTimer, pauseTimer, stopIfTargetReached
} from "./lib/timer.js";
import { daysAgoKey, keyToDate, dayStats, isDayComplete } from "./lib/history.js";
import { projectTasks, projectProgress } from "./lib/projects.js";

// Test data, only in memory for now (no Supabase yet).
// Yesterday is already complete, so its history row shows a ✓.
function makeTestData() {
  const yesterday = daysAgoKey(1);
  return {
    habits: [
      { id: 1, title: "Study", targetSeconds: 60, active: true },
      { id: 2, title: "Read", targetSeconds: 120, active: true }
    ],
    logs: [
      { id: `1-${yesterday}`, habitId: 1, date: yesterday, secondsDone: 60, startedAt: null },
      { id: `2-${yesterday}`, habitId: 2, date: yesterday, secondsDone: 120, startedAt: null }
    ],
    projects: [
      { id: 1, name: "Housekeeping", status: "active", createdAt: "" }
    ],
    tasks: [
      { id: 1, text: "Write README", done: false, createdAt: "", projectId: 1 },
      { id: 2, text: "Update uml.md", done: false, createdAt: "", projectId: 1 }
    ]
  };
}

export default function App() {
  // One `data` object that our functions change, kept between redraws
  const [data] = useState(makeTestData);

  // redraw() = "draw the screen again" (replaces the old render…() calls)
  const [, redraw] = useReducer(n => n + 1, 0);

  function toggleTimer(habit) {
    const log = getTodayLog(data, habit.id);
    if (log.startedAt) pauseTimer(data, habit.id);
    else if (log.secondsDone < habit.targetSeconds) startTimer(data, habit.id);
    redraw();
  }

  function toggleTask(id) {
    const task = data.tasks.find(t => t.id === id);
    task.done = !task.done;
    redraw();
  }

  // 1-second clock tick: start it when the page appears, stop it when it goes away
  useEffect(() => {
    const id = setInterval(() => {
      data.habits.forEach(habit => stopIfTargetReached(data, habit));
      redraw();
    }, 1000);
    return () => clearInterval(id);
  }, [data]);

  return (
    <main style={{ padding: 24 }}>
      <h1>React test</h1>

      {/* ---------- Habits ---------- */}
      <h2>Habits</h2>
      {data.habits.map(habit => {
        const log = getTodayLog(data, habit.id);
        const seconds = Math.min(getElapsed(log), habit.targetSeconds);
        const reached = seconds >= habit.targetSeconds;

        return (
          <div key={habit.id} style={{ marginBottom: 16 }}>
            <strong>{reached ? "✓ " : ""}{habit.title}</strong>
            <p>{formatClock(seconds)} / {formatDuration(habit.targetSeconds)}</p>
            <button onClick={() => toggleTimer(habit)} disabled={reached}>
              {reached ? "✓ Done" : log.startedAt ? "⏸ Pause" : "▶ Start"}
            </button>
          </div>
        );
      })}

      {/* ---------- History ---------- */}
      <h2>Last 7 days</h2>
      <ul>
        {[0, 1, 2, 3, 4, 5, 6].map(n => {
          const key = daysAgoKey(n);
          const stats = dayStats(data, key);
          const label = n === 0
            ? "Today"
            : keyToDate(key).toLocaleDateString(undefined, {
                weekday: "short", day: "numeric", month: "short"
              });

          return (
            <li key={key}>
              {label}: {stats.total === 0
                ? "-"
                : `${stats.done}/${stats.total} done · ${formatDuration(stats.seconds)}`}
              {isDayComplete(stats) ? " ✓" : ""}
            </li>
          );
        })}
      </ul>

      {/* ---------- Projects ---------- */}
      <h2>Projects</h2>
      {data.projects.map(project => {
        const p = projectProgress(data, project.id);
        return (
          <div key={project.id}>
            <strong>{project.name}</strong>
            <p>{p.done} / {p.total} tasks done ({Math.round(p.percent)}%)</p>
            {projectTasks(data, project.id).map(task => (
              <label key={task.id} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                />
                {" "}{task.text}
              </label>
            ))}
          </div>
        );
      })}
    </main>
  );
}