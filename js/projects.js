// Project data functions. Like habits.js, these only change `data`.
// app.js calls them, then saveData(data) and renders.

function addProject(data, name) {
  data.projects.push({
    id: Date.now(),
    name: name,
    status: "active",
    createdAt: new Date().toISOString()
  });
}

// Deletes the project but KEEPS its tasks: they become tasks without a project.
// (The database does the same with "on delete set null".)
function deleteProject(data, projectId) {
  data.projects = data.projects.filter(p => p.id !== projectId);
  data.tasks.forEach(t => {
    if (t.projectId === projectId) t.projectId = null;
  });
}

// status is "active" or "done" (the database only allows these two)
function setProjectStatus(data, projectId, status) {
  const project = data.projects.find(p => p.id === projectId);
  if (project) project.status = status;
}

// All tasks that belong to one project
function projectTasks(data, projectId) {
  return data.tasks.filter(t => t.projectId === projectId);
}

// Progress is counted from the tasks every time, never stored
function projectProgress(data, projectId) {
  const tasks = projectTasks(data, projectId);
  const done = tasks.filter(t => t.done).length;
  return {
    done: done,
    total: tasks.length,
    percent: tasks.length > 0 ? (done / tasks.length) * 100 : 0
  };
}
