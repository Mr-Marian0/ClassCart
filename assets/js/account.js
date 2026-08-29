import { initAddressLocations } from "./addressLocations.js";
import { supabase } from "./supabaseClient.js";

/* ═══════════════════════════════════════════════════════════════
   CURRENT USER CACHE
   Supabase keeps the real session; we mirror the bits we need in
   localStorage so other scripts (checkout.js, cart.js — plain
   scripts, not modules) can read them without importing Supabase.
═══════════════════════════════════════════════════════════════ */

function cacheUser(user, profile) { 
  localStorage.setItem("ccUserId", user.id);
  localStorage.setItem("ccUserEmail", user.email || "");
  localStorage.setItem("ccUserName", profile?.name || "");
}

function clearCachedUser() {
  localStorage.removeItem("ccUserId");
  localStorage.removeItem("ccUserEmail");
  localStorage.removeItem("ccUserName");
}

function getUserId() {
  return localStorage.getItem("ccUserId");
}

/* ═══════════════════════════════════════════════════════════════
   PER-USER LOCAL STORAGE KEYS
   Orders/addresses/wishlist aren't in Supabase yet, so they live in
   localStorage, namespaced by user id. Orders reuse the existing
   global "orders" key (written by checkout.js) and are filtered by
   a userId field on each order.
═══════════════════════════════════════════════════════════════ */

/* Orders, addresses, and wishlist all now live in Supabase. See the
   ORDER HISTORY / SAVED ADDRESSES / WISHLIST sections further down. */


/* ═══════════════════════════════════════════════════════════════
   VIEW SWITCHING (auth view <-> dashboard)
═══════════════════════════════════════════════════════════════ */

const authView = document.getElementById("auth-view");
const dashboardView = document.getElementById("dashboard-view");

