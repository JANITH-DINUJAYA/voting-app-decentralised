import { App } from './main';

export class Router {
  private app: App;

  // Top-level layout containers
  private loginScreen!: HTMLElement;
  private adminLoginScreen!: HTMLElement;
  private appLayout!: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.loginScreen = document.getElementById('login-screen')!;
    this.adminLoginScreen = document.getElementById('admin-login-screen')!;
    this.appLayout = document.getElementById('app-layout')!;

    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }

  /**
   * Evaluates location hash and activates the correct page layout
   */
  public handleRouting() {
    let hash = window.location.hash || '#/login';

    const isLoggedIn = this.app.activeUser !== null;
    const userRole = isLoggedIn ? this.app.activeUser!.role : null;

    // ── AUTH GATING ──────────────────────────────────────
    if (!isLoggedIn) {
      // Non-logged-in users can only see login or admin/login screens
      if (hash !== '#/login' && hash !== '#/admin/login') {
        window.location.hash = '#/login';
        return;
      }
    } else {
      // Logged-in user tries to visit login → redirect to their home
      if (hash === '#/login' || hash === '#/admin/login') {
        this.redirectToRoleHome(userRole);
        return;
      }

      // Role-based access control
      if (hash === '#/admin' && userRole !== 'ADMIN') {
        this.app.showNotification('Access Denied: Admin privileges required.', 'error');
        this.redirectToRoleHome(userRole);
        return;
      }

      if (hash === '#/verifier' && userRole !== 'ADMIN') {
        this.app.showNotification('Access Denied: Verifier privileges required.', 'error');
        this.redirectToRoleHome(userRole);
        return;
      }

      if (hash === '#/voter' && userRole !== 'VOTER') {
        this.app.showNotification('Access Denied: Voter account required.', 'error');
        this.redirectToRoleHome(userRole);
        return;
      }

      if (hash === '#/candidate' && userRole !== 'CANDIDATE') {
        this.app.showNotification('Access Denied: Candidate account required.', 'error');
        this.redirectToRoleHome(userRole);
        return;
      }
    }

    // ── LAYOUT SWITCHING ─────────────────────────────────
    const isLoginRoute = hash === '#/login';
    const isAdminLoginRoute = hash === '#/admin/login';

    // Show/hide top-level layout containers
    this.loginScreen.classList.toggle('active', isLoginRoute);
    this.adminLoginScreen.classList.toggle('active', isAdminLoginRoute);
    this.appLayout.classList.toggle('active', !isLoginRoute && !isAdminLoginRoute && isLoggedIn);

    if (isLoginRoute || isAdminLoginRoute) {
      // Nothing else to do for login screens — they are self-contained
      this.app.triggerPanelOnOpen(hash);
      return;
    }

    // ── PANEL ROUTING (inside app layout) ────────────────
    // Hide all panels
    const sections = document.querySelectorAll('.panel');
    sections.forEach(s => s.classList.remove('active'));

    // De-activate all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));

    // Map hash → panel ID
    const panelMap: Record<string, string> = {
      '#/': 'welcome',
      '#/voter': 'voter-terminal',
      '#/candidate': 'candidate-portal',
      '#/admin': 'admin-panel',
      '#/verifier': 'verifier-portal',
      '#/profile': 'profile',
      '#/explorer': 'explorer',
      '#/tamper': 'tamper',
      '#/diagnostics': 'diagnostics',
    };

    const panelId = panelMap[hash] ?? (isLoggedIn ? 'welcome' : 'login');
    const activeSection = document.getElementById(`panel-${panelId}`);
    if (activeSection) activeSection.classList.add('active');

    // Highlight matching nav item
    const matchingNav = document.querySelector(`.nav-item[href="${hash}"]`);
    if (matchingNav) matchingNav.classList.add('active');

    // Update sidebar & trigger panel-specific render
    this.updateNavigationSidebarLayout();
    this.app.triggerPanelOnOpen(hash);
  }

  private redirectToRoleHome(role: string | null) {
    if (role === 'ADMIN') window.location.hash = '#/admin';
    else if (role === 'CANDIDATE') window.location.hash = '#/candidate';
    else window.location.hash = '#/voter';
  }

  /**
   * Shows/hides sidebar navigation items based on current session state
   */
  public updateNavigationSidebarLayout() {
    const isLoggedIn = this.app.activeUser !== null;
    const userRole = isLoggedIn ? this.app.activeUser!.role : null;
    const user = this.app.activeUser;

    // Update sidebar user badge
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarRolePill = document.getElementById('sidebar-role-pill');

    if (sidebarUsername && user) {
      sidebarUsername.textContent = user.username;
    }

    if (sidebarAvatar && user) {
      const initials = (user.fullName || user.username)
        .split(' ')
        .map(n => n[0] || '')
        .join('')
        .substring(0, 2)
        .toUpperCase();
      sidebarAvatar.textContent = initials;
    }

    if (sidebarRolePill && user) {
      const roleIcons: Record<string, string> = {
        VOTER: 'fa-square-poll-horizontal',
        CANDIDATE: 'fa-user-tag',
        ADMIN: 'fa-user-shield',
      };
      const roleClasses: Record<string, string> = {
        VOTER: 'voter',
        CANDIDATE: 'candidate',
        ADMIN: 'admin',
      };
      sidebarRolePill.className = `sidebar-role-pill ${roleClasses[user.role] || 'voter'}`;
      sidebarRolePill.innerHTML = `<i class="fa-solid ${roleIcons[user.role] || 'fa-user'}"></i> ${user.role}`;
    }

    // Role-specific nav items
    const navVoter = document.getElementById('nav-voter');
    const navCandidate = document.getElementById('nav-candidate');
    const navAdmin = document.getElementById('nav-admin');
    const navVerifier = document.getElementById('nav-verifier');

    if (navVoter) navVoter.style.display = (isLoggedIn && userRole === 'VOTER') ? 'flex' : 'none';
    if (navCandidate) navCandidate.style.display = (isLoggedIn && userRole === 'CANDIDATE') ? 'flex' : 'none';
    if (navAdmin) navAdmin.style.display = (isLoggedIn && userRole === 'ADMIN') ? 'flex' : 'none';
    if (navVerifier) navVerifier.style.display = (isLoggedIn && userRole === 'ADMIN') ? 'flex' : 'none';
  }

  navigate(hash: string) {
    window.location.hash = hash;
  }
}
