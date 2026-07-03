// Top Seller Section
fetch("data/products.json")
  .then((res) => res.json())
  .then((products) => {
    // Find top seller by soldCount
    const topSeller = products.reduce((max, product) => 
      product.soldCount > max.soldCount ? product : max
    );

    renderTopSeller(topSeller);
    renderFeatured(products, "Writing Tools");

    // Featured tabs
    document.querySelectorAll(".featured-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".featured-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        renderFeatured(products, tab.dataset.category);
      });
    });

    // Welcome Emie on homepage (2-3 second delay)
    setTimeout(() => {
      if (window.showEmieWelcome) {
        window.showEmieWelcome();
      }
    }, 2500);
  });

function renderTopSeller(product) {
  const card = document.getElementById("top-seller-card");
  
  card.innerHTML = `
    <!-- Best Seller Badge - Top Right Corner of the whole card -->
    <img src="assets/images/best-seller.png" 
         alt="Best Seller" 
         class="best-seller-badge">

    <div class="top-seller-image">
      <img src="${product.sampleImage}" alt="${product.name}">
      <div class="top-seller-badge">Hot Pick of the Month!</div>
    </div>
    
    <div class="top-seller-details">
      <h2 class="top-seller-title">${product.name}</h2>
      <span class="top-seller-price">₱${product.price}</span>
      <div class="top-seller-sold">
        <span>Customers are loving it:</span>
        <span class="top-seller-sold-badge">${product.soldCount.toLocaleString()}+ sold</span>
      </div>
      
      <div class="top-seller-cta-group">
        <button class="top-seller-cta" data-product-id="${product.id}">Add to Cart</button>
        <button class="top-seller-view-btn" data-product-id="${product.id}">View Product</button>
      </div>
    </div>
  `;

  // Add to Cart
  const addBtn = card.querySelector(".top-seller-cta");
  addBtn.addEventListener("click", () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const item = {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.sampleImage,
      quantity: 1,
    };

    const existing = cart.find((p) => p.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push(item);

    localStorage.setItem("cart", JSON.stringify(cart));

    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = total;
      cartCount.style.display = total === 0 ? "none" : "flex";
    }

    if (window.emieReact) {
      window.emieReact(
        "assets/gifs/kilig_emie.gif",
        `🔥 Great choice! ${product.name} is flying off the shelves!`,
        2500
      );
    }

    const originalText = addBtn.textContent;
    addBtn.textContent = "✓ Added!";
    addBtn.style.background = "var(--cc-leaf)";
    
    setTimeout(() => {
      addBtn.textContent = originalText;
      addBtn.style.background = "var(--cc-yellow)";
    }, 2000);
  });

  const viewBtn = card.querySelector(".top-seller-view-btn");
  viewBtn.addEventListener("click", () => {
    window.location.href = `product.html?id=${product.id}`;
  });

}

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