function showAuthView() {
  authView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard(profile) {
  authView.hidden = true;
  dashboardView.hidden = false;
  renderProfile(profile);
  renderOrders();
  renderAddresses();
  renderWishlist();
}

/* ═══════════════════════════════════════════════════════════════
   SESSION CHECK ON PAGE LOAD
═══════════════════════════════════════════════════════════════ */

supabase.auth.getUser().then(async ({ data: { user } }) => {
  if (!user) {
    clearCachedUser();
    showAuthView();
    return;
  }

  let { data: profile, error } = await supabase
    .from("profile")
    .select("name, is_admin")
    .eq("id", user.id)
    .maybeSingle(); // null instead of throwing when 0 rows come back

  if (error) {
    // A real error (network, RLS denial, etc.) — show it instead of silently
    // bouncing back to the login screen, which just hides the real problem.
    console.error("Profile lookup failed:", error);
    alert(
      "You're logged in, but your profile couldn't be loaded (" +
        error.message +
        "). This is usually a Row Level Security policy blocking the read — check the profile table's policies in Supabase."
    );
    showAuthView();
    return;
  }

  if (!profile) {
    // Logged in, but no profile row exists yet (e.g. it never got created on
    // signup). Create one now instead of stranding the user on the login screen.
    const fallbackName = user.email ? user.email.split("@")[0] : "ClassCart User";
    const { data: created, error: insertError } = await supabase
      .from("profile")
      .insert({ id: user.id, name: fallbackName, is_admin: false })
      .select("name, is_admin")
      .maybeSingle();

    if (insertError) {
      console.error("Profile auto-create failed:", insertError);
      alert(
        "You're logged in, but no profile exists for this account and one couldn't be created automatically (" +
          insertError.message +
          "). Check the profile table's insert policy in Supabase."
      );
      showAuthView();
      return;
    }
    profile = created;
  }

  if (profile.is_admin) {
    window.location.href = "admin.html";
    return;
  }

  cacheUser(user, profile);
  showDashboard({ id: user.id, email: user.email, name: profile.name });
});

/* ═══════════════════════════════════════════════════════════════
   LOGIN / REGISTER TABS (only relevant on the logged-out view)
═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   CONFIRMATION EMAIL — MODAL + RESEND COOLDOWN
   Supabase itself rate-limits resend requests (~once per 60s) and
   throws an error if you call too soon. We track the same cooldown
   client-side (per email, in localStorage) and reflect it live on the
   modal's resend button ("Resend in 42s...") instead of relying on
   alert()/confirm() popups.
═══════════════════════════════════════════════════════════════ */

const RESEND_COOLDOWN_MS = 60_000;
let resendCountdownTimer = null;

function resendCooldownKey(email) {
  return `ccResendCooldown:${email.toLowerCase()}`;
}

function getResendCooldownRemaining(email) {
  const last = Number(localStorage.getItem(resendCooldownKey(email)) || 0);
  const remaining = RESEND_COOLDOWN_MS - (Date.now() - last);
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

function markResendSent(email) {
  localStorage.setItem(resendCooldownKey(email), String(Date.now()));
}

function tickResendButton(email) {
  const btn = document.getElementById("verify-email-resend");
  const secs = getResendCooldownRemaining(email);

  if (secs > 0) {
    btn.disabled = true;
    btn.textContent = `Resend in ${secs}s`;
  } else {
    btn.disabled = false;
    btn.textContent = "Resend Email";
    clearInterval(resendCountdownTimer);
  }
}

function startResendCountdown(email) {
  clearInterval(resendCountdownTimer);
  tickResendButton(email);
  resendCountdownTimer = setInterval(() => tickResendButton(email), 1000);
}

let verifyEmailCurrentEmail = "";

// mode: "signup" (just registered) or "unconfirmed" (tried to login, blocked)
function openVerifyEmailModal(email, mode) {
  verifyEmailCurrentEmail = email;

  document.getElementById("verify-email-title").textContent =
    mode === "unconfirmed" ? "Email not confirmed yet" : "Confirm your email";
  document.getElementById("verify-email-status").innerHTML =
    mode === "unconfirmed"
      ? `Your account exists, but <strong>${email}</strong> hasn't been confirmed yet. Check your inbox for the link, or resend it below.`
      : `We sent a confirmation link to <strong>${email}</strong>. Click it to activate your account, then come back and login.`;

  document.getElementById("verify-email-modal").classList.add("active");
  startResendCountdown(email);
}

function closeVerifyEmailModal() {
  document.getElementById("verify-email-modal").classList.remove("active");
  clearInterval(resendCountdownTimer);
}

document.getElementById("verify-email-close").addEventListener("click", closeVerifyEmailModal);

document.getElementById("verify-email-resend").addEventListener("click", () => {
  if (verifyEmailCurrentEmail) resendConfirmationEmail(verifyEmailCurrentEmail);
});

async function resendConfirmationEmail(email) {
  const waitSecs = getResendCooldownRemaining(email);
  if (waitSecs > 0) return; // button is disabled in this state anyway, this is just a safety net

  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    // Supabase's own rate limit may still catch us right at the edge of the
    // client-side window — surface that clearly instead of a generic failure.
    document.getElementById("verify-email-status").innerHTML =
      `<span style="color:#DC2626">Couldn't resend: ${error.message}</span>`;
    return;
  }

  markResendSent(email);
  startResendCountdown(email);
}



document.getElementById("register-btn").addEventListener("click", async () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }, // stashed on the auth user so we still have it even before email is confirmed
  });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("reg-name").value = "";
  document.getElementById("reg-email").value = "";
  document.getElementById("reg-password").value = "";

  // If Supabase's "Confirm email" setting is ON, signUp() succeeds but returns
  // no session yet — the account exists but isn't usable until they click the
  // link in their inbox. If it's OFF, a session comes back immediately and we
  // can set the profile up right away like before.
  if (!data.session) {
    markResendSent(email); // Supabase just sent the first one — start the cooldown clock

    if (window.emieReact) {
      window.emieReact(
        "assets/gifs/kilig_emie.gif",
        `Almost there! Check ${email} for a confirmation link.`,
        3000
      );
    }

    document.querySelector('.account-tab[data-tab="login"]').click();
    openVerifyEmailModal(email, "signup");
    return;
  }

  const { error: profileError } = await supabase
    .from("profile")
    .insert({ id: data.user.id, name, is_admin: false });

  if (profileError) {
    alert("Account created, but profile setup failed: " + profileError.message);
    return;
  }

  if (window.emieReact) {
    window.emieReact(
      "assets/gifs/kilig_emie.gif",
      `Welcome to ClassCart, ${name}! Now go shopping!`,
      2500
    );
  }

  alert("Account created! Please login.");
  document.querySelector('.account-tab[data-tab="login"]').click();
});

