export interface Candidate {
  name: string;
  bio: string;
  avatarUrl?: string;
}

export interface VoteRecord {
  candidateName: string;
  timestamp: number;
  txHash: string;
}

export class ElectionContract {
  public address: string;
  public creator: string;
  public title: string;
  public description: string;
  public candidates: Candidate[] = [];
  public deadline: number;
  public isPrivate: boolean;
  public whitelist: Set<string> = new Set();
  
  // Maps voter address -> VoteRecord
  public votes: Map<string, VoteRecord> = new Map();

  constructor(
    address: string,
    creator: string,
    title: string,
    description: string,
    candidates: Candidate[],
    deadline: number,
    isPrivate: boolean = false,
    whitelistArray: string[] = []
  ) {
    this.address = address;
    this.creator = creator;
    this.title = title;
    this.description = description;
    this.candidates = candidates;
    this.deadline = deadline;
    this.isPrivate = isPrivate;
    
    if (whitelistArray) {
      whitelistArray.forEach(addr => this.whitelist.add(addr.toLowerCase()));
    }
  }

  /**
   * Authorizes a voter address (Admin only)
   */
  registerVoter(voterAddress: string, sender: string): void {
    if (sender.toLowerCase() !== this.creator.toLowerCase()) {
      throw new Error('Unauthorized: Only the election creator can whitelist voters.');
    }
    this.whitelist.add(voterAddress.toLowerCase());
  }

  /**
   * Casts or modifies a vote.
   * Duplicate votes are prevented by overwriting the previous choice in the state map.
   */
  castVote(voterAddress: string, candidateName: string, timestamp: number, txHash: string): void {
    const voter = voterAddress.toLowerCase();
    
    // Check deadline
    if (timestamp > this.deadline) {
      throw new Error('Forbidden: The election deadline has passed. Votes cannot be cast or modified.');
    }

    // Check candidate validity
    const candidateExists = this.candidates.some(c => c.name === candidateName);
    if (!candidateExists) {
      throw new Error(`Invalid Candidate: ${candidateName} is not running in this election.`);
    }

    // Check whitelist if private
    if (this.isPrivate && !this.whitelist.has(voter)) {
      throw new Error('Unauthorized: Voter address is not in the registration whitelist.');
    }

    // Record the vote (overwriting any previous vote)
    this.votes.set(voter, {
      candidateName,
      timestamp,
      txHash
    });
  }

  /**
   * Calculates current vote counts dynamically based on the state map
   */
  getTallies(): Record<string, number> {
    const tallies: Record<string, number> = {};
    
    // Initialize tallies for all candidates to 0
    this.candidates.forEach(c => {
      tallies[c.name] = 0;
    });

    // Sum active votes
    this.votes.forEach(vote => {
      if (tallies[vote.candidateName] !== undefined) {
        tallies[vote.candidateName]++;
      }
    });

    return tallies;
  }

  /**
   * Returns voter choice if voted, otherwise null
   */
  getVoterVote(voterAddress: string): VoteRecord | null {
    return this.votes.get(voterAddress.toLowerCase()) || null;
  }

  /**
   * Serialization helper to snapshot state
   */
  getStateSnapshot(): any {
    const votesObj: Record<string, VoteRecord> = {};
    this.votes.forEach((record, voter) => {
      votesObj[voter] = record;
    });

    return {
      address: this.address,
      creator: this.creator,
      title: this.title,
      description: this.description,
      candidates: this.candidates,
      deadline: this.deadline,
      isPrivate: this.isPrivate,
      whitelist: Array.from(this.whitelist),
      votes: votesObj,
      tallies: this.getTallies()
    };
  }
}
