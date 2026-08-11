import { supabase } from "./supabaseClient.js";

// Tab switching
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("account-tab") || e.target.dataset.tab) {
    const tab = e.target.dataset.tab;
    if (!tab) return;

    document.querySelectorAll(".account-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".account-form").forEach((f) => f.classList.remove("active"));

    document.querySelector(`.account-tab[data-tab="${tab}"]`).classList.add("active");
    document.getElementById(`${tab}-form`).classList.add("active");
  }
});

// Register
document.getElementById("register-btn").addEventListener("click", async () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  // Create the real, secure account (Supabase handles password hashing)
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
    return;
  }

  // Create the matching profile row (name + admin flag)
  const { error: profileError } = await supabase
    .from("profile")
    .insert({ id: data.user.id, name, is_admin: false });

  if (profileError) {
    alert("Account created, but profile setup failed: " + profileError.message);
    return;
  }

  // Emie welcome reaction
  if (window.emieReact) {
    window.emieReact(
      "assets/gifs/kilig_emie.gif",
      `Welcome to ClassCart, ${name}! Now go shopping!`,
      2500
    );
  }

  alert("Account created! Please login.");

  // Clear form
  document.getElementById("reg-name").value = "";
  document.getElementById("reg-email").value = "";
  document.getElementById("reg-password").value = "";

  // Switch to login tab
  document.querySelector('.account-tab[data-tab="login"]').click();
});

// Login
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Invalid email or password.");

    if (window.emieReact) {
      window.emieReact(
        "assets/gifs/angry_emie.gif",
        `That didn't work... try again!`,
        2000
      );
    }
    return;
  }

  // Look up the profile to get name + admin status
  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("name, is_admin")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    alert("Logged in, but couldn't load profile: " + profileError.message);
    return;
  }

  // Emie login celebration
  if (window.emieReact) {
    window.emieReact(
      "assets/gifs/kilig_emie.gif",
      `Welcome back, ${profile.name}! Ready to shop? 🛍`,
      2500
    );
  }

  setTimeout(() => {
    if (profile.is_admin) {
      window.location.href = "admin.html";
      return;
    }

    // Redirect back to checkout if came from there
    const redirect = localStorage.getItem("redirectAfterLogin");
    if (redirect) {
      localStorage.removeItem("redirectAfterLogin");
      window.location.href = redirect;
    } else {
      window.location.href = "index.html";
    }
  }, 1000);
});
