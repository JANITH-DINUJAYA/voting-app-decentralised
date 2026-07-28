import { Block } from './Block';
import { Transaction } from './Transaction';
import { ElectionContract } from './SmartContract';
import type { Candidate } from './SmartContract';

export class Blockchain {
  public chain: Block[];
  public pendingTransactions: Transaction[] = [];
  public difficulty: number = 2; // Adjust for instant visual mining
  
  // Blockchain State
  public contracts: Map<string, ElectionContract> = new Map();
  public nonces: Map<string, number> = new Map();
  public verifiedAddresses: Set<string> = new Set(); // System-wide registered voter accounts
  public adminAddress: string = '0xff3b47f3e2cd767053ad26ec01860cdcb32ec43d';
  public voterRegistry: Map<string, {
    name: string;
    email: string;
    nicPhoto: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED';
    role: 'VOTER' | 'CANDIDATE' | 'ADMIN';
    bio?: string;
  }> = new Map();

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.nonces.set('0x0000000000000000000000000000000000000000', 0);

    // Pre-seed Admin Verifier
    this.verifiedAddresses.add(this.adminAddress);
    this.voterRegistry.set(this.adminAddress, {
      name: 'System Admin',
      email: 'admin@votechain.net',
      nicPhoto: 'https://i.ibb.co/3p03G4q/admin-avatar.png',
      status: 'VERIFIED',
      role: 'ADMIN'
    });

    // Pre-seed Demo Voter
    const demoVoter = '0x5a54ae7355004c6834bb619bc411a2c1bb71fb91';
    this.verifiedAddresses.add(demoVoter);
    this.voterRegistry.set(demoVoter, {
      name: 'Demo Voter',
      email: 'voter@votechain.net',
      nicPhoto: 'https://i.ibb.co/ZKgHq6F/voter-card.png',
      status: 'VERIFIED',
      role: 'VOTER'
    });

    // Pre-seed Demo Candidate
    const demoCandidate = '0x1fc1a0c3e8f4f0713ec2a921120765fca726cafb';
    this.verifiedAddresses.add(demoCandidate);
    this.voterRegistry.set(demoCandidate, {
      name: 'Demo Candidate',
      email: 'candidate@votechain.net',
      nicPhoto: 'https://i.ibb.co/f464JcT/candidate-card.png',
      status: 'VERIFIED',
      role: 'CANDIDATE',
      bio: 'Committed to absolute on-chain auditing and open data governance.'
    });

