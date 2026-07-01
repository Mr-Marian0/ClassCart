// Load cart items into checkout summary
function loadCheckoutSummary() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const container = document.getElementById("checkout-items");
  let subtotal = 0;

  container.innerHTML = "";

  cart.forEach((item) => {
    subtotal += item.price * item.quantity;
    const row = document.createElement("div");
    row.classList.add("checkout-item-row");
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div>
        <p class="checkout-item-name">${item.name}</p>
        <p class="checkout-item-qty">x${item.quantity}</p>
      </div>
      <span>₱${(item.price * item.quantity).toFixed(2)}</span>
    `;
    container.appendChild(row);
  });

  document.getElementById("checkout-subtotal").textContent =
    `₱${subtotal.toFixed(2)}`;
  document.getElementById("checkout-total").textContent =
    `₱${subtotal.toFixed(2)}`;
}

// Place order
document.getElementById("place-order-btn").addEventListener("click", () => {
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

  const order = {
    id: Date.now(),
    items: cart,
    delivery: { name, address, city, province, zip, country },
    payment: payment,
    status: "Pending",
    date: new Date().toLocaleDateString(),
  };

  // Save order
  const orders = JSON.parse(localStorage.getItem("orders")) || [];
  orders.push(order);
  localStorage.setItem("orders", JSON.stringify(orders));

  // Clear cart
  localStorage.removeItem("cart");

  // Show modal
  document.getElementById("order-modal").classList.add("active");
});

// Continue shopping
document.getElementById("continue-btn").addEventListener("click", () => {
  window.location.href = "index.html";
});

loadCheckoutSummary();
