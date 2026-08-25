fetch("components/footer.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("footer-placeholder").innerHTML = html;

    // =========================================
    // EMAIL SUBSCRIPTION
    // =========================================

    const emailInput = document.querySelector(".footer-email input");
    const emailBtn = document.querySelector(".footer-email button");

    if (emailBtn) {
      emailBtn.addEventListener("click", () => {
        const email = emailInput.value.trim();

        if (!email) {
          alert("Please enter your email.");
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
          alert("Please enter a valid email.");
          return;
        }

        if (window.emieReact) {
          window.emieReact(
            "assets/gifs/kilig_emie.gif",
            `Thanks for subscribing, ${email}! You'll get great deals!`,
            2500,
          );
        }

        alert("Thanks for subscribing!");
        emailInput.value = "";
      });

      if (emailInput) {
        emailInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            emailBtn.click();
          }
        });
      }
    }

    // =========================================
    // CAREERS & AFFILIATES MODAL
    // =========================================

    const footerModal = document.getElementById("footer-info-modal");
    const footerModalTitle = document.getElementById("footer-modal-title");
    const footerModalText = document.getElementById("footer-modal-text");
    const footerModalClose = document.getElementById("footer-modal-close");
    const footerModalOk = document.getElementById("footer-modal-ok");

    // Open modal
    function openFooterModal(title, message) {
      footerModalTitle.textContent = title;
      footerModalText.textContent = message;

      footerModal.classList.add("show");
    }

    // Close modal
    function closeFooterModal() {
      footerModal.classList.remove("show");
    }

    // =========================================
    // CAREERS
    // =========================================

    const careersLink = document.getElementById("careers-link");

    if (careersLink) {
      careersLink.addEventListener("click", (e) => {
        e.preventDefault();

        openFooterModal(
          "Interested in Working With Us?",
          "For available job opportunities, please contact the admins for more information.",
        );
      });
    }

    // =========================================
    // AFFILIATES
    // =========================================

    const affiliatesLink = document.getElementById("affiliates-link");

    if (affiliatesLink) {
      affiliatesLink.addEventListener("click", (e) => {
        e.preventDefault();

        openFooterModal(
          "Interested in Becoming an Affiliate?",
          "For available commission opportunities and affiliate details, please contact the admins.",
        );
      });
    }

    // =========================================
    // MODAL CLOSE BUTTON
    // =========================================

    if (footerModalClose) {
      footerModalClose.addEventListener("click", closeFooterModal);
    }

    // =========================================
    // "GOT IT" BUTTON
    // =========================================

    if (footerModalOk) {
      footerModalOk.addEventListener("click", closeFooterModal);
    }

    // =========================================
    // CLICK OUTSIDE MODAL
    // =========================================

    if (footerModal) {
      footerModal.addEventListener("click", (e) => {
        if (e.target === footerModal) {
          closeFooterModal();
        }
      });
    }

    // =========================================
    // ESC KEY
    // =========================================

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeFooterModal();
      }
    });
  })
  .catch((error) => {
    console.error("Error loading footer:", error);
  });

// =========================================
// ABOUT US
// =========================================

document.addEventListener("click", (e) => {
  const aboutUsLink = e.target.closest("#about-us-link");

  if (!aboutUsLink) {
    return;
  }

  e.preventDefault();

  // If already on the landing page
  const isLandingPage =
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/");

  if (isLandingPage) {
    const aboutMeSection = document.getElementById("about-me");

    if (aboutMeSection) {
      aboutMeSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    return;
  }

  // If on another page, simply go to the landing page
  window.location.href = "index.html#about-me";
});
