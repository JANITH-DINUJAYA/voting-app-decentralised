# 🗳️ VoteChain: Decentralized Voting App Setup Guide

This guide walks you through setting up and running **VoteChain**—a fully decentralized, Ethereum-based voting application that runs Solidity smart contracts locally with MetaMask, Vite, and a Neon PostgreSQL database backend.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
1. **Node.js** (v18 or higher) — [Download Node.js](https://nodejs.org/)
2. **Git** — [Download Git](https://git-scm.com/)
3. **MetaMask Extension** installed in your desktop web browser (Chrome, Edge, Firefox, or Brave) — [Get MetaMask](https://metamask.io/)

---

## 🛠️ Step 1: Clone the Project & Install Dependencies

1. Extract the project files or clone the repository to a folder on your computer.
2. Open a terminal (PowerShell, Command Prompt, or Terminal) in that project directory.
3. Install the required Node dependencies:
   ```bash
   npm install
   ```

---

## 🗄️ Step 2: Database Configuration (Neon PostgreSQL)

The backend serverless API uses **Neon PostgreSQL** to store user profiles and document verification details.
1. Sign up for a free account at **[neon.tech](https://neon.tech/)** and create a new PostgreSQL project.
2. Copy the **Connection String** from your Neon dashboard (it starts with `postgresql://...`).
3. In the root directory of the project, create a file named **`.env.local`** and add your connection string:
   ```env
   DATABASE_URL=your_neon_connection_string_here
   ```

---

## ⛓️ Step 3: Run the Local Ethereum Blockchain

Hardhat provides a local EVM node that acts as your local private blockchain network.
1. Open a **new, dedicated terminal window** in the project directory.
2. Start the local node:
   ```bash
   npx hardhat node
   ```
3. Keep this terminal running! It will list **20 pre-funded test accounts** (with 10,000 ETH each) along with their corresponding addresses and private keys.

---

## 🚀 Step 4: Deploy the Solidity Smart Contracts

Now, deploy the voting contracts (`VoterRegistry.sol` and `ElectionManager.sol`) to your running local blockchain.
1. Open a **second terminal window** in the project directory.
2. Run the deployment script targeting your localhost node:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```
3. Copy the deployed addresses printed in the terminal. The script automatically updates the addresses inside the frontend code!

---

## 💻 Step 5: Start the Development Server

Start the local Vercel Dev server which hosts the serverless database APIs and Vite frontend under a single portal.
1. In your **second terminal**, run:
   ```bash
   npx vercel dev
   ```
2. The application will build and start. Open your browser and navigate to:
   👉 **`http://localhost:3000/`** (Do NOT use `localhost:5173`, as backend serverless APIs are not exposed on that port!)

---

## 🦊 Step 6: Configure MetaMask Network (Crucial!)

You must connect MetaMask to your running local Hardhat blockchain.
1. Open the **MetaMask** extension popup.
2. Click the **Network Selector dropdown** in the top-left corner $\rightarrow$ click **Add network** $\rightarrow$ **Add a network manually**.
3. Enter the following details:
   * **Network Name**: `Hardhat Localhost`
   * **New RPC URL**: `http://127.0.0.1:8545`
   * **Chain ID**: `31337`
   * **Currency Symbol**: `ETH`
4. Click **Save** and switch your active network to **Hardhat Localhost**.

---

## 🔑 Step 7: Import Test Accounts into MetaMask

To test the different roles in the platform, import the pre-seeded private keys from your Hardhat node into MetaMask:

* **ADMIN Account** (Account #0):
  * **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  * **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
* **VOTER 1 Account** (Account #1):
  * **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  * **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
* **CANDIDATE 1 Account** (Account #2):
  * **Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
  * **Private Key**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
* **VOTER 2 Account** (Account #3):
  * **Address**: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
  * **Private Key**: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`
* **CANDIDATE 2 Account** (Account #4):
  * **Address**: `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
  * **Private Key**: `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a`

#### How to import:
1. Open the MetaMask extension.
2. Click your Account dropdown (top center) $\rightarrow$ **Add account or hardware wallet** $\rightarrow$ **Import account**.
3. Paste the private key and click **Import**.

---

## 🔄 Step 8: How to Reset MetaMask Nonce (Troubleshooting)

Every time you restart or reset your Hardhat node (`npx hardhat node`), the blockchain starts from block 0. However, MetaMask remembers the old block history and nonces, which will cause your transactions to fail or get stuck.

**Whenever you restart your Hardhat node, you MUST clear MetaMask's cache:**
1. Open the **MetaMask** extension.
2. Click the Account menu (top-right dropdown) $\rightarrow$ **Settings** $\rightarrow$ **Advanced**.
3. Scroll down and click **Clear activity tab data** (or **Reset Account**).
4. Click **Clear** to confirm. 

---

## 🗳️ Step 9: End-to-End Walkthrough Flow

Here is how to run a complete mock election:

1. **Log in as Admin**:
   * Go to `http://localhost:3000/` and click the **Admin Portal** link.
   * Switch MetaMask to **Account #0** (Admin).
   * Click **Connect & Authenticate Admin Wallet**.
2. **Register a Voter & Candidate**:
   * Open a new browser tab or log out.
   * Click **Create Account** $\rightarrow$ Register a username `voter1` (Voter role) and `candidate1` (Candidate role).
   * Log in to each profile, switch MetaMask to the corresponding account (**Account #1** for Voter 1, **Account #2** for Candidate 1), click **Connect MetaMask Wallet**, and submit a KYC application.
3. **Approve KYC as Admin**:
   * Log back in as Admin (MetaMask on **Account #0**).
   * Open the **Verifier Portal**. Click **Verify & Approve** next to each applicant to verify them on-chain.
4. **Deploy an Election**:
   * In the **Admin Panel**, click **Deploy New Election**.
   * Fill out the form (Title, Description, Candidates list, Private/Public, and Whitelisted addresses). Click **Deploy**.
5. **Start the Election**:
   * Once deployed, select the election in the Admin Panel and click **Start Election** (set a duration in seconds). This opens the voting window.
6. **Cast Your Vote**:
   * Log in to `voter1` (MetaMask on **Account #1**).
   * Select the election in the **Voter Terminal**.
   * Choose a candidate and click **Cast Vote**. Confirm the MetaMask popup.
7. **View Results**:
   * Once the countdown timer ends, the election automatically closes on-chain, counts the votes, and displays the winner on the live results dashboard!
