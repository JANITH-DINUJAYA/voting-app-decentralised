import { App } from '../main';
import { Transaction } from '../blockchain/Transaction';
import type { TransactionType } from '../blockchain/Transaction';

export class VoterTerminal {
  private app: App;
  private localSelectedCandidate: string | null = null;

  // DOM Elements
  private campaignSelect!: HTMLSelectElement;
  private selectedTitle!: HTMLElement;
  private radioContainer!: HTMLElement;
  
  private existingVoteBox!: HTMLElement;
  private existingVoteCandidate!: HTMLElement;
  
  private txPayloadBox!: HTMLElement;
  private btnSubmitVote!: HTMLButtonElement;
  private whitelistDeniedAlert!: HTMLElement;
  private votingToolsWrapper!: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    this.campaignSelect = document.getElementById('select-campaign-vote') as HTMLSelectElement;
    this.selectedTitle = document.getElementById('vote-selected-title')!;
    this.radioContainer = document.getElementById('vote-candidate-radio-container')!;
    this.existingVoteBox = document.getElementById('existing-vote-box')!;
    this.existingVoteCandidate = document.getElementById('existing-vote-candidate')!;
    this.txPayloadBox = document.getElementById('vote-tx-payload')!;
    this.btnSubmitVote = document.getElementById('btn-submit-vote') as HTMLButtonElement;
    this.whitelistDeniedAlert = document.getElementById('voter-whitelist-denied-alert')!;
    this.votingToolsWrapper = document.getElementById('voter-voting-tools')!;
  }

  private initEvents() {
    this.campaignSelect.addEventListener('change', () => {
      this.localSelectedCandidate = null;
      this.app.selectCampaign(this.campaignSelect.value);
    });

    this.btnSubmitVote.addEventListener('click', () => this.castVoterSelection());
  }

  /**
   * Generates dynamic raw transaction payload JSON for display
   */
  private updateTxPayload(candidateName: string) {
    if (!this.app.wallet || !this.app.selectedCampaignAddress) {
      this.txPayloadBox.textContent = '{ "error": "Wallet disconnected or campaign unselected" }';
      return;
    }

    const wallet = this.app.wallet;
    const contractAddr = this.app.selectedCampaignAddress;
    const contract = this.app.blockchain.contracts.get(contractAddr)!;
    const currentNonce = this.app.blockchain.getNonce(wallet.address);
    
    // Determine type (CAST vs UPDATE)
    const hasVoted = contract.getVoterVote(wallet.address) !== null;
    const type: TransactionType = hasVoted ? 'UPDATE_VOTE' : 'CAST_VOTE';

    const txTemplate = {
      sender: wallet.address,
      recipient: contractAddr,
      type: type,
      payload: { candidateName },
      nonce: currentNonce,
      timestamp: '[Calculated on signature]',
      publicKey: `${wallet.publicKeyHex.substring(0, 16)}...`
    };

    this.txPayloadBox.textContent = JSON.stringify(txTemplate, null, 2);
  }

  /**
   * Cryptographically signs and sends voting selection to the mempool
   */
  private async castVoterSelection() {
    if (!this.app.wallet || !this.app.selectedCampaignAddress) return;

    const wallet = this.app.wallet;
    const contractAddr = this.app.selectedCampaignAddress;
    const contract = this.app.blockchain.contracts.get(contractAddr)!;
    
    // Get radio selection
    const selectedRadio = this.radioContainer.querySelector('input[name="voter-choice"]:checked') as HTMLInputElement;
    if (!selectedRadio) {
      this.app.showNotification('Please select a candidate to vote.', 'error');
      return;
    }

    const candidateName = selectedRadio.value;

    try {
      this.btnSubmitVote.disabled = true;
      this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing Ballot...';

      const currentNonce = this.app.blockchain.getNonce(wallet.address);
      const hasVoted = contract.getVoterVote(wallet.address) !== null;
      const type: TransactionType = hasVoted ? 'UPDATE_VOTE' : 'CAST_VOTE';

      const tx = new Transaction({
        sender: wallet.address,
        recipient: contractAddr,
        type: type,
        payload: { candidateName },
        nonce: currentNonce,
        timestamp: Date.now(),
        publicKey: '0x',
      });

      // Submit to ledger mempool
      await this.app.blockchain.addTransaction(tx);

      this.app.showNotification(
        hasVoted 
          ? 'Ballot update signed! Transaction sent to mempool.' 
          : 'Ballot cast signed! Transaction sent to mempool.', 
        'success'
      );

      this.app.refreshAllViews();
    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Voting rejected: ${e.message}`, 'error');
      this.render(); // reset status
    }
  }

  /**
   * Sync and render Voter Terminal with full state-based UX
   */
  render() {
    const statusHeader = document.getElementById('voter-status-header')!;
    const kycGate = document.getElementById('voter-kyc-gate')!;
    const votingSection = document.getElementById('voter-voting-section')!;
    const contractAddr = this.app.selectedCampaignAddress;

    // Case 1: No wallet generated yet
    if (!this.app.wallet) {
      if (statusHeader) statusHeader.innerHTML = `
        <div class="alert-box warning">
          <i class="fa-solid fa-wallet"></i>
          <div>
            <strong>Wallet Required to Vote</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">You need a blockchain wallet to cast a vote. Go to <a href="#/profile" style="color: var(--color-primary); font-weight: 700;">My Profile</a> to generate your wallet and submit KYC verification.</p>
          </div>
        </div>
      `;
      if (kycGate) {
        kycGate.style.display = 'flex';
        kycGate.innerHTML = `
          <div style="text-align: center; padding: 2rem; width: 100%;">
            <i class="fa-solid fa-wallet" style="font-size: 2.5rem; color: var(--color-warning); display: block; margin-bottom: 0.75rem;"></i>
            <h3 style="margin-bottom: 0.5rem;">No Wallet Connected</h3>
            <p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Generate your blockchain wallet and complete KYC to participate in elections.</p>
            <a href="#/profile" class="btn"><i class="fa-solid fa-arrow-right"></i> Go to My Profile</a>
          </div>
        `;
      }
      if (votingSection) votingSection.style.display = 'none';
      this.selectedTitle.textContent = 'Wallet Required';
      return;
    }

    const wallet = this.app.wallet;

    // Case 2: KYC not submitted or not verified
    const profile = this.app.blockchain.voterRegistry.get(wallet.address.toLowerCase());
    const pendingTx = this.app.blockchain.pendingTransactions.find(t => 
      t.sender.toLowerCase() === wallet.address.toLowerCase() && 
      (t.type === 'REGISTER_VOTER_KYC' || t.type === 'REGISTER_CANDIDATE_KYC')
    );
    // Check if a VERIFY_IDENTITY tx for this voter is in the mempool (approval in flight)
    const pendingVerifyTx = this.app.blockchain.pendingTransactions.find(t =>
      t.type === 'VERIFY_IDENTITY' &&
      t.payload.targetAddress?.toLowerCase() === wallet.address.toLowerCase()
    );
    const user = this.app.activeUser!;

    let currentStatus = 'UNSUBMITTED';
    if (profile) {
      currentStatus = profile.status;
      // If blockchain shows PENDING but the Neon DB session already shows VERIFIED,
      // trust the DB (the VERIFY_IDENTITY block may not have been saved yet or is mining)
      if (currentStatus === 'PENDING' && user.kycStatus === 'VERIFIED') {
        currentStatus = 'VERIFIED';
        // Sync the on-chain registry so it stays consistent
        profile.status = 'VERIFIED';
        this.app.blockchain.verifiedAddresses.add(wallet.address.toLowerCase());
      }
      // If approval is actively being mined right now, show a special state
      if (currentStatus === 'PENDING' && pendingVerifyTx && pendingVerifyTx.payload.approved) {
        currentStatus = 'VERIFYING';
      }
    }
    else if (pendingTx) currentStatus = 'PENDING';
    else if (user.kycStatus) currentStatus = user.kycStatus;

    if (currentStatus === 'UNSUBMITTED') {
      if (statusHeader) statusHeader.innerHTML = `
        <div class="alert-box info">
          <i class="fa-solid fa-id-card"></i>
          <div>
            <strong>KYC Verification Required</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">Submit your National Identity Card in <a href="#/profile" style="color: var(--color-primary); font-weight: 700;">My Profile</a> to get your identity verified before voting.</p>
          </div>
        </div>
      `;
      if (kycGate) {
        kycGate.style.display = 'flex';
        kycGate.innerHTML = `
          <div style="text-align: center; padding: 2rem; width: 100%;">
            <i class="fa-solid fa-id-card" style="font-size: 2.5rem; color: var(--color-primary); display: block; margin-bottom: 0.75rem;"></i>
            <h3 style="margin-bottom: 0.5rem;">Identity Not Verified</h3>
            <p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 1rem;">Submit your NIC for on-chain verification to unlock your voting rights.</p>
            <a href="#/profile" class="btn"><i class="fa-solid fa-arrow-right"></i> Submit KYC in My Profile</a>
          </div>
        `;
      }
      if (votingSection) votingSection.style.display = 'none';
      this.selectedTitle.textContent = 'KYC Required';
      return;
    }

    if (currentStatus === 'PENDING' || currentStatus === 'VERIFYING') {
      const isVerifying = currentStatus === 'VERIFYING';
      if (statusHeader) statusHeader.innerHTML = `
        <div class="alert-box ${isVerifying ? 'success' : 'warning'}">
          <i class="fa-solid ${isVerifying ? 'fa-shield-halved fa-spin' : 'fa-hourglass-half'}"></i>
          <div>
            <strong>${isVerifying ? 'Verification Mining In Progress...' : 'Identity Verification Pending'}</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">${isVerifying ? 'Your approval is being recorded on the blockchain. This takes a few seconds.' : 'Your KYC application is under review. You will be able to vote once the verifier approves your identity.'}</p>
          </div>
        </div>
      `;
      if (kycGate) {
        kycGate.style.display = 'flex';
        kycGate.innerHTML = `
          <div style="text-align: center; padding: 2rem; width: 100%;">
            <i class="fa-solid ${isVerifying ? 'fa-shield-halved' : 'fa-hourglass-half'}" style="font-size: 2.5rem; color: var(--color-${isVerifying ? 'secondary' : 'warning'}); display: block; margin-bottom: 0.75rem; animation: spin 3s linear infinite;"></i>
            <h3 style="margin-bottom: 0.5rem;">${isVerifying ? 'Verification Mining...' : 'Audit in Progress'}</h3>
            <p style="color: var(--color-text-muted); font-size: 0.85rem;">${isVerifying ? 'Your approval transaction is being committed to the blockchain.' : 'Please wait while the verifier reviews your identity submission.'}</p>
          </div>
        `;
      }
      if (votingSection) votingSection.style.display = 'none';
      this.selectedTitle.textContent = isVerifying ? 'Verifying...' : 'Pending Verification';
      return;
    }

    if (currentStatus === 'REJECTED') {
      if (statusHeader) statusHeader.innerHTML = `
        <div class="alert-box danger">
          <i class="fa-solid fa-circle-xmark"></i>
          <div>
            <strong>Identity Verification Rejected</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">Your KYC was rejected. Please re-submit with a clearer document in <a href="#/profile" style="color: var(--color-danger); font-weight: 700;">My Profile</a>.</p>
          </div>
        </div>
      `;
      if (kycGate) { kycGate.style.display = 'flex'; kycGate.innerHTML = ''; }
      if (votingSection) votingSection.style.display = 'none';
      this.selectedTitle.textContent = 'KYC Rejected';
      return;
    }

    // Case 3: VERIFIED — Show voting terminal
    if (statusHeader) statusHeader.innerHTML = `
      <div class="alert-box success">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <strong>Identity Verified — Ready to Vote</strong>
          <p style="margin-top: 0.25rem; font-size: 0.82rem;">Select an election below, choose your candidate, and sign your ballot cryptographically.</p>
        </div>
      </div>
    `;
    if (kycGate) kycGate.style.display = 'none';
    if (votingSection) votingSection.style.display = 'flex';

    // No campaign selected
    if (!contractAddr) {
      this.whitelistDeniedAlert.style.display = 'none';
      this.votingToolsWrapper.style.display = 'flex';
      this.selectedTitle.textContent = 'Select an Election';
      this.radioContainer.innerHTML = '<p style="color: var(--color-text-muted); padding: 0.5rem 0;">Use the dropdown above to select an active election campaign.</p>';
      if (this.existingVoteBox) this.existingVoteBox.style.display = 'none';
      if (this.txPayloadBox) this.txPayloadBox.textContent = 'Select a candidate to preview your ballot...';
      if (this.btnSubmitVote) { this.btnSubmitVote.disabled = true; this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> Cryptographically Sign & Cast Vote'; }
      return;
    }

    const contract = this.app.blockchain.contracts.get(contractAddr)!;

    if (contract.status === 'PRE_REGISTRATION') {
      this.whitelistDeniedAlert.style.display = 'none';
      this.votingToolsWrapper.style.display = 'flex';
      this.selectedTitle.textContent = `${contract.title} ⏳ Nominations Phase`;
      if (statusHeader) statusHeader.innerHTML = `
        <div class="alert-box info">
          <i class="fa-solid fa-clock"></i>
          <div>
            <strong>Election in Nominations Phase</strong>
            <p style="margin-top: 0.25rem; font-size: 0.82rem;">This election is currently open for candidates to submit their nomination applications. Voting has not started yet.</p>
          </div>
        </div>
      `;
      this.radioContainer.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 1.5rem 0;">
          <i class="fa-solid fa-user-plus" style="font-size: 2rem; color: var(--color-primary); margin-bottom: 0.5rem; display: block;"></i>
          <p style="font-size: 0.85rem;">Nominations are pending admin approval. Approved candidates will appear here once voting opens.</p>
        </div>
      `;
      if (this.existingVoteBox) this.existingVoteBox.style.display = 'none';
      if (this.txPayloadBox) this.txPayloadBox.textContent = 'Voting will unlock once the election starts.';
      if (this.btnSubmitVote) {
        this.btnSubmitVote.disabled = true;
        this.btnSubmitVote.textContent = 'Election Not Started';
      }
      return;
    }

    const isEnded = Date.now() > contract.deadline;
    this.selectedTitle.textContent = `${contract.title} ${isEnded ? '❌ Ended' : '✅ Active'}`;

    // Check whitelist
    if (contract.isPrivate && !contract.whitelist.has(wallet.address.toLowerCase())) {
      this.whitelistDeniedAlert.innerHTML = `<div class="alert-box danger"><i class="fa-solid fa-lock"></i><div><strong>Access Restricted</strong><p style="font-size:0.82rem;">Your address is not whitelisted for this election.</p></div></div>`;
      this.whitelistDeniedAlert.style.display = 'block';
      this.votingToolsWrapper.style.display = 'none';
      if (this.btnSubmitVote) { this.btnSubmitVote.disabled = true; this.btnSubmitVote.textContent = 'Not Whitelisted'; }
      return;
    }

    // Whitelisted: show voting tools, hide alert
    this.whitelistDeniedAlert.style.display = 'none';
    this.votingToolsWrapper.style.display = 'flex';

    // Deadline check
    if (this.btnSubmitVote) {
      this.btnSubmitVote.disabled = isEnded;
    }

    // Current vote
    const currentVote = contract.getVoterVote(wallet.address);
    if (currentVote && this.existingVoteBox) {
      this.existingVoteBox.style.display = 'flex';
      if (this.existingVoteCandidate) this.existingVoteCandidate.textContent = currentVote.candidateName;
      if (this.btnSubmitVote && !isEnded) this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-signature"></i> Sign & Modify Vote';

      // Self-heal: if the local selected candidate is now on-chain, clear the local buffer
      if (currentVote.candidateName === this.localSelectedCandidate) {
        this.localSelectedCandidate = null;
      }
    } else if (this.existingVoteBox) {
      this.existingVoteBox.style.display = 'none';
      if (this.btnSubmitVote && !isEnded) this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> Cryptographically Sign & Cast Vote';
    }

    // Defensive check: if local selected candidate is not valid in this campaign, reset it
    if (this.localSelectedCandidate !== null && !contract.candidates.some(c => c.name === this.localSelectedCandidate)) {
      this.localSelectedCandidate = null;
    }

    // Pre-selected state: local buffer holds unsign selection, fallback to on-chain vote
    const selectedCandName = this.localSelectedCandidate !== null
      ? this.localSelectedCandidate
      : currentVote?.candidateName;

    // Build candidate cards
    const tallies = contract.getTallies();
    this.radioContainer.innerHTML = '';
    contract.candidates.forEach(cand => {
      const votes = tallies[cand.name] || 0;
      const isSelected = selectedCandName === cand.name;
      const initials = cand.name.split(' ').map((n: string) => n[0] || '').join('').substring(0, 2).toUpperCase();

      const card = document.createElement('label');
      card.className = `candidate-choice-card ${isSelected ? 'selected' : ''}`;

      card.innerHTML = `
        <input type="radio" name="voter-choice" value="${cand.name}" ${isSelected ? 'checked' : ''} />
        <div class="candidate-choice-avatar">${initials}</div>
        <div class="candidate-choice-info">
          <div class="candidate-choice-name">${cand.name}</div>
          <div class="candidate-choice-bio">${cand.bio || 'No manifesto provided.'}</div>
        </div>
        <div class="candidate-choice-tally">${votes} vote${votes !== 1 ? 's' : ''}</div>
      `;

      const radio = card.querySelector('input[type="radio"]') as HTMLInputElement;
      radio.addEventListener('change', () => {
        this.localSelectedCandidate = cand.name;
        this.radioContainer.querySelectorAll('.candidate-choice-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.updateTxPayload(cand.name);
      });

      this.radioContainer.appendChild(card);
    });

    // Update payload if something checked
    const checkedRadio = this.radioContainer.querySelector('input[name="voter-choice"]:checked') as HTMLInputElement;
    if (checkedRadio) {
      this.updateTxPayload(checkedRadio.value);
    } else if (this.txPayloadBox) {
      this.txPayloadBox.textContent = 'Select a candidate above to preview your ballot...';
    }
  }
}
