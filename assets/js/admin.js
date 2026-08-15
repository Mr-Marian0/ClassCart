import { supabase } from "./supabaseClient.js";

let cachedOrders = [];
let cachedProducts = [];
let cachedProfiles = [];

/* ─────────────────────────────────────────
   ACCESS GATE
───────────────────────────────────────── */
async function checkAdminAccess() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "account.html";
    return;
  }

  const { data: profile, error } = await supabase
    .from("profile")
    .select("name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !profile.is_admin) {
    window.location.href = "account.html";
    return;
  }

  document.getElementById("admin-whoami").textContent = profile.name;
  document.getElementById("admin-gate").classList.add("is-hidden");
  document.getElementById("admin-shell").classList.remove("is-hidden");

  loadEverything();
}

document.getElementById("admin-logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "account.html";
});

/* ─────────────────────────────────────────
   TAB NAVIGATION
───────────────────────────────────────── */
document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add("active");
  });
});

/* ─────────────────────────────────────────
   SHARED LOAD
───────────────────────────────────────── */
async function loadEverything() {
  await Promise.all([loadOrders(), loadProducts(), loadProfiles()]);
  renderOverview();
  renderOrders();
  renderProducts();
  renderCustomers();
}

async function loadOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("id", { ascending: false });
  if (error) {
    console.error("Failed to load orders:", error);
    return;
  }
  cachedOrders = data || [];
}

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("id", { ascending: false });
  if (error) {
    console.error("Failed to load products:", error);
    return;
  }
  cachedProducts = data || [];
}

async function loadProfiles() {
  const { data, error } = await supabase.from("profile").select("id, name, is_admin");
  if (error) {
    console.error("Failed to load profiles:", error);
    return;
  }
  cachedProfiles = data || [];
}

function profileName(userId) {
  const p = cachedProfiles.find((p) => p.id === userId);
  return p ? p.name : "Unknown";
}

function statusClass(status) {
  switch (status) {
    case "Shipped": return "st-shipped";
    case "Delivered": return "st-delivered";
    case "Cancelled": return "st-cancelled";
    default: return "st-processing";
  }
}

/* ─────────────────────────────────────────
   OVERVIEW
───────────────────────────────────────── */
function renderOverview() {
  const revenue = cachedOrders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const processingCount = cachedOrders.filter((o) => o.status === "Processing").length;
  const lowStockCount = cachedProducts.filter((p) => p.stock < 10).length;

  document.getElementById("stat-total-orders").textContent = cachedOrders.length;
  document.getElementById("stat-revenue").textContent = `₱${revenue.toFixed(2)}`;
  document.getElementById("stat-processing").textContent = processingCount;
  document.getElementById("stat-low-stock").textContent = lowStockCount;

  const body = document.getElementById("recent-orders-body");
  body.innerHTML = "";
  cachedOrders.slice(0, 6).forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">#${order.id}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
      <td>${profileName(order.user_id)}</td>
      <td class="mono">₱${Number(order.total).toFixed(2)}</td>
      <td><span class="status-badge ${statusClass(order.status)}">${order.status}</span></td>
    `;
    body.appendChild(tr);
  });
}

/* ─────────────────────────────────────────
   ORDERS
───────────────────────────────────────── */
const STATUS_OPTIONS = ["Processing", "Shipped", "Delivered", "Cancelled"];

const PAGE_SIZE = 10;
const pageState = { orders: 1, products: 1 };

// Slices a filtered array to the current page for the given key, and
// updates that panel's "Page X of Y" label + disables Prev/Next at the ends.
function paginate(key, items) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (pageState[key] > totalPages) pageState[key] = totalPages;

  document.getElementById(`${key}-page-num`).textContent = pageState[key];
  document.getElementById(`${key}-page-total`).textContent = totalPages;

  const wrap = document.getElementById(`${key}-pagination`);
  wrap.querySelector(".page-prev").disabled = pageState[key] <= 1;
  wrap.querySelector(".page-next").disabled = pageState[key] >= totalPages;

  const start = (pageState[key] - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

document.querySelectorAll(".page-prev").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.target;
    if (pageState[key] > 1) {
      pageState[key]--;
      key === "orders" ? renderOrders() : renderProducts();
    }
  });
});

document.querySelectorAll(".page-next").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.target;
    pageState[key]++;
    key === "orders" ? renderOrders() : renderProducts();
  });
});

function renderOrders() {
  const filter = document.getElementById("order-status-filter").value;
  const search = document.getElementById("order-search").value.trim().toLowerCase();
  const body = document.getElementById("orders-body");
  const empty = document.getElementById("orders-empty");

  let filtered = cachedOrders.filter((o) => filter === "all" || o.status === filter);

  if (search) {
    filtered = filtered.filter(
      (o) => String(o.id).includes(search) || profileName(o.user_id).toLowerCase().includes(search)
    );
  }

  body.innerHTML = "";

  if (filtered.length === 0) {
    empty.classList.remove("is-hidden");
    document.getElementById("orders-pagination").classList.add("is-hidden");
    return;
  }
  empty.classList.add("is-hidden");
  document.getElementById("orders-pagination").classList.remove("is-hidden");

  const pageItems = paginate("orders", filtered);

  pageItems.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><button class="expand-btn" data-order-id="${order.id}" type="button">▸</button></td>
      <td class="mono">#${order.id}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
      <td>${profileName(order.user_id)}</td>
      <td>${order.ship_name}, ${order.ship_city}</td>
      <td class="mono">₱${Number(order.total).toFixed(2)}</td>
      <td>
        <select class="status-select ${statusClass(order.status)}" data-order-id="${order.id}">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    `;
    body.appendChild(tr);

    const itemsRow = document.createElement("tr");
    itemsRow.className = "order-items-row is-hidden";
    itemsRow.dataset.forOrder = order.id;
    itemsRow.innerHTML = `
      <td colspan="7">
        ${(order.order_items || [])
          .map(
            (item) => `
          <div class="item-line">
            <span>${item.quantity} × ${item.product_name}</span>
            <span class="mono">₱${Number(item.unit_price).toFixed(2)} each</span>
          </div>
        `
          )
          .join("")}
        ${order.cancel_reason ? `<div class="item-line"><span>Cancel reason</span><span>${order.cancel_reason}</span></div>` : ""}
      </td>
    `;
    body.appendChild(itemsRow);
  });
}

