import { App } from '../main';
import { Block } from '../blockchain/Block';

export class Explorer {
  private app: App;
  private selectedBlockIndex: number | null = null;
  public isMining: boolean = false;

  // DOM Elements — matched exactly to index.html IDs
  private mempoolBanner!: HTMLElement;
  private mempoolCount!: HTMLElement;
  private btnMineBlock!: HTMLButtonElement | null;

  private blocksFlowContainer!: HTMLElement;

  private blockDetailContainer!: HTMLElement;
  private detailIndex!: HTMLElement;
  private detailBadge!: HTMLElement;
  private detailHash!: HTMLInputElement;
  private detailPrevHash!: HTMLInputElement;
  private detailNonce!: HTMLElement;
  private detailTime!: HTMLElement;
  private detailTxCount!: HTMLElement;
  private detailTransactionsList!: HTMLElement;

  // Mining Modal Elements
  private miningModal!: HTMLElement;
  private miningNonce!: HTMLElement;
  private miningHash!: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    this.mempoolBanner      = document.getElementById('mempool-banner-widget')!;
    this.mempoolCount       = document.getElementById('mempool-tx-count')!;
    // btn-mine-block is now just informational — auto-mining handles everything
    this.btnMineBlock       = document.getElementById('btn-mine-block') as HTMLButtonElement | null;

    // Correct IDs from index.html
    this.blocksFlowContainer    = document.getElementById('blocks-visual-flow')!;
    this.blockDetailContainer   = document.getElementById('explorer-block-detail')!;
    this.detailIndex            = document.getElementById('detail-block-index')!;
    this.detailBadge            = document.getElementById('detail-block-badge')!;
    this.detailHash             = document.getElementById('detail-block-hash') as HTMLInputElement;
    this.detailPrevHash         = document.getElementById('detail-block-prev-hash') as HTMLInputElement;
    this.detailNonce            = document.getElementById('detail-block-nonce')!;
    this.detailTime             = document.getElementById('detail-block-time')!;
    this.detailTxCount          = document.getElementById('detail-block-tx-count')!;
    this.detailTransactionsList = document.getElementById('detail-block-transactions')!;

