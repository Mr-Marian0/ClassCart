// Tab switching
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("account-tab") || e.target.dataset.tab) {
    const tab = e.target.dataset.tab;
    if (!tab) return;

    document
      .querySelectorAll(".account-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".account-form")
      .forEach((f) => f.classList.remove("active"));

    document
      .querySelector(`.account-tab[data-tab="${tab}"]`)
      .classList.add("active");
    document.getElementById(`${tab}-form`).classList.add("active");
  }
});

// Register
document.getElementById("register-btn").addEventListener("click", () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const exists = users.find((u) => u.email === email);

  if (exists) {
    alert("Email already registered.");
    return;
  }

  users.push({ name, email, password });
  localStorage.setItem("users", JSON.stringify(users));
  alert("Account created! Please login.");

  // Switch to login tab
  document.querySelector('.account-tab[data-tab="login"]').click();
});

// Login
document.getElementById("login-btn").addEventListener("click", () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    alert("Invalid email or password.");
    return;
  }

  localStorage.setItem("loggedInUser", JSON.stringify(user));

  // Redirect back to checkout if came from there
  const redirect = localStorage.getItem("redirectAfterLogin");
  if (redirect) {
    localStorage.removeItem("redirectAfterLogin");
    window.location.href = redirect;
  } else {
    window.location.href = "index.html";
  }
});
