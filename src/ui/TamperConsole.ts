import { App } from '../main';
import { Transaction } from '../blockchain/Transaction';
import { ElectionContract } from '../blockchain/SmartContract';

export class TamperConsole {
  private app: App;
  
  // Stores original transaction copies: blockIndex -> stringified transactions json
  private originalBlockTxs: Map<number, string> = new Map();

  // DOM Elements
  private blockSelect!: HTMLSelectElement;
  private editorArea!: HTMLElement;
  private blockIndexText!: HTMLElement;
  private txListContainer!: HTMLElement;
  private btnSaveTamper!: HTMLButtonElement;
  private btnRestoreTamper!: HTMLButtonElement;

  constructor(app: App) {
    this.app = app;
    this.initElements();
    this.initEvents();
  }

  private initElements() {
    this.blockSelect = document.getElementById('select-tamper-block') as HTMLSelectElement;
    this.editorArea = document.getElementById('tamper-editor-area')!;
    this.blockIndexText = document.getElementById('tamper-block-index')!;
    this.txListContainer = document.getElementById('tamper-transactions-list')!;
    this.btnSaveTamper = document.getElementById('btn-save-tamper') as HTMLButtonElement;
    this.btnRestoreTamper = document.getElementById('btn-restore-tamper') as HTMLButtonElement;
  }

  private initEvents() {
    this.blockSelect.addEventListener('change', () => this.handleBlockSelectChange());
    this.btnSaveTamper.addEventListener('click', () => this.executeBlockTampering());
    this.btnRestoreTamper.addEventListener('click', () => this.restoreOriginalBlockData());
  }

  /**
   * Populates the block dropdown list
   */
  init() {
    this.renderDropdown();
  }

  private renderDropdown() {
    const prevVal = this.blockSelect.value;
    this.blockSelect.innerHTML = '<option value="">-- Choose Block --</option>';
    
    // Allow editing any mined block (except genesis, to keep it simple, or including genesis for total freedom)
    this.app.blockchain.chain.forEach(block => {
      // Don't show block 0 (Genesis) as it has fixed values, let them edit blocks starting from #1
      if (block.index > 0) {
        const option = document.createElement('option');
        option.value = block.index.toString();
        option.textContent = `Block #${block.index} (${block.transactions.length} Txs)`;
        this.blockSelect.appendChild(option);
      }
    });

    if (prevVal && parseInt(prevVal) < this.app.blockchain.chain.length) {
      this.blockSelect.value = prevVal;
    }
  }

  /**
   * Triggers when user selects a block to view its transactions
   */
  private handleBlockSelectChange() {
    const blockIndexStr = this.blockSelect.value;
    
    if (!blockIndexStr) {
      this.editorArea.style.display = 'none';
      return;
    }

    const index = parseInt(blockIndexStr);
    const block = this.app.blockchain.chain[index];
    this.blockIndexText.textContent = block.index.toString();

    // Populate transaction input editors
    this.txListContainer.innerHTML = '';

    block.transactions.forEach((tx, txIdx) => {
      const card = document.createElement('div');
      card.className = 'tamper-tx-edit-card';

      // We only allow tampering with candidate name selection inside CAST_VOTE or UPDATE_VOTE txs
      // as it directly alters election counts. For other transactions, we can display read-only inputs or allow string alters.
      if (tx.type === 'CAST_VOTE' || tx.type === 'UPDATE_VOTE') {
        card.innerHTML = `
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary);">
            Tx #${txIdx}: ${tx.type} (Voter: ${tx.sender.substring(0, 10)}...)
          </div>
          <div class="form-group">
            <span class="tamper-input-label">Altered Candidate Selection</span>
            <input type="text" class="tamper-input tx-payload-candidate" 
                   data-tx-idx="${txIdx}" value="${tx.payload.candidateName}" />
          </div>
        `;
      } else if (tx.type === 'DEPLOY_ELECTION') {
        card.innerHTML = `
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary);">
            Tx #${txIdx}: DEPLOY_ELECTION (Admin: ${tx.sender.substring(0, 10)}...)
          </div>
          <div class="form-group">
            <span class="tamper-input-label">Altered Election Title</span>
            <input type="text" class="tamper-input tx-payload-title" 
                   data-tx-idx="${txIdx}" value="${tx.payload.title}" />
          </div>
        `;
      } else {
        // Fallback for CLAIM_FAUCET / REGISTER_VOTER
        card.innerHTML = `
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-text-muted);">
            Tx #${txIdx}: ${tx.type} (Sender: ${tx.sender.substring(0, 10)}...)
          </div>
          <p style="font-size: 0.8rem; color: var(--color-text-muted);">Payload details cannot be altered for system utility transactions.</p>
        `;
      }

      this.txListContainer.appendChild(card);
    });

    // Check if block was already tampered
    const hasOriginal = this.originalBlockTxs.has(block.index);
    this.btnRestoreTamper.style.display = hasOriginal ? 'inline-flex' : 'none';

    this.editorArea.style.display = 'flex';
  }

