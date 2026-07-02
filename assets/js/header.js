fetch("components/header.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("header-placeholder").innerHTML = html;

    // ── Active nav link ──
    const page = window.location.pathname.split("/").pop().replace(".html", "") || "index";
    document.querySelectorAll(".header-nav a[data-page]").forEach((link) => {
      if (link.dataset.page === page) link.classList.add("active");
    });

    // ── Search ──
    const searchBtn = document.getElementById("search-btn");
    const searchBar = document.getElementById("header-search");
    const searchInput = document.getElementById("search-input");
    const searchSubmit = document.getElementById("search-submit");

    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      searchBar.classList.toggle("open");
      if (searchBar.classList.contains("open")) searchInput.focus();
    });

    document.addEventListener("click", (e) => {
      if (!searchBar.contains(e.target) && e.target !== searchBtn) {
        searchBar.classList.remove("open");
      }
    });

    function doSearch() {
      const query = searchInput.value.trim();
      if (query) {
        localStorage.setItem("emieShouldReact", "true");
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
      }
    }

    searchSubmit.addEventListener("click", doSearch);
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") doSearch();
    });

    // ── Cart count ──
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const total = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById("cart-count");
    if (cartCount && total > 0) {
      cartCount.textContent = total;
      cartCount.style.display = "flex";
    }

    // ── Inject Emie companion into body ──
    const emieHTML = `
      <div class="emie-companion" id="emie-companion">
        <div class="emie-bubble" id="emie-bubble"></div>
        <div class="emie-avatar" id="emie-logo">
          <img src="assets/gifs/idle_emie2.gif" alt="Emie" id="emie-img" />
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", emieHTML);

    // ── Emie setup ──
    const emieAvatar = document.getElementById("emie-logo");
    const emieImg = document.getElementById("emie-img");
    const emieBubble = document.getElementById("emie-bubble");

    let emieDisabled = sessionStorage.getItem("emieDisabled") === "true";
    let emieTimer = null;

    if (emieDisabled) {
      emieAvatar.classList.add("disabled");
      emieImg.src = "assets/gifs/angry_emie.gif";
    }

    const emieGifs = [
      "assets/gifs/kilig_emie.gif",
      "assets/gifs/trans_emie.gif",
      "assets/gifs/angry_emie.gif",
      "assets/gifs/jelous_emie.gif",
      "assets/gifs/emie - ring2.gif",
    ];

    const emieLines = [
      "Ooh, let me check that for you!",
      "Searching... searching...",
      "This is gonna be good!",
      "Found it... maybe!",
      "Hang tight, I'm on it!",
      "Let's dig through the shelves!",
      "Ooh, good taste!",
      "One sec, scanning the aisles!",
      "Beep boop, searching mode!",
      "I love a good treasure hunt!",
      "Let me sniff this one out!",
      "Almost there, hang on!",
      "Ooh, this looks fun!",
      "Searching the whole store for you!",
      "Give me a moment to think!",
      "I've got my eyes peeled!",
      "This better be good, I'm excited!",
      "On the case, captain!",
      "Let's see what we've got here!",
      "Hmm, let me think about this one!",
    ];

    function emieReact(gif, line, duration = 2800) {
      if (emieDisabled) return;
      clearTimeout(emieTimer);

      emieImg.src = gif || emieGifs[Math.floor(Math.random() * emieGifs.length)];
      emieBubble.textContent = line || emieLines[Math.floor(Math.random() * emieLines.length)];
      emieBubble.classList.add("show");

      emieTimer = setTimeout(() => {
        emieBubble.classList.remove("show");
        setTimeout(() => {
          emieImg.src = "assets/gifs/idle_emie2.gif";
        }, 250);
      }, duration);
    }

    // Expose globally so other scripts can trigger Emie
    window.emieReact = emieReact;

    // React on search navigation
    if (localStorage.getItem("emieShouldReact") === "true") {
      localStorage.removeItem("emieShouldReact");
      emieReact();
    }

    // Toggle Emie on click
    emieAvatar.addEventListener("click", () => {
      emieDisabled = !emieDisabled;
      sessionStorage.setItem("emieDisabled", emieDisabled);
      emieAvatar.classList.toggle("disabled", emieDisabled);

      if (emieDisabled) {
        emieImg.src = "assets/gifs/angry_emie.gif";
        emieBubble.textContent = "Okay, I'll be quiet...";
        emieBubble.classList.add("show");
        clearTimeout(emieTimer);
        emieTimer = setTimeout(() => emieBubble.classList.remove("show"), 2000);
      } else {
        emieImg.src = "assets/gifs/idle_emie2.gif";
        emieBubble.classList.remove("show");
      }
    });
  });

// Welcome greeting function
window.showEmieWelcome = function() {
  if (sessionStorage.getItem("emieWelcomed")) return;
  
  const emieAvatar = document.getElementById("emie-logo");
  const emieImg = document.getElementById("emie-img");
  const emieBubble = document.getElementById("emie-bubble");
  
  if (!emieAvatar || !emieImg || !emieBubble) return;
  
  sessionStorage.setItem("emieWelcomed", "true");
  
  emieImg.src = "assets/gifs/kilig_emie.gif";
  emieBubble.textContent = "Hi! I'm Emie, your shopping buddy! 👋";
  emieBubble.classList.add("show");
  
  setTimeout(() => {
    emieBubble.classList.remove("show");
    setTimeout(() => {
      emieImg.src = "assets/gifs/idle_emie2.gif";
    }, 250);
  }, 3000);
};
