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
      <a href="/admin/question-bank.html">🗂️ Question Bank</a>
      <a href="/admin/messages.html">💬 Messages <span id="adminMsgBadge" class="admin-msg-badge" style="display:none;"></span></a>
      <a href="/admin/config.html">⚙️ Config</a>
    </nav>
  </aside>`;

  // ── Badge CSS ──────────────────────────────────────────
  const badgeStyle = document.createElement('style');
  badgeStyle.textContent = `
.admin-msg-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: #e74c3c; color: #fff;
  font-size: 10px; font-weight: 700; margin-left: 4px;
}`;
  document.head.appendChild(badgeStyle);

  // ── Public: update unread message badge ────────────────
  window.adminUpdateMsgBadge = function (count) {
    const badge = document.getElementById('adminMsgBadge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  };

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
