import { App } from '../main';
import { Block } from '../blockchain/Block';

export class Explorer {
  private app: App;
  private selectedBlockIndex: number | null = null;

  // DOM Elements
  private mempoolBanner!: HTMLElement;
  private mempoolCount!: HTMLElement;
  private btnMineBlock!: HTMLButtonElement;
  
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
    this.mempoolBanner = document.getElementById('mempool-banner-widget')!;
    this.mempoolCount = document.getElementById('mempool-tx-count')!;
    this.btnMineBlock = document.getElementById('btn-mine-block') as HTMLButtonElement;
    
    this.blocksFlowContainer = document.getElementById('blocks-visual-flow')!;
    
    this.blockDetailContainer = document.getElementById('explorer-block-detail')!;
    this.detailIndex = document.getElementById('detail-block-index')!;
    this.detailBadge = document.getElementById('detail-block-badge')!;
    this.detailHash = document.getElementById('detail-block-hash') as HTMLInputElement;
    this.detailPrevHash = document.getElementById('detail-block-prev-hash') as HTMLInputElement;
    this.detailNonce = document.getElementById('detail-block-nonce')!;
    this.detailTime = document.getElementById('detail-block-time')!;
    this.detailTxCount = document.getElementById('detail-block-tx-count')!;
    this.detailTransactionsList = document.getElementById('detail-block-transactions')!;
    
