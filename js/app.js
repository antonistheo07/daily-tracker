const data = loadData();
settleStaleTimers(data);
ensureTodayLogs(data);
data.habits.forEach(stopIfTargetReached);
saveData(data);

let currentDay = todayKey();

// Unlock sound on the first click anywhere on the page
document.addEventListener("click", unlockAudio);

// ---------- Tasks ----------
const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("taskList");

function addTask() {
  const text = input.value.trim();
  if (!text) return;

  data.tasks.push({
    id: Date.now(),
    text: text,
    done: false,
    createdAt: new Date().toISOString()
  });

  input.value = "";
  saveData(data);
  renderTasks();
}

function toggleTask(id) {
  const task = data.tasks.find(t => t.id === id);
  task.done = !task.done;
  saveData(data);
  renderTasks();
}

function deleteTask(id) {
  data.tasks = data.tasks.filter(t => t.id !== id);
  saveData(data);
  renderTasks();
}

function renderTasks() {
  list.innerHTML = "";

  data.tasks.forEach(task => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.onchange = () => toggleTask(task.id);

    const span = document.createElement("span");
    span.textContent = task.text;

    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete";
    del.onclick = () => deleteTask(task.id);

    li.append(checkbox, span, del);
    list.appendChild(li);
  });
}

addBtn.onclick = addTask;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") addTask();
});

// ---------- Daily habits ----------
const habitTitleInput = document.getElementById("habitTitle");
const habitMinutesInput = document.getElementById("habitMinutes");
const addHabitBtn = document.getElementById("addHabitBtn");
const habitList = document.getElementById("habitList");

// Remembers the elements of each habit so the timer can update them every
// second without rebuilding the whole list (which would eat button clicks)
const habitViews = {};

// If the running timer has passed the target, stop it exactly at the target.
// Returns true when it stopped something.
function stopIfTargetReached(habit) {
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

function addHabitFromForm() {
  const title = habitTitleInput.value.trim();
  const minutes = Number(habitMinutesInput.value);
  if (!title || !minutes || minutes <= 0) return;

  addHabit(data, title, minutes);
  ensureTodayLogs(data);

  habitTitleInput.value = "";
  habitMinutesInput.value = "";
  saveData(data);
  renderHabits();
}

function removeHabit(habit) {
  if (!confirm(`Delete "${habit.title}" and its history?`)) return;
  deleteHabit(data, habit.id);
  saveData(data);
  renderHabits();
}

function toggleTimer(habit) {
  const log = getTodayLog(data, habit.id);

  if (log.startedAt) {
    pauseTimer(data, habit.id);
  } else if (log.secondsDone < habit.targetSeconds) {
    unlockAudio();
    requestNotificationPermission();
    startTimer(data, habit.id);
  }
  // if the target is already reached, do nothing

  saveData(data);
  renderHabits();
}

// Updates the numbers, bar and colour for one habit
function updateHabitView(habit) {
  const view = habitViews[habit.id];
  if (!view) return;

  const log = getTodayLog(data, habit.id);
  const seconds = getElapsed(log);
  const percent = Math.min(100, (seconds / habit.targetSeconds) * 100);
  const reached = seconds >= habit.targetSeconds;

  view.progress.textContent =
    `${formatClock(Math.min(seconds, habit.targetSeconds))} / ${formatDuration(habit.targetSeconds)}`;
  view.fill.style.width = percent + "%";
  view.title.textContent = (reached ? "✓ " : "") + habit.title;
  view.li.classList.toggle("reached", reached);
}

function renderHabits() {
  habitList.innerHTML = "";
  Object.keys(habitViews).forEach(id => delete habitViews[id]);

  data.habits.forEach(habit => {
    const log = getTodayLog(data, habit.id);
    const running = Boolean(log.startedAt);
    const reached = log.secondsDone >= habit.targetSeconds;

    const li = document.createElement("li");
    li.className = "habit" + (running ? " running" : "");

    // top row: title + delete
    const top = document.createElement("div");
    top.className = "habit-row";

    const title = document.createElement("span");

    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete";
    del.onclick = () => removeHabit(habit);

    top.append(title, del);

    // progress bar
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "fill";
    bar.appendChild(fill);

    // bottom row: time + start/pause/done
    const bottom = document.createElement("div");
    bottom.className = "habit-row";

    const progress = document.createElement("small");
    progress.className = "clock";

    const timerBtn = document.createElement("button");
    if (reached) {
      timerBtn.textContent = "✓ Done";
      timerBtn.className = "done";
      timerBtn.disabled = true;
    } else {
      timerBtn.textContent = running ? "⏸ Pause" : "▶ Start";
      timerBtn.className = running ? "pause" : "start";
      timerBtn.onclick = () => toggleTimer(habit);
    }

    bottom.append(progress, timerBtn);

    li.append(top, bar, bottom);
    habitList.appendChild(li);

    habitViews[habit.id] = { li, title, fill, progress };
    updateHabitView(habit);
    renderHistory(data);
  });
}

addHabitBtn.onclick = addHabitFromForm;
habitTitleInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addHabitFromForm();
});

// ---------- Clock tick ----------
setInterval(() => {
  // New day started while the page was open
  if (todayKey() !== currentDay) {
    currentDay = todayKey();
    settleStaleTimers(data);
    ensureTodayLogs(data);
    data.habits.forEach(stopIfTargetReached);
    saveData(data);
    renderHabits();
    return;
  }

  // Stop any timer that just reached its target, and alert for each one
  const finishedHabits = data.habits.filter(habit => stopIfTargetReached(habit));

  if (finishedHabits.length > 0) {
    saveData(data);
    renderHabits();   // redraws the card green with the "Done" button
    finishedHabits.forEach(notifyFinished);
    return;
  }

  // Otherwise just refresh the numbers of the running habits
  data.habits.forEach(habit => {
    const log = getTodayLog(data, habit.id);
    if (log.startedAt) updateHabitView(habit);
  });
}, 1000);

// ---------- Start ----------
renderHabits();
renderTasks();