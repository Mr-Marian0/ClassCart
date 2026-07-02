fetch('components/footer.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('footer-placeholder').innerHTML = html;

    // Email subscription
    const emailInput = document.querySelector('.footer-email input');
    const emailBtn = document.querySelector('.footer-email button');

    if (emailBtn) {
      emailBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (!email) {
          alert('Please enter your email.');
          return;
        }

        // Simple validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          alert('Please enter a valid email.');
          return;
        }

        // Emie reaction
        if (window.emieReact) {
          window.emieReact(
            "assets/gifs/kilig_emie.gif",
            `Thanks for subscribing, ${email}! You'll get great deals!`,
            2500
          );
        }

        alert('Thanks for subscribing!');
        emailInput.value = '';
      });

      // Allow Enter key to submit
      emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') emailBtn.click();
      });
    }
  });
