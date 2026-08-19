import { supabase } from "./supabaseClient.js";

const checkingView = document.getElementById("reset-checking");
const invalidView = document.getElementById("reset-invalid");
const formView = document.getElementById("reset-form");
const successView = document.getElementById("reset-success");

function showView(view) {
  [checkingView, invalidView, formView, successView].forEach((v) => (v.hidden = true));
  view.hidden = false;
}

// When someone opens the link Supabase emailed them, the Supabase client
// exchanges the token in the URL for a temporary "recovery" session and
// fires this event. We never see or handle the raw token ourselves —
// Supabase's own servers generate, store, and validate it.
let recoveryConfirmed = false;

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    recoveryConfirmed = true;
    showView(formView);
  }
});

// Fallback: if the event already fired before this listener attached,
// check directly whether we currently hold a valid session.
setTimeout(async () => {
  if (recoveryConfirmed) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    recoveryConfirmed = true;
    showView(formView);
  } else {
    showView(invalidView);
  }
}, 2500);

document.getElementById("reset-submit-btn").addEventListener("click", async () => {
  const pass = document.getElementById("reset-password-input").value;
  const confirm = document.getElementById("reset-confirm-input").value;

  if (!pass || pass.length < 6) {
    alert("Password should be at least 6 characters.");
    return;
  }
  if (pass !== confirm) {
    alert("Passwords don't match.");
    return;
  }

  const btn = document.getElementById("reset-submit-btn");
  btn.disabled = true;
  btn.textContent = "Updating…";

  const { error } = await supabase.auth.updateUser({ password: pass });

  btn.disabled = false;
  btn.textContent = "Reset Password";

  if (error) {
    alert("Couldn't update your password: " + error.message);
    return;
  }

  // The recovery link/session Supabase issued is single-use — once the
  // password is updated, it can't be reused to change it again.
  showView(successView);
});

// Toggle password visibility with checkbox
document.getElementById('show-password-toggle').addEventListener('change', function() {
  const passwordInput = document.getElementById('reset-password-input');
  const confirmInput = document.getElementById('reset-confirm-input');
  
  const type = this.checked ? 'text' : 'password';
  passwordInput.type = type;
  confirmInput.type = type;
});