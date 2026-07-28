import { Blockchain } from './blockchain/Blockchain';
import { Wallet } from './blockchain/Wallet';
import { Transaction } from './blockchain/Transaction';
import { Router } from './router';
import { LoginRegister } from './ui/LoginRegister';
import { AdminPanel } from './ui/AdminPanel';
import { VoterTerminal } from './ui/VoterTerminal';
import { Explorer } from './ui/Explorer';
import { TamperConsole } from './ui/TamperConsole';
import { VerifierPortal } from './ui/VerifierPortal';
import { runAutomatedTests } from './blockchain/test';
import './style.css';

export interface UserProfile {
  username: string;
  role: 'ADMIN' | 'VOTER' | 'CANDIDATE';
  fullName: string;
  email: string;
  walletPrivateKey?: string;
  walletPublicKey?: string;
  walletAddress?: string;
  nicPhoto?: string;
  kycStatus?: string;
  bio?: string;
}

export class App {
  public blockchain: Blockchain;
  public wallet: Wallet | null = null;
  public activeUser: UserProfile | null = null;
  public selectedCampaignAddress: string = '';

  // Timer Countdown Interval
  private welcomeTimerInterval: any = null;

  // Routing
  public router!: Router;

  // UI Component Instances
  private loginRegister!: LoginRegister;
  private adminPanel!: AdminPanel;
  private voterTerminal!: VoterTerminal;
  private explorer!: Explorer;
  private tamperConsole!: TamperConsole;
  private verifierPortal!: VerifierPortal;

  constructor() {
    this.blockchain = new Blockchain();
    this.init();
  }

