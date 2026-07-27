import { App } from './main';

export class Router {
  private app: App;

  constructor(app: App) {
    this.app = app;
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }

  /**
   * Evaluates location hash and activates correct page layout panel
   */
  public handleRouting() {
    let hash = window.location.hash || '#/login';

    const isLoggedIn = this.app.activeUser !== null;
    const userRole = isLoggedIn ? this.app.activeUser!.role : null;

    // 1. Enforce Gated Navigation Rules
    if (!isLoggedIn) {
      if (hash !== '#/login') {
        window.location.hash = '#/login';
        return;
      }
    } else {
      // If logged in, protect role-based sections
      if (hash === '#/login' && userRole === 'ADMIN') {
        // Redirect Admin away from login screen to admin dashboard
        window.location.hash = '#/admin';
        return;
      }

      if (hash === '#/admin' && userRole !== 'ADMIN') {
        this.app.showNotification('Access Denied: Admin role required.', 'error');
        window.location.hash = userRole === 'CANDIDATE' ? '#/candidate' : '#/voter';
        return;
      }

      if (hash === '#/verifier' && userRole !== 'ADMIN') {
        this.app.showNotification('Access Denied: Verifier privileges required.', 'error');
        window.location.hash = userRole === 'CANDIDATE' ? '#/candidate' : '#/voter';
        return;
      }

      if (hash === '#/voter' && userRole !== 'VOTER') {
        this.app.showNotification('Access Denied: Voter profile required.', 'error');
        window.location.hash = userRole === 'ADMIN' ? '#/admin' : '#/candidate';
        return;
      }

      if (hash === '#/candidate' && userRole !== 'CANDIDATE') {
        this.app.showNotification('Access Denied: Candidate profile required.', 'error');
        window.location.hash = userRole === 'ADMIN' ? '#/admin' : '#/voter';
        return;
      }
    }

    // 2. Hide all panels first
    const sections = document.querySelectorAll('.panel');
    sections.forEach(s => s.classList.remove('active'));

    // 3. De-activate all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));

    // Map Hash to Panel ID
    let panelId = 'login';
    
    switch (hash) {
      case '#/':
        panelId = 'welcome';
        break;
      case '#/login':
        panelId = 'login';
        break;
      case '#/voter':
        panelId = 'voter-terminal';
        break;
      case '#/candidate':
        panelId = 'candidate-portal';
        break;
      case '#/admin':
        panelId = 'admin-panel';
        break;
      case '#/verifier':
        panelId = 'verifier-portal';
        break;
      case '#/explorer':
        panelId = 'explorer';
        break;
      case '#/tamper':
        panelId = 'tamper';
        break;
      case '#/diagnostics':
        panelId = 'diagnostics';
        break;
      default:
        panelId = isLoggedIn ? 'welcome' : 'login';
        break;
    }

    // Show target section container
    const activeSection = document.getElementById(`panel-${panelId}`);
    if (activeSection) {
      activeSection.classList.add('active');
    }

    // Highlight correct navigation sidebar items
    const matchingNavItem = document.querySelector(`.nav-item[href="${hash}"]`);
    if (matchingNavItem) {
      matchingNavItem.classList.add('active');
    }

    // Sync menu items based on state changes (Login, logout, admin displays)
    this.updateNavigationSidebarLayout();

    // Trigger state renders
    this.app.triggerPanelOnOpen(hash);
  }

  /**
   * Shows or hides menu navigation triggers depending on active session state
   */
  public updateNavigationSidebarLayout() {
    const isLoggedIn = this.app.activeUser !== null;
    const userRole = isLoggedIn ? this.app.activeUser!.role : null;

    // Elements
    const navLogin = document.querySelector('.nav-item[href="#/login"]') as HTMLElement;
    const navHome = document.querySelector('.nav-item[href="#/"]') as HTMLElement;
    const navVoter = document.querySelector('.nav-item[href="#/voter"]') as HTMLElement;
    const navCandidate = document.querySelector('.nav-item[href="#/candidate"]') as HTMLElement;
    const navAdmin = document.querySelector('.nav-item[href="#/admin"]') as HTMLElement;
    const navVerifier = document.querySelector('.nav-item[href="#/verifier"]') as HTMLElement;
    const navExplorer = document.querySelector('.nav-item[href="#/explorer"]') as HTMLElement;
    const navTamper = document.querySelector('.nav-item[href="#/tamper"]') as HTMLElement;
    const navDiag = document.querySelector('.nav-item[href="#/diagnostics"]') as HTMLElement;

    if (navLogin) {
      if (isLoggedIn) {
        navLogin.innerHTML = '<i class="fa-solid fa-circle-user"></i> Profile Session';
        navLogin.style.color = 'var(--color-secondary)';
      } else {
        navLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login / Sign Up';
        navLogin.style.color = '';
      }
    }

    if (navHome) navHome.style.display = isLoggedIn ? 'flex' : 'none';
    if (navVoter) navVoter.style.display = (isLoggedIn && userRole === 'VOTER') ? 'flex' : 'none';
    if (navCandidate) navCandidate.style.display = (isLoggedIn && userRole === 'CANDIDATE') ? 'flex' : 'none';
    
    // Admin & Verifier screens visible only to Admin
    if (navAdmin) navAdmin.style.display = (isLoggedIn && userRole === 'ADMIN') ? 'flex' : 'none';
    if (navVerifier) navVerifier.style.display = (isLoggedIn && userRole === 'ADMIN') ? 'flex' : 'none';

    // Explorer, Tamper, Diagnostics visible to all logged-in profiles
    if (navExplorer) navExplorer.style.display = isLoggedIn ? 'flex' : 'none';
    if (navTamper) navTamper.style.display = isLoggedIn ? 'flex' : 'none';
    if (navDiag) navDiag.style.display = isLoggedIn ? 'flex' : 'none';
  }

  navigate(hash: string) {
    window.location.hash = hash;
  }
}
