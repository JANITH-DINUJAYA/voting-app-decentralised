import { App } from '../main';
import { Transaction } from '../blockchain/Transaction';

export class VerifierPortal {
  private app: App;

  // DOM Elements
  private container!: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.container = document.getElementById('verifier-applications-container')!;
  }

  /**
   * Approves or rejects a KYC application on-chain
   */
  private async processVerification(targetAddress: string, approved: boolean, btn: HTMLButtonElement) {
    if (!this.app.wallet) return;

    try {
      btn.disabled = true;
      btn.innerHTML = approved 
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Approving...' 
        : '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';

      const admin = this.app.wallet;
      const currentNonce = this.app.blockchain.getNonce(admin.address);

      const tx = new Transaction({
        sender: admin.address,
        recipient: '0x0000000000000000000000000000000000000000',
        type: 'VERIFY_IDENTITY',
        payload: {
          targetAddress,
          approved
        },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: admin.publicKeyHex
      });

      // Cryptographically sign with Admin key
      await tx.signTransaction(admin);

      // Broadcast transaction
      await this.app.blockchain.addTransaction(tx);

      // Sync verification status to Neon database
      try {
        await fetch('/api/verify-kyc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetAddress,
            approved
          })
        });
      } catch (err) {
        console.warn('Database verification sync failed:', err);
      }

      this.app.showNotification(
        approved 
          ? 'KYC verification approved! Transaction queued in mempool.' 
          : 'KYC registration rejected! Transaction queued in mempool.',
        approved ? 'success' : 'info'
      );

      this.app.refreshAllViews();

      // Redirect to explorer to mine block
      const explorerNav = document.querySelector('[href="#/explorer"]') as HTMLElement;
      if (explorerNav) explorerNav.click();

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Verification action failed: ${e.message}`, 'error');
      this.render(); // reset button states
    }
  }

  private pendingApplications: { address: string; name: string; email: string; nicPhoto: string; role: string; bio?: string }[] = [];
  private isLoading: boolean = false;

  /**
   * Fetches pending applications from database, mempool, and blockchain registry
   */
  public async fetchPendingKyc() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.render();

    // 1. Get from local mempool
    const localPending = this.app.blockchain.pendingTransactions
      .filter(t => t.type === 'REGISTER_VOTER_KYC' || t.type === 'REGISTER_CANDIDATE_KYC')
      .map(t => ({
        address: t.sender,
        name: t.payload.name,
        email: t.payload.email,
        nicPhoto: t.payload.nicPhoto,
        role: t.type === 'REGISTER_CANDIDATE_KYC' ? 'CANDIDATE' : 'VOTER',
        bio: t.payload.bio
      }));

    // 2. Get from blockchain voterRegistry
    const blockchainPending: typeof localPending = [];
    this.app.blockchain.voterRegistry.forEach((profile, address) => {
      if (profile.status === 'PENDING') {
        blockchainPending.push({
          address,
          name: profile.name,
          email: profile.email,
          nicPhoto: profile.nicPhoto,
          role: profile.role,
          bio: profile.bio
        });
      }
    });

    // 3. Fetch from Neon database
    let dbPending: typeof localPending = [];
    try {
      const res = await fetch('/api/pending-kyc');
      if (res.ok) {
        const data = await res.json();
        dbPending = data.map((d: any) => ({
          address: d.walletAddress,
          name: d.fullName,
          email: d.email,
          nicPhoto: d.nicPhoto,
          role: d.role,
          bio: d.bio
        }));
      }
    } catch (err) {
      console.warn('Database fetch failed, relying on ledger:', err);
    }

    // Merge and deduplicate by address
    const merged = [...localPending, ...blockchainPending, ...dbPending];
    const seen = new Set<string>();
    this.pendingApplications = merged.filter(app => {
      if (!app.address) return false;
      const addr = app.address.toLowerCase();
      if (seen.has(addr)) return false;
      seen.add(addr);
      return true;
    });

    this.isLoading = false;
    this.render();
  }

  /**
   * Render pending registrations
   */
  render() {
    this.container.innerHTML = '';

    if (this.isLoading) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--color-primary);"></i>
          <p>Querying pending identity records from Neon...</p>
        </div>
      `;
      return;
    }
    
    if (this.pendingApplications.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
          <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--color-primary);"></i>
          <p>No KYC applications pending verification at this moment.</p>
        </div>
      `;
      return;
    }

    this.pendingApplications.forEach(app => {
      const card = document.createElement('div');
      card.className = 'kyc-application-card';

      const isCandidate = app.role === 'CANDIDATE';

      card.innerHTML = `
        <div class="kyc-app-header">
          <span style="font-weight: 700; font-size: 1rem;">${app.name}</span>
          <span class="status-badge ${isCandidate ? 'pending' : 'verified'}" style="font-size: 0.7rem;">
            <i class="fa-solid ${isCandidate ? 'fa-user-tag' : 'fa-user'}"></i> ${app.role}
          </span>
        </div>
        
        <div class="kyc-app-body">
          <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; padding: 0.85rem; background: var(--bg-main); border: 1px solid var(--border-color);">
            <div><strong>Blockchain Address:</strong> <span style="font-family: var(--font-mono); color: var(--color-secondary);">${app.address}</span></div>
            <div><strong>Email Address:</strong> ${app.email}</div>
            ${app.bio ? `<div style="margin-top: 0.25rem;"><strong>Manifesto Statement:</strong> <span style="color: var(--color-text-muted); font-style: italic;">"${app.bio}"</span></div>` : ''}
          </div>

          <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>National Identity Card (NIC)</strong>
              <a href="${app.nicPhoto}" target="_blank" rel="noopener" style="color: var(--color-primary); font-size: 0.75rem; font-weight: 600; text-decoration: none;">
                <i class="fa-solid fa-up-right-from-square"></i> View Original
              </a>
            </div>
            <img src="${app.nicPhoto}" class="kyc-app-nic-preview" alt="NIC Photo Preview" onerror="this.src='https://via.placeholder.com/400x250?text=NIC+Photo+Unavailable'" />
          </div>

          <div class="kyc-app-actions">
            <button class="btn btn-approve-kyc" style="flex: 1; background: var(--color-secondary); border-color: var(--color-secondary); color: var(--bg-main);">
              <i class="fa-solid fa-circle-check"></i> Approve Application
            </button>
            <button class="btn btn-danger btn-reject-kyc" style="flex: 1;">
              <i class="fa-solid fa-circle-xmark"></i> Reject application
            </button>
          </div>
        </div>
      `;

      const approveBtn = card.querySelector('.btn-approve-kyc') as HTMLButtonElement;
      const rejectBtn = card.querySelector('.btn-reject-kyc') as HTMLButtonElement;

      approveBtn.addEventListener('click', () => this.processVerification(app.address, true, approveBtn));
      rejectBtn.addEventListener('click', () => this.processVerification(app.address, false, rejectBtn));

      this.container.appendChild(card);
    });
  }
}