document.getElementById("order-status-filter").addEventListener("change", () => {
  pageState.orders = 1;
  renderOrders();
});
document.getElementById("order-search").addEventListener("input", () => {
  pageState.orders = 1;
  renderOrders();
});

document.getElementById("orders-body").addEventListener("click", (e) => {
  const expandBtn = e.target.closest(".expand-btn");
  if (!expandBtn) return;
  expandBtn.classList.toggle("open");
  expandBtn.textContent = expandBtn.classList.contains("open") ? "▾" : "▸";
  const itemsRow = document.querySelector(`.order-items-row[data-for-order="${expandBtn.dataset.orderId}"]`);
  itemsRow.classList.toggle("is-hidden");
});

document.getElementById("orders-body").addEventListener("change", async (e) => {
  const select = e.target.closest(".status-select");
  if (!select) return;

  const orderId = select.dataset.orderId;
  const newStatus = select.value;
  const update = { status: newStatus };

  if (newStatus === "Cancelled") {
    const reason = prompt("Reason for cancelling this order?", "Cancelled by admin");
    if (reason === null) {
      renderOrders(); // revert the dropdown, admin backed out
      return;
    }
    update.cancel_reason = reason || "Cancelled by admin";
    update.cancelled_at = new Date().toISOString();
  }

  select.disabled = true;
  const { error } = await supabase.from("orders").update(update).eq("id", orderId);
  select.disabled = false;

  if (error) {
    alert("Couldn't update order status: " + error.message);
    return;
  }

  await loadOrders();
  renderOverview();
  renderOrders();
});

/* ─────────────────────────────────────────
   PRODUCTS
───────────────────────────────────────── */
function renderProducts() {
  const search = document.getElementById("product-search").value.trim().toLowerCase();
  const body = document.getElementById("products-body");
  const empty = document.getElementById("products-empty");

  let filtered = cachedProducts;
  if (search) {
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(search) || (p.category || "").toLowerCase().includes(search)
    );
  }

  body.innerHTML = "";

  if (filtered.length === 0) {
    empty.classList.remove("is-hidden");
    document.getElementById("products-pagination").classList.add("is-hidden");
    return;
  }
  empty.classList.add("is-hidden");
  document.getElementById("products-pagination").classList.remove("is-hidden");

  const pageItems = paginate("products", filtered);

  pageItems.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img class="thumb" src="${p.sample_image || ""}" alt="${p.name}"></td>
      <td>${p.name}</td>
      <td>${p.category || "—"}</td>
      <td class="mono">₱${Number(p.price).toFixed(2)}</td>
      <td>
        <input type="number" class="stock-input ${p.stock < 10 ? "stock-low" : ""}" min="0" step="1"
               value="${p.stock}" data-product-id="${p.id}">
      </td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" class="active-toggle" data-product-id="${p.id}" ${p.is_active ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn edit-product" data-product-id="${p.id}" type="button">Edit</button>
          <button class="icon-btn danger delete-product" data-product-id="${p.id}" type="button">Delete</button>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}

