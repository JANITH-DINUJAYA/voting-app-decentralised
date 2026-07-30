// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VoterRegistry.sol";

contract ElectionManager {
    VoterRegistry public registry;
    address public admin;

    enum ElectionStatus { PRE_REGISTRATION, ACTIVE, ENDED }

    struct CandidateInfo {
        string name;
        string bio;
    }

    struct CandidateApplication {
        address candidateAddress;
        string name;
        string bio;
        bool approved;
        bool exists;
    }

    struct Election {
        uint256 id;
        string title;
        string description;
        uint256 deadline;
        bool isPrivate;
        ElectionStatus status;
        string[] candidateNames;
    }

    Election[] public elections;

    // Separate mappings to bypass Solidity struct storage mapping limits
    // electionId => candidateName => bio
    mapping(uint256 => mapping(string => string)) public candidateBios;
    // electionId => candidateAddress => CandidateApplication
    mapping(uint256 => mapping(address => CandidateApplication)) public candidateApplications;
    // electionId => array of candidate application addresses
    mapping(uint256 => address[]) public electionApplicantAddresses;
    
    // electionId => voterAddress => candidateName
    mapping(uint256 => mapping(address => string)) public votes;
    // electionId => voterAddress => hasVoted (bool)
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    // electionId => candidateName => voteCount
    mapping(uint256 => mapping(string => uint256)) public tallies;
    
    // electionId => voterAddress => isWhitelisted
    mapping(uint256 => mapping(address => bool)) public electionWhitelists;
    // electionId => whitelist array (for view helper)
    mapping(uint256 => address[]) public whitelistArrays;

    event ElectionCreated(uint256 indexed electionId, string title);
    event CandidacyApplied(uint256 indexed electionId, address indexed candidateAddress, string name);
    event CandidacyApproved(uint256 indexed electionId, address indexed candidateAddress, bool approved);
    event ElectionStarted(uint256 indexed electionId, uint256 deadline);
    event VoteCast(uint256 indexed electionId, address indexed voterAddress, string candidateName, bool isModification);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin verifier can perform this action");
        _;
    }

    modifier onlyVerified() {
        require(registry.isVerified(msg.sender), "Sender identity must be verified via KYC");
        _;
    }

    constructor(address _registryAddress) {
        registry = VoterRegistry(_registryAddress);
        admin = msg.sender;
    }

    function createElection(
        string memory title,
        string memory description,
        string[] memory initialCandidateNames,
        string[] memory initialCandidateBios,
        uint256 durationMinutes,
        bool isPrivate,
        address[] memory whitelistAddresses
    ) external onlyAdmin {
        require(initialCandidateNames.length == initialCandidateBios.length, "Candidates and bios count mismatch");
        
        uint256 electionId = elections.length;
        
        // Push initial election
        elections.push();
        Election storage newEl = elections[electionId];
        newEl.id = electionId;
        newEl.title = title;
        newEl.description = description;
        newEl.isPrivate = isPrivate;
        newEl.status = ElectionStatus.PRE_REGISTRATION;

        // Set candidates
        for (uint256 i = 0; i < initialCandidateNames.length; i++) {
            newEl.candidateNames.push(initialCandidateNames[i]);
            candidateBios[electionId][initialCandidateNames[i]] = initialCandidateBios[i];
        }

        // Set whitelist
        if (isPrivate) {
            for (uint256 j = 0; j < whitelistAddresses.length; j++) {
                address voter = whitelistAddresses[j];
                electionWhitelists[electionId][voter] = true;
                whitelistArrays[electionId].push(voter);
            }
        }

        if (durationMinutes > 0) {
            newEl.status = ElectionStatus.ACTIVE;
            newEl.deadline = block.timestamp + durationMinutes * 60;
        }

        emit ElectionCreated(electionId, title);
    }

    function applyCandidacy(uint256 electionId, string memory name, string memory bio) external onlyVerified {
        require(electionId < elections.length, "Election does not exist");
        Election storage el = elections[electionId];
        require(el.status == ElectionStatus.PRE_REGISTRATION, "Election candidacy applications are closed");
        
        // Verify user role in registry
        (, , , , , VoterRegistry.Role role) = registry.getProfile(msg.sender);
        require(role == VoterRegistry.Role.CANDIDATE, "User registry role must be CANDIDATE to apply");

        CandidateApplication storage app = candidateApplications[electionId][msg.sender];
        require(!app.exists, "Already applied for this election");

        candidateApplications[electionId][msg.sender] = CandidateApplication({
            candidateAddress: msg.sender,
            name: name,
            bio: bio,
            approved: false,
            exists: true
        });
        
        electionApplicantAddresses[electionId].push(msg.sender);

        emit CandidacyApplied(electionId, msg.sender, name);
    }

    function approveCandidacy(uint256 electionId, address candidate, bool approved) external onlyAdmin {
        require(electionId < elections.length, "Election does not exist");
        Election storage el = elections[electionId];
        require(el.status == ElectionStatus.PRE_REGISTRATION, "Election is already active or ended");

        CandidateApplication storage app = candidateApplications[electionId][candidate];
        require(app.exists, "Candidacy application not found");
        require(!app.approved, "Candidacy application already approved");

        app.approved = approved;
        
        if (approved) {
            el.candidateNames.push(app.name);
            candidateBios[electionId][app.name] = app.bio;
        }

        emit CandidacyApproved(electionId, candidate, approved);
    }

    function startElection(uint256 electionId, uint256 durationMinutes) external onlyAdmin {
        require(electionId < elections.length, "Election does not exist");
        Election storage el = elections[electionId];
        require(el.status == ElectionStatus.PRE_REGISTRATION, "Election is already active or ended");

        el.status = ElectionStatus.ACTIVE;
        el.deadline = block.timestamp + durationMinutes * 60;

        emit ElectionStarted(electionId, el.deadline);
    }

    function castVote(uint256 electionId, string memory candidateName) external onlyVerified {
        require(electionId < elections.length, "Election does not exist");
        Election storage el = elections[electionId];
        
        // Auto-end check if past deadline
        if (el.status == ElectionStatus.ACTIVE && block.timestamp > el.deadline) {
            el.status = ElectionStatus.ENDED;
        }
        
        require(el.status == ElectionStatus.ACTIVE, "Voting is not open for this election");
        require(block.timestamp <= el.deadline, "Voting deadline has passed");

        if (el.isPrivate) {
            require(electionWhitelists[electionId][msg.sender], "Voter address is not whitelisted");
        }

        // Validate candidate exists
        bool candidateExists = false;
        for (uint256 i = 0; i < el.candidateNames.length; i++) {
            if (keccak256(abi.encodePacked(el.candidateNames[i])) == keccak256(abi.encodePacked(candidateName))) {
                candidateExists = true;
                break;
            }
        }
        require(candidateExists, "Candidate does not exist in this election");

        bool isMod = hasVoted[electionId][msg.sender];
        if (isMod) {
            // Modify vote: decrement vote count for previous candidate
            string memory previousChoice = votes[electionId][msg.sender];
            tallies[electionId][previousChoice]--;
        }

        // Record vote
        votes[electionId][msg.sender] = candidateName;
        hasVoted[electionId][msg.sender] = true;
        tallies[electionId][candidateName]++;

        emit VoteCast(electionId, msg.sender, candidateName, isMod);
    }

    // Helper functions for frontend
    function getElectionsCount() external view returns (uint256) {
        return elections.length;
    }

    function getCandidates(uint256 electionId) external view returns (string[] memory) {
        require(electionId < elections.length, "Election does not exist");
        return elections[electionId].candidateNames;
    }

    function getTallies(uint256 electionId) external view returns (string[] memory, uint256[] memory) {
        require(electionId < elections.length, "Election does not exist");
        Election storage el = elections[electionId];
        
        uint256[] memory voteCounts = new uint256[](el.candidateNames.length);
        for (uint256 i = 0; i < el.candidateNames.length; i++) {
            voteCounts[i] = tallies[electionId][el.candidateNames[i]];
        }
        return (el.candidateNames, voteCounts);
    }

    function getWhitelist(uint256 electionId) external view returns (address[] memory) {
        return whitelistArrays[electionId];
    }

    function getApplicants(uint256 electionId) external view returns (address[] memory) {
        return electionApplicantAddresses[electionId];
    }
}
