import { Blockchain } from './blockchain/Blockchain';
import { Wallet } from './blockchain/Wallet';
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
}

export class App {
  public blockchain: Blockchain;
  public wallet: Wallet | null = null;
  public activeUser: UserProfile | null = null;
  public selectedCampaignAddress: string = '';

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

  private init() {
    // 1. Initialize UI component controllers
    this.loginRegister = new LoginRegister(this);
    this.adminPanel = new AdminPanel(this);
    this.voterTerminal = new VoterTerminal(this);
    this.explorer = new Explorer(this);
    this.tamperConsole = new TamperConsole(this);
    this.verifierPortal = new VerifierPortal(this);

    // 2. Initialize Hash Router (coordinates initial page parse)
    this.router = new Router(this);

    // 3. Set up event handler for public welcome select list
    const welcomeSelect = document.getElementById('select-campaign-welcome') as HTMLSelectElement;
    if (welcomeSelect) {
      welcomeSelect.addEventListener('change', () => {
        this.selectCampaign(welcomeSelect.value);
      });
    }

    // 4. Setup automated diagnostic audits
    this.setupDiagnostics();

    // 5. Initial sync
    this.refreshAllViews();
    this.tamperConsole.init();
    
    this.showNotification('VoteChain Network active. Welcome to decentralized governance!', 'info');
  }

  /**
   * Action trigger when a route view becomes active
   */
  triggerPanelOnOpen(hash: string) {
    switch (hash) {
      case '#/':
        this.renderWelcomeHub();
        break;
      case '#/login':
      case '#/admin/login':
        this.loginRegister.render();
        break;
      case '#/voter':
        this.voterTerminal.render();
        break;
      case '#/candidate':
        this.renderCandidateNomineePortal();
        break;
      case '#/admin':
        this.adminPanel.render();
        break;
      case '#/verifier':
        this.verifierPortal.render();
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
   * Render Candidate Nomination standing view
   */
  private renderCandidateNomineePortal() {
    const card = document.getElementById('candidate-portal-details')!;
    if (!card) return;

    if (!this.wallet) {
      card.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 2rem;"><i class="fa-solid fa-wallet" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br/>Wallet not generated. Please access the "Profile Session" page to generate your wallet.</p>`;
      return;
    }

    const profile = this.blockchain.voterRegistry.get(this.wallet.address.toLowerCase());
    if (profile && profile.role === 'CANDIDATE') {
      if (profile.status !== 'VERIFIED') {
        card.innerHTML = `<p style="color: var(--color-primary); text-align: center; padding: 2rem;"><i class="fa-solid fa-hourglass-half" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br/>KYC Identity Audit Pending. Your profile status is currently <strong>${profile.status}</strong>. Please wait for verifier approval.</p>`;
        return;
      }

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1.5rem; border-bottom: 1px solid rgba(157, 78, 221, 0.1); padding-bottom: 1rem;">
          <div id="candidate-portal-avatar" style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.5rem; color: var(--bg-main);">CA</div>
          <div>
            <h3 id="candidate-portal-name" style="font-size: 1.25rem;">Candidate Alpha</h3>
            <span id="candidate-portal-address" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--color-secondary);">0x...</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>KYC Profile Status</label>
            <span id="candidate-portal-kyc-status" style="font-weight: 700; font-size: 1rem;">VERIFIED</span>
          </div>
          <div class="form-group">
            <label>NIC Identity Link</label>
            <a id="candidate-portal-nic-link" href="" target="_blank" style="color: var(--color-primary); font-size: 0.9rem; font-weight: 600; text-decoration: none;"><i class="fa-solid fa-arrow-up-right-from-square"></i> View Uploaded NIC on ImgBB</a>
          </div>
        </div>

        <div class="form-group">
          <label>Nomination Manifesto</label>
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); padding: 1rem; font-size: 0.9rem; line-height: 1.5;" id="candidate-portal-bio">
            Your manifesto biography...
          </div>
        </div>
      `;

      const pName = document.getElementById('candidate-portal-name')!;
      const pAddress = document.getElementById('candidate-portal-address')!;
      const pKycStatus = document.getElementById('candidate-portal-kyc-status')!;
      const pNicLink = document.getElementById('candidate-portal-nic-link') as HTMLAnchorElement;
      const pBio = document.getElementById('candidate-portal-bio')!;
      const pAvatar = document.getElementById('candidate-portal-avatar')!;

      pName.textContent = profile.name;
      pAddress.textContent = this.wallet.address;
      pKycStatus.textContent = profile.status;
      pKycStatus.style.color = 'var(--color-secondary)';
      pNicLink.href = profile.nicPhoto;
      pBio.textContent = profile.bio || 'No manifesto provided.';
      
      const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      pAvatar.textContent = initials;
    } else {
      card.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 2rem;"><i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br/>KYC application required. Please access the "Profile Session" page to submit your details and wait for verifier approval.</p>`;
    }
  }

