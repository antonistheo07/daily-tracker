const LEGACY_KEY = "tracker:v1";

function emptyData() {
  return { tasks: [], habits: [], logs: [] };
}

function isEmptyData(d) {
  return d.tasks.length === 0 && d.habits.length === 0 && d.logs.length === 0;
}

// Reads what the app saved in this browser before we had accounts
function loadLegacyData() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyData();

    const data = JSON.parse(raw);
    return {
      tasks: data.tasks || [],
      habits: data.habits || [],
      logs: data.logs || []
    };
  } catch (error) {
    console.error("Could not read old local data:", error);
    return emptyData();
  }
}