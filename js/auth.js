const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userEmail = document.getElementById("userEmail");

function setMessage(text, isError = true) {
  authMessage.textContent = text;
  authMessage.className = "auth-message" + (isError ? " error" : "");
}

function readForm() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email || !password) {
    setMessage("Enter your email and password.");
    return null;
  }
  if (password.length < 6) {
    setMessage("Password must be at least 6 characters.");
    return null;
  }
  return { email, password };
}

async function signUp() {
  const form = readForm();
  if (!form) return;

  setMessage("Creating account...", false);
  const { data, error } = await sb.auth.signUp(form);

  if (error) {
    setMessage(error.message);
  } else if (!data.session) {
    setMessage("Account created. Check your email to confirm, then log in.", false);
  } else {
    setMessage("");
  }
}

async function logIn() {
  const form = readForm();
  if (!form) return;

  setMessage("Logging in...", false);
  const { error } = await sb.auth.signInWithPassword(form);

  if (error) setMessage(error.message);
  else setMessage("");
}

async function logOut() {
  await flushSync();          // make sure the last change is saved first
  await sb.auth.signOut();
}

// Logged in: load the user's data from the cloud and start the app
async function openSession(session) {
  const uid = session.user.id;

  // Supabase re-announces the same login on token refresh / tab focus
  if (uid === currentUserId) return;

  userEmail.textContent = session.user.email;
  authView.hidden = true;
  appView.hidden = false;
  authPassword.value = "";

  currentUserId = uid;
  setSyncStatus("Loading...");

  try {
    let startData = await loadFromCloud();

    // First login: offer to import what this browser had saved before
    if (isEmptyData(startData)) {
      const legacy = loadLegacyData();
      if (!isEmptyData(legacy) &&
          confirm("Import the data saved in this browser into your account?")) {
        startData = legacy;
      }
    }

    startApp(startData);   // calls saveData, which uploads it
  } catch (error) {
    console.error("Could not load data:", error);
    currentUserId = null;  // never save over data we failed to load
    setSyncStatus("Could not load your data. Refresh the page.", true);
  }
}

function closeSession() {
  stopSync();
  stopApp();
  appView.hidden = true;
  authView.hidden = false;
}

signupBtn.onclick = signUp;
loginBtn.onclick = logIn;
logoutBtn.onclick = logOut;
authPassword.addEventListener("keydown", e => {
  if (e.key === "Enter") logIn();
});

// Runs once at start, then on every login / logout.
// setTimeout avoids a known Supabase deadlock when calling it inside this callback.
sb.auth.onAuthStateChange((event, session) => {
  setTimeout(() => {
    if (session) openSession(session);
    else closeSession();
  }, 0);
});