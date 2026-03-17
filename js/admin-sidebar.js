// ============================================================
// QAcademy — admin-sidebar.js
// Injects the admin sidebar into any page with <div id="sidebar">
// ============================================================

(function () {
  const container = document.getElementById('sidebar');
  if (!container) return;

  container.innerHTML = `
  <aside class="sidebar">
    <div class="sidebar-logo">
      <h2>QAcademy</h2>
      <p>Admin Panel</p>
    </div>
    <nav class="sidebar-nav">
      <a href="/admin/dashboard.html">🏠 Dashboard</a>
      <a href="/admin/users.html">👥 Users</a>
      <a href="/admin/subscriptions.html">💳 Subscriptions</a>
      <a href="/admin/payments.html">💰 Payments</a>
      <a href="/admin/products.html">📦 Products</a>
      <a href="/admin/courses.html">📚 Courses</a>
      <a href="/admin/announcements.html">📢 Announcements</a>
      <a href="/admin/fixed-quizzes.html">📝 Fixed Quizzes</a>
      <a href="/admin/config.html">⚙️ Config</a>
    </nav>
  </aside>`;

  // Mark the active link
  const path = window.location.pathname;

  document.querySelectorAll('#sidebar .sidebar-nav a').forEach(link => {
    const href = link.getAttribute('href').replace('.html', '');
    if (path === href || path.startsWith(href + '?')) {
      link.classList.add('active');
    }
  });
  // ── Mobile hamburger ───────────────────────────────────────
  const hamburger = document.createElement('button');
  hamburger.className = 'hamburger-btn';
  hamburger.setAttribute('aria-label', 'Open menu');
  hamburger.textContent = '☰';
  document.body.appendChild(hamburger);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  const sidebarEl = container.querySelector('.sidebar');

  function openSidebar() {
    if (sidebarEl) sidebarEl.classList.add('open');
    overlay.classList.add('open');
    hamburger.textContent = '✕';
  }

  function closeSidebar() {
    if (sidebarEl) sidebarEl.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.textContent = '☰';
  }

  hamburger.addEventListener('click', function () {
    if (sidebarEl && sidebarEl.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  // Close sidebar on nav link tap (mobile)
  container.querySelectorAll('.sidebar-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
})();