document.getElementById("products-body").addEventListener("change", async (e) => {
  const stockInput = e.target.closest(".stock-input");
  const toggle = e.target.closest(".active-toggle");

  if (stockInput) {
    const id = stockInput.dataset.productId;
    const stock = parseInt(stockInput.value, 10) || 0;
    const { error } = await supabase.from("products").update({ stock }).eq("id", id);
    if (error) {
      alert("Couldn't update stock: " + error.message);
      return;
    }
    await loadProducts();
    renderOverview();
    renderProducts();
  }

  if (toggle) {
    const id = toggle.dataset.productId;
    const { error } = await supabase.from("products").update({ is_active: toggle.checked }).eq("id", id);
    if (error) {
      alert("Couldn't update product: " + error.message);
      toggle.checked = !toggle.checked;
      return;
    }
    await loadProducts();
  }
});

document.getElementById("products-body").addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".edit-product");
  const deleteBtn = e.target.closest(".delete-product");

  if (editBtn) {
    const p = cachedProducts.find((p) => p.id == editBtn.dataset.productId);
    if (!p) return;
    openProductModal(p);
  }

  if (deleteBtn) {
    if (!confirm("Delete this product? This can't be undone. Past orders that included it will keep their own copy of the name/price.")) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteBtn.dataset.productId);
    if (error) {
      alert("Couldn't delete this product: " + error.message);
      return;
    }
    await loadProducts();
    renderOverview();
    renderProducts();
  }
});

function openProductModal(product) {
  const modal = document.getElementById("product-modal");
  modal.dataset.editId = product ? product.id : "";
  document.getElementById("product-modal-title").textContent = product ? "Edit Product" : "Add Product";
  document.getElementById("prod-name").value = product?.name || "";
  document.getElementById("prod-category").value = product?.category || "";
  document.getElementById("prod-price").value = product?.price ?? "";
  document.getElementById("prod-stock").value = product?.stock ?? 0;
  document.getElementById("prod-active").checked = product ? !!product.is_active : true;
  document.getElementById("prod-sample-image").value = product?.sample_image || "";
  document.getElementById("prod-additional-images").value = (product?.additional_images || []).join(", ");
  modal.classList.add("active");
}

document.getElementById("add-product-btn").addEventListener("click", () => openProductModal(null));
document.getElementById("product-search").addEventListener("input", () => {
  pageState.products = 1;
  renderProducts();
});
document.getElementById("product-modal-close").addEventListener("click", () => {
  document.getElementById("product-modal").classList.remove("active");
});

document.getElementById("product-modal-save").addEventListener("click", async () => {
  const modal = document.getElementById("product-modal");
  const editId = modal.dataset.editId;

  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value.trim();
  const price = parseFloat(document.getElementById("prod-price").value);
  const stock = parseInt(document.getElementById("prod-stock").value, 10) || 0;
  const isActive = document.getElementById("prod-active").checked;
  const sampleImage = document.getElementById("prod-sample-image").value.trim();
  const additionalImages = document
    .getElementById("prod-additional-images")
    .value.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name || !category || isNaN(price) || !sampleImage) {
    alert("Please fill in name, category, price, and a main image URL.");
    return;
  }

  const row = {
    name,
    category,
    price,
    stock,
    is_active: isActive,
    sample_image: sampleImage,
    additional_images: additionalImages,
  };

  const saveBtn = document.getElementById("product-modal-save");
  saveBtn.disabled = true;

  const { error } = editId
    ? await supabase.from("products").update(row).eq("id", editId)
    : await supabase.from("products").insert(row);

  saveBtn.disabled = false;

  if (error) {
    alert("Couldn't save this product: " + error.message);
    return;
  }

  modal.classList.remove("active");
  await loadProducts();
  renderOverview();
  renderProducts();
});

/* ─────────────────────────────────────────
   CUSTOMERS
───────────────────────────────────────── */
function renderCustomers() {
  const search = document.getElementById("customer-search").value.trim().toLowerCase();
  const body = document.getElementById("customers-body");
  const empty = document.getElementById("customers-empty");

  const filtered = search
    ? cachedProfiles.filter((p) => p.name.toLowerCase().includes(search))
    : cachedProfiles;

  body.innerHTML = "";

  if (filtered.length === 0) {
    empty.classList.remove("is-hidden");
    return;
  }
  empty.classList.add("is-hidden");

  filtered.forEach((profile) => {
    const theirOrders = cachedOrders.filter((o) => o.user_id === profile.id);
    const spent = theirOrders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${profile.name}</td>
      <td class="mono">${theirOrders.length}</td>
      <td class="mono">₱${spent.toFixed(2)}</td>
      <td>${profile.is_admin ? "Admin" : "Customer"}</td>
    `;
    body.appendChild(tr);
  });
}

document.getElementById("customer-search").addEventListener("input", renderCustomers);

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
checkAdminAccess();