/* ═══════════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════════ */

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const notConfirmed =
      error.code === "email_not_confirmed" ||
      error.message?.toLowerCase().includes("email not confirmed");

    if (notConfirmed) {
      openVerifyEmailModal(email, "unconfirmed");
      return;
    }

    alert("Invalid email or password.");

    if (window.emieReact) {
      window.emieReact("assets/gifs/angry_emie.gif", `That didn't work... try again!`, 2000);
    }
    return;
  }

  let { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("name, is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    alert("Logged in, but couldn't load profile: " + profileError.message);
    return;
  }

  if (!profile) {
    const fallbackName =
      data.user.user_metadata?.name ||
      (data.user.email ? data.user.email.split("@")[0] : "ClassCart User");
    const { data: created, error: insertError } = await supabase
      .from("profile")
      .insert({ id: data.user.id, name: fallbackName, is_admin: false })
      .select("name, is_admin")
      .maybeSingle();

    if (insertError) {
      alert("Logged in, but no profile exists and one couldn't be created: " + insertError.message);
      return;
    }
    profile = created;
  }

  cacheUser(data.user, profile);

  if (window.emieReact) {
    window.emieReact("assets/gifs/kilig_emie.gif", `Welcome back, ${profile.name}! Ready to shop? 🛍`, 2500);
  }

  setTimeout(() => {
    if (profile.is_admin) {
      window.location.href = "admin.html";
      return;
    }

    // Coming from checkout? Continue that flow. Otherwise land on the dashboard.
    const redirect = localStorage.getItem("redirectAfterLogin");
    if (redirect) {
      localStorage.removeItem("redirectAfterLogin");
      window.location.href = redirect;
    } else {
      showDashboard({ id: data.user.id, email: data.user.email, name: profile.name });
    }
  }, 1000);
});

/* ═══════════════════════════════════════════════════════════════
   LOGOUT
═══════════════════════════════════════════════════════════════ */

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  clearCachedUser();
  showAuthView();
});

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD NAV
═══════════════════════════════════════════════════════════════ */

document.querySelectorAll(".dash-nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".dash-nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".dash-panel").forEach((p) => p.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`panel-${btn.dataset.panel}`).classList.add("active");
  });
});

/* ═══════════════════════════════════════════════════════════════
   ORDER HISTORY
═══════════════════════════════════════════════════════════════ */

let currentOrderFilter = "all";
let cachedOrders = []; // last fetch, reused by buy-again/cancel handlers

function statusMeta(status) {
  switch (status) {
    case "Delivered":
      return { cls: "status-delivered", label: "Delivered" };
    case "Shipped":
      return { cls: "status-shipped", label: "Shipped" };
    case "Cancelled":
      return { cls: "status-cancelled", label: "Cancelled" };
    default:
      return { cls: "status-processing", label: "Processing" };
  }
}

