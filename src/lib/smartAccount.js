import {
  createPublicClient,
  http,
  encodeFunctionData,
} from "viem";
import { sepolia } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  Implementation,
  toMetaMaskSmartAccount,
} from "@metamask/smart-accounts-kit";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { bundlerClientFactory } from "../services/bundlerClient.js";
import { pimlicoClientFactory } from "../services/pimlicoClient.js";

// Sepolia Configuration
const SEPOLIA_RPC = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const SEPOLIA_CHAIN_ID = 11155111;

// Get or create session key from localStorage
function getSessionKey() {
  if (typeof window === "undefined") return null;
  
  let privKey = localStorage.getItem("metaaegis_session_key");
  if (!privKey) {
    privKey = generatePrivateKey();
    localStorage.setItem("metaaegis_session_key", privKey);
    console.log("[SA] 🔑 Generated new session key");
  }
  
  return privateKeyToAccount(privKey);
}

export async function createSessionAccount(publicClient) {
  console.log("[SA] 🎫 Creating Session Account...");
  
  const account = getSessionKey();
  if (!account) throw new Error("Failed to create session key");
  
  console.log("[SA] 🔑 Session key address:", account.address);

  const sessionAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [account.address, [], [], []],
    deploySalt: "0x",
    signer: { account },
  });

  console.log("[SA] ✅ Session Account created:", sessionAccount.address);
  return sessionAccount;
}

export async function grantPermissions(sessionAccount, walletClient, chainId) {
  console.log("[SA] 📜 Granting permissions...");
  
  if (!sessionAccount) {
    throw new Error("Session account not found");
  }

  if (!walletClient) {
    throw new Error("Wallet client not connected");
  }

  try {
    const client = walletClient.extend(erc7715ProviderActions());
    const currentTime = Math.floor(Date.now() / 1000);
    const expiry = currentTime + 24 * 60 * 60 * 30;

    const permissions = await client.requestExecutionPermissions([{
      chainId: chainId || SEPOLIA_CHAIN_ID,
      expiry,
      signer: {
        type: "account",
        data: {
          address: sessionAccount.address,
        },
      },
      isAdjustmentAllowed: true,
      permission: {
        type: "native-token-periodic",
        data: {
          periodAmount: 100000000000000000n,
          periodDuration: 3600,
          justification: "MetaAegis protection permissions",
        },
      },
    }]);

    console.log("[SA] ✅ Permissions granted!");
    return permissions[0];
  } catch (error) {
    console.error("[SA] ❌ Permission grant failed:", error);
    throw error;
  }
}

export async function initSmartAccountContext(publicClient) {
  console.log("[SA] 🏗️ Init Smart Account Context...");

  const sessionAccount = await createSessionAccount(publicClient);

  console.log("[SA] 📦 Setup Bundler & Pimlico...");
  const bundlerClient = bundlerClientFactory(SEPOLIA_CHAIN_ID);
  const pimlicoClient = pimlicoClientFactory(SEPOLIA_CHAIN_ID);

  console.log("[SA] 🎉 Context ready!");

  return {
    sessionAccount,
    bundlerClient,
    pimlicoClient,
    publicClient,
    address: sessionAccount.address,
  };
}
