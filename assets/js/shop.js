import { supabase } from "./supabaseClient.js";

const PRODUCTS_PER_PAGE = 12;
let currentPage = 1;
let allProducts = [];
let filteredProducts = [];

const urlParams = new URLSearchParams(window.location.search);
const searchQuery = urlParams.get('search');

let filters = {
  category: 'all',
  priceMin: 0,
  priceMax: 1000,
  sort: 'newest'
};

// Fetch products
supabase
  .from("products")
  .select("*")
  .then(({ data: products, error }) => {
    if (error) {
      console.error("Error loading products:", error);
      return;
    }
    allProducts = products;
    
    // If search query, start with search filter
    if (searchQuery) {
      filters.category = 'all';
      filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      filteredProducts = products;
    }

    applyFilters();
    setupEventListeners();
    renderPage(1);
  });

function applyFilters() {
  let results = allProducts;

  // Apply category filter
  if (filters.category !== 'all') {
    results = results.filter(p => p.category === filters.category);
  }

  // Apply search filter
  if (searchQuery) {
    results = results.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply price filter
  results = results.filter(p => 
    p.price >= filters.priceMin && p.price <= filters.priceMax
  );

  // Apply sorting
  switch(filters.sort) {
    case 'price-low':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'name':
      results.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'newest':
    default:
      results.sort((a, b) => b.id - a.id);
  }

  filteredProducts = results;
  currentPage = 1;
}

function renderPage(page) {
  const grid = document.getElementById("product-grid");

  if (filteredProducts.length === 0) {
    grid.innerHTML = `<p class="search-not-found">No products found${searchQuery ? ` for "<strong>${searchQuery}</strong>"` : ''}.</p>`;
    updatePagination(0, 0);
    updateProductCount(0);
    return;
  }

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const start = (page - 1) * PRODUCTS_PER_PAGE;
  const end = start + PRODUCTS_PER_PAGE;
  const pageProducts = filteredProducts.slice(start, end);

  grid.innerHTML = "";

  pageProducts.forEach((product) => {
    const card = document.createElement("div");
    card.classList.add("product-card");
    card.innerHTML = `
      <img src="${product.sample_image}" alt="${product.name}">
      <div class="product-card-details">
        <h3 class="product-card-name">${product.name}</h3>
        <span class="product-card-price">₱${product.price}</span>
        <button class="product-add-btn">Add to Cart</button>
      </div>
    `;
    grid.appendChild(card);

    card.addEventListener("click", () => {
      window.location.href = `product.html?id=${product.id}`;
    });
  });

  updatePagination(page, totalPages);
  updateProductCount(filteredProducts.length);
}

function updatePagination(page, totalPages) {
  document.getElementById("current-page").textContent = page;
  document.getElementById("total-pages").textContent = totalPages || 1;
}

function updateProductCount(count) {
  document.getElementById("product-count").textContent = count;
}

function setupEventListeners() {
  // Category filter
  document.querySelectorAll("#category-list a").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll("#category-list a").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      filters.category = link.dataset.category;
      applyFilters();
      renderPage(1);
    });
  });

  // Price range filter
  document.getElementById("price-min").addEventListener("change", (e) => {
    filters.priceMin = parseFloat(e.target.value) || 0;
    applyFilters();
    renderPage(1);
  });

  document.getElementById("price-max").addEventListener("change", (e) => {
    filters.priceMax = parseFloat(e.target.value) || 1000;
    applyFilters();
    renderPage(1);
  });

  // Sorting
  document.getElementById("sort-select").addEventListener("change", (e) => {
    filters.sort = e.target.value;
    applyFilters();
    renderPage(1);
  });

  // Pagination
  document.querySelector(".move-page-left").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
      window.scrollTo(0, 0);
    }
  });

  document.querySelector(".move-page-right").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderPage(currentPage);
      window.scrollTo(0, 0);
    }
  });
}