async function renderOrders() {
  const uid = getUserId();
  const list = document.getElementById("orders-list");
  const empty = document.getElementById("orders-empty");
  const countBadge = document.getElementById("orders-count");

  // order_items(*) pulls each order's line items in the same request,
  // via the order_items.order_id -> orders.id foreign key.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", uid)
    .order("id", { ascending: false }); // newest first

  if (error) {
    console.error("Failed to load orders:", error);
    list.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Couldn't load your orders (" + error.message + ").";
    countBadge.textContent = "0";
    return;
  }

  cachedOrders = orders || [];
  countBadge.textContent = cachedOrders.length;

  const filtered = cachedOrders.filter((o) => {
    if (currentOrderFilter === "all") return true;
    if (currentOrderFilter === "cancelled") return o.status === "Cancelled";
    if (currentOrderFilter === "not-shipped") return o.status !== "Cancelled" && o.status !== "Delivered";
    return true;
  });

  list.innerHTML = "";

  if (filtered.length === 0) {
    empty.hidden = false;
    empty.textContent = "No orders here yet. When you place an order, it'll show up in this list.";
    return;
  }
  empty.hidden = true;

  filtered.forEach((order) => {
    const meta = statusMeta(order.status);
    const canCancel = order.status !== "Cancelled" && order.status !== "Delivered";
    const placedDate = new Date(order.created_at).toLocaleDateString();

    const card = document.createElement("div");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-card-head" data-order-id="${order.id}">
        <div class="order-card-head-field">
          <span class="label">Order placed</span>
          <strong>${placedDate}</strong>
        </div>
        <div class="order-card-head-field">
          <span class="label">Total</span>
          <strong>₱${Number(order.total).toFixed(2)} <span class="total-caret">▾</span></strong>
        </div>
        <div class="order-card-head-field">
          <span class="label">Ship to</span>
          <strong>${order.ship_name || "—"}</strong>
        </div>
        <div class="order-card-id">Order #${order.id}</div>
      </div>

      <div class="order-total-breakdown-wrapper" id="breakdown-${order.id}">
        <div class="order-total-breakdown-inner">
          <div class="order-total-breakdown">
            ${(order.order_items || [])
              .map((item) => {
                const lineTotal = item.unit_price * item.quantity;
                return `
              <div class="order-total-breakdown-line">
                <span>${item.product_name}</span>
                <span>₱${Number(item.unit_price).toFixed(2)} × ${item.quantity} = <strong>₱${lineTotal.toFixed(2)}</strong></span>
              </div>
            `;
              })
              .join("")}
          </div>
        </div>
      </div>

      <div class="order-status-row">
        <span class="order-status-badge ${meta.cls}">${meta.label}</span>
      </div>

      ${
        order.status === "Cancelled" && order.cancel_reason
          ? `<div class="order-status-note">Cancelled${order.cancelled_at ? " on " + new Date(order.cancelled_at).toLocaleDateString() : ""} · Reason: ${order.cancel_reason}</div>`
          : ""
      }

      ${(order.order_items || [])
        .map(
          (item) => `
        <div class="order-item-row">
          <img src="${item.product_image}" alt="${item.product_name}">
          <div class="order-item-details">
            <p class="order-item-name">${item.product_name}</p>
            <p class="order-item-qty">Qty: ${item.quantity} · ₱${Number(item.unit_price).toFixed(2)} each</p>
          </div>
          <div class="order-item-actions">
            <button class="btn-outline buy-again" data-order-id="${order.id}" data-item-id="${item.id}">Buy it again</button>
            ${canCancel ? `<button class="btn-outline cancel-order" data-order-id="${order.id}">Cancel Order</button>` : ""}
          </div>
        </div>
      `
        )
        .join("")}
    `;
    list.appendChild(card);
  });
}

document.getElementById("orders-list").addEventListener("click", (e) => {
  const head = e.target.closest(".order-card-head");
  if (!head) return;
  
  const orderId = head.dataset.orderId;
  const wrapper = document.getElementById(`breakdown-${orderId}`);
  const caret = head.querySelector(".total-caret");
  
  if (wrapper) {
    wrapper.classList.toggle("open");
    if (caret) {
      caret.style.transform = wrapper.classList.contains("open") ? "rotate(180deg)" : "rotate(0deg)";
    }
  }
});

document.getElementById("orders-list").addEventListener("click", (e) => {
  const totalToggle = e.target.closest(".order-total-toggle");
  if (!totalToggle) return;
  const breakdown = document.getElementById(`breakdown-${totalToggle.dataset.orderId}`);
  breakdown.hidden = !breakdown.hidden;
  totalToggle.classList.toggle("open", !breakdown.hidden);
});

document.querySelectorAll(".orders-subtab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".orders-subtab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentOrderFilter = tab.dataset.filter;
    renderOrders();
  });
});

// Buy it again / Cancel Order (event delegation, since cards are rendered dynamically)
document.getElementById("orders-list").addEventListener("click", (e) => {
  const buyBtn = e.target.closest(".buy-again");
  const cancelBtn = e.target.closest(".cancel-order");

  if (buyBtn) {
    const order = cachedOrders.find((o) => o.id == buyBtn.dataset.orderId);
    const item = order?.order_items.find((i) => i.id == buyBtn.dataset.itemId);
    if (!item) return;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((c) => c.id === item.product_id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        image: item.product_image,
        quantity: item.quantity,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));

    if (window.emieReact) {
      window.emieReact("assets/gifs/kilig_emie.gif", `Added ${item.product_name} back to your cart!`, 2200);
    } else {
      alert(`Added ${item.product_name} back to your cart.`);
    }
  }

  if (cancelBtn) {
    document.getElementById("cancel-order-id").textContent = `#${cancelBtn.dataset.orderId}`;
    document.getElementById("cancel-order-modal").dataset.orderId = cancelBtn.dataset.orderId;
    document.getElementById("cancel-reason-select").value = "";
    document.getElementById("cancel-reason-text").value = "";
    document.getElementById("cancel-order-modal").classList.add("active");
  }
});

