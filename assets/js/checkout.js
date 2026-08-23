import { initAddressLocations } from "./addressLocations.js";
import { supabase } from "./supabaseClient.js";

// Require login before allowing checkout
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  window.location.href = "account.html";
}

// Load cart items into checkout summary
function loadCheckoutSummary() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const container = document.getElementById("checkout-items");
  let subtotal = 0;

  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = '<p style="color: var(--cc-slate); text-align: center;">Your cart is empty</p>';
    document.getElementById("checkout-subtotal").textContent = "₱0.00";
    document.getElementById("checkout-total").textContent = "₱0.00";
    return;
  }

  cart.forEach((item) => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    const row = document.createElement("div");
    row.classList.add("checkout-item-row");
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="checkout-item-details">
        <p class="checkout-item-name">${item.name}</p>
        <p class="checkout-item-line">
          ₱${item.price.toFixed(2)} × ${item.quantity} = <strong>₱${lineTotal.toFixed(2)}</strong>
        </p>
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById("checkout-subtotal").textContent = `₱${subtotal.toFixed(2)}`;
  document.getElementById("checkout-total").textContent = `₱${subtotal.toFixed(2)}`;
}

// Philippine delivery location selectors
const checkoutLocations = initAddressLocations({
  regionId: "checkout-region",
  provinceId: "checkout-province",
  cityId: "checkout-city",
  barangayId: "checkout-barangay",
});

// ── Saved address dropdown ──
let savedAddresses = [];

async function loadSavedAddresses() {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to load saved addresses:", error);
    return;
  }

  savedAddresses = data || [];
  const select = document.getElementById("checkout-saved-address");

  savedAddresses.forEach((addr) => {
    const option = document.createElement("option");
    option.value = addr.id;
    option.textContent = `${addr.label || "Address"} — ${addr.address_line}, ${addr.city}${addr.is_default ? " (Default)" : ""}`;
    select.appendChild(option);
  });
}

document.getElementById("checkout-saved-address").addEventListener("change", async (e) => {
  const addr = savedAddresses.find((a) => a.id == e.target.value);

  if (!addr) {
    // "+ Enter a new address" selected — clear the form for manual entry
    document.getElementById("checkout-name").value = "";
    document.getElementById("checkout-address").value = "";
    document.getElementById("checkout-zip").value = "";
    await checkoutLocations.reset();
    return;
  }

  document.getElementById("checkout-name").value = addr.full_name;
  document.getElementById("checkout-address").value = addr.address_line;
  document.getElementById("checkout-zip").value = addr.zip;

  await checkoutLocations.setValues({
    region: addr.region,
    province: addr.province,
    city: addr.city,
    barangay: addr.barangay,
  });
});

loadSavedAddresses();

// Place order
const placeOrderBtn = document.getElementById("place-order-btn");

placeOrderBtn.addEventListener("click", async () => {
  const name = document.getElementById("checkout-name").value.trim();
  const address = document.getElementById("checkout-address").value.trim();
  const location = checkoutLocations.getValues();
  const zip = document.getElementById("checkout-zip").value.trim();
  const country = document.getElementById("checkout-country").value.trim();

  if (!name || !address || !location.region || !location.city || !location.barangay || !zip || !country) {
    alert("Please fill in all delivery address fields.");
    return;
  }

  const province = location.province || location.region;
  const payment = document.querySelector('input[name="payment"]:checked').value;
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Placing order...";

  // 1. Insert the order header
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      ship_name: name,
      ship_address: address,
      ship_region: location.region,
      ship_province: province,
      ship_city: location.city,
      ship_barangay: location.barangay,
      ship_zip: zip,
      ship_country: country,
      payment_method: payment,
      subtotal: subtotal,
      total: subtotal,
      status: "Processing",
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("Order insert failed:", orderError);
    alert("Something went wrong placing your order: " + (orderError?.message || "unknown error"));
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    return;
  }

  // 2. Insert one row per cart item, linked to the new order
  const orderItems = cart.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    product_name: item.name,
    product_image: item.image,
    unit_price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Order items insert failed:", itemsError);
    await supabase.from("orders").delete().eq("id", order.id);

    const friendlyMessage = itemsError.message.includes("insufficient_stock")
      ? "Sorry, one of the items in your cart just sold out or dropped in stock. Please update your cart and try again."
      : "Something went wrong saving your order items: " + itemsError.message;

    alert(friendlyMessage);
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    return;
  }

  localStorage.removeItem("cart");

  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = "0";
    cartCount.style.display = "none";
  }

  if (window.emieReact) {
    window.emieReact(
      "assets/gifs/kilig_emie.gif",
      `Order placed! Your supplies are on the way! 🎉`,
      3000
    );
  }

  document.getElementById("order-modal").classList.add("active");
  placeOrderBtn.disabled = false;
  placeOrderBtn.textContent = "Place Order";
});

// Continue shopping
document.getElementById("continue-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

// Load summary on page load
loadCheckoutSummary();