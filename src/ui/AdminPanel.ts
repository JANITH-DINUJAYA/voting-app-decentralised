import { App } from '../main';
import { Transaction } from '../blockchain/Transaction';
import type { Candidate } from '../blockchain/SmartContract';

export class AdminPanel {
  private app: App;

  // DOM Elements
  private titleInput!: HTMLInputElement;
  private descInput!: HTMLTextAreaElement;
  private durationInput!: HTMLInputElement;
  private typeSelect!: HTMLSelectElement;
  private whitelistGroup!: HTMLElement;
  private whitelistInput!: HTMLTextAreaElement;
  private candidatesContainer!: HTMLElement;
  private btnAddCandidate!: HTMLButtonElement;
  private btnDeployCampaign!: HTMLButtonElement;

  constructor(app: App) {
    this.app = app;
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    this.titleInput = document.getElementById('campaign-title') as HTMLInputElement;
    this.descInput = document.getElementById('campaign-desc') as HTMLTextAreaElement;
    this.durationInput = document.getElementById('campaign-duration') as HTMLInputElement;
    this.typeSelect = document.getElementById('campaign-type') as HTMLSelectElement;
    this.whitelistGroup = document.getElementById('whitelist-input-group')!;
    this.whitelistInput = document.getElementById('campaign-whitelist') as HTMLTextAreaElement;
    this.candidatesContainer = document.getElementById('candidates-input-container')!;
    this.btnAddCandidate = document.getElementById('btn-add-candidate-input') as HTMLButtonElement;
    this.btnDeployCampaign = document.getElementById('btn-deploy-campaign') as HTMLButtonElement;
  }