document.getElementById("cancel-modal-close").addEventListener("click", () => {
  document.getElementById("cancel-order-modal").classList.remove("active");
});

document.getElementById("cancel-modal-confirm").addEventListener("click", async () => {
  const modal = document.getElementById("cancel-order-modal");
  const orderId = modal.dataset.orderId;
  const reasonSelect = document.getElementById("cancel-reason-select").value;
  const reasonText = document.getElementById("cancel-reason-text").value.trim();

  if (!reasonSelect) {
    alert("Please select a reason for cancelling.");
    return;
  }

  const confirmBtn = document.getElementById("cancel-modal-confirm");
  confirmBtn.disabled = true;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "Cancelled",
      cancel_reason: reasonText ? `${reasonSelect} — ${reasonText}` : reasonSelect,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  confirmBtn.disabled = false;

  if (error) {
    console.error("Cancel order failed:", error);
    alert("Couldn't cancel this order: " + error.message);
    return;
  }

  modal.classList.remove("active");

  if (window.emieReact) {
    window.emieReact("assets/gifs/angry_emie.gif", `Order cancelled. Aww, okay...`, 2200);
  }

  renderOrders();
});

/* ═══════════════════════════════════════════════════════════════
   PROFILE INFO
═══════════════════════════════════════════════════════════════ */

function renderProfile(profile) {
  const name = profile.name || "ClassCart User";
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-email").textContent = profile.email;
  document.getElementById("profile-avatar").textContent = name.charAt(0).toUpperCase();
}

// Edit name
document.getElementById("open-edit-name").addEventListener("click", () => {
  document.getElementById("edit-name-input").value = document.getElementById("profile-name").textContent;
  document.getElementById("edit-name-modal").classList.add("active");
});

document.getElementById("edit-name-close").addEventListener("click", () => {
  document.getElementById("edit-name-modal").classList.remove("active");
});

document.getElementById("edit-name-save").addEventListener("click", async () => {
  const newName = document.getElementById("edit-name-input").value.trim();
  if (!newName) {
    alert("Name can't be empty.");
    return;
  }

  const uid = getUserId();
  const { error } = await supabase.from("profile").update({ name: newName }).eq("id", uid);

  if (error) {
    alert("Couldn't update name: " + error.message);
    return;
  }

  localStorage.setItem("ccUserName", newName);
  document.getElementById("profile-name").textContent = newName;
  document.getElementById("profile-avatar").textContent = newName.charAt(0).toUpperCase();
  document.getElementById("edit-name-modal").classList.remove("active");
});

// Change password
document.getElementById("open-change-password").addEventListener("click", () => {
  document.getElementById("new-password-input").value = "";
  document.getElementById("confirm-password-input").value = "";
  document.getElementById("change-password-modal").classList.add("active");
});

document.getElementById("change-password-close").addEventListener("click", () => {
  document.getElementById("change-password-modal").classList.remove("active");
});

document.getElementById("change-password-save").addEventListener("click", async () => {
  const pass = document.getElementById("new-password-input").value;
  const confirm = document.getElementById("confirm-password-input").value;

  if (!pass || pass.length < 6) {
    alert("Password should be at least 6 characters.");
    return;
  }
  if (pass !== confirm) {
    alert("Passwords don't match.");
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: pass });
  if (error) {
    alert("Couldn't update password: " + error.message);
    return;
  }

  document.getElementById("change-password-modal").classList.remove("active");
  alert("Password updated.");
});

