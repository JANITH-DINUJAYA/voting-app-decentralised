import { App } from '../main';
import { Transaction } from '../blockchain/Transaction';
import { Wallet } from '../blockchain/Wallet';

export class AdminPanel {
  private app: App;

  // DOM Elements
  private titleInput!: HTMLInputElement;
  private descInput!: HTMLTextAreaElement;
  private durationInput!: HTMLInputElement;
  private typeSelect!: HTMLSelectElement;
  private whitelistGroup!: HTMLElement;
  private whitelistInput!: HTMLTextAreaElement;
  private btnDeployCampaign!: HTMLButtonElement;
  private electionsList!: HTMLElement;

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
    this.btnDeployCampaign = document.getElementById('btn-deploy-campaign') as HTMLButtonElement;
    this.electionsList = document.getElementById('admin-elections-list')!;
  }

  private initEvents() {
    if (this.typeSelect) {
      this.typeSelect.addEventListener('change', () => this.handleTypeSelectChange());
    }
    if (this.btnDeployCampaign) {
      this.btnDeployCampaign.addEventListener('click', () => this.deployElectionCampaign());
    }
  }

  private handleTypeSelectChange() {
    const isPrivate = this.typeSelect.value === 'private';
    if (this.whitelistGroup) {
      this.whitelistGroup.style.display = isPrivate ? 'flex' : 'none';
    }
  }

  /**
   * Deploys a new election in PRE_REGISTRATION phase
   */
  private async deployElectionCampaign() {
    if (!this.app.wallet) {
      this.app.showNotification('Deploy Rejected: You must connect a wallet first.', 'error');
      return;
    }

    const wallet = this.app.wallet;
    const isVerifierAdmin = wallet.address.toLowerCase() === this.app.blockchain.adminAddress.toLowerCase();
    if (!isVerifierAdmin) {
      this.app.showNotification('Deploy Rejected: Only the Admin Verifier can deploy elections.', 'error');
      return;
    }

    const title = this.titleInput.value.trim();
    const desc = this.descInput.value.trim();
    const durationMin = parseInt(this.durationInput.value);
    const isPrivate = this.typeSelect.value === 'private';

    if (!title || !desc) {
      this.app.showNotification('Deploy Rejected: Title and description are required.', 'error');
      return;
    }

    if (isNaN(durationMin) || durationMin <= 0) {
      this.app.showNotification('Deploy Rejected: Please input a valid duration.', 'error');
      return;
    }

    let whitelist: string[] = [];
    if (isPrivate) {
      const text = this.whitelistInput.value.trim();
      whitelist = text.split(/[\n,]+/).map(a => a.trim()).filter(a => a.startsWith('0x'));
      if (whitelist.length === 0) {
        this.app.showNotification('Deploy Rejected: Whitelist elections require at least one voter address.', 'error');
        return;
      }
    }

    try {
      this.btnDeployCampaign.disabled = true;
      this.btnDeployCampaign.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deploying...';

      const currentNonce = this.app.blockchain.getNonce(wallet.address);
      
      // Default: empty candidates at deploy. Candidates must apply.
      const tx = new Transaction({
        sender: wallet.address,
        recipient: '0x0000000000000000000000000000000000000000',
        type: 'DEPLOY_ELECTION',
        payload: {
          title,
          description: desc,
          candidates: [], // Start empty
          deadline: Date.now() + (durationMin * 60 * 1000), // Default placeholder, starts counting upon StartElection
          isPrivate,
          whitelist
        },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: '0x',
      });

      await this.app.blockchain.addTransaction(tx);

      this.resetForm();
      this.app.showNotification('Election deployed! It will be mined and created automatically.', 'success');
      this.app.refreshAllViews();
    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Deployment failed: ${e.message}`, 'error');
    } finally {
      this.btnDeployCampaign.disabled = false;
      this.btnDeployCampaign.innerHTML = '<i class="fa-solid fa-rocket"></i> Deploy Election Smart Contract';
    }
  }

  private resetForm() {
    this.titleInput.value = '';
    this.descInput.value = '';
    this.durationInput.value = '5';
    this.typeSelect.value = 'public';
    this.whitelistInput.value = '';
    this.whitelistGroup.style.display = 'none';
  }

  /**
   * Admin triggers candidate application approval/rejection
   */
  private async processCandidacyApplication(contractAddress: string, candidateAddress: string, approved: boolean, btn: HTMLButtonElement) {
    if (!this.app.wallet) return;

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

      const admin = this.app.wallet;
      const currentNonce = this.app.blockchain.getNonce(admin.address);

      const tx = new Transaction({
        sender: admin.address,
        recipient: contractAddress,
        type: 'APPROVE_CANDIDACY',
        payload: {
          candidateAddress,
          approved
        },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: '0x'
      });

      await this.app.blockchain.addTransaction(tx);

      this.app.showNotification(
        approved 
          ? 'Candidacy application approved! It will be mined and processed automatically.' 
          : 'Candidacy application rejected! It will be mined and processed automatically.', 
        'success'
      );

      this.app.refreshAllViews();
    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Action failed: ${e.message}`, 'error');
      this.render();
    }
  }

  /**
   * Admin triggers election phase start (status: ACTIVE)
   */
  private async startElection(contractAddress: string, durationMinutes: number, btn: HTMLButtonElement) {
    if (!this.app.wallet) return;

    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting...';

      const admin = this.app.wallet;
      const currentNonce = this.app.blockchain.getNonce(admin.address);

      const tx = new Transaction({
        sender: admin.address,
        recipient: contractAddress,
        type: 'START_ELECTION',
        payload: {
          durationMinutes
        },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: '0x'
      });

      await this.app.blockchain.addTransaction(tx);

      this.app.showNotification('Election started! It will be mined and opened for voting automatically.', 'success');
      this.app.refreshAllViews();
    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Failed to start election: ${e.message}`, 'error');
      this.render();
    }
  }

  /**
   * Render deployed elections management panel
   */
  async render() {
    const isAdmin = this.app.activeUser?.role === 'ADMIN';

    if (!isAdmin) {
      if (this.btnDeployCampaign) {
        this.btnDeployCampaign.disabled = true;
        this.btnDeployCampaign.textContent = 'Admin Role Required';
      }
      if (this.electionsList) {
        this.electionsList.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: 1rem;"><i class="fa-solid fa-triangle-exclamation"></i> Administrative privileges required.</p>';
      }
      return;
    }

    // Auto-restore admin wallet if activeUser is admin but wallet object is null
    if (!this.app.wallet && this.app.activeUser?.walletPrivateKey && this.app.activeUser?.walletPublicKey) {
      try {
        const w = new Wallet();
        await w.importFromHex(this.app.activeUser.walletPrivateKey, this.app.activeUser.walletPublicKey);
        this.app.wallet = w;
      } catch (err) {
        console.warn('Failed to auto-restore admin wallet in panel:', err);
      }
    }

    if (this.btnDeployCampaign) {
      this.btnDeployCampaign.disabled = false;
      this.btnDeployCampaign.innerHTML = '<i class="fa-solid fa-rocket"></i> Deploy Election Smart Contract';
    }

    // Populate elections list
    if (!this.electionsList) return;
    this.electionsList.innerHTML = '';
    const elections = Array.from(this.app.blockchain.contracts.entries());

    if (elections.length === 0) {
      this.electionsList.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 2rem;">
          <i class="fa-solid fa-folder-open" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.5rem; display: block;"></i>
          <p>No elections deployed on-chain yet.</p>
        </div>
      `;
      return;
    }

    elections.forEach(([address, contract]) => {
      const card = document.createElement('div');
      card.style.background = 'var(--bg-card)';
      card.style.border = '1px solid var(--border-color)';
      card.style.padding = '1.25rem';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '0.75rem';

      const isEnded = contract.status === 'ENDED' || Date.now() > contract.deadline;
      const statusLabels: Record<string, string> = {
        PRE_REGISTRATION: '<span class="status-badge pending"><i class="fa-solid fa-user-plus"></i> Nominations</span>',
        ACTIVE: '<span class="status-badge verified"><i class="fa-solid fa-circle-play"></i> Active Voting</span>',
        ENDED: '<span class="status-badge rejected"><i class="fa-solid fa-circle-xmark"></i> Ended</span>'
      };

      let statusHtml = statusLabels[contract.status] || statusLabels.PRE_REGISTRATION;
      if (contract.status === 'ACTIVE' && isEnded) {
        statusHtml = statusLabels.ENDED;
      }

      let contentHtml = '';

      if (contract.status === 'PRE_REGISTRATION') {
        const approvedCount = contract.candidates.length;

        contentHtml = `
          <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <strong style="font-size: 0.8rem; text-transform: uppercase; color: var(--color-text-muted);">Candidacy Applications</strong>
            
            <!-- Applicants list -->
            <div style="display: flex; flex-direction: column; gap: 0.50rem; margin-top: 0.5rem;">
              ${contract.candidateApplicants.length === 0 ? `
                <p style="color: var(--color-text-dim); font-size: 0.8rem;">No candidates have applied for nominations yet.</p>
              ` : contract.candidateApplicants.map(app => `
                <div style="background: var(--bg-main); padding: 0.75rem; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                  <div>
                    <strong style="font-size: 0.88rem;">${app.name}</strong>
                    <span style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-text-muted); display: block;">${app.address.substring(0, 16)}...</span>
                    ${app.bio ? `<p style="font-size: 0.78rem; color: var(--color-text-dim); margin-top: 0.15rem;">"${app.bio}"</p>` : ''}
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${app.status === 'PENDING' ? `
                      <button class="btn btn-ghost btn-sm btn-approve-candidate-app" data-candidate="${app.address}" style="color: var(--color-secondary); border-color: rgba(0, 245, 212, 0.2);"><i class="fa-solid fa-check"></i> Approve</button>
                      <button class="btn btn-ghost btn-sm btn-reject-candidate-app" data-candidate="${app.address}" style="color: var(--color-danger); border-color: rgba(255, 0, 85, 0.2);"><i class="fa-solid fa-xmark"></i> Reject</button>
                    ` : `
                      <span class="status-badge ${app.status === 'APPROVED' ? 'verified' : 'rejected'}" style="font-size: 0.68rem;">${app.status}</span>
                    `}
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Start Election triggers -->
            <div style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(157, 78, 221, 0.1); padding-top: 0.85rem; gap: 1rem; flex-wrap: wrap;">
              <span style="font-size: 0.82rem; color: var(--color-text-muted);">
                Approved Nominees: <strong style="color: var(--color-secondary);">${approvedCount}</strong> (Requires min. 2 to start)
              </span>
              <button class="btn btn-secondary btn-sm btn-start-voting-phase" ${approvedCount < 2 ? 'disabled' : ''} style="font-weight: 700;">
                <i class="fa-solid fa-play"></i> Start Voting Phase
              </button>
            </div>
          </div>
        `;
      } else if (contract.status === 'ACTIVE') {
        const tallies = contract.getTallies();
        const totalVotes = Array.from(contract.votes.values()).length;
        const timeRemaining = contract.deadline - Date.now();
        const isEnded = timeRemaining <= 0;

        // Compute winner if ended
        let winnerHtml = '';
        if (isEnded) {
          let winnerName = 'No votes cast';
          let maxVotes = 0;
          let tie = false;
          Object.entries(tallies).forEach(([candName, votes]) => {
            if (votes > maxVotes) {
              maxVotes = votes;
              winnerName = candName;
              tie = false;
            } else if (votes === maxVotes && maxVotes > 0) {
              tie = true;
            }
          });
          const winnerText = tie 
            ? `Tie (${maxVotes} votes)` 
            : maxVotes > 0 
              ? `${winnerName} (${maxVotes} votes)` 
              : 'No votes cast';

          winnerHtml = `
            <div style="margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(0, 245, 212, 0.05); border: 1px solid rgba(0, 245, 212, 0.2); font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; color: var(--color-secondary);">
              <i class="fa-solid fa-trophy" style="color: var(--color-warning);"></i>
              <span>Winner: <strong>${winnerText}</strong></span>
            </div>
          `;
        }

        contentHtml = `
          <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.5rem; color: var(--color-text-muted);">
              <span>Voting Progress: <strong>${totalVotes} votes cast</strong></span>
              <span>Time Left: <strong class="admin-countdown" data-deadline="${contract.deadline}">${timeRemaining > 0 ? Math.round(timeRemaining / 60000) + ' min' : 'Ended'}</strong></span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
              ${contract.candidates.map(cand => {
                const votes = tallies[cand.name] || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                return `
                  <div style="font-size: 0.8rem; display: flex; justify-content: space-between;">
                    <span>${cand.name}</span>
                    <strong>${votes} vote${votes !== 1 ? 's' : ''} (${percentage}%)</strong>
                  </div>
                `;
              }).join('')}
            </div>
            ${winnerHtml}
          </div>
        `;
      } else {
        const tallies = contract.getTallies();
        const totalVotes = Array.from(contract.votes.values()).length;

        // Compute winner
        let winnerName = 'No votes cast';
        let maxVotes = 0;
        let tie = false;
        Object.entries(tallies).forEach(([candName, votes]) => {
          if (votes > maxVotes) {
            maxVotes = votes;
            winnerName = candName;
            tie = false;
          } else if (votes === maxVotes && maxVotes > 0) {
            tie = true;
          }
        });
        const winnerText = tie 
          ? `Tie (${maxVotes} votes)` 
          : maxVotes > 0 
            ? `${winnerName} (${maxVotes} votes)` 
            : 'No votes cast';

        contentHtml = `
          <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
            <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 0.4rem;">Election closed with <strong>${totalVotes} total votes</strong>.</p>
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.5rem;">
              ${contract.candidates.map(cand => {
                const votes = tallies[cand.name] || 0;
                return `
                  <div style="font-size: 0.8rem; display: flex; justify-content: space-between;">
                    <span>${cand.name}</span>
                    <strong>${votes} vote${votes !== 1 ? 's' : ''}</strong>
                  </div>
                `;
              }).join('')}
            </div>
            <div style="padding: 0.5rem 0.75rem; background: rgba(0, 245, 212, 0.05); border: 1px solid rgba(0, 245, 212, 0.2); font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem; color: var(--color-secondary);">
              <i class="fa-solid fa-trophy" style="color: var(--color-warning);"></i>
              <span>Winner: <strong>${winnerText}</strong></span>
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700;">${contract.title}</h3>
            <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-secondary);">${address}</span>
          </div>
          <div>${statusHtml}</div>
        </div>
        <p style="font-size: 0.82rem; color: var(--color-text-muted);">${contract.description}</p>
        ${contentHtml}
      `;

      // Event listeners for Approve/Reject buttons
      card.querySelectorAll('.btn-approve-candidate-app').forEach(btn => {
        btn.addEventListener('click', () => {
          const candidateAddr = btn.getAttribute('data-candidate')!;
          this.processCandidacyApplication(address, candidateAddr, true, btn as HTMLButtonElement);
        });
      });

      card.querySelectorAll('.btn-reject-candidate-app').forEach(btn => {
        btn.addEventListener('click', () => {
          const candidateAddr = btn.getAttribute('data-candidate')!;
          this.processCandidacyApplication(address, candidateAddr, false, btn as HTMLButtonElement);
        });
      });

      // Event listener for Start Voting phase
      const startBtn = card.querySelector('.btn-start-voting-phase') as HTMLButtonElement;
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          // Duration is customized during creation, we use duration input value or default value from deploy form
          const durationVal = parseInt(this.durationInput.value) || 5;
          this.startElection(address, durationVal, startBtn);
        });
      }

      this.electionsList.appendChild(card);
    });
  }
}
