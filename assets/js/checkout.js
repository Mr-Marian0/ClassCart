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
    subtotal += item.price * item.quantity;
    const row = document.createElement("div");
    row.classList.add("checkout-item-row");
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="checkout-item-details">
        <p class="checkout-item-name">${item.name}</p>
        <p class="checkout-item-qty">Qty: ${item.quantity}</p>
        <p class="checkout-item-price">₱${(item.price * item.quantity).toFixed(2)}</p>
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById("checkout-subtotal").textContent = `₱${subtotal.toFixed(2)}`;
  document.getElementById("checkout-total").textContent = `₱${subtotal.toFixed(2)}`;
}

// Place order
const placeOrderBtn = document.getElementById("place-order-btn");

placeOrderBtn.addEventListener("click", async () => {
  const name = document.getElementById("checkout-name").value.trim();
  const address = document.getElementById("checkout-address").value.trim();
  const city = document.getElementById("checkout-city").value.trim();
  const province = document.getElementById("checkout-province").value.trim();
  const zip = document.getElementById("checkout-zip").value.trim();
  const country = document.getElementById("checkout-country").value.trim();

  if (!name || !address || !city || !province || !zip || !country) {
    alert("Please fill in all fields.");
    return;
  }

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
      ship_city: city,
      ship_province: province,
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

    // Roll back the order header we just created — otherwise it's left
    // behind as an empty "Processing" order that never really happened.
    await supabase.from("orders").delete().eq("id", order.id);

    const friendlyMessage = itemsError.message.includes("insufficient_stock")
      ? "Sorry, one of the items in your cart just sold out or dropped in stock. Please update your cart and try again."
      : "Something went wrong saving your order items: " + itemsError.message;

    alert(friendlyMessage);
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
    return;
  }

  // Clear cart
  localStorage.removeItem("cart");

  // Update cart count
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = "0";
    cartCount.style.display = "none";
  }

  // Emie celebration
  if (window.emieReact) {
    window.emieReact(
      "assets/gifs/kilig_emie.gif",
      `Order placed! Your supplies are on the way! 🎉`,
      3000
    );
  }

  // Show modal
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