// Delete account
// NOTE: Supabase's client SDK can't permanently delete an auth user —
// that requires the service_role key, which must never be shipped to
// the browser. A real "delete" needs a Supabase Edge Function (using
// supabase.auth.admin.deleteUser) called from here instead. Until
// that's set up, this signs the user out and clears their local data
// as a stand-in.
document.getElementById("open-delete-account").addEventListener("click", () => {
  document.getElementById("delete-confirm-input").value = "";
  document.getElementById("delete-account-modal").classList.add("active");
});

document.getElementById("delete-account-close").addEventListener("click", () => {
  document.getElementById("delete-account-modal").classList.remove("active");
});

document.getElementById("delete-account-confirm").addEventListener("click", async () => {
  const confirmText = document.getElementById("delete-confirm-input").value.trim();
  if (confirmText !== "DELETE") {
    alert('Please type "DELETE" to confirm.');
    return;
  }

  const uid = getUserId();
  await supabase.from("addresses").delete().eq("user_id", uid);
  await supabase.from("wishlist").delete().eq("user_id", uid);

  // Cancel any orders that are still in-flight (Processing/Shipped) —
  // no one's coming back to fulfill or receive them after this.
  await supabase
    .from("orders")
    .update({
      status: "Cancelled",
      cancel_reason: "Account deleted",
      cancelled_at: new Date().toISOString(),
    })
    .eq("user_id", uid)
    .not("status", "in", "(Cancelled,Delivered)");

  await supabase.auth.signOut();
  clearCachedUser();

  document.getElementById("delete-account-modal").classList.remove("active");
  alert("Your saved addresses and wishlist have been deleted, any open orders were cancelled, and you've been signed out.");
  showAuthView();
});

/* ═══════════════════════════════════════════════════════════════
   SAVED ADDRESSES
═══════════════════════════════════════════════════════════════ */

let cachedAddresses = [];
const addressLocations = initAddressLocations({
  regionId: "addr-region",
  provinceId: "addr-province",
  cityId: "addr-city",
  barangayId: "addr-barangay",
});

