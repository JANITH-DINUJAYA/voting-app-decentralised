import { Transaction } from './Transaction';
import { sha256 } from './Wallet';

export class Block {
  public index: number;
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public hash: string = '';
  public nonce: number = 0;

  constructor(index: number, transactions: Transaction[], previousHash: string = '') {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
  }

  /**
   * Calculates the SHA-256 hash of the block's data
   */
  async calculateHash(): Promise<string> {
    // Serialize transactions into a standardized format
    const txData = this.transactions.map(tx => ({
      sender: tx.sender,
      recipient: tx.recipient,
      type: tx.type,
      payload: tx.payload,
      nonce: tx.nonce,
      timestamp: tx.timestamp,
      signature: tx.signature,
      publicKey: tx.publicKey,
    }));

    const dataString =
      this.index.toString() +
      this.previousHash +
      this.timestamp.toString() +
      JSON.stringify(txData) +
      this.nonce.toString();

    return await sha256(dataString);
  }

  /**
   * Mines the block by searching for a nonce that produces a hash starting with the target difficulty zeros
   * Supports an optional callback to report hashing steps (for smooth UI animations)
   */
  async mineBlock(difficulty: number, onProgress?: (currentHash: string, currentNonce: number) => void): Promise<string> {
    const target = Array(difficulty + 1).join('0');
    
    // We run in small asynchronous chunks so we don't freeze the browser UI thread
    this.hash = await this.calculateHash();
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = await this.calculateHash();
      
      // Periodically yield execution or trigger progress event (every 500 hashes)
      if (this.nonce % 500 === 0 && onProgress) {
        onProgress(this.hash, this.nonce);
        // Pause briefly to keep UI fluid
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    if (onProgress) {
      onProgress(this.hash, this.nonce);
    }
    
    return this.hash;
  }
}