    this.miningModal = document.getElementById('mining-modal')!;
    this.miningNonce = document.getElementById('mining-status-nonce')!;
    this.miningHash = document.getElementById('mining-status-hash')!;
  }

  private initEvents() {
    this.btnMineBlock.addEventListener('click', () => this.mineMempoolTransactions());
  }

  /**
   * Triggers the Proof-of-Work miner and updates progress stats inside the overlay
   */
  private async mineMempoolTransactions() {
    // Determine miner address
    const miner = this.app.wallet ? this.app.wallet.address : '0x0000000000000000000000000000000000000000';
    
    try {
      this.btnMineBlock.disabled = true;
      this.miningModal.classList.add('active');
      
      this.miningNonce.textContent = 'Nonce: 0';
      this.miningHash.textContent = 'Searching hash...';

      // Perform asynchronous mining with progress updates
      const minedBlock = await this.app.blockchain.minePendingTransactions(
        miner,
        (currentHash, currentNonce) => {
          this.miningNonce.textContent = `Hash Nonce: ${currentNonce}`;
          this.miningHash.textContent = currentHash;
        }
      );

      this.app.showNotification(`Block #${minedBlock.index} successfully mined and appended to the chain!`, 'success');
      
      // Auto select the new block in explorer details
      this.selectedBlockIndex = minedBlock.index;
      
      // Refresh UI components
      await this.app.refreshAllViews();

    } catch (e: any) {
      console.error(e);
      this.app.showNotification(`Mining failed: ${e.message}`, 'error');
    } finally {
      this.miningModal.classList.remove('active');
      this.btnMineBlock.disabled = false;
    }
  }

  /**
   * Displays full metadata of a clicked block card
   */
  private renderBlockDetails(block: Block, isValid: boolean) {
    this.detailIndex.textContent = block.index.toString();
    this.detailHash.value = block.hash;
    this.detailPrevHash.value = block.previousHash;
    this.detailNonce.textContent = block.nonce.toString();
    this.detailTime.textContent = new Date(block.timestamp).toLocaleString();
    this.detailTxCount.textContent = block.transactions.length.toString();

    if (isValid) {
      this.detailBadge.className = 'block-status valid';
      this.detailBadge.textContent = 'Valid Ledger Block';
    } else {
      this.detailBadge.className = 'block-status invalid';
      this.detailBadge.textContent = 'Tampered Block!';
    }

    // Populate transaction list card details
    this.detailTransactionsList.innerHTML = '';
    
    if (block.transactions.length === 0) {
      this.detailTransactionsList.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem;">No transactions recorded.</p>';
    }

    block.transactions.forEach(tx => {
      const item = document.createElement('div');
      item.className = 'tx-item';

      let txTitle = '';
      let iconClass = 'fa-solid fa-receipt';
      let deployClass = '';

      switch (tx.type) {
        case 'CLAIM_FAUCET':
          txTitle = 'Faucet Verification Claim';
          iconClass = 'fa-solid fa-user-check';
          break;
        case 'DEPLOY_ELECTION':
          txTitle = `Deploy Election Contract: "${tx.payload.title}"`;
          iconClass = 'fa-solid fa-file-contract';
          deployClass = 'deploy';
          break;
        case 'REGISTER_VOTER':
          txTitle = `Register Voter Address`;
          iconClass = 'fa-solid fa-user-plus';
          break;
        case 'CAST_VOTE':
          txTitle = `Cast Vote Ballot for: ${tx.payload.candidateName}`;
          iconClass = 'fa-solid fa-vote-yea';
          break;
        case 'UPDATE_VOTE':
          txTitle = `Modify Vote Ballot to: ${tx.payload.candidateName}`;
          iconClass = 'fa-solid fa-pen-nib';
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
   * Render Block Explorer components
   */
  async render() {
    // 1. Sync Mempool banner
    const pendingCount = this.app.blockchain.pendingTransactions.length;
    if (pendingCount > 0) {
      this.mempoolCount.textContent = pendingCount.toString();
      this.mempoolBanner.style.display = 'flex';
    } else {
      this.mempoolBanner.style.display = 'none';
    }

    // 2. Render horizontal Block Chain flow
    this.blocksFlowContainer.innerHTML = '';
    
    const auditReport = await this.app.blockchain.checkLedgerValidity();
    const brokenIndex = auditReport.errorBlockIndex;

    this.app.blockchain.chain.forEach((block, index) => {
      // Add visual connector arrows (exclude index 0)
      if (index > 0) {
        const arrow = document.createElement('div');
        arrow.className = 'block-link-arrow';
        arrow.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
        this.blocksFlowContainer.appendChild(arrow);
      }

      const isBlockValid = brokenIndex === null || index < brokenIndex;

      const card = document.createElement('div');
      card.className = `block-card ${isBlockValid ? '' : 'tampered'}`;
      
      const truncatedHash = `${block.hash.substring(0, 10)}...${block.hash.slice(-4)}`;
      const truncatedPrev = index === 0 ? '0' : `${block.previousHash.substring(0, 10)}...`;

      card.innerHTML = `
        <div class="block-header">
          <span class="block-number">Block #${block.index}</span>
          <span class="block-status ${isBlockValid ? 'valid' : 'invalid'}">
            ${isBlockValid ? 'Valid' : 'Tampered!'}
          </span>
        </div>
        <div class="block-hash-row">
          <span class="hash-label">Hash:</span>
          <span class="hash-value">${truncatedHash}</span>
        </div>
        <div class="block-hash-row">
          <span class="hash-label">Prev Hash:</span>
          <span class="hash-value secondary">${truncatedPrev}</span>
        </div>
        <div class="block-meta">
          <span class="block-tx-count">${block.transactions.length} Txs</span>
          <span>Nonce: ${block.nonce}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedBlockIndex = block.index;
        this.renderBlockDetails(block, isBlockValid);
        
        // Highlight active clicked card border
        this.blocksFlowContainer.querySelectorAll('.block-card').forEach(c => (c as HTMLElement).style.outline = 'none');
        card.style.outline = '2px solid var(--color-primary)';
      });

      this.blocksFlowContainer.appendChild(card);
      
      // Auto-render details of currently selected block if match
      if (this.selectedBlockIndex === block.index) {
        this.renderBlockDetails(block, isBlockValid);
        card.style.outline = '2px solid var(--color-primary)';
      }
    });

    // Default: If details open but no block selected, default to latest
    if (this.selectedBlockIndex === null && this.app.blockchain.chain.length > 0) {
      const latestBlock = this.app.blockchain.getLatestBlock();
      this.selectedBlockIndex = latestBlock.index;
      this.renderBlockDetails(latestBlock, brokenIndex === null);
      
      // Highlight latest card
      const cards = this.blocksFlowContainer.querySelectorAll('.block-card');
      if (cards.length > 0) {
        (cards[cards.length - 1] as HTMLElement).style.outline = '2px solid var(--color-primary)';
      }
    }
  }
}
