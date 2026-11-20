const STORAGE_KEY = "tracker:v1";

function emptyData() {
  return { tasks: [], habits: [], logs: [] };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();

    const data = JSON.parse(raw);
    return {
      tasks: data.tasks || [],
      habits: data.habits || [],
      logs: data.logs || []
    };
  } catch (error) {
    console.error("Could not read saved data:", error);
    return emptyData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}