// SAMPLE PRODUCTS --------------------------------------------------------------

fetch("data/products.json")
  .then((response) => response.json())
  .then((products) => {
    const grid = document.getElementById("product-grid");

    products.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <img src="${product.sampleImage}" alt="${product.name}">
        <div class="product-card-details">
          <span class="product-category">${product.category}</span>
          <h3 class="product-name">${product.name}</h3>
          <span class="product-price">₱${product.price}</span>
          <button class="product-add-btn">Add to Cart</button>
        </div>
      `;

      grid.appendChild(card);

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        window.location.href = `product.html?id=${product.id}`;
      });
    });
  });

//   PAGINATION LOGIC ----------------------------------------------------------

// PAGINATION LOGIC
const PRODUCTS_PER_PAGE = 9;
let currentPage = 1;
let allProducts = [];

const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('search');

fetch("data/products.json")
  .then((response) => response.json())
  .then((products) => {
    if (searchQuery) {
      allProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      allProducts = products;
    }
    renderPage(currentPage);
  });

function renderPage(page) {
  const grid = document.getElementById("product-grid");

  if (allProducts.length === 0) {
    grid.innerHTML = `<p class="search-not-found">No products found for "<strong>${searchQuery}</strong>".</p>`;
    document.querySelector(".listing-pagination-number").textContent = "0 / 0";
    return;
  }

  const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
  const start = (page - 1) * PRODUCTS_PER_PAGE;
  const end = start + PRODUCTS_PER_PAGE;
  const pageProducts = allProducts.slice(start, end);

  grid.innerHTML = "";

  pageProducts.forEach((product) => {
    const card = document.createElement("div");
    card.classList.add("product-card");
    card.innerHTML = `
      <img src="${product.sampleImage}" alt="${product.name}">
      <div class="product-card-details">
        <span class="product-category">${product.category}</span>
        <h3 class="product-name">${product.name}</h3>
        <span class="product-price">₱${product.price}</span>
        <button class="product-add-btn">Add to Cart</button>
      </div>
    `;
    grid.appendChild(card);

    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      window.location.href = `product.html?id=${product.id}`;
    });
  });

  document.querySelector(".listing-pagination-number").textContent =
    `${page} / ${totalPages}`;
}

document.querySelector(".move-page-left").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
});

document.querySelector(".move-page-right").addEventListener("click", () => {
  const totalPages = Math.ceil(allProducts.length / PRODUCTS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage(currentPage);
  }
});