async function renderAddresses() {
  const uid = getUserId();
  const list = document.getElementById("address-list");
  const empty = document.getElementById("addresses-empty");

  const { data: addresses, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", uid)
    .order("is_default", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load addresses:", error);
    list.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Couldn't load your addresses (" + error.message + ").";
    return;
  }

  cachedAddresses = addresses || [];
  list.innerHTML = "";

  if (cachedAddresses.length === 0) {
    empty.hidden = false;
    empty.textContent = "No saved addresses yet. Add one so checkout is faster next time.";
    return;
  }
  empty.hidden = true;

  cachedAddresses.forEach((addr) => {
    const card = document.createElement("div");
    card.className = `address-card ${addr.is_default ? "default" : ""}`;
    const locationParts = [addr.barangay, addr.city, addr.province, addr.region, addr.zip]
      .filter(Boolean)
      .join(", ");
    card.innerHTML = `
      ${addr.is_default ? '<span class="default-badge">Default</span>' : ""}
      <p class="address-label">${addr.label || "Address"}</p>
      <p>${addr.full_name}</p>
      <p>${addr.phone}</p>
      <p>${addr.address_line}${locationParts ? `, ${locationParts}` : ""}</p>
      <p>${addr.country}</p>
      <div class="address-actions">
        ${!addr.is_default ? `<button class="link-btn set-default" data-id="${addr.id}">Set as default</button>` : ""}
        <button class="link-btn edit-address" data-id="${addr.id}">Edit</button>
        <button class="link-btn danger remove-address" data-id="${addr.id}">Remove</button>
      </div>
    `;
    list.appendChild(card);
  });
}

document.getElementById("add-address-btn").addEventListener("click", async () => {
  document.getElementById("address-modal-title").textContent = "Add New Address";
  document.getElementById("address-modal").dataset.editId = "";
  ["addr-label", "addr-fullname", "addr-phone", "addr-line", "addr-zip"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  document.getElementById("addr-country").value = "Philippines";
  document.getElementById("addr-default").checked = false;
  await addressLocations.reset();
  document.getElementById("address-modal").classList.add("active");
});

document.getElementById("address-modal-close").addEventListener("click", () => {
  document.getElementById("address-modal").classList.remove("active");
});

document.getElementById("address-modal-save").addEventListener("click", async () => {
  const uid = getUserId();
  const modal = document.getElementById("address-modal");
  const editId = modal.dataset.editId;

  const fullName = document.getElementById("addr-fullname").value.trim();
  const phone = document.getElementById("addr-phone").value.trim();
  const addressLine = document.getElementById("addr-line").value.trim();
  const location = addressLocations.getValues();
  const zip = document.getElementById("addr-zip").value.trim();
  const country = document.getElementById("addr-country").value.trim();
  const label = document.getElementById("addr-label").value.trim() || "Address";
  const isDefault = document.getElementById("addr-default").checked || cachedAddresses.length === 0;

  if (!fullName || !phone || !addressLine || !location.region || !location.city || !location.barangay || !zip || !country) {
    alert("Please fill in all address fields.");
    return;
  }

  // The addresses table currently requires province to be non-null.
  // For a province-less location such as NCR, use the region name in that field.
  const province = location.province || location.region;

  const saveBtn = document.getElementById("address-modal-save");
  saveBtn.disabled = true;

  if (isDefault) {
    let unsetQuery = supabase.from("addresses").update({ is_default: false }).eq("user_id", uid);
    if (editId) unsetQuery = unsetQuery.neq("id", editId);
    const { error: unsetError } = await unsetQuery;
    if (unsetError) {
      console.error("Failed to clear previous default:", unsetError);
      alert("Couldn't save this address: " + unsetError.message);
      saveBtn.disabled = false;
      return;
    }
  }

  const row = {
    label,
    full_name: fullName,
    phone,
    address_line: addressLine,
    region: location.region,
    province,
    city: location.city,
    barangay: location.barangay,
    zip,
    country,
    is_default: isDefault,
  };

  const { error } = editId
    ? await supabase.from("addresses").update(row).eq("id", editId)
    : await supabase.from("addresses").insert({ ...row, user_id: uid });

  saveBtn.disabled = false;

  if (error) {
    console.error("Failed to save address:", error);
    alert("Couldn't save this address: " + error.message);
    return;
  }

  modal.classList.remove("active");
  renderAddresses();
});

document.getElementById("address-list").addEventListener("click", async (e) => {
  const uid = getUserId();
  const setDefaultBtn = e.target.closest(".set-default");
  const editBtn = e.target.closest(".edit-address");
  const removeBtn = e.target.closest(".remove-address");

  if (setDefaultBtn) {
    const id = setDefaultBtn.dataset.id;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", uid);
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) {
      alert("Couldn't set default address: " + error.message);
      return;
    }
    renderAddresses();
  }

  if (editBtn) {
    const addr = cachedAddresses.find((a) => a.id == editBtn.dataset.id);
    if (!addr) return;

    document.getElementById("address-modal-title").textContent = "Edit Address";
    document.getElementById("address-modal").dataset.editId = addr.id;
    document.getElementById("addr-label").value = addr.label || "";
    document.getElementById("addr-fullname").value = addr.full_name || "";
    document.getElementById("addr-phone").value = addr.phone || "";
    document.getElementById("addr-line").value = addr.address_line || "";
    document.getElementById("addr-zip").value = addr.zip || "";
    document.getElementById("addr-country").value = addr.country || "Philippines";
    document.getElementById("addr-default").checked = !!addr.is_default;

    await addressLocations.setValues({
      region: addr.region || "",
      province: addr.province || "",
      city: addr.city || "",
      barangay: addr.barangay || "",
    });

    document.getElementById("address-modal").classList.add("active");
  }

  if (removeBtn) {
    if (!confirm("Remove this address?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", removeBtn.dataset.id);
    if (error) {
      alert("Couldn't remove this address: " + error.message);
      return;
    }
    renderAddresses();
  }
});

/* ═══════════════════════════════════════════════════════════════
   WISHLIST
   Items get added from product.html via window.ccToggleWishlist().
═══════════════════════════════════════════════════════════════ */

let cachedWishlist = []; // last fetch, reused by remove/move-to-cart handlers

async function renderWishlist() {
  const uid = getUserId();
  const list = document.getElementById("wishlist-list");
  const empty = document.getElementById("wishlist-empty");

  // products(*) pulls each wishlist row's current product data via the
  // wishlist.product_id -> products.id foreign key, so it's always fresh
  // (unlike orders, which snapshot the price at time of purchase).
  const { data: items, error } = await supabase
    .from("wishlist")
    .select("id, product_id, products(*)")
    .eq("user_id", uid)
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load wishlist:", error);
    list.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Couldn't load your wishlist (" + error.message + ").";
    return;
  }

  // Skip rows where the linked product no longer exists.
  cachedWishlist = (items || []).filter((i) => i.products);
  list.innerHTML = "";

  if (cachedWishlist.length === 0) {
    empty.hidden = false;
    empty.textContent = "Nothing saved yet. Tap the heart icon on any product to add it here.";
    return;
  }
  empty.hidden = true;

  cachedWishlist.forEach((item) => {
    const p = item.products;
    const card = document.createElement("div");
    card.className = "wishlist-card";
    card.innerHTML = `
      <button class="wishlist-remove-btn" data-id="${item.id}" title="Remove from wishlist">×</button>
      <img src="${p.sample_image}" alt="${p.name}">
      <div class="wishlist-card-details">
        <p class="wishlist-card-name">${p.name}</p>
        <p class="wishlist-card-price">₱${Number(p.price).toFixed(2)}</p>
        <button class="product-add-btn move-to-cart" data-id="${item.id}">Add to Cart</button>
      </div>
    `;
    list.appendChild(card);
  });
}

document.getElementById("wishlist-list").addEventListener("click", async (e) => {
  const removeBtn = e.target.closest(".wishlist-remove-btn");
  const cartBtn = e.target.closest(".move-to-cart");

  if (removeBtn) {
    const { error } = await supabase.from("wishlist").delete().eq("id", removeBtn.dataset.id);
    if (error) {
      alert("Couldn't remove this item: " + error.message);
      return;
    }
    renderWishlist();
  }

  if (cartBtn) {
    const item = cachedWishlist.find((i) => i.id == cartBtn.dataset.id);
    if (!item) return;
    const p = item.products;

    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const existing = cart.find((c) => c.id === p.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id: p.id, name: p.name, price: p.price, image: p.sample_image, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));

    if (window.emieReact) {
      window.emieReact("assets/gifs/kilig_emie.gif", `${p.name} added to your cart!`, 2200);
    }
  }
});
/* ─────────────────────────────────────────
   FORGOT PASSWORD
   Uses Supabase Auth's built-in recovery flow — Supabase generates and
   stores the reset token securely on its own servers; we never see or
   handle the raw token ourselves. The email links to reset-password.html.
───────────────────────────────────────── */
const NEUTRAL_RESET_MESSAGE =
  "If an account exists for this email, we've sent instructions to reset the password. Check your inbox (and spam folder).";

