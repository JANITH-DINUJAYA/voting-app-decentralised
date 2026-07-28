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

      const appData = this.pendingApplications.find(a => a.address.toLowerCase() === targetAddress.toLowerCase());

      // Resolve the actual nicPhoto from DB if on-chain reference is a placeholder
      let resolvedNicPhoto = appData?.nicPhoto || '';
      if (resolvedNicPhoto.startsWith('kyc:db:')) {
        resolvedNicPhoto = this.app.activeUser?.nicPhoto || 'https://via.placeholder.com/400x250?text=NIC+Photo';
      }

      const tx = new Transaction({
        sender: admin.address,
        recipient: '0x0000000000000000000000000000000000000000',
        type: 'VERIFY_IDENTITY',
        payload: {
          targetAddress,
          approved,
          targetName: appData ? appData.name : undefined,
          targetEmail: appData ? appData.email : undefined,
          targetNicPhoto: resolvedNicPhoto || undefined,
          targetRole: appData ? appData.role : undefined,
          targetBio: appData ? appData.bio : undefined
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
        const verifyRes = await fetch('/api/verify-kyc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetAddress, approved })
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          // If the approved user is the currently logged-in user, update their local session
          if (verifyData.user && this.app.activeUser?.walletAddress?.toLowerCase() === targetAddress.toLowerCase()) {
            this.app.activeUser.kycStatus = verifyData.user.kycStatus;
            localStorage.setItem('votechain_session', JSON.stringify(this.app.activeUser));
          }
        } else {
          console.warn('verify-kyc API returned non-OK:', await verifyRes.text());
        }
      } catch (err) {
        console.warn('Database verification sync failed:', err);
      }

      // Optimistically remove from pending list immediately (don't wait for mining)
      this.pendingApplications = this.pendingApplications.filter(
        a => a.address.toLowerCase() !== targetAddress.toLowerCase()
      );
      this.render();

      this.app.showNotification(
        approved 
          ? `KYC Approved! Identity verified for ${appData?.name || targetAddress.substring(0, 12)}. Mining in progress...` 
          : `KYC Rejected. Application from ${appData?.name || targetAddress.substring(0, 12)} has been rejected.`,
        approved ? 'success' : 'info'
      );

      this.app.refreshAllViews();
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

    // Build set of addresses already VERIFIED or REJECTED on-chain
    const alreadyProcessed = new Set<string>();
    this.app.blockchain.voterRegistry.forEach((profile, address) => {
      if (profile.status === 'VERIFIED' || profile.status === 'REJECTED') {
        alreadyProcessed.add(address.toLowerCase());
      }
    });

    // Check for pending VERIFY_IDENTITY transactions in the mempool (being mined right now)
    const pendingVerifications = new Set(
      this.app.blockchain.pendingTransactions
        .filter(t => t.type === 'VERIFY_IDENTITY')
        .map(t => t.payload.targetAddress.toLowerCase())
    );

    // Merge: DB data first (has real nicPhoto URLs), then blockchain, then mempool
    // Deduplication keeps the first occurrence, so DB data wins
    const merged = [...dbPending, ...blockchainPending, ...localPending];
    const seen = new Set<string>();
    this.pendingApplications = merged.filter(app => {
      if (!app.address) return false;
      const addr = app.address.toLowerCase();
      if (alreadyProcessed.has(addr)) return false;     // Already verified/rejected on-chain
      if (pendingVerifications.has(addr)) return false;  // Being mined right now
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
              ${!app.nicPhoto.startsWith('kyc:db:') ? `
              <a href="${app.nicPhoto}" target="_blank" rel="noopener" style="color: var(--color-primary); font-size: 0.75rem; font-weight: 600; text-decoration: none;">
                <i class="fa-solid fa-up-right-from-square"></i> View Original
              </a>` : ''}
            </div>
            ${app.nicPhoto.startsWith('kyc:db:')
              ? `<div style="padding: 1rem; background: var(--bg-main); border: 1px solid var(--border-color); text-align: center; color: var(--color-text-muted); font-size: 0.82rem;"><i class="fa-solid fa-image" style="font-size: 2rem; color: var(--color-primary); display: block; margin-bottom: 0.5rem;"></i>NIC photo stored securely in Neon database. Identity documentation was submitted and is available for review.</div>`
              : `<img src="${app.nicPhoto}" class="kyc-app-nic-preview" alt="NIC Photo Preview" onerror="this.src='https://via.placeholder.com/400x250?text=NIC+Photo+Unavailable'" />`
            }
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
