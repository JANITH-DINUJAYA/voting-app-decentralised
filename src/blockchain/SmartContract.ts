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
  
  // Election Lifecycle Status
  public status: 'PRE_REGISTRATION' | 'ACTIVE' | 'ENDED' = 'PRE_REGISTRATION';
  
  // List of Candidate Nominee Applications
  public candidateApplicants: { address: string; name: string; bio: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }[] = [];

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
    this.candidates = candidates || [];
    this.deadline = deadline;
    this.isPrivate = isPrivate;
    
    if (whitelistArray) {
      whitelistArray.forEach(addr => this.whitelist.add(addr.toLowerCase()));
    }
  }

  /**
   * Applies for candidacy in this election
   */
  applyCandidacy(candidateAddress: string, name: string, bio: string): void {
    const addr = candidateAddress.toLowerCase();
    if (this.status !== 'PRE_REGISTRATION') {
      throw new Error('Candidacy application period has ended for this election.');
    }
    const alreadyApplied = this.candidateApplicants.some(app => app.address === addr);
    if (alreadyApplied) {
      throw new Error('You have already applied for candidacy in this election.');
    }
    this.candidateApplicants.push({
      address: addr,
      name,
      bio,
      status: 'PENDING'
    });
  }

  /**
   * Approves or rejects a candidate's candidacy (Admin only)
   */
  approveCandidacy(candidateAddress: string, approved: boolean, sender: string): void {
    if (sender.toLowerCase() !== this.creator.toLowerCase()) {
      throw new Error('Unauthorized: Only the election creator can manage candidate applications.');
    }
    if (this.status !== 'PRE_REGISTRATION') {
      throw new Error('Candidacy cannot be modified after the election has started.');
    }
    const addr = candidateAddress.toLowerCase();
    const application = this.candidateApplicants.find(app => app.address === addr);
    if (!application) {
      throw new Error('Candidate application not found.');
    }

    application.status = approved ? 'APPROVED' : 'REJECTED';

    if (approved) {
      // Add candidate to active list if not already present
      const alreadyCandidate = this.candidates.some(c => c.name === application.name);
      if (!alreadyCandidate) {
        this.candidates.push({
          name: application.name,
          bio: application.bio
        });
      }
    } else {
      // Remove from active candidates list if rejected later
      this.candidates = this.candidates.filter(c => c.name !== application.name);
    }
  }

  /**
   * Starts the voting phase of the election (Admin only)
   */
  startElection(durationMinutes: number, sender: string, referenceTimestamp: number): void {
    if (sender.toLowerCase() !== this.creator.toLowerCase()) {
      throw new Error('Unauthorized: Only the election creator can start this election.');
    }
    if (this.status !== 'PRE_REGISTRATION') {
      throw new Error('Election is already active or ended.');
    }
    this.status = 'ACTIVE';
    this.deadline = referenceTimestamp + durationMinutes * 60 * 1000;
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
    
    // Check if active
    if (this.status !== 'ACTIVE') {
      throw new Error('Forbidden: This election is not open for voting.');
    }

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
