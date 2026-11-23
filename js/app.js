let data = emptyData();
let appActive = false;
let currentDay = todayKey();

// Unlock sound on the first click anywhere on the page
document.addEventListener("click", unlockAudio);

// Called by auth.js after login, with the data loaded from the cloud
function startApp(loaded) {
  data = loaded;
  settleStaleTimers(data);
  ensureTodayLogs(data);
  data.habits.forEach(stopIfTargetReached);
  saveData(data);

  currentDay = todayKey();
  appActive = true;
  renderHabits();
  renderTasks();
}

// Called by auth.js on logout
function stopApp() {
  appActive = false;
  data = emptyData();
  habitList.innerHTML = "";
  list.innerHTML = "";
  projectList.innerHTML = "";
  projectTaskList.innerHTML = "";
  openProjectId = null;
  taskFilter = "all";
  taskEmpty.hidden = true;
  document.getElementById("historyList").innerHTML = "";
  document.getElementById("streak").textContent = "";
  Object.keys(habitViews).forEach(id => delete habitViews[id]);
  updateProfile();
}

// ---------- Tasks ----------
const input = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("taskList");
const taskProjectSelect = document.getElementById("taskProject");
const taskFilterSelect = document.getElementById("taskFilter");
const taskEmpty = document.getElementById("taskEmpty");

// Which tasks the Tasks tab shows: "all", "none" (no project) or a project id
let taskFilter = "all";

// Creates a task. projectId = null means "no project".
// Used by the Tasks tab and by an open project.
function createTask(text, projectId) {
  data.tasks.push({
    id: Date.now(),
    text: text,
    done: false,
    createdAt: new Date().toISOString(),
    projectId: projectId
  });
}

function addTask() {
  const text = input.value.trim();
  if (!text) return;

  // "" = No project, otherwise the id of the chosen project
  const chosen = taskProjectSelect.value;
  createTask(text, chosen === "" ? null : Number(chosen));

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
  markDeleted("tasks", id);
  saveData(data);
  renderTasks();
}

// Builds one task row (checkbox, text, delete).
// The Tasks tab and an open project both use it, so they look and act the same.
// showProject = true adds a small label with the project's name (Tasks tab only)
function buildTaskItem(task, showProject = false) {
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

  li.append(checkbox, span);

  // Project label: click it to open the project
  const project = showProject && task.projectId !== null
    ? data.projects.find(p => p.id === task.projectId)
    : null;
  if (project) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "task-chip";
    chip.textContent = project.name;
    chip.title = `Open project ${project.name}`;
    chip.onclick = () => {
      showTab("projects");
      openProject(project.id);
    };
    li.appendChild(chip);
  }

  li.append(del);
  return li;
}

// Refills a <select> with the projects, keeping the chosen value if it still exists.
// firstOptions are the fixed choices at the top, e.g. [["", "No project"]].
function fillProjectSelect(select, firstOptions, value) {
  select.innerHTML = "";
  firstOptions.concat(data.projects.map(p => [String(p.id), p.name])).forEach(([v, label]) => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = label;
    select.appendChild(option);
  });
  const exists = [...select.options].some(o => o.value === String(value));
  select.value = exists ? String(value) : firstOptions[0][0];
  return select.value;
}

function taskMatchesFilter(task) {
  if (taskFilter === "all") return true;
  if (taskFilter === "none") return task.projectId === null;
  return task.projectId === Number(taskFilter);
}

function renderTasks() {
  // Keep both dropdowns in step with the current projects
  // (if the filtered project was deleted, go back to "All tasks")
  taskFilter = fillProjectSelect(taskFilterSelect, [["all", "All tasks"], ["none", "No project"]], taskFilter);
  fillProjectSelect(taskProjectSelect, [["", "No project"]], taskProjectSelect.value);

  list.innerHTML = "";

  const shown = data.tasks.filter(taskMatchesFilter);
  shown.forEach(task => {
    list.appendChild(buildTaskItem(task, true));
  });
  taskEmpty.hidden = shown.length > 0;

  renderProjects();   // project progress depends on tasks
  updateProfile();
}

// Changing the filter to a project also picks that project for new tasks
taskFilterSelect.onchange = () => {
  taskFilter = taskFilterSelect.value;
  if (taskFilter === "none") taskProjectSelect.value = "";
  else if (taskFilter !== "all") taskProjectSelect.value = taskFilter;
  renderTasks();
};

addBtn.onclick = addTask;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") addTask();
});

// ---------- Projects ----------
const projectNameInput = document.getElementById("projectName");
const addProjectBtn = document.getElementById("addProjectBtn");
const projectList = document.getElementById("projectList");
const projectEmpty = document.getElementById("projectEmpty");
const projectListPanel = document.getElementById("projectListPanel");
const projectDetail = document.getElementById("projectDetail");
const projectTaskInput = document.getElementById("projectTaskInput");
const addProjectTaskBtn = document.getElementById("addProjectTaskBtn");
const projectTaskList = document.getElementById("projectTaskList");

// Which project is open (null = show the list of all projects)
let openProjectId = null;

function openProject(projectId) {
  openProjectId = projectId;
  renderProjects();
  window.scrollTo(0, 0);
  projectTaskInput.focus();
}

function closeProject() {
  openProjectId = null;
  renderProjects();
}