  private initEvents() {
    this.typeSelect.addEventListener('change', () => this.handleTypeSelectChange());
    this.btnAddCandidate.addEventListener('click', () => this.addCandidateInputRow());
    this.btnDeployCampaign.addEventListener('click', () => this.deployElectionCampaign());
    
    // Add delete listeners to initial candidate input trash buttons
    this.candidatesContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const removeBtn = target.closest('.btn-remove-candidate');
      if (removeBtn) {
        const row = removeBtn.closest('.candidate-input-row');
        if (row) {
          row.remove();
          this.toggleCandidateDeleteButtons();
        }
      }
    });
  }

  /**
   * Toggle visibility of the whitelist input field
   */
  private handleTypeSelectChange() {
    const isPrivate = this.typeSelect.value === 'private';
    this.whitelistGroup.style.display = isPrivate ? 'flex' : 'none';
  }

  /**
   * Adds an input row for registering candidate name & bio manifesto
   */
  private addCandidateInputRow() {
    const row = document.createElement('div');
    row.className = 'form-row candidate-input-row';
    row.style.gridTemplateColumns = '1fr 2fr auto';
    row.style.alignItems = 'center';

    row.innerHTML = `
      <input type="text" class="cand-input-name" placeholder="Candidate Name" />
      <input type="text" class="cand-input-bio" placeholder="Short manifesto/slogan" />
      <button class="btn-icon btn-remove-candidate" title="Delete Candidate"><i class="fa-solid fa-trash-can"></i></button>
    `;

    this.candidatesContainer.appendChild(row);
    this.toggleCandidateDeleteButtons();
  }

  /**
   * Enforces that an election has at least 2 candidates
   */
  private toggleCandidateDeleteButtons() {
    const rows = this.candidatesContainer.querySelectorAll('.candidate-input-row');
    const deleteButtons = this.candidatesContainer.querySelectorAll('.btn-remove-candidate');
    
    deleteButtons.forEach(btn => {
      const button = btn as HTMLButtonElement;
      button.disabled = rows.length <= 2;
    });
  }

  /**
   * Signs and deploys a DEPLOY_ELECTION transaction to the ledger
   */
  private async deployElectionCampaign() {
    // 1. Authorization check
    if (!this.app.wallet) {
      this.app.showNotification('Deploy Rejected: You must create/import a wallet first.', 'error');
      return;
    }

    const wallet = this.app.wallet;

    // Check if wallet is admin
    const isVerifierAdmin = wallet.address.toLowerCase() === this.app.blockchain.adminAddress.toLowerCase();
    if (!isVerifierAdmin) {
      this.app.showNotification('Deploy Rejected: Only the designated Admin Verifier can deploy elections.', 'error');
      return;
    }

    // 2. Validate basic inputs
    const title = this.titleInput.value.trim();
    const desc = this.descInput.value.trim();
    const durationMin = parseInt(this.durationInput.value);
    const isPrivate = this.typeSelect.value === 'private';

    if (!title || !desc) {
      this.app.showNotification('Deploy Rejected: Title and description are required.', 'error');
      return;
    }

    if (isNaN(durationMin) || durationMin <= 0) {
      this.app.showNotification('Deploy Rejected: Please input a valid duration in minutes.', 'error');
      return;
    }

    // Parse candidates
    const candidateRows = this.candidatesContainer.querySelectorAll('.candidate-input-row');
    const candidates: Candidate[] = [];
    let hasEmptyName = false;

    candidateRows.forEach(row => {
      const nameInput = row.querySelector('.cand-input-name') as HTMLInputElement;
      const bioInput = row.querySelector('.cand-input-bio') as HTMLInputElement;
      
      const name = nameInput.value.trim();
      const bio = bioInput.value.trim();

      if (!name) {
        hasEmptyName = true;
      } else {
        candidates.push({ name, bio });
      }
    });

    if (hasEmptyName) {
      this.app.showNotification('Deploy Rejected: All candidates must have a name.', 'error');
      return;
    }

    if (candidates.length < 2) {
      this.app.showNotification('Deploy Rejected: An election requires at least 2 candidates.', 'error');
      return;
    }

    // Check for duplicate candidate names
    const namesSet = new Set(candidates.map(c => c.name));
    if (namesSet.size !== candidates.length) {
      this.app.showNotification('Deploy Rejected: Candidate names must be unique.', 'error');
      return;
    }

    // Parse Whitelist if private
    let whitelist: string[] = [];
    if (isPrivate) {
      const text = this.whitelistInput.value.trim();
      whitelist = text.split(/[\n,]+/).map(a => a.trim()).filter(a => a.startsWith('0x'));
      
      if (whitelist.length === 0) {
        this.app.showNotification('Deploy Rejected: A whitelist campaign requires at least one valid voter address (0x...).', 'error');
        return;
      }
    }

    try {
      this.btnDeployCampaign.disabled = true;
      this.btnDeployCampaign.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deploying Smart Contract...';

      const currentNonce = this.app.blockchain.getNonce(wallet.address);
      const deadline = Date.now() + (durationMin * 60 * 1000);

      // Create transaction
      const tx = new Transaction({
        sender: wallet.address,
        recipient: '0x0000000000000000000000000000000000000000', // System address for creation
        type: 'DEPLOY_ELECTION',
        payload: {
          title,
          description: desc,
          candidates,
          deadline,
          isPrivate,
          whitelist
        },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: wallet.publicKeyHex,
      });

      // Cryptographically sign
      await tx.signTransaction(wallet);

      // Broadcast to mempool
      await this.app.blockchain.addTransaction(tx);

      // Reset form fields
      this.resetForm();

      this.app.showNotification('Election deployed! Transaction signed and queued in mempool.', 'success');
      
      // Auto redirect to Block Explorer to mine
      this.app.refreshAllViews();
      this.app.router.navigate('#/explorer');

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Deployment failed: ${e.message}`, 'error');
    } finally {
      this.btnDeployCampaign.disabled = false;
      this.btnDeployCampaign.innerHTML = '<i class="fa-solid fa-square-plus"></i> Deploy Smart Contract';
    }
  }

  /**
   * Resets form values to defaults
   */
  private resetForm() {
    this.titleInput.value = '';
    this.descInput.value = '';
    this.durationInput.value = '5';
    this.typeSelect.value = 'public';
    this.whitelistInput.value = '';
    this.whitelistGroup.style.display = 'none';

    // Clear and restore first two default candidates
    this.candidatesContainer.innerHTML = `
      <div class="form-row candidate-input-row" style="grid-template-columns: 1fr 2fr auto; align-items: center;">
        <input type="text" class="cand-input-name" placeholder="Candidate Name" value="Candidate Alpha" />
        <input type="text" class="cand-input-bio" placeholder="Short manifesto/slogan" value="Pioneering absolute transparency and open communication." />
        <button class="btn-icon btn-remove-candidate" disabled><i class="fa-solid fa-trash-can"></i></button>
      </div>
      <div class="form-row candidate-input-row" style="grid-template-columns: 1fr 2fr auto; align-items: center;">
        <input type="text" class="cand-input-name" placeholder="Candidate Name" value="Candidate Beta" />
        <input type="text" class="cand-input-bio" placeholder="Short manifesto/slogan" value="Advocating for dynamic updates and streamlined execution rules." />
        <button class="btn-icon btn-remove-candidate" disabled><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;
    this.toggleCandidateDeleteButtons();
  }

  /**
   * Admin panel renderer
   */
  render() {
    // If wallet not loaded, warn admin
    if (!this.app.wallet) {
      this.btnDeployCampaign.disabled = true;
      this.btnDeployCampaign.textContent = 'Wallet Disconnected';
    } else {
      const isVerifierAdmin = this.app.wallet.address.toLowerCase() === this.app.blockchain.adminAddress.toLowerCase();
      if (!isVerifierAdmin) {
        this.btnDeployCampaign.disabled = true;
        this.btnDeployCampaign.textContent = 'Admin Key Required';
      } else {
        this.btnDeployCampaign.disabled = false;
        this.btnDeployCampaign.innerHTML = '<i class="fa-solid fa-square-plus"></i> Deploy Smart Contract';
      }
    }
  }
}
