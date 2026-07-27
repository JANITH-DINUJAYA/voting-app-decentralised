import { Wallet, sha256 } from './Wallet';

export type TransactionType = 
  | 'DEPLOY_ELECTION' 
  | 'REGISTER_VOTER' 
  | 'CAST_VOTE' 
  | 'UPDATE_VOTE' 
  | 'CLAIM_FAUCET'
  | 'REGISTER_VOTER_KYC'
  | 'REGISTER_CANDIDATE_KYC'
  | 'VERIFY_IDENTITY'
  | 'APPLY_CANDIDACY'
  | 'APPROVE_CANDIDACY'
  | 'START_ELECTION';

export interface TransactionData {
  sender: string;
  recipient: string; // "0x0" for deploy, or contract address
  type: TransactionType;
  payload: any;
  nonce: number;
  timestamp: number;
  publicKey: string;
  signature?: string;
}

export class Transaction {
  public sender: string;
  public recipient: string;
  public type: TransactionType;
  public payload: any;
  public nonce: number;
  public timestamp: number;
  public publicKey: string;
  public signature: string = '';

  constructor(data: TransactionData) {
    this.sender = data.sender;
    this.recipient = data.recipient;
    this.type = data.type;
    this.payload = data.payload;
    this.nonce = data.nonce;
    this.timestamp = data.timestamp || Date.now();
    this.publicKey = data.publicKey;
    if (data.signature) {
      this.signature = data.signature;
    }
  }

  /**
   * Serializes the transaction payload and data for hashing
   */
  getDataString(): string {
    return (
      this.sender +
      this.recipient +
      this.type +
      JSON.stringify(this.payload) +
      this.nonce.toString() +
      this.timestamp.toString() +
      this.publicKey
    );
  }

  /**
   * Computes the SHA-256 hash of the transaction data
   */
  async calculateHash(): Promise<string> {
    return await sha256(this.getDataString());
  }

  /**
   * Signs the transaction with the sender's wallet
   */
  async signTransaction(wallet: Wallet): Promise<void> {
    // Validate that the wallet address matches the transaction sender
    if (wallet.address !== this.sender) {
      throw new Error('Cannot sign transaction with this wallet: address mismatch.');
    }
    
    // Verify the public key matches
    if (wallet.publicKeyHex !== this.publicKey) {
      throw new Error('Cannot sign transaction with this wallet: public key mismatch.');
    }

    const txHash = await this.calculateHash();
    this.signature = await wallet.sign(txHash);
  }

  /**
   * Verifies if the transaction signature is valid and matches the sender
   */
  async isValid(): Promise<boolean> {
    // Faucet transactions can be self-signed or verified by a system wallet. 
    // Here we enforce signature validation for all non-system transactions.
    if (!this.signature) {
      return false;
    }

    // Verify public key matches sender address
    const derivedAddress = await Wallet.deriveAddress(this.publicKey);
    if (derivedAddress !== this.sender) {
      return false;
    }

    // Verify signature of the transaction hash
    const txHash = await this.calculateHash();
    return await Wallet.verify(txHash, this.signature, this.publicKey);
  }
}