document.getElementById("open-forgot-password").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("forgot-password-status").textContent =
    "Enter your account email and we'll send you a link to reset your password.";
  document.getElementById("forgot-password-form-group").hidden = false;
  document.getElementById("forgot-password-send").hidden = false;
  document.getElementById("forgot-password-email").value = document.getElementById("login-email").value || "";
  document.getElementById("forgot-password-modal").classList.add("active");
});

document.getElementById("forgot-password-close").addEventListener("click", () => {
  document.getElementById("forgot-password-modal").classList.remove("active");
});

document.getElementById("forgot-password-send").addEventListener("click", async () => {
  const email = document.getElementById("forgot-password-email").value.trim();
  const sendBtn = document.getElementById("forgot-password-send");

  if (!email) {
    alert("Please enter your email.");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending…";

  // Supabase always resolves this the same way whether or not the email
  // belongs to an account — that's intentional, and it's what keeps this
  // from being usable to guess which emails are registered.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`,
  });

  sendBtn.disabled = false;
  sendBtn.textContent = "Send Reset Link";

  // Same message shown no matter the outcome — see comment above.
  document.getElementById("forgot-password-status").textContent = NEUTRAL_RESET_MESSAGE;
  document.getElementById("forgot-password-form-group").hidden = true;
  sendBtn.hidden = true;
});