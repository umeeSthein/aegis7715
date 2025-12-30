# 🛡️ MetaAegis - Emergency Asset Rescue

**Autonomous protection system for compromised wallets using ERC-7715 Advanced Permissions**

MetaAegis automatically rescues crypto assets from hacked wallets. When your wallet is compromised and funds are being drained, MetaAegis detects the attack and autonomously transfers remaining assets to your Safe multisig — all gasless, all automatic.

---

## 💡 The Problem

When a wallet is compromised:
- Attacker continuously drains assets
- Manual rescue requires gas (which you don't have)
- You're racing against time
- Every second counts

**MetaAegis solves this with autonomous, gasless rescue operations powered by ERC-7715.**

---

## 🎯 How It Works

### Setup (One Time)
1. Connect MetaMask Flask with your compromised wallet
2. Grant ERC-7715 permissions to session account
3. Provide your Safe multisig address

### Monitoring
- Checks balances
- Tracks both ETH and USDC on Sepolia
- Real-time dashboard updates

### Automatic Rescue
**When ETH drops below 0.005:**
- Immediately rescues all remaining USDC to Safe
- 100% gasless via Pimlico

**When USDC drops below 0.5:**
- Immediately rescues all remaining ETH to Safe
- 100% gasless via Pimlico

**Both stolen?**
- Rescues whatever is left
- No manual intervention needed

---

## 🚀 Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Add your Pimlico API key

# Run
npm run dev
```

**Requirements:**
- MetaMask Flask (for ERC-7715 support)
- Safe multisig on Sepolia
- Some Sepolia ETH & USDC for testing

---

## 🧰 Tech Stack

**Core:**
- Next.js 16 + React 19
- Viem + Wagmi
- MetaMask Smart Accounts Kit (Hybrid)
- ERC-7715 Advanced Permissions

**Infrastructure:**
- Pimlico (Bundler + Paymaster)
- Safe (Multisig destination)
- Sepolia Testnet

---

## 📊 Key Features

| Feature | Description |
|---------|-------------|
| **Real-time Monitoring** | 3-second balance checks |
| **Smart Thresholds** | ETH < 0.005 / USDC < 0.5 |
| **Autonomous Rescue** | No user action required |
| **100% Gasless** | Pimlico Paymaster sponsorship |
| **Safe Integration** | Rescued funds to multisig |
| **30s Cooldown** | Prevents spam operations |

---

## 🎮 Testing

1. **Start Monitoring** in dashboard
2. Click **"SIMULATE ETH DRAIN"** or **"SIMULATE USDC DRAIN"**
3. Follow modal instructions:
   - Open MetaMask Flask
   - Send assets from Protected Account
   - Watch automatic rescue happen!

---

## 🔐 Security

**ERC-7715 Permissions:**
- Period-based limits (0.1 ETH/day, 100 USDC/day)
- 30-day expiry
- Revocable anytime
- Session account isolation

**Why Safe?**
- Funds rescued to multisig (not another EOA)
- Requires multiple signatures for withdrawal
- Maximum security for recovered assets

---

## 🏗️ Architecture

```
Compromised EOA
    ↓ (grants permission)
Session Account (Hybrid Smart Account)
    ↓ (monitors balances)
Dashboard (checks every 3s)
    ↓ (detects attack)
Automatic Rescue (gasless UserOp)
    ↓ (transfers assets)
Safe Multisig ✅
```

---

## 🌐 Configuration

**Sepolia Network:**
- RPC: `https://ethereum-sepolia-rpc.publicnode.com`
- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Chain ID: `11155111`

**Thresholds:**
- ETH Alert: `0.005 ETH`
- USDC Alert: `0.5 USDC`
- Monitoring Interval: `3 seconds`
- Rescue Cooldown: `30 seconds`

---

## 📝 Environment Variables

```bash
NEXT_PUBLIC_PIMLICO_API_KEY=pim_xxxxx
NEXT_PUBLIC_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

---

## 🎯 MetaMask Hackathon Submission

This project demonstrates:

✅ **ERC-7715 Advanced Permissions** - autonomous rescue operations  
✅ **MetaMask Smart Accounts Kit** - Hybrid implementation  
✅ **Account Abstraction** - ERC-4337 UserOperations  
✅ **Gasless Transactions** - critical for compromised wallets  
✅ **Real-world Use Case** - emergency asset recovery  

---

## 🚧 Limitations

- MetaMask Flask required (ERC-7715 not in stable yet)
- Sepolia testnet only
- Tab must stay open for monitoring
- Session key stored in localStorage

---

## 📞 Info

**GitHub:** [github.com/umeeSthein/aegis7715](https://github.com/umeeSthein/aegis7715)  
**Network:** Sepolia Testnet  
**License:** MIT  

---

**🛡️ When seconds matter, MetaAegis protects.**

*Powered by ERC-7715 Advanced Permissions + MetaMask Smart Accounts*