  /**
   * Modifies the values inside block transactions without re-signing or mining.
   * This breaks the block's SHA-256 hash validation!
   */
  private async executeBlockTampering() {
    const blockIndexStr = this.blockSelect.value;
    if (!blockIndexStr) return;

    const blockIndex = parseInt(blockIndexStr);
    const block = this.app.blockchain.chain[blockIndex];

    // Backup original data first (deep clone)
    if (!this.originalBlockTxs.has(blockIndex)) {
      const txsCopy = block.transactions.map(tx => new Transaction({
        sender: tx.sender,
        recipient: tx.recipient,
        type: tx.type,
        payload: JSON.parse(JSON.stringify(tx.payload)),
        nonce: tx.nonce,
        timestamp: tx.timestamp,
        publicKey: tx.publicKey,
        signature: tx.signature
      }));
      this.originalBlockTxs.set(blockIndex, JSON.stringify(txsCopy));
    }

    // Read input edits
    const nameInputs = this.txListContainer.querySelectorAll('.tx-payload-candidate') as NodeListOf<HTMLInputElement>;
    nameInputs.forEach(input => {
      const txIdx = parseInt(input.getAttribute('data-tx-idx')!);
      block.transactions[txIdx].payload.candidateName = input.value.trim();
    });

    const titleInputs = this.txListContainer.querySelectorAll('.tx-payload-title') as NodeListOf<HTMLInputElement>;
    titleInputs.forEach(input => {
      const txIdx = parseInt(input.getAttribute('data-tx-idx')!);
      block.transactions[txIdx].payload.title = input.value.trim();
    });

    try {
      this.app.showNotification('Block data altered successfully! Recalculating ledger state...', 'info');

      // Replay all transactions to rebuild contract states (this will throw consistency errors)
      await this.recalculateLedgerState();

      await this.app.refreshAllViews();
      this.handleBlockSelectChange(); // refresh buttons view

    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Restores block data back to original state
   */
  private async restoreOriginalBlockData() {
    const blockIndexStr = this.blockSelect.value;
    if (!blockIndexStr) return;

    const blockIndex = parseInt(blockIndexStr);
    const block = this.app.blockchain.chain[blockIndex];

    const originalJson = this.originalBlockTxs.get(blockIndex);
    if (!originalJson) return;

    // Restore transactions
    const rawTxs: any[] = JSON.parse(originalJson);
    block.transactions = rawTxs.map(t => new Transaction(t));

    this.originalBlockTxs.delete(blockIndex);

    this.app.showNotification('Block restored to original cryptographic state. Resynced ledger.', 'success');

    await this.recalculateLedgerState();
    await this.app.refreshAllViews();
    this.handleBlockSelectChange();
  }

  /**
   * Traverses chain to reprocess contract states from Block 0 transactions
   */
  private async recalculateLedgerState() {
    // Reset state maps
    this.app.blockchain.contracts.clear();
    this.app.blockchain.nonces.clear();
    this.app.blockchain.verifiedAddresses.clear();
    this.app.blockchain.nonces.set('0x0000000000000000000000000000000000000000', 0);

    // Replay transactions directly to rebuild contracts state
    for (const block of this.app.blockchain.chain) {
      for (const tx of block.transactions) {
        const sender = tx.sender.toLowerCase();
        
        // Nonce sync
        const currentNonce = this.app.blockchain.getNonce(sender);
        this.app.blockchain.nonces.set(sender, currentNonce + 1);

        const txHash = await tx.calculateHash();

        switch (tx.type) {
          case 'CLAIM_FAUCET':
            this.app.blockchain.verifiedAddresses.add(sender);
            break;

          case 'DEPLOY_ELECTION': {
            const contractAddress = '0x' + txHash.slice(-40);
            const { title, description, candidates, deadline, isPrivate, whitelist } = tx.payload;
            
            const freshContract = new ElectionContract(
              contractAddress,
              tx.sender,
              title,
              description,
              candidates,
              deadline,
              isPrivate,
              whitelist
            );
            this.app.blockchain.contracts.set(contractAddress, freshContract);
            break;
          }

          case 'REGISTER_VOTER': {
            const contract = this.app.blockchain.contracts.get(tx.recipient);
            if (contract) {
              contract.registerVoter(tx.payload.voterAddress, tx.sender);
            }
            break;
          }

          case 'CAST_VOTE':
          case 'UPDATE_VOTE': {
            const contract = this.app.blockchain.contracts.get(tx.recipient);
            if (contract) {
              contract.castVote(tx.sender, tx.payload.candidateName, tx.timestamp, txHash);
            }
            break;
          }
        }
      }
    }
  }

  /**
   * Render Tamper Console
   */
  render() {
    this.renderDropdown();
  }
}