    this.miningModal  = document.getElementById('mining-modal')!;
    this.miningNonce  = document.getElementById('mining-status-nonce')!;
    this.miningHash   = document.getElementById('mining-status-hash')!;
  }

  private initEvents() {
    // "Mine Block" button is hidden in the mempool banner for admin-only use
    // All mining is done automatically — this button is kept as a manual override for admin
    if (this.btnMineBlock) {
      this.btnMineBlock.addEventListener('click', () => this.triggerManualMine());
    }
  }

  /**
   * Manual override mine (admin only). Shows the mining overlay for transparency.
   */
  private async triggerManualMine() {
    if (!this.miningModal) return;
    const miner = this.app.wallet ? this.app.wallet.address : '0x0000000000000000000000000000000000000000';

    try {
      if (this.btnMineBlock) this.btnMineBlock.disabled = true;
      this.miningModal.classList.add('active');
      if (this.miningNonce) this.miningNonce.textContent = 'Nonce: 0';
      if (this.miningHash)  this.miningHash.textContent  = 'Searching hash...';

      const minedBlock = await this.app.blockchain.minePendingTransactions(
        miner,
        (_currentHash: string, _currentNonce: number) => {
          if (this.miningNonce) this.miningNonce.textContent = `Hash Nonce: ${_currentNonce}`;
          if (this.miningHash)  this.miningHash.textContent  = _currentHash;
        }
      );

      this.app.showNotification(`Block #${minedBlock.index} successfully mined and committed to the chain!`, 'success');
      this.selectedBlockIndex = minedBlock.index;
      await this.app.refreshAllViews();

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Mining failed: ${e.message}`, 'error');
    } finally {
      if (this.miningModal) this.miningModal.classList.remove('active');
      if (this.btnMineBlock) this.btnMineBlock.disabled = false;
    }
  }

  /**
   * Displays full metadata of a clicked block card
   */
  private renderBlockDetails(block: Block, isValid: boolean) {
    if (!this.detailIndex) return;

    this.detailIndex.textContent     = block.index.toString();
    this.detailHash.value            = block.hash;
    this.detailPrevHash.value        = block.previousHash;
    this.detailNonce.textContent     = block.nonce.toString();
    this.detailTime.textContent      = new Date(block.timestamp).toLocaleString();
    this.detailTxCount.textContent   = block.transactions.length.toString();

    if (isValid) {
      this.detailBadge.className   = 'block-status valid';
      this.detailBadge.textContent = 'Valid Ledger Block';
    } else {
      this.detailBadge.className   = 'block-status invalid';
      this.detailBadge.textContent = 'Tampered Block!';
    }

    // Populate transaction list
    this.detailTransactionsList.innerHTML = '';

    if (block.transactions.length === 0) {
      this.detailTransactionsList.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem;">No transactions recorded in this block.</p>';
      this.blockDetailContainer.style.display = 'flex';
      return;
    }

    block.transactions.forEach(tx => {
      const item = document.createElement('div');
      item.className = 'tx-item';

      let txTitle: string = tx.type;
      let iconClass = 'fa-solid fa-receipt';
      let deployClass = '';

      switch (tx.type) {
        case 'CLAIM_FAUCET':
          txTitle   = 'Genesis — Network Initialized';
          iconClass = 'fa-solid fa-circle-nodes';
          break;
        case 'DEPLOY_ELECTION':
          txTitle     = `Deploy Election Contract: "${tx.payload.title}"`;
          iconClass   = 'fa-solid fa-file-contract';
          deployClass = 'deploy';
          break;
        case 'REGISTER_VOTER_KYC':
          txTitle   = `Register Voter KYC: ${tx.payload.name || ''}`;
          iconClass = 'fa-solid fa-user-plus';
          break;
        case 'REGISTER_CANDIDATE_KYC':
          txTitle   = `Register Candidate KYC: ${tx.payload.name || ''}`;
          iconClass = 'fa-solid fa-user-tag';
          break;
        case 'VERIFY_IDENTITY':
          txTitle   = tx.payload.approved
            ? `Identity Verified ✓: ${tx.payload.targetAddress?.substring(0, 14)}...`
            : `Identity Rejected ✗: ${tx.payload.targetAddress?.substring(0, 14)}...`;
          iconClass = tx.payload.approved ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';
          break;
        case 'APPLY_CANDIDACY':
          txTitle   = `Candidacy Nomination: ${tx.payload.name || ''}`;
          iconClass = 'fa-solid fa-square-plus';
          break;
        case 'APPROVE_CANDIDACY':
          txTitle   = tx.payload.approved
            ? `Candidacy Approved: ${tx.payload.candidateAddress?.substring(0, 14)}...`
            : `Candidacy Rejected: ${tx.payload.candidateAddress?.substring(0, 14)}...`;
          iconClass = 'fa-solid fa-clipboard-check';
          break;
        case 'START_ELECTION':
          txTitle   = 'Election Voting Phase Started';
          iconClass = 'fa-solid fa-play-circle';
          break;
        case 'CAST_VOTE':
          txTitle   = `Vote Cast → ${tx.payload.candidateName}`;
          iconClass = 'fa-solid fa-vote-yea';
          break;
        case 'UPDATE_VOTE':
          txTitle   = `Vote Changed → ${tx.payload.candidateName}`;
          iconClass = 'fa-solid fa-pen-nib';
          break;
        case 'REGISTER_VOTER':
          txTitle   = 'Whitelist Voter Address';
          iconClass = 'fa-solid fa-list-check';
          break;
      }

      item.innerHTML = `
        <div class="tx-icon ${deployClass}"><i class="${iconClass}"></i></div>
        <div class="tx-body">
          <span class="tx-title">${txTitle}</span>
          <span class="tx-addresses" title="Sender: ${tx.sender}">From: ${tx.sender.substring(0, 15)}... &bull; Nonce: ${tx.nonce}</span>
        </div>
        <div class="tx-meta">
          <span class="tx-badge">${tx.type}</span>
          <span class="tx-time">${new Date(tx.timestamp).toLocaleTimeString()}</span>
        </div>
      `;
      this.detailTransactionsList.appendChild(item);
    });

    this.blockDetailContainer.style.display = 'flex';
  }

  /**
   * Render Block Explorer — block cards + detail pane
   */
  async render() {
    if (!this.blocksFlowContainer) return;

    // 1. Mempool banner — admin only
    const pendingCount = this.app.blockchain.pendingTransactions.length;
    const isAdmin      = this.app.activeUser?.role === 'ADMIN';

    if (pendingCount > 0 && isAdmin && this.mempoolBanner) {
      if (this.mempoolCount) this.mempoolCount.textContent = pendingCount.toString();
      this.mempoolBanner.style.display = 'flex';
    } else if (this.mempoolBanner) {
      this.mempoolBanner.style.display = 'none';
    }

    // 2. Build horizontal block chain flow
    this.blocksFlowContainer.innerHTML = '';

    const auditReport  = await this.app.blockchain.checkLedgerValidity();
    const brokenIndex  = auditReport.errorBlockIndex;

    this.app.blockchain.chain.forEach((block, index) => {
      // Link arrow between consecutive blocks
      if (index > 0) {
        const arrow = document.createElement('div');
        arrow.className   = 'block-link-arrow';
        arrow.innerHTML   = '<i class="fa-solid fa-angles-right"></i>';
        this.blocksFlowContainer.appendChild(arrow);
      }

      const isBlockValid = brokenIndex === null || index < brokenIndex;

      const card = document.createElement('div');
      card.className = `block-card${isBlockValid ? '' : ' tampered'}`;

      const truncHash = `${block.hash.substring(0, 10)}...${block.hash.slice(-4)}`;
      const truncPrev = index === 0 ? '0×000...0' : `${block.previousHash.substring(0, 10)}...`;

      card.innerHTML = `
        <div class="block-header">
          <span class="block-number">Block #${block.index}</span>
          <span class="block-status ${isBlockValid ? 'valid' : 'invalid'}">
            ${isBlockValid ? 'Valid' : 'Tampered!'}
          </span>
        </div>
        <div class="block-hash-row">
          <span class="hash-label">Block Hash</span>
          <span class="hash-value">${truncHash}</span>
        </div>
        <div class="block-hash-row">
          <span class="hash-label">Previous Hash</span>
          <span class="hash-value secondary">${truncPrev}</span>
        </div>
        <div class="block-meta">
          <span class="block-tx-count"><i class="fa-solid fa-receipt"></i> ${block.transactions.length} Tx${block.transactions.length !== 1 ? 's' : ''}</span>
          <span>Nonce: ${block.nonce}</span>
        </div>
        <div class="block-mined-at" style="font-size:0.65rem; color: var(--color-text-muted); margin-top: 0.25rem; font-family: var(--font-mono);">
          ${new Date(block.timestamp).toLocaleString()}
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedBlockIndex = block.index;
        this.renderBlockDetails(block, isBlockValid);

        // Highlight selected card
        this.blocksFlowContainer.querySelectorAll('.block-card').forEach(c => {
          (c as HTMLElement).style.outline = 'none';
        });
        card.style.outline = '2px solid var(--color-primary)';
      });

      this.blocksFlowContainer.appendChild(card);

      // Auto-restore selected block highlight
      if (this.selectedBlockIndex === block.index) {
        this.renderBlockDetails(block, isBlockValid);
        card.style.outline = '2px solid var(--color-primary)';
      }
    });

    // 3. Default: render latest block details on first open
    if (this.selectedBlockIndex === null && this.app.blockchain.chain.length > 0) {
      const latest = this.app.blockchain.getLatestBlock();
      this.selectedBlockIndex = latest.index;
      this.renderBlockDetails(latest, brokenIndex === null);

      const cards = this.blocksFlowContainer.querySelectorAll('.block-card');
      if (cards.length > 0) {
        (cards[cards.length - 1] as HTMLElement).style.outline = '2px solid var(--color-primary)';
      }
    }
  }
}
