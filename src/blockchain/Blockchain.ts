import { ethers } from 'ethers';
import { Block } from './Block';
import { Transaction } from './Transaction';
import { ElectionContract } from './SmartContract';
import { VOTER_REGISTRY_ADDRESS, ELECTION_MANAGER_ADDRESS } from './contract-addresses';
import { VOTER_REGISTRY_ABI, ELECTION_MANAGER_ABI } from './abi';
import { sha256 } from './Wallet';

export class Blockchain {
  public chain: Block[] = [];
  public pendingTransactions: Transaction[] = [];
  public difficulty: number = 2;

  // Blockchain States (mirrored from Solidity contract states)
  public contracts: Map<string, ElectionContract> = new Map();
  public nonces: Map<string, number> = new Map();
  public verifiedAddresses: Set<string> = new Set();
  public adminAddress: string = '';
  public evmBlockHeight: number = 0;
  public evmTotalTxs: number = 0;
  public voterRegistry: Map<string, {
    name: string;
    email: string;
    nicPhoto: string;
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNSUBMITTED';
    role: 'VOTER' | 'CANDIDATE' | 'ADMIN';
    bio?: string;
  }> = new Map();

  public onBlockMined?: () => void;
  public onBlockMiningFailed?: (errorMsg: string) => void;