// Adds a task to the open project. It also shows up in the Tasks tab,
// because it is the same task in data.tasks.
function addProjectTask() {
  const text = projectTaskInput.value.trim();
  if (!text || openProjectId === null) return;

  createTask(text, openProjectId);

  projectTaskInput.value = "";
  saveData(data);
  renderTasks();   // redraws the Tasks tab AND the open project
}

function addProjectFromForm() {
  const name = projectNameInput.value.trim();
  if (!name) return;

  addProject(data, name);

  projectNameInput.value = "";
  saveData(data);
  renderProjects();
}

function removeProject(project) {
  const count = projectTasks(data, project.id).length;
  const message = count > 0
    ? `Delete "${project.name}"? Its ${count} task${count === 1 ? "" : "s"} will stay in Tasks.`
    : `Delete "${project.name}"?`;
  if (!confirm(message)) return;

  deleteProject(data, project.id);
  markDeleted("projects", project.id);
  saveData(data);
  renderTasks();   // also redraws the projects
}

function renderProjects() {
  const open = data.projects.find(p => p.id === openProjectId);

  // The open project was deleted (or never existed): go back to the list
  if (!open) openProjectId = null;

  projectListPanel.hidden = Boolean(open);
  projectDetail.hidden = !open;
  projectEmpty.hidden = Boolean(open) || data.projects.length > 0;

  if (open) renderProjectDetail(open);

  projectList.innerHTML = "";

  // Active projects first, done projects at the bottom
  const ordered = [...data.projects].sort(
    (a, b) => (a.status === "done") - (b.status === "done")
  );

  ordered.forEach(project => {
    const p = projectProgress(data, project.id);

    const li = document.createElement("li");
    li.className = "project";
    if (p.total > 0 && p.done === p.total) li.classList.add("complete");
    if (project.status === "done") li.classList.add("finished");

    // Click (or Enter) anywhere on the card opens the project
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", `Open project ${project.name}`);
    li.onclick = () => openProject(project.id);
    li.onkeydown = e => {
      if (e.key === "Enter" && e.target === li) openProject(project.id);
    };

    // top row: name + delete
    const top = document.createElement("div");
    top.className = "project-row";

    const name = document.createElement("span");
    name.className = "project-name";
    name.textContent = project.name;

    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete";
    del.onclick = e => {
      e.stopPropagation();   // don't open the project when deleting it
      removeProject(project);
    };

    if (project.status === "done") {
      const badge = document.createElement("span");
      badge.className = "badge-done";
      badge.textContent = "Done";
      name.after(badge);
      top.append(name, badge, del);
    } else {
      top.append(name, del);
    }

    // progress bar
    const bar = document.createElement("div");
    bar.className = "project-bar";
    const fill = document.createElement("div");
    fill.className = "project-fill";
    fill.style.width = p.percent + "%";
    bar.appendChild(fill);

    // "3 / 5 tasks"
    const count = document.createElement("small");
    count.className = "project-count";
    count.textContent = p.total === 0
      ? "No tasks yet"
      : `${p.done} / ${p.total} task${p.total === 1 ? "" : "s"} done`;

    li.append(top, bar, count);
    projectList.appendChild(li);
  });
}

// Draws the open project: name, progress and its tasks
function renderProjectDetail(project) {
  const p = projectProgress(data, project.id);

  document.getElementById("projectDetailName").textContent = project.name;
  document.getElementById("projectDetailFill").style.width = p.percent + "%";
  document.getElementById("projectDetailCount").textContent = p.total === 0
    ? "No tasks yet. Add the first one below."
    : `${p.done} / ${p.total} task${p.total === 1 ? "" : "s"} done`;
  projectDetail.classList.toggle("complete", p.total > 0 && p.done === p.total);

  // "Done" badge + button:
  //  - project done          -> badge, and "Reopen project"
  //  - all its tasks ticked  -> "Mark project done"
  //  - otherwise             -> no button
  const isDone = project.status === "done";
  const allTicked = p.total > 0 && p.done === p.total;
  const statusBtn = document.getElementById("projectStatusBtn");

  document.getElementById("projectDetailBadge").hidden = !isDone;
  statusBtn.hidden = !isDone && !allTicked;
  statusBtn.textContent = isDone ? "Reopen project" : "✓ Mark project done";
  statusBtn.classList.toggle("reopen", isDone);

  projectTaskList.innerHTML = "";
  projectTasks(data, project.id).forEach(task => {
    projectTaskList.appendChild(buildTaskItem(task));
  });
}

document.getElementById("projectBack").onclick = closeProject;

// Marks the open project done, or reopens it
document.getElementById("projectStatusBtn").onclick = () => {
  const project = data.projects.find(p => p.id === openProjectId);
  if (!project) return;

  setProjectStatus(data, project.id, project.status === "done" ? "active" : "done");
  saveData(data);
  renderProjects();
  updateProfile();
};

addProjectTaskBtn.onclick = addProjectTask;
projectTaskInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addProjectTask();
});

addProjectBtn.onclick = addProjectFromForm;
projectNameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addProjectFromForm();
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
  markDeleted("habits", habit.id);
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
  });

  renderHistory(data);
  updateProfile();
}

addHabitBtn.onclick = addHabitFromForm;
habitTitleInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addHabitFromForm();
});

// ---------- Clock tick ----------
setInterval(() => {
  if (!appActive) return;

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
  if (data.habits.some(h => getTodayLog(data, h.id).startedAt)) updateProfile();
}, 1000);