// ============================================================
// QAcademy — student-sidebar.js
// Injects the student sidebar into any page with <div id="sidebar">
// Exposes window.populateCourseDropdown(courseAccessMap, allCourses)
// ============================================================

(function () {
  const container = document.getElementById('sidebar');
  if (!container) return;

  // ── A) Inject sidebar HTML ──────────────────────────────────
  container.innerHTML = `
  <aside class="sidebar">
    <div class="sidebar-logo">
      <img src="/images/QAcademy_Logo.png" alt="QAcademy" style="width:40px; margin-bottom:6px;" />
      <h2>QAcademy</h2>
    </div>
    <nav class="sidebar-nav">
      <a href="/student/dashboard.html">🏠 Dashboard</a>
      <div class="sidebar-dropdown" id="sidebarCoursesDropdown">
        <div class="sidebar-dropdown-toggle" id="sidebarCoursesToggle">
          📚 My Courses <span class="sidebar-dropdown-arrow">▾</span>
        </div>
        <div class="sidebar-dropdown-menu" id="sidebarCoursesMenu">
          <div class="sidebar-dropdown-loading">Loading...</div>
        </div>
      </div>
      <a href="/student/fixed-quizzes.html">📝 Fixed Quizzes</a>
      <a href="/student/quiz-builder.html">🔧 Quiz Builder</a>
      <a href="/student/history.html">📊 History</a>
      <a href="/student/announcements.html">📢 Announcements</a>
      <a href="/student/downloads.html">📥 Downloads</a>
      <a href="/student/messages.html">💬 Messages</a>
      <a href="/student/telegram.html">✈️ Telegram</a>
    </nav>
  </aside>`;

  // ── B) Inject dropdown CSS ──────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
.sidebar-dropdown { position: relative; }
.sidebar-dropdown-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.sidebar-dropdown-toggle:hover { background: rgba(255,255,255,0.08); color: #fff; }
.sidebar-dropdown-toggle.active { background: var(--accent); color: #fff; }
.sidebar-dropdown-arrow { font-size: 11px; transition: transform 0.2s; }
.sidebar-dropdown.open .sidebar-dropdown-arrow { transform: rotate(180deg); }
.sidebar-dropdown-menu {
  display: none;
  flex-direction: column;
  background: rgba(0,0,0,0.15);
}
.sidebar-dropdown.open .sidebar-dropdown-menu { display: flex; }
.sidebar-dropdown-menu a {
  padding: 8px 24px 8px 40px;
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  transition: background 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-dropdown-menu a:hover { background: rgba(255,255,255,0.08); color: #fff; }
.sidebar-dropdown-menu a.active { color: #fff; font-weight: 600; }
.sidebar-dropdown-loading { padding: 8px 24px 8px 40px; font-size: 12px; color: rgba(255,255,255,0.4); }
`;
  document.head.appendChild(style);

  // ── C) Auto-mark active link ────────────────────────────────
  const path = window.location.pathname;

  container.querySelectorAll('.sidebar-nav > a').forEach(function (a) {
    if (a.getAttribute('href') === path) {
      a.classList.add('active');
    }
  });

  // If on a course page, activate the dropdown toggle and open it
  if (path.startsWith('/student/course')) {
    var toggle = document.getElementById('sidebarCoursesToggle');
    var dropdown = document.getElementById('sidebarCoursesDropdown');
    if (toggle) toggle.classList.add('active');
    if (dropdown) dropdown.classList.add('open');
  }

  // ── D) Toggle behaviour ─────────────────────────────────────
  var toggleEl = document.getElementById('sidebarCoursesToggle');
  if (toggleEl) {
    toggleEl.addEventListener('click', function () {
      var dd = document.getElementById('sidebarCoursesDropdown');
      if (dd) dd.classList.toggle('open');
    });
  }

  // ── E) Expose populateCourseDropdown ────────────────────────
  window.populateCourseDropdown = function (courseAccessMap, allCourses) {
    var menu = document.getElementById('sidebarCoursesMenu');
    if (!menu) return;

    // Clear loading placeholder
    menu.innerHTML = '';

    // Filter to courses the student has access to
    var accessible = (allCourses || []).filter(function (c) {
      return courseAccessMap && courseAccessMap[c.course_id];
    });

    if (accessible.length === 0) {
      menu.innerHTML = '<span class="sidebar-dropdown-loading">No courses found</span>';
      return;
    }

    var search = window.location.search;

    accessible.forEach(function (course) {
      var a = document.createElement('a');
      a.href = '/student/course.html?id=' + course.course_id;
      a.textContent = course.title;

      // Mark current course as active
      if (search.indexOf('id=' + course.course_id) !== -1) {
        a.classList.add('active');
      }

      menu.appendChild(a);
    });
  };
})();
