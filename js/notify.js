let audioCtx = null;

// Browsers only allow sound after the user has clicked something,
// so we "unlock" audio on the first click
function unlockAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (error) {
    console.error("Audio not available:", error);
  }
}

function playBeep() {
  if (!audioCtx) return;

  [0, 0.35, 0.7].forEach(offset => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const t = audioCtx.currentTime + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// Must be called from a click, otherwise the browser ignores it
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body: body });
}

function notifyFinished(habit) {
  playBeep();
  showNotification("Time's up! ✓", `${habit.title}: ${formatDuration(habit.targetSeconds)} done`);
}