  private async restoreSession() {
    try {
      const stored = localStorage.getItem('votechain_session');
      if (!stored) return;

      const user = JSON.parse(stored) as UserProfile;
      this.activeUser = user;

      if (user && user.walletPrivateKey && user.walletPublicKey) {
        const w = new Wallet();
        await w.importFromHex(user.walletPrivateKey, user.walletPublicKey);
        this.wallet = w;
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
    }
  }

  private async init() {
    // 0. Restore session first sequentially
    await this.restoreSession();

    // 1. Initialize UI component controllers
    this.loginRegister = new LoginRegister(this);
    this.adminPanel = new AdminPanel(this);
    this.voterTerminal = new VoterTerminal(this);
    this.explorer = new Explorer(this);
    this.tamperConsole = new TamperConsole(this);
    this.verifierPortal = new VerifierPortal(this);

    // 2. Initialize Hash Router (restores active panel UI instantly)
    this.router = new Router(this);

    // 2.5 Load decentralized ledger from Neon database in background
    this.showNotification('Synchronizing blockchain ledger with Neon cloud DB...', 'info');
    await this.blockchain.loadState();

    // 3. Welcome hub campaign selector
    const welcomeSelect = document.getElementById('select-campaign-welcome') as HTMLSelectElement;
    if (welcomeSelect) {
      welcomeSelect.addEventListener('change', () => {
        this.selectCampaign(welcomeSelect.value);
      });
    }

    // 4. Candidate standings campaign selector
    const candidateSelect = document.getElementById('select-campaign-candidates') as HTMLSelectElement;
    if (candidateSelect) {
      candidateSelect.addEventListener('change', () => {
        this.renderCandidateStandings(candidateSelect.value);
      });
    }

    // 5. Sidebar sign-out button
    const navSignout = document.getElementById('btn-nav-signout');
    if (navSignout) {
      navSignout.addEventListener('click', (e) => {
        e.preventDefault();
        this.loginRegister.triggerSignOut();
      });
    }

    // 6. Setup automated diagnostics
    this.setupDiagnostics();

    // 7. Initial sync
    this.refreshAllViews();
    this.tamperConsole.init();

    // Setup background database polling (every 5 seconds) to pull transactions/blocks
    setInterval(async () => {
      try {
        if (this.explorer && !this.explorer.isMining) {
          await this.blockchain.loadState();
          this.refreshAllViews();
        }
      } catch (err) {
        console.warn('Background Neon DB sync failed:', err);
      }
    }, 5000);

    this.showNotification('VoteChain Network active. Welcome to decentralized governance!', 'info');
  }

  /**
   * Triggered when a route/panel becomes active
   */
  triggerPanelOnOpen(hash: string) {
    if (hash !== '#/' && hash !== '' && this.welcomeTimerInterval) {
      clearInterval(this.welcomeTimerInterval);
      this.welcomeTimerInterval = null;
    }

    switch (hash) {
      case '#/':
        this.renderWelcomeHub();
        break;
      case '#/login':
      case '#/admin/login':
        this.loginRegister.render();
        break;
      case '#/profile':
        this.loginRegister.render(); // Profile panel re-uses LoginRegister render
        break;
      case '#/voter':
        this.voterTerminal.render();
        break;
      case '#/candidate':
        this.renderCandidatePanel();
        break;
      case '#/admin':
        this.adminPanel.render();
        break;
      case '#/verifier':
        this.verifierPortal.fetchPendingKyc();
        break;
      case '#/explorer':
        this.explorer.render();
        break;
      case '#/tamper':
        this.tamperConsole.render();
        break;
    }
  }

  /**
   * Renders the complete candidate dashboard with proper state-aware flow
   */
  private renderCandidatePanel() {
    const statusHeader = document.getElementById('candidate-status-header')!;
    const detailsCard = document.getElementById('candidate-portal-details')!;
    const standingsCard = document.getElementById('candidate-standings-card')!;

    if (!statusHeader || !detailsCard) return;

    // Case 1: No wallet yet
    if (!this.wallet) {
      statusHeader.innerHTML = `
        <div class="alert-box warning">
          <i class="fa-solid fa-wallet"></i>
          <div>
            <strong>Wallet Required</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">You need a cryptographic wallet to participate. Go to <a href="#/profile" style="color: var(--color-primary); font-weight: 700;">My Profile</a> to generate your wallet and submit KYC verification.</p>
          </div>
        </div>
      `;
      detailsCard.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
          <i class="fa-solid fa-wallet" style="font-size: 2rem; color: var(--color-warning); display: block; margin-bottom: 0.75rem;"></i>
          <p>Set up your wallet in <a href="#/profile" style="color: var(--color-primary);">My Profile</a> to continue.</p>
        </div>
      `;
      standingsCard.style.display = 'none';
      const applyCard = document.getElementById('candidate-apply-elections-card');
      if (applyCard) applyCard.style.display = 'none';
      return;
    }

    const profile = this.blockchain.voterRegistry.get(this.wallet.address.toLowerCase());
    const pendingTx = this.blockchain.pendingTransactions.find(t => 
      t.sender.toLowerCase() === this.wallet!.address.toLowerCase() && 
      (t.type === 'REGISTER_VOTER_KYC' || t.type === 'REGISTER_CANDIDATE_KYC')
    );
    const user = this.activeUser!;

    let currentStatus = 'UNSUBMITTED';
    let displayProfile = profile ? { name: profile.name, email: profile.email } : null;

    if (profile) {
      currentStatus = profile.status;
    } else if (pendingTx) {
      currentStatus = 'PENDING';
      displayProfile = { name: pendingTx.payload.name, email: pendingTx.payload.email };
    } else if (user.kycStatus && user.kycStatus !== 'UNSUBMITTED') {
      currentStatus = user.kycStatus;
      displayProfile = { name: user.fullName, email: user.email };
    }

    // Case 2: KYC not yet submitted
    if (currentStatus === 'UNSUBMITTED') {
      statusHeader.innerHTML = `
        <div class="alert-box info">
          <i class="fa-solid fa-circle-info"></i>
          <div>
            <strong>KYC Verification Required</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">To appear as a candidate in elections, you must submit your identity verification. Go to <a href="#/profile" style="color: var(--color-primary); font-weight: 700;">My Profile</a> to submit your NIC and manifesto.</p>
          </div>
        </div>
      `;
      detailsCard.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <i class="fa-solid fa-id-card" style="font-size: 2.5rem; color: var(--color-primary); display: block; margin-bottom: 0.75rem;"></i>
          <h3 style="margin-bottom: 0.5rem;">Identity Not Yet Submitted</h3>
          <p style="color: var(--color-text-muted); font-size: 0.85rem; max-width: 360px; margin: 0 auto 1rem;">Submit your National Identity Card and campaign manifesto in the Profile section to register as a candidate.</p>
          <a href="#/profile" class="btn"><i class="fa-solid fa-arrow-right"></i> Go to My Profile</a>
        </div>
      `;
      standingsCard.style.display = 'none';
      const applyCard = document.getElementById('candidate-apply-elections-card');
      if (applyCard) applyCard.style.display = 'none';
      return;
    }

    // Case 3: KYC pending
    if (currentStatus === 'PENDING') {
      statusHeader.innerHTML = `
        <div class="alert-box warning">
          <i class="fa-solid fa-hourglass-half"></i>
          <div>
            <strong>Identity Verification Pending</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">Your KYC application has been submitted and is awaiting review by the system verifier. You will be able to participate in elections once approved.</p>
          </div>
        </div>
      `;
      detailsCard.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <i class="fa-solid fa-hourglass-half" style="font-size: 2.5rem; color: var(--color-warning); display: block; margin-bottom: 0.75rem; animation: spin 3s linear infinite;"></i>
          <h3 style="margin-bottom: 0.5rem;">Audit In Progress</h3>
          <p style="color: var(--color-text-muted); font-size: 0.85rem;">Your application is queued for review. This typically takes a few moments.</p>
          <div style="margin-top: 1rem; padding: 0.75rem 1rem; background: var(--bg-card); border: 1px solid var(--border-color); font-size: 0.82rem; display: flex; flex-direction: column; gap: 0.35rem;">
            <div><strong>Name:</strong> ${displayProfile ? displayProfile.name : user.fullName}</div>
            <div><strong>Email:</strong> ${displayProfile ? displayProfile.email : user.email}</div>
            <div><strong>Status:</strong> <span class="status-badge pending"><i class="fa-solid fa-hourglass-half"></i> PENDING</span></div>
          </div>
        </div>
      `;
      standingsCard.style.display = 'none';
      const applyCard = document.getElementById('candidate-apply-elections-card');
      if (applyCard) applyCard.style.display = 'none';
      return;
    }

    // Case 4: KYC rejected
    if (currentStatus === 'REJECTED') {
      statusHeader.innerHTML = `
        <div class="alert-box danger">
          <i class="fa-solid fa-circle-xmark"></i>
          <div>
            <strong>Identity Verification Rejected</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">Your KYC application was rejected by the system verifier. Please re-submit with a clearer NIC photo in <a href="#/profile" style="color: var(--color-danger); font-weight: 700;">My Profile</a>.</p>
          </div>
        </div>
      `;
      detailsCard.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <i class="fa-solid fa-circle-xmark" style="font-size: 2.5rem; color: var(--color-danger); display: block; margin-bottom: 0.75rem;"></i>
          <h3 style="margin-bottom: 0.5rem; color: var(--color-danger);">Application Rejected</h3>
          <p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Please re-submit your identity verification with clear, valid documents.</p>
          <a href="#/profile" class="btn btn-danger btn-sm"><i class="fa-solid fa-redo"></i> Re-submit KYC</a>
        </div>
      `;
      standingsCard.style.display = 'none';
      const applyCard = document.getElementById('candidate-apply-elections-card');
      if (applyCard) applyCard.style.display = 'none';
      return;
    }

    // Case 5: VERIFIED — show full profile + standings
    statusHeader.innerHTML = `
      <div class="alert-box success">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <strong>Identity Verified — You are a Registered Candidate</strong>
          <p style="margin-top: 0.25rem; font-size: 0.82rem;">Your identity has been verified on-chain. You are eligible to participate in elections as a candidate.</p>
        </div>
      </div>
    `;

    const displayName = profile?.name || user.fullName || 'Candidate';
    const displayEmail = profile?.email || user.email || '';
    const displayNic = profile?.nicPhoto || user.nicPhoto || 'https://via.placeholder.com/400x250';
    const displayBio = profile?.bio || user.bio || '';

    const initials = displayName.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();

    detailsCard.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
        <div style="width: 56px; height: 56px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.25rem; color: var(--bg-main); flex-shrink: 0;">${initials}</div>
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700;">${displayName}</h3>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--color-secondary);">${this.wallet!.address}</span>
        </div>
        <div style="margin-left: auto;">
          <span class="status-badge verified"><i class="fa-solid fa-circle-check"></i> VERIFIED</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.88rem;">
        <div class="form-group">
          <label>Email on Record</label>
          <span>${displayEmail}</span>
        </div>
        <div class="form-group">
          <label>NIC Document</label>
          <a href="${displayNic}" target="_blank" rel="noopener" style="color: var(--color-primary); font-weight: 600; font-size: 0.88rem; text-decoration: none;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> View NIC Document
          </a>
        </div>
      </div>

      ${displayBio ? `
        <div class="form-group">
          <label>Candidacy Manifesto</label>
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 0.85rem 1rem; font-size: 0.88rem; line-height: 1.6; color: var(--color-text-main);">${displayBio}</div>
        </div>
      ` : ''}
    `;

    // Show standings card
    standingsCard.style.display = 'flex';
    this.renderCandidateStandings(this.selectedCampaignAddress);

    // Show upcoming elections application card
    const applyCard = document.getElementById('candidate-apply-elections-card');
    if (applyCard) applyCard.style.display = 'flex';
    this.renderCandidateUpcomingElections();
  }

  /**
   * Render live election standings for the candidate panel
   */
  private renderCandidateStandings(contractAddress: string) {
    const titleEl = document.getElementById('candidate-selected-title')!;
    const chartEl = document.getElementById('candidate-standings-chart')!;
    const select = document.getElementById('select-campaign-candidates') as HTMLSelectElement;

    if (select && contractAddress) select.value = contractAddress;

    if (!contractAddress || !this.blockchain.contracts.has(contractAddress)) {
      if (titleEl) titleEl.textContent = 'No Election Selected';
      if (chartEl) chartEl.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem; padding: 0.5rem 0;">Select an election above to view your standings.</p>';
      return;
    }

    const contract = this.blockchain.contracts.get(contractAddress)!;
    const myAddress = this.wallet?.address.toLowerCase();
    const tallies = contract.getTallies();
    const totalVotes = Array.from(contract.votes.values()).length;

    if (titleEl) titleEl.textContent = contract.title + (Date.now() > contract.deadline ? ' ❌ Ended' : ' ✅ Active');
    if (!chartEl) return;

    chartEl.innerHTML = '';
    contract.candidates.forEach(cand => {
      const votes = tallies[cand.name] || 0;
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      const myProfile = this.blockchain.voterRegistry.get(myAddress || '');
      const isMe = myProfile?.name === cand.name;

      const group = document.createElement('div');
      group.className = `standings-bar-group ${isMe ? 'is-me' : ''}`;
      group.innerHTML = `
        <div class="standings-bar-labels">
          <span style="font-weight: ${isMe ? '800' : '600'}; color: ${isMe ? 'var(--color-primary)' : 'var(--color-text-main)'};">
            ${isMe ? '⭐ ' : ''}${cand.name} ${isMe ? '<span style="font-size:0.72rem; color:var(--color-primary);">(You)</span>' : ''}
          </span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: ${isMe ? 'var(--color-primary)' : 'var(--color-secondary)'};">${votes} vote${votes !== 1 ? 's' : ''} (${percentage}%)</span>
        </div>
        <div class="standings-bar-track">
          <div class="standings-bar-fill ${isMe ? 'is-me' : ''}" style="width: ${percentage}%"></div>
        </div>
      `;
      chartEl.appendChild(group);
    });
  }

  private renderCandidateUpcomingElections() {
    const listEl = document.getElementById('candidate-upcoming-elections-list')!;
    if (!listEl) return;

    listEl.innerHTML = '';
    const elections = Array.from(this.blockchain.contracts.entries()).filter(([_, c]) => c.status === 'PRE_REGISTRATION');

    if (elections.length === 0) {
      listEl.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem; padding: 0.5rem 0;">No upcoming elections open for nomination.</p>';
      return;
    }

    // Use wallet address if available; fallback to activeUser walletAddress from DB session
    const myAddress = (this.wallet?.address || this.activeUser?.walletAddress || '').toLowerCase();
    const myProfile = myAddress ? this.blockchain.voterRegistry.get(myAddress) : null;

    // Also check mempool for pending APPLY_CANDIDACY transactions from this address
    const pendingApplicationContracts = new Set(
      this.blockchain.pendingTransactions
        .filter(t => t.type === 'APPLY_CANDIDACY' && t.sender.toLowerCase() === myAddress)
        .map(t => t.recipient)
    );

    elections.forEach(([address, contract]) => {
      const item = document.createElement('div');
      item.style.background = 'var(--bg-main)';
      item.style.border = '1px solid var(--border-color)';
      item.style.padding = '1rem';
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.gap = '0.5rem';

      // Check if already applied (mined on-chain)
      const application = myAddress ? contract.candidateApplicants.find(app => app.address.toLowerCase() === myAddress) : null;
      // Check if pending in mempool
      const isPending = pendingApplicationContracts.has(address);

      let actionHtml = '';
      if (application) {
        let badgeClass = 'pending';
        if (application.status === 'APPROVED') badgeClass = 'verified';
        if (application.status === 'REJECTED') badgeClass = 'rejected';
        actionHtml = `<span class="status-badge ${badgeClass}" style="font-size: 0.72rem; font-weight: 700;"><i class="fa-solid fa-${application.status === 'APPROVED' ? 'circle-check' : application.status === 'REJECTED' ? 'circle-xmark' : 'clock'}"></i> Application: ${application.status}</span>`;
      } else if (isPending) {
        actionHtml = `<span class="status-badge pending" style="font-size: 0.72rem; font-weight: 700;"><i class="fa-solid fa-spinner fa-spin"></i> Application: PENDING (Mining...)</span>`;
      } else if (!myAddress) {
        actionHtml = `<span style="font-size: 0.78rem; color: var(--color-text-muted);">Connect wallet to apply</span>`;
      } else {
        actionHtml = `<button class="btn btn-secondary btn-sm btn-apply-to-election" data-election="${address}" style="font-size:0.75rem;"><i class="fa-solid fa-square-plus"></i> Submit Nomination</button>`;
      }

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700;">${contract.title}</h4>
            <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-secondary);">${address.substring(0, 16)}...</span>
          </div>
          <div>${actionHtml}</div>
        </div>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.4;">${contract.description}</p>
      `;

      const applyBtn = item.querySelector('.btn-apply-to-election') as HTMLButtonElement;
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const candName = myProfile?.name || this.activeUser?.fullName || 'Candidate';
          const candBio = myProfile?.bio || this.activeUser?.bio || '';
          this.applyForCandidacy(address, candName, candBio, applyBtn);
        });
      }

      listEl.appendChild(item);
    });
  }

  private async applyForCandidacy(contractAddress: string, name: string, bio: string, btn: HTMLButtonElement) {
    if (!this.wallet) return;

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

      const wallet = this.wallet;
      const currentNonce = this.blockchain.getNonce(wallet.address);

      const tx = new Transaction({
        sender: wallet.address,
        recipient: contractAddress,
        type: 'APPLY_CANDIDACY',
        payload: { name, bio },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: wallet.publicKeyHex
      });

      await tx.signTransaction(wallet);
      await this.blockchain.addTransaction(tx);

      this.showNotification('Nomination submitted! Mining in progress — status will update shortly.', 'success');
      // Immediate UI refresh so the pending badge shows
      this.refreshAllViews();
    } catch (e: any) {
      console.error(e);
      this.showNotification(`Application failed: ${e.message}`, 'error');
      // Re-enable button on error
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-square-plus"></i> Submit Nomination';
      }
      this.refreshAllViews();
    }
  }

  /**
   * Render the public welcome hub with optional campaign results
   */
  private renderWelcomeHub() {
    const welcomeResults = document.getElementById('welcome-results-section')!;
    const welcomeChart = document.getElementById('welcome-chart-list')!;
    const welcomeTimer = document.getElementById('welcome-timer-display')!;
    const welcomeTimerLabel = document.getElementById('welcome-timer-label')!;
    const welcomeWinnerCard = document.getElementById('welcome-winner-card')!;
    const welcomeWinnerName = document.getElementById('welcome-winner-name')!;
    const welcomeWinnerVotes = document.getElementById('welcome-winner-votes')!;

    if (!this.selectedCampaignAddress) {
      if (welcomeResults) welcomeResults.style.display = 'none';
      return;
    }

    const contract = this.blockchain.contracts.get(this.selectedCampaignAddress);
    if (!contract) {
      if (welcomeResults) welcomeResults.style.display = 'none';
      return;
    }

    if (contract.status === 'PRE_REGISTRATION') {
      welcomeChart.innerHTML = `
        <div style="text-align: center; padding: 1.5rem 0;">
          <i class="fa-solid fa-clock" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.5rem; display: block;"></i>
          <h4 style="margin-bottom: 0.25rem;">Nominations Phase</h4>
          <p style="color: var(--color-text-muted); font-size: 0.85rem; max-width: 320px; margin: 0 auto;">Candidates are currently applying to run in this election. Once the admin starts the voting phase, live results will display here.</p>
        </div>
      `;
      welcomeTimer.textContent = 'PENDING';
      welcomeTimer.style.background = 'var(--color-primary)';
      welcomeTimer.style.webkitBackgroundClip = 'initial';
      welcomeTimer.style.webkitTextFillColor = 'var(--color-text-main)';
      welcomeTimerLabel.textContent = 'Awaiting Voting Phase';
      welcomeWinnerCard.style.display = 'none';
      welcomeResults.style.display = 'grid';
      return;
    }

    // Tally charts
    welcomeChart.innerHTML = '';
    const tallies = contract.getTallies();
    const totalVotes = Array.from(contract.votes.values()).length;

    contract.candidates.forEach(cand => {
      const votes = tallies[cand.name] || 0;
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

      const group = document.createElement('div');
      group.className = 'chart-bar-group';
      group.innerHTML = `
        <div class="chart-labels">
          <span style="font-weight: 600;">${cand.name}</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-secondary);">${votes} vote${votes !== 1 ? 's' : ''} (${percentage}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${percentage}%"></div>
        </div>
      `;
      welcomeChart.appendChild(group);
    });

    // Clear old timer interval if any
    if (this.welcomeTimerInterval) {
      clearInterval(this.welcomeTimerInterval);
      this.welcomeTimerInterval = null;
    }

    // Countdown timer + winner
    const updateTime = () => {
      const remaining = contract.deadline - Date.now();
      if (remaining <= 0) {
        welcomeTimer.textContent = '00:00:00';
        welcomeTimer.style.background = 'var(--color-danger)';
        welcomeTimer.style.webkitBackgroundClip = 'initial';
        welcomeTimer.style.webkitTextFillColor = 'var(--color-text-main)';
        welcomeTimerLabel.textContent = 'Election Ended';

        if (totalVotes > 0) {
          let highest = -1;
          let winnerNameStr = '';
          contract.candidates.forEach(c => {
            const v = tallies[c.name] || 0;
            if (v > highest) { highest = v; winnerNameStr = c.name; }
            else if (v === highest && v > 0) { winnerNameStr += ` & ${c.name}`; }
          });
          welcomeWinnerName.textContent = winnerNameStr;
          welcomeWinnerVotes.textContent = `with ${highest} verified vote${highest !== 1 ? 's' : ''}`;
        } else {
          welcomeWinnerName.textContent = 'No Votes Cast';
          welcomeWinnerVotes.textContent = 'Election closed with zero ballots.';
        }
        welcomeWinnerCard.style.display = 'block';
        if (this.welcomeTimerInterval) {
          clearInterval(this.welcomeTimerInterval);
          this.welcomeTimerInterval = null;
        }
      } else {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        welcomeTimer.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        welcomeTimer.style.background = 'linear-gradient(135deg, #ff00c8, #00f5d4)';
        welcomeTimer.style.webkitBackgroundClip = 'text';
        welcomeTimer.style.webkitTextFillColor = 'transparent';
        welcomeTimerLabel.textContent = 'Remaining before deadline';
        welcomeWinnerCard.style.display = 'none';
      }
    };

    updateTime();
    this.welcomeTimerInterval = setInterval(updateTime, 1000);
    welcomeResults.style.display = 'grid';
  }

  /**
   * Sync global statistics numbers in the sidebar
   */
  updateStats() {
    const blockCountEl = document.getElementById('stat-blocks');
    const txCountEl = document.getElementById('stat-transactions');
    const campaignCountEl = document.getElementById('stat-campaigns');

    let totalTxs = 0;
    this.blockchain.chain.forEach(block => { totalTxs += block.transactions.length; });

    if (blockCountEl) blockCountEl.textContent = this.blockchain.chain.length.toString();
    if (txCountEl) txCountEl.textContent = totalTxs.toString();
    if (campaignCountEl) campaignCountEl.textContent = this.blockchain.contracts.size.toString();

    // Also update admin dashboard stat cards if visible
    const adminElectionsEl = document.getElementById('admin-stat-elections');
    const adminPendingEl = document.getElementById('admin-stat-pending');
    const adminVotesEl = document.getElementById('admin-stat-votes');

    if (adminElectionsEl) adminElectionsEl.textContent = this.blockchain.contracts.size.toString();

    if (adminPendingEl) {
      const pending = Array.from(this.blockchain.voterRegistry.values()).filter(p => p.status === 'PENDING').length;
      adminPendingEl.textContent = pending.toString();
    }

    if (adminVotesEl) {
      let totalVotes = 0;
      this.blockchain.contracts.forEach(contract => {
        totalVotes += contract.votes.size;
      });
      adminVotesEl.textContent = totalVotes.toString();
    }
  }

  /**
   * Re-evaluates ledger hashes and updates the integrity badge
   */
  async updateIntegrityBadge() {
    const badge = document.getElementById('integrity-badge');
    const badgeText = document.getElementById('integrity-status-text');

    if (!badge || !badgeText) return;

    const audit = await this.blockchain.checkLedgerValidity();
    const consistency = await this.blockchain.verifyStateConsistency();

    if (audit.isValid && consistency) {
      badge.className = 'integrity-banner valid';
      badge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> <span>Ledger Secured</span>';
    } else {
      badge.className = 'integrity-banner invalid';
      let reason = 'Ledger Altered';
      if (!audit.isValid) reason = `Block #${audit.errorBlockIndex} Tampered!`;
      else if (!consistency) reason = 'State Mismatch!';
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${reason}</span>`;
    }
  }

  /**
   * Sync all campaign dropdowns to current blockchain state
   */
  syncCampaignDropdowns() {
    const dropdownIds = [
      'select-campaign-welcome',
      'select-campaign-candidates',
      'select-campaign-vote',
    ];

    dropdownIds.forEach(id => {
      const dropdown = document.getElementById(id) as HTMLSelectElement;
      if (!dropdown) return;

      const prevValue = dropdown.value;
      dropdown.innerHTML = '<option value="">— Choose Election —</option>';

      this.blockchain.contracts.forEach((contract, address) => {
        const opt = document.createElement('option');
        opt.value = address;
        opt.textContent = `${contract.title} (${address.substring(0, 8)}...)`;
        dropdown.appendChild(opt);
      });

      // Preserve selection
      if (this.blockchain.contracts.has(prevValue)) {
        dropdown.value = prevValue;
      } else if (!dropdown.value && this.selectedCampaignAddress && this.blockchain.contracts.has(this.selectedCampaignAddress)) {
        dropdown.value = this.selectedCampaignAddress;
      }
    });
  }

  /**
   * Global UI refresh — call after any blockchain state change
   */
  async refreshAllViews() {
    this.updateStats();
    await this.updateIntegrityBadge();
    this.syncCampaignDropdowns();
    this.router.updateNavigationSidebarLayout();

    const hash = window.location.hash || '#/';
    this.triggerPanelOnOpen(hash);
  }

  /**
   * Set selected campaign globally and sync all dropdowns
   */
  selectCampaign(address: string) {
    this.selectedCampaignAddress = address;

    const dropdownIds = ['select-campaign-welcome', 'select-campaign-candidates', 'select-campaign-vote'];
    dropdownIds.forEach(id => {
      const d = document.getElementById(id) as HTMLSelectElement;
      if (d) d.value = address;
    });

    this.refreshAllViews();
  }

  private setupDiagnostics() {
    const btnRun = document.getElementById('btn-run-diagnostics') as HTMLButtonElement;
    const logBox = document.getElementById('diagnostics-log-box')!;
    if (!btnRun || !logBox) return;

    btnRun.addEventListener('click', async () => {
      btnRun.disabled = true;
      btnRun.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running Audits...';
      logBox.style.display = 'flex';
      logBox.innerHTML = '';

      const appendLog = (msg: string, type: 'pass' | 'fail' | 'info') => {
        const item = document.createElement('div');
        let color = '#a5a1c0';
        if (type === 'pass') color = 'var(--color-secondary)';
        if (type === 'fail') color = 'var(--color-danger)';
        item.style.color = color;
        item.innerHTML = msg;
        logBox.appendChild(item);
        logBox.scrollTop = logBox.scrollHeight;
      };

      try {
        await runAutomatedTests(appendLog);
      } catch (err: any) {
        appendLog(`Critical Audit Crash: ${err.message}`, 'fail');
      } finally {
        btnRun.disabled = false;
        btnRun.innerHTML = '<i class="fa-solid fa-play"></i> Run Security Audits';
        await this.refreshAllViews();
      }
    });
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;

    const icons: Record<string, string> = {
      success: '<i class="fa-solid fa-circle-check"></i>',
      error: '<i class="fa-solid fa-circle-exclamation"></i>',
      info: '<i class="fa-solid fa-circle-info"></i>',
    };

    notif.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(notif);

    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 400);
    }, 4000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).app = new App();
});
