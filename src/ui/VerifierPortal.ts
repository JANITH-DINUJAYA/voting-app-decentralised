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

  /**
   * Render pending registrations
   */
  render() {
    this.container.innerHTML = '';
    
    // Select all pending applications
    const pendingApps: { address: string; name: string; email: string; nicPhoto: string; role: string; bio?: string }[] = [];
    this.app.blockchain.voterRegistry.forEach((profile, address) => {
      if (profile.status === 'PENDING') {
        pendingApps.push({
          address,
          ...profile
        });
      }
    });

    if (pendingApps.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
          <i class="fa-solid fa-inbox" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--color-primary);"></i>
          <p>No KYC applications pending verification at this moment.</p>
        </div>
      `;
      return;
    }

    pendingApps.forEach(app => {
      const card = document.createElement('div');
      card.className = 'verifier-app-card';

      const isCandidate = app.role === 'CANDIDATE';

      card.innerHTML = `
        <div class="verifier-app-header">
          <span class="verifier-app-name">${app.name}</span>
          <span class="verifier-app-role ${isCandidate ? 'candidate' : ''}">${app.role} nominee</span>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; background: var(--bg-main); border: 1px solid var(--border-color); padding: 0.75rem;">
          <div><strong>Address:</strong> <span style="font-family: var(--font-mono); color: var(--color-secondary);">${app.address}</span></div>
          <div><strong>Email:</strong> ${app.email}</div>
          ${app.bio ? `<div><strong>Manifesto:</strong> ${app.bio}</div>` : ''}
        </div>

        <div class="verifier-nic-container">
          <strong>National Identity Card (NIC) hosted on ImgBB:</strong>
          <a href="${app.nicPhoto}" target="_blank" style="color: var(--color-primary); font-size: 0.75rem; text-decoration: none; margin-bottom: 0.25rem; display: block;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Photo in new tab</a>
          <img src="${app.nicPhoto}" class="verifier-nic-image" alt="NIC Photo File" onerror="this.src='https://via.placeholder.com/400x250?text=Image+Load+Error'" />
        </div>

        <div class="form-row" style="margin-top: 0.5rem;">
          <button class="btn btn-approve-kyc" style="background: var(--color-secondary); border-color: var(--color-secondary); color: var(--bg-main);"><i class="fa-solid fa-circle-check"></i> Approve Application</button>
          <button class="btn btn-danger btn-reject-kyc"><i class="fa-solid fa-circle-xmark"></i> Reject Profile</button>
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
