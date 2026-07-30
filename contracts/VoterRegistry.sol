// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoterRegistry {
    address public admin;

    enum Status { UNSUBMITTED, PENDING, VERIFIED, REJECTED }
    enum Role { VOTER, CANDIDATE, ADMIN }

    struct Profile {
        string name;
        string email;
        string nicPhoto;
        string bio;
        Status status;
        Role role;
    }

    mapping(address => Profile) public registry;
    address[] public registeredAddresses;

    event KYCSubmitted(address indexed voterAddress, string name, Role role);
    event KYCVerified(address indexed voterAddress, Status status, Role role);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin verifier can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
        registry[msg.sender] = Profile({
            name: "System Admin",
            email: "admin@votechain.net",
            nicPhoto: "https://i.ibb.co/3p03G4q/admin-avatar.png",
            bio: "System Administrator",
            status: Status.VERIFIED,
            role: Role.ADMIN
        });
        registeredAddresses.push(msg.sender);
    }

    function submitKYC(
        string memory name,
        string memory email,
        string memory nicPhoto,
        string memory roleStr,
        string memory bio
    ) external {
        Role selectedRole = Role.VOTER;
        if (keccak256(abi.encodePacked(roleStr)) == keccak256(abi.encodePacked("CANDIDATE"))) {
            selectedRole = Role.CANDIDATE;
        }

        Profile storage profile = registry[msg.sender];
        
        // Track unique addresses registered
        if (profile.status == Status.UNSUBMITTED) {
            registeredAddresses.push(msg.sender);
        }

        profile.name = name;
        profile.email = email;
        profile.nicPhoto = nicPhoto;
        profile.bio = bio;
        profile.status = Status.PENDING;
        profile.role = selectedRole;

        emit KYCSubmitted(msg.sender, name, selectedRole);
    }

    function verifyIdentity(
        address target,
        bool approved,
        string memory targetRoleStr
    ) external onlyAdmin {
        Profile storage profile = registry[target];
        require(profile.status == Status.PENDING, "Voter profile is not in PENDING state");

        Role finalRole = profile.role;
        if (keccak256(abi.encodePacked(targetRoleStr)) == keccak256(abi.encodePacked("CANDIDATE"))) {
            finalRole = Role.CANDIDATE;
        } else if (keccak256(abi.encodePacked(targetRoleStr)) == keccak256(abi.encodePacked("ADMIN"))) {
            finalRole = Role.ADMIN;
        }

        if (approved) {
            profile.status = Status.VERIFIED;
            profile.role = finalRole;
        } else {
            profile.status = Status.REJECTED;
        }

        emit KYCVerified(target, profile.status, profile.role);
    }

    function getProfile(address target) external view returns (
        string memory name,
        string memory email,
        string memory nicPhoto,
        string memory bio,
        Status status,
        Role role
    ) {
        Profile memory p = registry[target];
        return (p.name, p.email, p.nicPhoto, p.bio, p.status, p.role);
    }

    function isVerified(address target) external view returns (bool) {
        return registry[target].status == Status.VERIFIED;
    }

    function getRegisteredAddressesCount() external view returns (uint256) {
        return registeredAddresses.length;
    }
}
