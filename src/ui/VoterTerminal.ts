import { App } from '../main';
import { Transaction } from '../blockchain/Transaction';
import type { TransactionType } from '../blockchain/Transaction';

export class VoterTerminal {
  private app: App;

  // DOM Elements
  private campaignSelect!: HTMLSelectElement;
  private selectedTitle!: HTMLElement;
  private radioContainer!: HTMLElement;
  
  private existingVoteBox!: HTMLElement;
  private existingVoteCandidate!: HTMLElement;
  
  private txPayloadBox!: HTMLElement;
  private btnSubmitVote!: HTMLButtonElement;

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
  }

  private initEvents() {
    this.campaignSelect.addEventListener('change', () => {
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
        publicKey: wallet.publicKeyHex,
      });

      // Sign transaction
      await tx.signTransaction(wallet);

      // Submit to ledger mempool
      await this.app.blockchain.addTransaction(tx);

      this.app.showNotification(
        hasVoted 
          ? 'Ballot update signed! Transaction sent to mempool.' 
          : 'Ballot cast signed! Transaction sent to mempool.', 
        'success'
      );

      this.app.refreshAllViews();
      
      // Auto redirect to Block Explorer to mine
      this.app.router.navigate('#/explorer');

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Voting rejected: ${e.message}`, 'error');
      this.render(); // reset status
    }
  }

  /**
   * Sync and render Voter Terminal
   */
  render() {
    const contractAddr = this.app.selectedCampaignAddress;
    
    if (!contractAddr) {
      this.selectedTitle.textContent = 'No Election Selected';
      this.radioContainer.innerHTML = '<p style="color: var(--color-text-muted);">Please select a campaign using the dropdown.</p>';
      this.existingVoteBox.style.display = 'none';
      this.txPayloadBox.textContent = 'Select candidate to generate payload...';
      this.btnSubmitVote.disabled = true;
      this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> Cryptographically Sign & Cast Vote';
      return;
    }

    const contract = this.app.blockchain.contracts.get(contractAddr)!;
    const isEnded = Date.now() > contract.deadline;
    this.selectedTitle.textContent = `${contract.title} ${isEnded ? '❌ Ended' : '✅ Active'}`;

    // Wallet checks
    if (!this.app.wallet) {
      this.radioContainer.innerHTML = '<p style="color: var(--color-danger);"><i class="fa-solid fa-wallet"></i> Wallet not generated. Access the "Connect Wallet" page to get started.</p>';
      this.existingVoteBox.style.display = 'none';
      this.btnSubmitVote.disabled = true;
      this.btnSubmitVote.textContent = 'Wallet Disconnected';
      return;
    }

    const wallet = this.app.wallet;
    
    // Check if voter registered and verified in KYC registry
    const profile = this.app.blockchain.voterRegistry.get(wallet.address.toLowerCase());
    const isVerified = profile ? profile.status === 'VERIFIED' : false;
    if (!isVerified) {
      this.radioContainer.innerHTML = '<p style="color: var(--color-danger);"><i class="fa-solid fa-circle-exclamation"></i> KYC Verification required. Please register your profile and wait for verifier approval.</p>';
      this.existingVoteBox.style.display = 'none';
      this.btnSubmitVote.disabled = true;
      this.btnSubmitVote.textContent = 'Verification Required';
      return;
    }

    // Check if private and not whitelisted
    if (contract.isPrivate && !contract.whitelist.has(wallet.address.toLowerCase())) {
      this.radioContainer.innerHTML = `<p style="color: var(--color-danger);"><i class="fa-solid fa-lock"></i> Restricted. Your address is not whitelisted for this election campaign.</p>`;
      this.existingVoteBox.style.display = 'none';
      this.btnSubmitVote.disabled = true;
      this.btnSubmitVote.textContent = 'Not Whitelisted';
      return;
    }

    // Check if deadline passed
    if (isEnded) {
      this.btnSubmitVote.disabled = true;
      this.btnSubmitVote.textContent = 'Election Deadline Passed';
    } else {
      this.btnSubmitVote.disabled = false;
    }

    // Read current selection of this voter from contract state
    const currentVote = contract.getVoterVote(wallet.address);
    if (currentVote) {
      this.existingVoteBox.style.display = 'block';
      this.existingVoteCandidate.textContent = currentVote.candidateName;
      this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-signature"></i> Cryptographically Sign & Modify Vote';
    } else {
      this.existingVoteBox.style.display = 'none';
      this.btnSubmitVote.innerHTML = '<i class="fa-solid fa-pen-fancy"></i> Cryptographically Sign & Cast Vote';
    }

    // Populate radio items
    this.radioContainer.innerHTML = '';
    contract.candidates.forEach(cand => {
      const wrapper = document.createElement('label');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '0.75rem';
      wrapper.style.background = 'var(--bg-card)';
      wrapper.style.padding = '0.75rem 1rem';
      wrapper.style.borderRadius = '8px';
      wrapper.style.cursor = 'pointer';
      wrapper.style.border = '1px solid var(--border-color)';
      wrapper.style.transition = 'var(--transition-smooth)';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'voter-choice';
      radio.value = cand.name;
      radio.style.accentColor = 'var(--color-primary)';
      
      // Auto-check if matches current choice
      if (currentVote && currentVote.candidateName === cand.name) {
        radio.checked = true;
        wrapper.style.borderColor = 'var(--color-secondary)';
        wrapper.style.boxShadow = '0 0 8px rgba(0, 245, 212, 0.15)';
      }

      // Add radio changes trigger
      radio.addEventListener('change', () => {
        // Reset borders
        this.radioContainer.querySelectorAll('label').forEach(lbl => {
          lbl.style.borderColor = 'var(--border-color)';
          lbl.style.boxShadow = 'none';
        });
        wrapper.style.borderColor = 'var(--color-primary)';
        wrapper.style.boxShadow = '0 0 8px rgba(157, 78, 221, 0.15)';
        
        this.updateTxPayload(cand.name);
      });

      wrapper.appendChild(radio);
      wrapper.appendChild(document.createTextNode(cand.name));
      this.radioContainer.appendChild(wrapper);
    });

    // Update payload text initially if something checked
    const checkedRadio = this.radioContainer.querySelector('input[name="voter-choice"]:checked') as HTMLInputElement;
    if (checkedRadio) {
      this.updateTxPayload(checkedRadio.value);
    } else {
      this.txPayloadBox.textContent = 'Select candidate to generate payload...';
    }
  }
}
