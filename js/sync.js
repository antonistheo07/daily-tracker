let currentUserId = null;
let latestData = null;
let syncTimer = null;
let syncing = false;
let dirty = false;

// Rows deleted locally that still need to be deleted in the cloud
const pendingDeletes = { tasks: new Set(), habits: new Set(), projects: new Set() };

function setSyncStatus(text, isError = false) {
  const el = document.getElementById("syncStatus");
  el.textContent = text;
  el.className = isError ? "error" : "";
}

function markDeleted(table, id) {
  pendingDeletes[table].add(id);
}

// ---------- Cloud -> app ----------
async function loadFromCloud() {
  const [tasks, habits, logs, projects] = await Promise.all([
    sb.from("tasks").select("*").order("id"),
    sb.from("habits").select("*").order("id"),
    sb.from("logs").select("*"),
    sb.from("projects").select("*").order("id")
  ]);

  for (const result of [tasks, habits, logs, projects]) {
    if (result.error) throw result.error;
  }

  return {
    tasks: tasks.data.map(r => ({
      id: r.id,
      text: r.text,
      done: r.done,
      createdAt: r.created_at,
      projectId: r.project_id ?? null   // null = task without a project
    })),
    habits: habits.data.map(r => ({
      id: r.id,
      title: r.title,
      targetSeconds: r.target_seconds,
      active: r.active
    })),
    logs: logs.data.map(r => ({
      id: `${r.habit_id}-${r.date}`,
      habitId: r.habit_id,
      date: r.date,
      secondsDone: r.seconds_done,
      startedAt: r.started_at
    })),
    projects: projects.data.map(r => ({
      id: r.id,
      name: r.name,
      status: r.status,
      createdAt: r.created_at
    }))
  };
}

// ---------- App -> cloud ----------
async function upsertRows(table, rows, conflict) {
  if (rows.length === 0) return;
  const { error } = await sb.from(table).upsert(rows, { onConflict: conflict });
  if (error) throw error;
}

async function deleteRows(table, ids) {
  if (ids.length === 0) return;
  const { error } = await sb.from(table).delete().in("id", ids);
  if (error) throw error;
}

async function pushToCloud(uid, d, deletes) {
  // 1. deletes
  //    - deleting a habit also deletes its logs in the database
  //    - deleting a project keeps its tasks and empties their project_id
  await deleteRows("habits", deletes.habits);
  await deleteRows("tasks", deletes.tasks);
  await deleteRows("projects", deletes.projects);

  // 2. upserts, in this order:
  //    projects BEFORE tasks (tasks point to projects)
  //    habits BEFORE logs (logs point to habits)
  await upsertRows("projects", (d.projects || []).map(p => ({
    user_id: uid,
    id: p.id,
    name: p.name,
    status: p.status || "active",
    created_at: p.createdAt || new Date(p.id).toISOString()
  })), "user_id,id");

  await upsertRows("habits", d.habits.map(h => ({
    user_id: uid,
    id: h.id,
    title: h.title,
    target_seconds: h.targetSeconds,
    active: h.active
  })), "user_id,id");

  await upsertRows("tasks", d.tasks.map(t => ({
    user_id: uid,
    id: t.id,
    text: t.text,
    done: t.done,
    created_at: t.createdAt || new Date(t.id).toISOString(),
    project_id: t.projectId ?? null
  })), "user_id,id");

  await upsertRows("logs", d.logs.map(l => ({
    user_id: uid,
    habit_id: l.habitId,
    date: l.date,
    seconds_done: l.secondsDone,
    started_at: l.startedAt
  })), "user_id,habit_id,date");
}

// Same name as before, so app.js keeps calling saveData(data)
function saveData(d) {
  if (!currentUserId) return;
  latestData = d;
  dirty = true;
  setSyncStatus("Saving...");
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 300);
}

async function syncNow() {
  if (!currentUserId || !latestData) return;

  // already sending: try again shortly
  if (syncing) {
    syncTimer = setTimeout(syncNow, 300);
    return;
  }

  syncing = true;
  const uid = currentUserId;
  const snapshot = JSON.parse(JSON.stringify(latestData));
  const deletes = {
    tasks: [...pendingDeletes.tasks],
    habits: [...pendingDeletes.habits],
    projects: [...pendingDeletes.projects]
  };
  dirty = false;

  try {
    await pushToCloud(uid, snapshot, deletes);
    deletes.tasks.forEach(id => pendingDeletes.tasks.delete(id));
    deletes.habits.forEach(id => pendingDeletes.habits.delete(id));
    deletes.projects.forEach(id => pendingDeletes.projects.delete(id));
    if (!dirty) setSyncStatus("Saved ✓");
  } catch (error) {
    console.error("Sync failed:", error);
    dirty = true;
    setSyncStatus("Sync failed, retrying...", true);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 5000);
  } finally {
    syncing = false;
  }
}

// Send anything still waiting (used before logging out)
async function flushSync() {
  clearTimeout(syncTimer);
  if (dirty) await syncNow();
}

function stopSync() {
  clearTimeout(syncTimer);
  currentUserId = null;
  latestData = null;
  dirty = false;
  pendingDeletes.tasks.clear();
  pendingDeletes.habits.clear();
  pendingDeletes.projects.clear();
  setSyncStatus("");
}

// Warn if the tab is closed before the last change was saved
window.addEventListener("beforeunload", e => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