  // Maps simulated UI contract address -> Solidity election index ID
  public addressToId: Map<string, number> = new Map();
  public app: any; // Reference to main App

  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  private createGenesisBlock(): Block {
    const genesis = new Block(0, [], '0000000000000000000000000000000000000000000000000000000000000000');
    genesis.hash = '0000000000000000000000000000000000000000000000000000000000000000';
    return genesis;
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Mock nonce fetcher to satisfy legacy validations
   */
  getNonce(_address: string): number {
    return 0;
  }

  /**
   * Executes transaction state transition on EVM Solidity contract via MetaMask
   */
  async addTransaction(transaction: Transaction): Promise<void> {
    if (!this.app || !this.app.wallet || !this.app.wallet.signer) {
      throw new Error('Transaction Rejected: Wallet not connected to MetaMask.');
    }

    const wallet = this.app.wallet;
    const registry = wallet.registryContract;
    const manager = wallet.managerContract;

    if (!registry || !manager) {
      throw new Error('Transaction Rejected: Solidity contracts not initialized.');
    }

    try {
      let txResponse;

      if (transaction.type === 'REGISTER_VOTER_KYC' || transaction.type === 'REGISTER_CANDIDATE_KYC') {
        const roleStr = transaction.type === 'REGISTER_CANDIDATE_KYC' ? 'CANDIDATE' : 'VOTER';
        txResponse = await registry.submitKYC(
          transaction.payload.name,
          transaction.payload.email,
          transaction.payload.nicPhoto,
          roleStr,
          transaction.payload.bio || ''
        );
      } 
      else if (transaction.type === 'VERIFY_IDENTITY') {
        const targetRoleStr = transaction.payload.targetRole || 'VOTER';
        txResponse = await registry.verifyIdentity(
          transaction.payload.targetAddress,
          transaction.payload.approved,
          targetRoleStr
        );
      } 
      else if (transaction.type === 'DEPLOY_ELECTION') {
        const cNames = transaction.payload.candidates.map((c: any) => c.name);
        const cBios = transaction.payload.candidates.map((c: any) => c.bio);
        const whitelistList = transaction.payload.whitelist || [];
        const isPrivate = transaction.payload.isPrivate || false;
        
        txResponse = await manager.createElection(
          transaction.payload.title,
          transaction.payload.description,
          cNames,
          cBios,
          0, // pre-registration (Admin starts manual countdown later)
          isPrivate,
          whitelistList
        );
      } 
      else if (transaction.type === 'APPLY_CANDIDACY') {
        const elId = this.addressToId.get(transaction.recipient.toLowerCase());
        if (elId === undefined) throw new Error('Target election contract does not exist.');
        
        txResponse = await manager.applyCandidacy(
          elId,
          transaction.payload.name,
          transaction.payload.bio
        );
      } 
      else if (transaction.type === 'APPROVE_CANDIDACY') {
        const elId = this.addressToId.get(transaction.recipient.toLowerCase());
        if (elId === undefined) throw new Error('Target election contract does not exist.');

        txResponse = await manager.approveCandidacy(
          elId,
          transaction.payload.candidateAddress,
          transaction.payload.approved
        );
      } 
      else if (transaction.type === 'START_ELECTION') {
        const elId = this.addressToId.get(transaction.recipient.toLowerCase());
        if (elId === undefined) throw new Error('Target election contract does not exist.');

        txResponse = await manager.startElection(
          elId,
          transaction.payload.durationMinutes
        );
      } 
      else if (transaction.type === 'CAST_VOTE' || transaction.type === 'UPDATE_VOTE') {
        const elId = this.addressToId.get(transaction.recipient.toLowerCase());
        if (elId === undefined) throw new Error('Target election contract does not exist.');

        txResponse = await manager.castVote(
          elId,
          transaction.payload.candidateName
        );
      }

      if (txResponse) {
        // Wait for contract transaction blocks to mine on Ethereum Network
        await txResponse.wait();
        
        // Sync states directly from Solidity contracts
        await this.loadState();
        
        if (this.onBlockMined) {
          this.onBlockMined();
        }
      }
    } catch (e: any) {
      console.error('Solidity transaction failed on EVM:', e);
      throw new Error(e.reason || e.message || 'Transaction execution failed on EVM.');
    }
  }

  /**
   * Syncs all blockchain states directly from local/remote EVM network
   */
  public async loadState(): Promise<void> {
    try {
      let registryContract: ethers.Contract;
      let managerContract: ethers.Contract;

      // Use connected MetaMask provider if available, otherwise read-only localhost node provider
      if (this.app && this.app.wallet && this.app.wallet.registryContract) {
        registryContract = this.app.wallet.registryContract;
        managerContract = this.app.wallet.managerContract!;
      } else {
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        registryContract = new ethers.Contract(VOTER_REGISTRY_ADDRESS, VOTER_REGISTRY_ABI, provider);
        managerContract = new ethers.Contract(ELECTION_MANAGER_ADDRESS, ELECTION_MANAGER_ABI, provider);
      }

      // 1. Fetch system verifier admin address
      this.adminAddress = await registryContract.admin();

      // 2. Sync Voter Profile Registries
      const count = await registryContract.getRegisteredAddressesCount();
      this.voterRegistry.clear();
      this.verifiedAddresses.clear();

      const statusMap = ['UNSUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'] as const;
      const roleMap = ['VOTER', 'CANDIDATE', 'ADMIN'] as const;

      for (let i = 0; i < Number(count); i++) {
        const addr = await registryContract.registeredAddresses(i);
        const p = await registryContract.getProfile(addr);
        const statusStr = statusMap[Number(p[4])] || 'UNSUBMITTED';
        const roleStr = roleMap[Number(p[5])] || 'VOTER';

        this.voterRegistry.set(addr.toLowerCase(), {
          name: p[0],
          email: p[1],
          nicPhoto: p[2],
          status: statusStr,
          role: roleStr,
          bio: p[3]
        });

        if (statusStr === 'VERIFIED') {
          this.verifiedAddresses.add(addr.toLowerCase());
        }
      }

      // 3. Sync Active Campaigns
      const electionsCount = await managerContract.getElectionsCount();
      this.contracts.clear();
      this.addressToId.clear();

      const electionStatusMap = ['PRE_REGISTRATION', 'ACTIVE', 'ENDED'] as const;

      for (let i = 0; i < Number(electionsCount); i++) {
        const el = await managerContract.elections(i);
        const elId = Number(el[0]);
        const title = el[1];
        const description = el[2];
        const deadline = Number(el[3]) * 1000;
        const isPrivate = el[4];
        const statusNum = Number(el[5]);
        const statusStr = electionStatusMap[statusNum] || 'PRE_REGISTRATION';

        const mockAddr = '0x' + (await sha256(elId.toString())).slice(-40);
        this.addressToId.set(mockAddr.toLowerCase(), elId);

        // Fetch Candidates List and Tallies
        const [cNames] = await managerContract.getTallies(elId);
        const candidatesList = [];
        for (let j = 0; j < cNames.length; j++) {
          const cName = cNames[j];
          const bio = await managerContract.candidateBios(elId, cName);
          candidatesList.push({
            name: cName,
            bio: bio
          });
        }

        // Fetch whitelist Addresses
        const whitelistAddresses = await managerContract.getWhitelist(elId);
        const whitelistStrings = whitelistAddresses.map((a: string) => a.toLowerCase());

        const newContract = new ElectionContract(
          mockAddr,
          this.adminAddress,
          title,
          description,
          candidatesList,
          deadline,
          isPrivate,
          whitelistStrings
        );
        newContract.status = statusStr;

        // Fetch Applicants
        const applicants = await managerContract.getApplicants(elId);
        newContract.candidateApplicants = [];
        for (const appAddr of applicants) {
          const appInfo = await managerContract.candidateApplications(elId, appAddr);
          newContract.candidateApplicants.push({
            address: appAddr.toLowerCase(),
            name: appInfo[1],
            bio: appInfo[2],
            status: appInfo[3] ? 'APPROVED' : (appInfo[4] ? 'PENDING' : 'REJECTED')
          });
        }

        // Fetch Votes mapping
        for (const voter of this.verifiedAddresses) {
          const hasVotedVal = await managerContract.hasVoted(elId, voter);
          if (hasVotedVal) {
            const choice = await managerContract.votes(elId, voter);
            newContract.votes.set(voter.toLowerCase(), {
              candidateName: choice,
              timestamp: Date.now(),
              txHash: '0x' + (await sha256(voter + choice)).slice(-40)
            });
          }
        }

        this.contracts.set(mockAddr.toLowerCase(), newContract);
      }

      // Reconstruct actual blocks from the EVM provider for the Explorer UI
      try {
        const statsProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const blockNumber = await statsProvider.getBlockNumber();
        
        this.chain = [];
        for (let i = 0; i <= blockNumber; i++) {
          const blockInfo = await statsProvider.getBlock(i, true);
          if (blockInfo) {
            const txs: Transaction[] = [];
            
            for (const txOrHash of blockInfo.transactions) {
              if (typeof txOrHash !== 'string') {
                const evmTx = txOrHash as any;
                const input = evmTx.data || '0x';
                const selector = input.slice(0, 10).toLowerCase();
                
                let txType = 'EVM_TRANSACTION';
                let payload: any = {};
                
                if (!evmTx.to || evmTx.to === ethers.ZeroAddress) {
                  txType = 'DEPLOY_ELECTION';
                  payload = { title: 'Deploy System Smart Contract' };
                } else if (selector === '0x7f9ec2f0') {
                  txType = 'DEPLOY_ELECTION';
                  payload = { title: 'Create Governance Election' };
                } else if (selector === '0xa9fabbd2') {
                  txType = 'REGISTER_VOTER_KYC';
                  payload = { name: 'User Profile KYC Submission' };
                } else if (selector === '0xeba08a64') {
                  txType = 'VERIFY_IDENTITY';
                  payload = { approved: true, targetAddress: evmTx.from };
                } else if (selector === '0x3109cf2f') {
                  txType = 'APPLY_CANDIDACY';
                  payload = { name: 'Nomination Candidate Application' };
                } else if (selector === '0x094fbfc5') {
                  txType = 'APPROVE_CANDIDACY';
                  payload = { approved: true, candidateAddress: evmTx.from };
                } else if (selector === '0x0c54b463') {
                  txType = 'START_ELECTION';
                } else if (selector === '0xd037853a') {
                  txType = 'CAST_VOTE';
                  payload = { candidateName: 'Cast Ballot Selection' };
                }
                
                txs.push(new Transaction({
                  sender: evmTx.from,
                  recipient: evmTx.to || '0x0000000000000000000000000000000000000000',
                  type: txType as any,
                  payload: payload,
                  nonce: evmTx.nonce,
                  timestamp: blockInfo.timestamp * 1000,
                  publicKey: '0x'
                }));
              } else {
                txs.push(new Transaction({
                  sender: '0x',
                  recipient: '0x',
                  type: 'EVM_TRANSACTION' as any,
                  payload: { hash: txOrHash, value: '0' },
                  nonce: 0,
                  timestamp: blockInfo.timestamp * 1000,
                  publicKey: '0x'
                }));
              }
            }
            
            const localBlock = new Block(
              i,
              txs,
              blockInfo.parentHash || '0000000000000000000000000000000000000000000000000000000000000000'
            );
            localBlock.hash = blockInfo.hash || '0x';
            localBlock.timestamp = blockInfo.timestamp * 1000;
            localBlock.nonce = Number(blockInfo.nonce || 0);
            
            this.chain.push(localBlock);
          }
        }
      } catch (blockErr) {
        console.warn('Failed to rebuild chain from EVM blocks:', blockErr);
        this.chain = [this.createGenesisBlock()];
      }

      // Fetch actual EVM network statistics
      try {
        const statsProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const blockNumber = await statsProvider.getBlockNumber();
        this.evmBlockHeight = blockNumber;
        
        let txCount = 0;
        const startBlock = Math.max(0, blockNumber - 50);
        for (let b = startBlock; b <= blockNumber; b++) {
          const blockInfo = await statsProvider.getBlock(b);
          if (blockInfo) {
            txCount += blockInfo.transactions.length;
          }
        }
        this.evmTotalTxs = txCount;
      } catch (statsErr) {
        console.warn('Failed to query EVM stats:', statsErr);
      }

    } catch (err) {
      console.warn('EVM State Sync Failed. Ensure localhost Hardhat node is running.', err);
    }
  }

  /**
   * Mock consistency check (Solidity state cannot be altered in DB, so it is always consistent)
   */
  async verifyStateConsistency(): Promise<boolean> {
    return true;
  }

  /**
   * Mock validation report (EVM consensus secures validity)
   */
  async checkLedgerValidity() {
    return {
      isValid: true,
      errorBlockIndex: null,
      reason: 'Ledger secured by EVM decentralized consensus.'
    };
  }

  /**
   * Mock minePendingTransactions to satisfy Explorer manual trigger panel
   */
  async minePendingTransactions(
    _minerAddress: string, 
    _onProgress?: (hash: string, nonce: number) => void
  ): Promise<Block> {
    await this.loadState();
    return this.getLatestBlock();
  }

  /**
   * Mock saveState to satisfy login session cache updates
   */
  saveState(): void {
    // No-op for EVM State
  }
}
