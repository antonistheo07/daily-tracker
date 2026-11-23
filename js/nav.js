// Sidebar: switches between Profile, Habits, Tasks and Projects,
// and keeps the progress ring + profile numbers up to date.

const TABS = ["profile", "habits", "tasks", "projects"];

function readSaved(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function writeSaved(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch (e) {}
}

// ---------- Tabs ----------
function showTab(name) {
  if (!TABS.includes(name)) name = "habits";

  document.querySelectorAll(".nav-item").forEach(btn => {
    if (btn.dataset.tab === name) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  document.querySelectorAll(".view").forEach(view => {
    view.hidden = view.dataset.view !== name;
  });

  writeSaved("tab", name);
  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});

showTab(readSaved("tab") || "habits");

// ---------- Today's progress + profile numbers ----------
// Ring = share of today's target time done, across all habits
function todayProgress(d) {
  const habits = d.habits || [];
  let target = 0;
  let doneSeconds = 0;
  let doneCount = 0;

  habits.forEach(habit => {
    const log = (d.logs || []).find(l => l.habitId === habit.id && l.date === todayKey());
    const elapsed = log ? getElapsed(log) : 0;
    target += habit.targetSeconds;
    doneSeconds += Math.min(elapsed, habit.targetSeconds);
    if (elapsed >= habit.targetSeconds) doneCount++;
  });

  return {
    total: habits.length,
    done: doneCount,
    percent: target > 0 ? (doneSeconds / target) * 100 : 0
  };
}

function updateProfile() {
  const email = document.getElementById("userEmail").textContent || "";
  const p = todayProgress(data);

  const todayText = p.total === 0
    ? "No habits for today"
    : p.done === p.total
      ? "All habits done today"
      : `${p.done} of ${p.total} habits done today`;

  document.querySelectorAll("[data-email]").forEach(el => { el.textContent = email; });
  document.querySelectorAll("[data-initial]").forEach(el => { el.textContent = email.charAt(0) || "?"; });
  document.querySelectorAll("[data-today]").forEach(el => { el.textContent = todayText; });

  document.querySelectorAll("[data-ring]").forEach(ring => {
    ring.querySelector(".ring-fg").style.strokeDasharray = `${p.percent} 100`;
    ring.classList.toggle("complete", p.total > 0 && p.done === p.total);
  });

  const streak = calculateStreak(data);
  const openTasks = (data.tasks || []).filter(t => !t.done).length;
  document.querySelector('[data-stat="streak"]').textContent =
    `${streak} day${streak === 1 ? "" : "s"}`;
  document.querySelector('[data-stat="habits"]').textContent = (data.habits || []).length;
  document.querySelector('[data-stat="tasks"]').textContent = openTasks;

  const openProjects = (data.projects || []).filter(p => p.status !== "done").length;
  document.querySelector('[data-stat="projects"]').textContent = openProjects;
}

// ---------- Theme ----------
function currentTheme() {
  const t = readSaved("theme");
  return t === "light" || t === "dark" ? t : "system";
}

function applyTheme(choice) {
  if (choice === "system") {
    document.documentElement.removeAttribute("data-theme");
    writeSaved("theme", null);
  } else {
    document.documentElement.setAttribute("data-theme", choice);
    writeSaved("theme", choice);
  }
  document.querySelectorAll("[data-theme-choice]").forEach(btn => {
    btn.setAttribute("aria-checked", String(btn.dataset.themeChoice === choice));
  });
}

document.querySelectorAll("[data-theme-choice]").forEach(btn => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.themeChoice));
});

applyTheme(currentTheme());
