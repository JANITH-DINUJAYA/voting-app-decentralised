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
    let hash = window.location.hash || '#/';

    // Route Guards check
    const isLoggedIn = this.app.wallet !== null;
    const adminAddress = this.app.blockchain.adminAddress;
    const isVerifierAdmin = isLoggedIn && adminAddress && this.app.wallet!.address.toLowerCase() === adminAddress.toLowerCase();

    // 1. Enforce Navigation Rules
    if (!isLoggedIn && (
      hash === '#/voter' || 
      hash === '#/candidate' || 
      hash === '#/admin' || 
      hash === '#/verifier'
    )) {
      this.app.showNotification('Access Denied: Wallet connection required. Redirecting to Login...', 'error');
      window.location.hash = '#/login';
      return;
    }

    if (isLoggedIn && hash === '#/admin' && !isVerifierAdmin) {
      this.app.showNotification('Access Denied: Admin role required for this panel.', 'error');
      window.location.hash = '#/voter';
      return;
    }

    if (isLoggedIn && hash === '#/verifier' && !isVerifierAdmin) {
      this.app.showNotification('Access Denied: Authorized Verifier key required.', 'error');
      window.location.hash = '#/voter';
      return;
    }

    // 2. Hide all panels first
    const sections = document.querySelectorAll('.panel');
    sections.forEach(s => s.classList.remove('active'));

    // 3. De-activate all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));

    // Map Hash to Panel ID
    let panelId = 'dashboard'; // fallback public landing
    
    switch (hash) {
      case '#/':
        panelId = 'welcome';
        break;
      case '#/login':
        panelId = 'login';
        break;
      case '#/register':
        panelId = 'register';
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
        panelId = 'welcome';
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
   * Shows or hides menu navigation triggers depending on active wallet login
   */
  public updateNavigationSidebarLayout() {
    const isLoggedIn = this.app.wallet !== null;
    const adminAddress = this.app.blockchain.adminAddress;
    const isVerifierAdmin = isLoggedIn && adminAddress && this.app.wallet!.address.toLowerCase() === adminAddress.toLowerCase();

    // Elements
    const navLogin = document.querySelector('.nav-item[href="#/login"]') as HTMLElement;
    const navRegister = document.querySelector('.nav-item[href="#/register"]') as HTMLElement;
    const navVoter = document.querySelector('.nav-item[href="#/voter"]') as HTMLElement;
    const navCandidate = document.querySelector('.nav-item[href="#/candidate"]') as HTMLElement;
    const navAdmin = document.querySelector('.nav-item[href="#/admin"]') as HTMLElement;
    const navVerifier = document.querySelector('.nav-item[href="#/verifier"]') as HTMLElement;
    
    if (navLogin) {
      if (isLoggedIn) {
        navLogin.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket"></i> Disconnect';
        navLogin.style.color = 'var(--color-danger)';
      } else {
        navLogin.innerHTML = '<i class="fa-solid fa-wallet"></i> Connect Wallet';
        navLogin.style.color = '';
      }
    }

    if (navRegister) navRegister.style.display = isLoggedIn ? 'none' : 'flex';
    
    // Voter portal displays only when logged in as non-admin
    if (navVoter) {
      navVoter.style.display = isLoggedIn ? 'flex' : 'none';
      if (isVerifierAdmin) navVoter.style.display = 'none'; // Admin shouldn't vote in normal candidate views
    }

    // Candidate portal displays only when candidate logs in
    if (navCandidate) {
      let isCandidate = false;
      if (isLoggedIn) {
        const profile = this.app.blockchain.voterRegistry.get(this.app.wallet!.address.toLowerCase());
        isCandidate = profile ? profile.role === 'CANDIDATE' : false;
      }
      navCandidate.style.display = isCandidate ? 'flex' : 'none';
    }

    // Admin & Verifier screens visible only to Admin
    if (navAdmin) navAdmin.style.display = isVerifierAdmin ? 'flex' : 'none';
    if (navVerifier) navVerifier.style.display = isVerifierAdmin ? 'flex' : 'none';
  }

  /**
   * Navigate code helper
   */
  navigate(hash: string) {
    window.location.hash = hash;
  }
}
