// Featured Products Section

fetch("data/products.json")
  .then((res) => res.json())
  .then((products) => {
    renderFeatured(products, "Writing Tools");

    document.querySelectorAll(".featured-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".featured-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        renderFeatured(products, tab.dataset.category);
      });
    });
  });

function renderFeatured(products, category) {
  const grid = document.getElementById("featured-grid");
  const filtered = products.filter((p) => p.category === category).slice(0, 4);

  grid.classList.add("flip");

  setTimeout(() => {
    grid.innerHTML = "";

    filtered.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${product.sampleImage}" alt="${product.name}">
        <div class="product-card-details">
          <h3 class="product-card-name">${product.name}</h3>
          <span class="product-card-price">₱${product.price}</span>
          <button class="product-add-btn">Add to Cart</button>
        </div>
      `;
      grid.appendChild(card);

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        window.location.href = `product.html?id=${product.id}`;
      });
    });

    grid.classList.remove("flip");
  }, 400);
}
