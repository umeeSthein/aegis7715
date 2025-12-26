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
function getSessionKey(eoaAddress) {
  if (typeof window === "undefined" || !eoaAddress) return null;
  
  let privKey = localStorage.getItem(`metaaegis_session_key_${eoaAddress}`);
  if (!privKey) {
    privKey = generatePrivateKey();
    localStorage.setItem(`metaaegis_session_key_${eoaAddress}`, privKey);
    console.log("[SA] 🔑 Generated new session key for", eoaAddress);
  }
  
  return privateKeyToAccount(privKey);
}

export async function createSessionAccount(publicClient, eoaAddress) {
  console.log("[SA] 🎫 Creating Session Account...");
  
  const account = getSessionKey(eoaAddress);
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
    const expiry = currentTime + 24 * 60 * 60 * 30; // 30 days

    // USDC address on Sepolia
    const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

    const permissions = await client.requestExecutionPermissions([
      // ETH Permission
      {
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
            periodAmount: 100000000000000000n, // 0.1 ETH
            periodDuration: 3600, // 1 hour
            justification: "MetaAegis ETH protection",
          },
        },
      },
      // USDC Permission
      {
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
          type: "erc20-token-periodic",
          data: {
            tokenAddress: USDC_ADDRESS,
            periodAmount: 10000000n, // 10 USDC (6 decimals)
            periodDuration: 3600, // 1 hour
            justification: "MetaAegis USDC protection",
          },
        },
      },
    ]);

    console.log("[SA] ✅ Permissions granted!");
    console.log("[SA] ETH Permission:", permissions[0]);
    console.log("[SA] USDC Permission:", permissions[1]);
    
    return {
      eth: permissions[0],
      usdc: permissions[1],
    };
  } catch (error) {
    console.error("[SA] ❌ Permission grant failed:", error);
    throw error;
  }
}

export async function initSmartAccountContext(publicClient, eoaAddress) {
  console.log("[SA] 🏗️ Init Smart Account Context...");

  const sessionAccount = await createSessionAccount(publicClient, eoaAddress);

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

export async function rescueAssets(ctx, permission, { to, amount, token }) {
  console.log("[Rescue] 🚨 Executing rescue...");
  console.log("[Rescue] Token:", token);
  console.log("[Rescue] To:", to);
  console.log("[Rescue] Amount:", amount);

  const { bundlerClient, pimlicoClient, sessionAccount, publicClient } = ctx;

  if (!permission) {
    throw new Error("No permission granted");
  }

  try {
    const { context, signerMeta } = permission;

    if (!signerMeta || !context) {
      throw new Error("Invalid permission data");
    }

    const { delegationManager } = signerMeta;

    // Get gas prices
    const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();
    console.log("[Rescue] ⛽ Gas:", String(fee.maxFeePerGas));

    let callData = "0x";
    let targetAddress = to;
    let value = 0n;

    if (token === "ETH") {
      // Native ETH transfer
      value = amount;
    } else {
      // ERC20 transfer
      targetAddress = token;
      const transferAbi = [{
        name: "transfer",
        type: "function",
        inputs: [
          { name: "to", type: "address" },
          { name: "value", type: "uint256" }
        ],
      }];
      
      const { encodeFunctionData } = await import("viem");
      callData = encodeFunctionData({
        abi: transferAbi,
        functionName: "transfer",
        args: [to, amount],
      });
    }

    // Send rescue transaction
    console.log("[Rescue] 🚀 Sending rescue operation...");
    const hash = await bundlerClient.sendUserOperationWithDelegation({
      publicClient,
      account: sessionAccount,
      calls: [{
        to: targetAddress,
        data: callData,
        value,
        permissionsContext: context,
        delegationManager,
      }],
      ...fee,
    });

    console.log("[Rescue] ✅ UserOp Hash:", hash);

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({ hash });
    console.log("[Rescue] ✅ Transaction:", receipt.transactionHash);

    return {
      hash,
      txHash: receipt.transactionHash,
    };
  } catch (error) {
    console.error("[Rescue] ❌ Failed:", error);
    throw error;
  }
}