  /**
   * Render the public welcome hub results
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
      welcomeResults.style.display = 'none';
      return;
    }

    const contract = this.blockchain.contracts.get(this.selectedCampaignAddress);
    if (!contract) {
      welcomeResults.style.display = 'none';
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
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-secondary);">${votes} votes (${percentage}%)</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${percentage}%"></div>
        </div>
      `;
      welcomeChart.appendChild(group);
    });

    // Countdown and Winner details
    const updateTime = () => {
      const remaining = contract.deadline - Date.now();
      if (remaining <= 0) {
        welcomeTimer.textContent = '00:00:00';
        welcomeTimer.style.background = 'var(--color-danger)';
        welcomeTimer.style.webkitBackgroundClip = 'initial';
        welcomeTimer.style.webkitTextFillColor = 'var(--color-text-main)';
        welcomeTimerLabel.textContent = 'Election Campaign Ended';

        // Set Winner
        if (totalVotes > 0) {
          let highest = -1;
          let winnerNameStr = '';
          contract.candidates.forEach(c => {
            const v = tallies[c.name] || 0;
            if (v > highest) {
              highest = v;
              winnerNameStr = c.name;
            } else if (v === highest && v > 0) {
              winnerNameStr += ` & ${c.name}`;
            }
          });
          welcomeWinnerName.textContent = winnerNameStr;
          welcomeWinnerVotes.textContent = `with ${highest} verified votes`;
          welcomeWinnerCard.style.display = 'block';
        } else {
          welcomeWinnerName.textContent = 'No Votes Cast';
          welcomeWinnerVotes.textContent = 'Closed with zero ballots.';
          welcomeWinnerCard.style.display = 'block';
        }
      } else {
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        welcomeTimer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        welcomeTimer.style.background = 'linear-gradient(135deg, #ff00c8, #00f5d4)';
        welcomeTimer.style.webkitBackgroundClip = 'text';
        welcomeTimer.style.webkitTextFillColor = 'transparent';
        welcomeTimerLabel.textContent = 'Remaining before deadline';
        welcomeWinnerCard.style.display = 'none';
      }
    };
    
    updateTime();
    welcomeResults.style.display = 'grid';
  }

  /**
   * Sync global statistics numbers
   */
  updateStats() {
    const blockCountEl = document.getElementById('stat-blocks');
    const txCountEl = document.getElementById('stat-transactions');
    const campaignCountEl = document.getElementById('stat-campaigns');

    let totalTxs = 0;
    this.blockchain.chain.forEach(block => {
      totalTxs += block.transactions.length;
    });

    if (blockCountEl) blockCountEl.textContent = this.blockchain.chain.length.toString();
    if (txCountEl) txCountEl.textContent = totalTxs.toString();
    if (campaignCountEl) campaignCountEl.textContent = this.blockchain.contracts.size.toString();
  }

  /**
   * Re-evaluates ledger hashes and signatures, modifying the integrity badge
   */
  async updateIntegrityBadge() {
    const badge = document.getElementById('integrity-badge');
    const badgeText = document.getElementById('integrity-status-text');
    
    if (!badge || !badgeText) return;

    const audit = await this.blockchain.checkLedgerValidity();
    const consistency = await this.blockchain.verifyStateConsistency();
    
    if (audit.isValid && consistency) {
      badge.className = 'integrity-banner valid';
      badgeText.textContent = 'Ledger Secured';
      badge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> <span>Ledger Secured</span>';
    } else {
      badge.className = 'integrity-banner invalid';
      let reason = 'Ledger Altered';
      if (!audit.isValid) {
        reason = `Block #${audit.errorBlockIndex} Tampered!`;
      } else if (!consistency) {
        reason = `State Mismatch Detected!`;
      }
      badgeText.textContent = reason;
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${reason}</span>`;
    }
  }

  /**
   * Shared helper to synchronize all campaign drop-downs in panels
   */
  syncCampaignDropdowns() {
    const dropdownIds = [
      'select-campaign-welcome',
      'select-campaign-candidates', 
      'select-campaign-vote', 
      'select-campaign-results'
    ];
    
    dropdownIds.forEach(id => {
      const dropdown = document.getElementById(id) as HTMLSelectElement;
      if (!dropdown) return;
      
      const prevValue = dropdown.value;
      dropdown.innerHTML = '<option value="">-- Choose Campaign --</option>';
      
      this.blockchain.contracts.forEach((contract, address) => {
        const option = document.createElement('option');
        option.value = address;
        option.textContent = `${contract.title} (${address.substring(0, 8)}...)`;
        dropdown.appendChild(option);
      });
      
      // Preserve selection if it still exists
      if (this.blockchain.contracts.has(prevValue)) {
        dropdown.value = prevValue;
      } else if (dropdown.value === '' && this.blockchain.contracts.size > 0 && this.selectedCampaignAddress) {
        dropdown.value = this.selectedCampaignAddress;
      }
    });
  }

  /**
   * Global function to update the entire application UI
   */
  async refreshAllViews() {
    this.updateStats();
    await this.updateIntegrityBadge();
    this.syncCampaignDropdowns();
    this.router.updateNavigationSidebarLayout();
    
    // Update currently visible panels depending on routing
    const hash = window.location.hash || '#/';
    this.triggerPanelOnOpen(hash);
  }

  /**
   * Helper to set selected election globally
   */
  selectCampaign(address: string) {
    this.selectedCampaignAddress = address;
    
    // Sync current values across all dropdowns
    const dropdownIds = [
      'select-campaign-welcome',
      'select-campaign-candidates', 
      'select-campaign-vote', 
      'select-campaign-results'
    ];
    
    dropdownIds.forEach(id => {
      const dropdown = document.getElementById(id) as HTMLSelectElement;
      if (dropdown) dropdown.value = address;
    });

    // Refresh display
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
        let color = '#a5a1c0'; // info
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
        btnRun.innerHTML = '<i class="fa-solid fa-play"></i> Run Cryptographic Security Audits';
        await this.refreshAllViews();
      }
    });
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    if (type === 'info') icon = '<i class="fa-solid fa-circle-info"></i>';

    notif.innerHTML = `
      ${icon}
      <span>${message}</span>
    `;

    container.appendChild(notif);
    
    // Slide in
    setTimeout(() => notif.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
      notif.classList.remove('show');
      setTimeout(() => notif.remove(), 400);
    }, 4000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).app = new App();
});