    // Load persisted state from localStorage
    this.loadState();
  }

  /**
   * Generates the hardcoded Genesis block
   */
  private createGenesisBlock(): Block {
    const genesisTx = new Transaction({
      sender: '0x0000000000000000000000000000000000000000',
      recipient: '0x0000000000000000000000000000000000000000',
      type: 'CLAIM_FAUCET',
      payload: { note: 'Genesis Block - Decentralized Voting Network Initialized' },
      nonce: 0,
      timestamp: 1777248000000, // Fixed historical date
      publicKey: '00', // Empty public key
    });
    
    const genesisBlock = new Block(0, [genesisTx], '0');
    genesisBlock.hash = '0000000000000000000000000000000000000000000000000000000000000000';
    genesisBlock.nonce = 137;
    return genesisBlock;
  }

  /**
   * Gets the latest block in the chain
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Retrieves the current transaction nonce for a specific address
   */
  getNonce(address: string): number {
    return this.nonces.get(address.toLowerCase()) || 0;
  }

  /**
   * Validates a transaction and adds it to the mempool (pending queue)
   */
  async addTransaction(transaction: Transaction): Promise<void> {
    // 1. Verify cryptographic signature (unless it is a system-level genesis transaction)
    if (transaction.sender !== '0x0000000000000000000000000000000000000000') {
      const isSigValid = await transaction.isValid();
      if (!isSigValid) {
        throw new Error('Transaction Rejected: Invalid cryptographic signature.');
      }
    }

    // 2. Nonce Validation
    const currentNonce = this.getNonce(transaction.sender);
    if (transaction.nonce !== currentNonce) {
      throw new Error(`Transaction Rejected: Invalid nonce. Expected ${currentNonce}, got ${transaction.nonce}.`);
    }

    // 3. Smart Contract Rule Validation (dry-run prior to queueing)
    if (transaction.type === 'CAST_VOTE' || transaction.type === 'UPDATE_VOTE') {
      const contract = this.contracts.get(transaction.recipient);
      if (!contract) {
        throw new Error('Transaction Rejected: Destination contract address does not exist.');
      }
      
      const candidateName = transaction.payload.candidateName;
      const candidateExists = contract.candidates.some(c => c.name === candidateName);
      if (!candidateExists) {
        throw new Error(`Transaction Rejected: Candidate "${candidateName}" is not running.`);
      }

      if (contract.status !== 'ACTIVE') {
        throw new Error('Transaction Rejected: This election is not open for voting.');
      }

      if (transaction.timestamp > contract.deadline) {
        throw new Error('Transaction Rejected: Voting campaign deadline has already passed.');
      }

      // Check KYC verification status
      const profile = this.voterRegistry.get(transaction.sender.toLowerCase());
      if (!profile || profile.status !== 'VERIFIED') {
        throw new Error('Transaction Rejected: Voter identity profile is not verified.');
      }

      if (contract.isPrivate && !contract.whitelist.has(transaction.sender.toLowerCase())) {
        throw new Error('Transaction Rejected: Sender address is not whitelisted for this election.');
      }
    }

    if (transaction.type === 'VERIFY_IDENTITY') {
      if (this.adminAddress && transaction.sender.toLowerCase() !== this.adminAddress.toLowerCase()) {
        throw new Error('Transaction Rejected: Only the designated admin verifier can verify identities.');
      }
    }

    if (transaction.type === 'REGISTER_VOTER') {
      const contract = this.contracts.get(transaction.recipient);
      if (!contract) {
        throw new Error('Transaction Rejected: Destination contract address does not exist.');
      }
      if (transaction.sender.toLowerCase() !== contract.creator.toLowerCase()) {
        throw new Error('Transaction Rejected: Only the election creator can register voters.');
      }
    }

    if (transaction.type === 'APPLY_CANDIDACY') {
      const contract = this.contracts.get(transaction.recipient);
      if (!contract) {
        throw new Error('Transaction Rejected: Destination contract address does not exist.');
      }
      if (contract.status !== 'PRE_REGISTRATION') {
        throw new Error('Transaction Rejected: Candidate applications are closed.');
      }
      const profile = this.voterRegistry.get(transaction.sender.toLowerCase());
      if (!profile || profile.status !== 'VERIFIED' || profile.role !== 'CANDIDATE') {
        throw new Error('Transaction Rejected: Sender must be a verified candidate.');
      }
    }

    if (transaction.type === 'APPROVE_CANDIDACY') {
      const contract = this.contracts.get(transaction.recipient);
      if (!contract) {
        throw new Error('Transaction Rejected: Destination contract address does not exist.');
      }
      if (transaction.sender.toLowerCase() !== contract.creator.toLowerCase()) {
        throw new Error('Transaction Rejected: Only the election creator can manage candidate applications.');
      }
      if (contract.status !== 'PRE_REGISTRATION') {
        throw new Error('Transaction Rejected: Election status is not in candidate application phase.');
      }
    }

    if (transaction.type === 'START_ELECTION') {
      const contract = this.contracts.get(transaction.recipient);
      if (!contract) {
        throw new Error('Transaction Rejected: Destination contract address does not exist.');
      }
      if (transaction.sender.toLowerCase() !== contract.creator.toLowerCase()) {
        throw new Error('Transaction Rejected: Only the election creator can start this election.');
      }
      if (contract.status !== 'PRE_REGISTRATION') {
        throw new Error('Transaction Rejected: Election has already started or ended.');
      }
    }

    // Add to pending transactions queue
    this.pendingTransactions.push(transaction);

    // Broadcast to Neon Cloud mempool
    try {
      await fetch('/api/mempool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: transaction.sender,
          recipient: transaction.recipient,
          type: transaction.type,
          payload: transaction.payload,
          nonce: transaction.nonce,
          timestamp: transaction.timestamp,
          publicKey: transaction.publicKey,
          signature: transaction.signature
        })
      });
    } catch (e) {
      console.error('Failed to broadcast transaction to Neon mempool:', e);
    }

    this.saveState();
  }

  /**
   * Packs pending transactions into a new block, mines it, and updates blockchain states
   */
  async minePendingTransactions(
    minerAddress: string, 
    onProgress?: (hash: string, nonce: number) => void
  ): Promise<Block> {
    const blockIndex = this.chain.length;
    const previousHash = this.getLatestBlock().hash;
    
    const newBlock = new Block(blockIndex, this.pendingTransactions, previousHash);
    
    // Perform proof-of-work mining
    await newBlock.mineBlock(this.difficulty, onProgress);
    
    // Add to chain
    this.chain.push(newBlock);
    
    // Process block transactions and apply changes to contract/blockchain states
    for (const tx of newBlock.transactions) {
      await this.executeTransactionStateTransition(tx);
    }
    
    // Clear mempool
    this.pendingTransactions = [];

    // Post mined block to Neon DB
    try {
      await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: newBlock.index,
          timestamp: newBlock.timestamp,
          transactions: newBlock.transactions.map(t => ({
            sender: t.sender,
            recipient: t.recipient,
            type: t.type,
            payload: t.payload,
            nonce: t.nonce,
            timestamp: t.timestamp,
            publicKey: t.publicKey,
            signature: t.signature
          })),
          previousHash: newBlock.previousHash,
          hash: newBlock.hash,
          nonce: newBlock.nonce
        })
      });
    } catch (e) {
      console.error('Failed to post mined block to Neon:', e);
    }
    
    // Reward the miner (could be a simple record)
    console.log(`Block #${blockIndex} mined successfully by ${minerAddress}. Hash: ${newBlock.hash}`);
    
    this.saveState();
    return newBlock;
  }

  /**
   * Executes a transaction's operations to mutate the blockchain contract states
   */
  private async executeTransactionStateTransition(tx: Transaction): Promise<void> {
    const sender = tx.sender.toLowerCase();
    
    // Increment Sender Nonce
    const currentNonce = this.getNonce(sender);
    this.nonces.set(sender, currentNonce + 1);

    const txHash = await tx.calculateHash();

    switch (tx.type) {
      case 'CLAIM_FAUCET':
        // Faucet gives normal voter/candidate simulated gas tokens. They must verify via KYC.
        break;

      case 'REGISTER_VOTER_KYC':
        this.voterRegistry.set(sender, {
          name: tx.payload.name,
          email: tx.payload.email,
          nicPhoto: tx.payload.nicPhoto,
          status: 'PENDING',
          role: 'VOTER'
        });
        break;

      case 'REGISTER_CANDIDATE_KYC':
        this.voterRegistry.set(sender, {
          name: tx.payload.name,
          email: tx.payload.email,
          nicPhoto: tx.payload.nicPhoto,
          status: 'PENDING',
          role: 'CANDIDATE',
          bio: tx.payload.bio
        });
        break;

      case 'VERIFY_IDENTITY': {
        const targetAddress = tx.payload.targetAddress.toLowerCase();
        const profile = this.voterRegistry.get(targetAddress);
        if (profile) {
          profile.status = tx.payload.approved ? 'VERIFIED' : 'REJECTED';
          if (tx.payload.approved) {
            this.verifiedAddresses.add(targetAddress);
          }
        }
        break;
      }

      case 'DEPLOY_ELECTION': {
        const contractAddress = '0x' + txHash.slice(-40);
        const { title, description, candidates, deadline, isPrivate, whitelist } = tx.payload;
        
        const newContract = new ElectionContract(
          contractAddress,
          tx.sender,
          title,
          description,
          candidates as Candidate[],
          deadline,
          isPrivate,
          whitelist as string[]
        );
        
        this.contracts.set(contractAddress, newContract);
        break;
      }

      case 'REGISTER_VOTER': {
        const contract = this.contracts.get(tx.recipient);
        if (contract) {
          contract.registerVoter(tx.payload.voterAddress, tx.sender);
        }
        break;
      }

      case 'CAST_VOTE':
      case 'UPDATE_VOTE': {
        const contract = this.contracts.get(tx.recipient);
        if (contract) {
          contract.castVote(tx.sender, tx.payload.candidateName, tx.timestamp, txHash);
        }
        break;
      }

      case 'APPLY_CANDIDACY': {
        const contract = this.contracts.get(tx.recipient);
        if (contract) {
          contract.applyCandidacy(tx.sender, tx.payload.name, tx.payload.bio);
        }
        break;
      }

      case 'APPROVE_CANDIDACY': {
        const contract = this.contracts.get(tx.recipient);
        if (contract) {
          contract.approveCandidacy(tx.payload.candidateAddress, tx.payload.approved, tx.sender);
        }
        break;
      }

      case 'START_ELECTION': {
        const contract = this.contracts.get(tx.recipient);
        if (contract) {
          contract.startElection(tx.payload.durationMinutes, tx.sender);
        }
        break;
      }
    }
  }

  /**
   * Audits the blockchain ledger's integrity.
   * Returns a report detailing whether the blockchain hashes are valid and if transaction signatures verify.
   */
  async checkLedgerValidity(): Promise<{ isValid: boolean; errorBlockIndex: number | null; reason: string }> {
    // 1. Quick hash chain check
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Verify block hash matches calculation
      const calculatedHash = await currentBlock.calculateHash();
      if (currentBlock.hash !== calculatedHash) {
        return {
          isValid: false,
          errorBlockIndex: i,
          reason: `Block hash mismatch. Block claims "${currentBlock.hash}", but recalculation yields "${calculatedHash}".`
        };
      }

      // Verify link to previous hash
      if (currentBlock.previousHash !== previousBlock.hash) {
        return {
          isValid: false,
          errorBlockIndex: i,
          reason: `Broken chain link. Block #${i} references previous hash "${currentBlock.previousHash}", but Block #${i - 1} hash is "${previousBlock.hash}".`
        };
      }

      // Verify difficulty requirement is met
      const target = Array(this.difficulty + 1).join('0');
      if (currentBlock.hash.substring(0, this.difficulty) !== target) {
        return {
          isValid: false,
          errorBlockIndex: i,
          reason: `Invalid proof-of-work. Block hash "${currentBlock.hash}" does not satisfy difficulty requirement (needs ${this.difficulty} leading zeros).`
        };
      }

      // Verify transaction signatures inside the block
      for (let j = 0; j < currentBlock.transactions.length; j++) {
        const tx = currentBlock.transactions[j];
        if (tx.sender !== '0x0000000000000000000000000000000000000000') {
          const isSigValid = await tx.isValid();
          if (!isSigValid) {
            return {
              isValid: false,
              errorBlockIndex: i,
              reason: `Cryptographic Signature Audit Failed. Block #${i}, Transaction #${j} has an invalid signature. Data may have been tampered with.`
            };
          }
        }
      }
    }

    return {
      isValid: true,
      errorBlockIndex: null,
      reason: 'Ledger is valid. Hash integrity verified, consensus difficulty matched, and transaction signatures verified.'
    };
  }

  /**
   * Replays all transactions on a fresh state to rebuild contracts and nonces.
   * Useful to detect if someone re-mined blocks but changed internal states.
   */
  async verifyStateConsistency(): Promise<boolean> {
    const tempContracts: Map<string, ElectionContract> = new Map();
    const tempNonces: Map<string, number> = new Map();
    const tempVerified: Set<string> = new Set();
    
    tempNonces.set('0x0000000000000000000000000000000000000000', 0);

    try {
      // Replay every transaction from genesis
      for (const block of this.chain) {
        for (const tx of block.transactions) {
          const sender = tx.sender.toLowerCase();
          
          // Verify nonce matches expectations at this point
          const expectedNonce = tempNonces.get(sender) || 0;
          if (tx.nonce !== expectedNonce) {
            console.error(`State consistency error: Nonce mismatch on replay. Address: ${sender}, Expected: ${expectedNonce}, got: ${tx.nonce}`);
            return false;
          }
          
          // Increment nonce
          tempNonces.set(sender, expectedNonce + 1);

          const txHash = await tx.calculateHash();

          switch (tx.type) {
            case 'CLAIM_FAUCET':
              tempVerified.add(sender);
              break;

            case 'REGISTER_VOTER_KYC':
            case 'REGISTER_CANDIDATE_KYC':
              break;

            case 'VERIFY_IDENTITY':
              if (tx.payload.approved) {
                tempVerified.add(tx.payload.targetAddress.toLowerCase());
              }
              break;

            case 'DEPLOY_ELECTION': {
              const contractAddress = '0x' + txHash.slice(-40);
              const { title, description, candidates, deadline, isPrivate, whitelist } = tx.payload;
              
              const newContract = new ElectionContract(
                contractAddress,
                tx.sender,
                title,
                description,
                candidates as Candidate[],
                deadline,
                isPrivate,
                whitelist as string[]
              );
              tempContracts.set(contractAddress, newContract);
              break;
            }

            case 'REGISTER_VOTER': {
              const contract = tempContracts.get(tx.recipient);
              if (contract) {
                contract.registerVoter(tx.payload.voterAddress, tx.sender);
              }
              break;
            }

            case 'CAST_VOTE':
            case 'UPDATE_VOTE': {
              const contract = tempContracts.get(tx.recipient);
              if (contract) {
                contract.castVote(tx.sender, tx.payload.candidateName, tx.timestamp, txHash);
              }
              break;
            }

            case 'APPLY_CANDIDACY': {
              const contract = tempContracts.get(tx.recipient);
              if (contract) {
                contract.applyCandidacy(tx.sender, tx.payload.name, tx.payload.bio);
              }
              break;
            }

            case 'APPROVE_CANDIDACY': {
              const contract = tempContracts.get(tx.recipient);
              if (contract) {
                contract.approveCandidacy(tx.payload.candidateAddress, tx.payload.approved, tx.sender);
              }
              break;
            }

            case 'START_ELECTION': {
              const contract = tempContracts.get(tx.recipient);
              if (contract) {
                contract.startElection(tx.payload.durationMinutes, tx.sender);
              }
              break;
            }
          }
        }
      }

      // Compare final snapshots
      if (this.contracts.size !== tempContracts.size) return false;
      
      for (const [addr, contract] of this.contracts.entries()) {
        const tempContract = tempContracts.get(addr);
        if (!tempContract) return false;
        
        // Compare voting tally maps
        if (contract.votes.size !== tempContract.votes.size) return false;
        for (const [voter, vote] of contract.votes.entries()) {
          const tempVote = tempContract.votes.get(voter);
          if (!tempVote || tempVote.candidateName !== vote.candidateName) return false;
        }
      }

      return true;
    } catch (e) {
      console.error('State replay validation crashed:', e);
      return false;
    }
  }

  public saveState(): void {
    try {
      const data = {
        chain: this.chain.map(b => ({
          index: b.index,
          timestamp: b.timestamp,
          transactions: b.transactions.map(t => ({
            sender: t.sender,
            recipient: t.recipient,
            type: t.type,
            payload: t.payload,
            nonce: t.nonce,
            timestamp: t.timestamp,
            publicKey: t.publicKey,
            signature: t.signature
          })),
          previousHash: b.previousHash,
          hash: b.hash,
          nonce: b.nonce
        })),
        pendingTransactions: this.pendingTransactions.map(t => ({
          sender: t.sender,
          recipient: t.recipient,
          type: t.type,
          payload: t.payload,
          nonce: t.nonce,
          timestamp: t.timestamp,
          publicKey: t.publicKey,
          signature: t.signature
        })),
        nonces: Array.from(this.nonces.entries()),
        verifiedAddresses: Array.from(this.verifiedAddresses),
        voterRegistry: Array.from(this.voterRegistry.entries()),
        contracts: Array.from(this.contracts.entries()).map(([address, contract]) => ({
          address,
          creator: contract.creator,
          title: contract.title,
          description: contract.description,
          candidates: contract.candidates,
          deadline: contract.deadline,
          isPrivate: contract.isPrivate,
          whitelist: Array.from(contract.whitelist),
          votes: Array.from(contract.votes.entries()),
          status: contract.status,
          candidateApplicants: contract.candidateApplicants
        }))
      };
      localStorage.setItem('votechain_ledger', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save blockchain state locally:', e);
    }
  }

  public async loadState(): Promise<void> {
    try {
      // 1. Fetch blocks from Neon cloud database
      const blocksRes = await fetch('/api/blocks');
      if (!blocksRes.ok) {
        throw new Error('Failed to fetch blockchain ledger from Neon cloud.');
      }
      const blocksData = await blocksRes.json();

      // 2. Fetch mempool from Neon cloud mempool
      const mempoolRes = await fetch('/api/mempool');
      if (!mempoolRes.ok) {
        throw new Error('Failed to fetch mempool from Neon cloud.');
      }
      const mempoolData = await mempoolRes.json();

      // Reset state maps
      this.nonces.clear();
      this.verifiedAddresses.clear();
      this.voterRegistry.clear();
      this.contracts.clear();
      this.nonces.set('0x0000000000000000000000000000000000000000', 0);

      // Re-seed defaults
      this.verifiedAddresses.add(this.adminAddress);
      this.voterRegistry.set(this.adminAddress, {
        name: 'System Admin',
        email: 'admin@votechain.net',
        nicPhoto: 'https://i.ibb.co/3p03G4q/admin-avatar.png',
        status: 'VERIFIED',
        role: 'ADMIN'
      });

      const demoVoter = '0x5a54ae7355004c6834bb619bc411a2c1bb71fb91';
      this.verifiedAddresses.add(demoVoter);
      this.voterRegistry.set(demoVoter, {
        name: 'Demo Voter',
        email: 'voter@votechain.net',
        nicPhoto: 'https://i.ibb.co/ZKgHq6F/voter-card.png',
        status: 'VERIFIED',
        role: 'VOTER'
      });

      const demoCandidate = '0x1fc1a0c3e8f4f0713ec2a921120765fca726cafb';
      this.verifiedAddresses.add(demoCandidate);
      this.voterRegistry.set(demoCandidate, {
        name: 'Demo Candidate',
        email: 'candidate@votechain.net',
        nicPhoto: 'https://i.ibb.co/f464JcT/candidate-card.png',
        status: 'VERIFIED',
        role: 'CANDIDATE',
        bio: 'Committed to absolute on-chain auditing and open data governance.'
      });

      // 3. Reconstruct chain from database blocks
      let reconstructedChain: Block[] = [];

      if (Array.isArray(blocksData) && blocksData.length > 0) {
        reconstructedChain = blocksData.map((blockData: any) => {
          const txs = blockData.transactions.map((t: any) => new Transaction(t));
          const block = new Block(blockData.index, txs, blockData.previousHash);
          block.timestamp = parseInt(blockData.timestamp, 10) || blockData.timestamp;
          block.hash = blockData.hash;
          block.nonce = blockData.nonce;
          return block;
        });
      } else {
        // Initialize Genesis Block and POST to DB
        const genesis = this.createGenesisBlock();
        reconstructedChain = [genesis];
        
        await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            index: genesis.index,
            timestamp: genesis.timestamp,
            transactions: genesis.transactions.map(t => ({
              sender: t.sender,
              recipient: t.recipient,
              type: t.type,
              payload: t.payload,
              nonce: t.nonce,
              timestamp: t.timestamp,
              publicKey: t.publicKey,
              signature: t.signature
            })),
            previousHash: genesis.previousHash,
            hash: genesis.hash,
            nonce: genesis.nonce
          })
        });
      }

      // Replay transitions to build Maps/Sets
      for (const block of reconstructedChain) {
        if (block.index > 0) {
          for (const tx of block.transactions) {
            await this.executeTransactionStateTransition(tx);
          }
        }
      }

      this.chain = reconstructedChain;

      // Reconstruct mempool
      if (Array.isArray(mempoolData)) {
        this.pendingTransactions = mempoolData.map((t: any) => new Transaction(t));
      }

      // Verify integrity & self-heal local storage
      const report = await this.checkLedgerValidity();
      if (!report.isValid) {
        console.warn('Ledger invalidity detected in database records: ', report.reason);
      }

      // Save state to local cache for redundancy
      this.saveState();

    } catch (e) {
      console.error('Failed to load blockchain state from Neon database:', e);
      // Fallback to local storage if API is down
      const stored = localStorage.getItem('votechain_ledger');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.chain)) {
            this.chain = parsed.chain.map((blockData: any) => {
              const txs = blockData.transactions.map((t: any) => new Transaction(t));
              const block = new Block(blockData.index, txs, blockData.previousHash);
              block.timestamp = blockData.timestamp;
              block.hash = blockData.hash;
              block.nonce = blockData.nonce;
              return block;
            });
            if (Array.isArray(parsed.pendingTransactions)) {
              this.pendingTransactions = parsed.pendingTransactions.map((t: any) => new Transaction(t));
            }
            // Replay
            for (const block of this.chain) {
              if (block.index > 0) {
                for (const tx of block.transactions) {
                  await this.executeTransactionStateTransition(tx);
                }
              }
            }
          }
        } catch (localErr) {
          console.error('Failed to parse local fallback storage:', localErr);
        }
      }
    }
  }
}
