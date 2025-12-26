import { createPublicClient, http, encodeFunctionData } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Implementation, toMetaMaskSmartAccount } from "@metamask/smart-accounts-kit";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { createBundler } from "./bundler";
import { createPimlico } from "./pimlico";
import { CHAIN, CHAIN_ID, RPC_URL } from "../config/constants";

// Session key management
const SESSION_KEY = "metaaegis_session";

function getOrCreateSessionKey() {
  if (typeof window === "undefined") return null;
  
  let key = localStorage.getItem(SESSION_KEY);
  if (!key) {
    key = generatePrivateKey();
    localStorage.setItem(SESSION_KEY, key);
  }
  
  return privateKeyToAccount(key);
}

export async function initializeAegis(publicClient) {
  console.log("[Aegis] Initializing protection...");
  
  const sessionKey = getOrCreateSessionKey();
  if (!sessionKey) throw new Error("Failed to create session key");
  
  console.log("[Aegis] Session key:", sessionKey.address);

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [sessionKey.address, [], [], []],
    deploySalt: "0x",
    signer: { account: sessionKey },
  });

  console.log("[Aegis] Smart Account:", smartAccount.address);

  const bundler = createBundler(CHAIN_ID);
  const pimlico = createPimlico(CHAIN_ID);

  return {
    smartAccount,
    bundler,
    pimlico,
    publicClient,
    address: smartAccount.address,
  };
}

export async function grantProtection(smartAccount, walletClient) {
  console.log("[Aegis] Granting protection permissions...");
  
  if (!smartAccount || !walletClient) {
    throw new Error("Smart account or wallet client not ready");
  }

  try {
    const client = walletClient.extend(erc7715ProviderActions());
    const currentTime = Math.floor(Date.now() / 1000);
    const expiry = currentTime + 30 * 24 * 60 * 60; // 30 days

    const permissions = await client.requestExecutionPermissions([{
      chainId: CHAIN_ID,
      expiry,
      signer: {
        type: "account",
        data: {
          address: smartAccount.address,
        },
      },
      isAdjustmentAllowed: true,
      permission: {
        type: "native-token-periodic",
        data: {
          periodAmount: 100000000000000000n, // 0.1 ETH
          periodDuration: 3600, // 1 hour for demo
          justification: "Emergency asset rescue protection",
        },
      },
    }]);

    console.log("[Aegis] Protection granted!");
    
    // Save to localStorage
    localStorage.setItem("metaaegis_permission", JSON.stringify(permissions[0]));
    
    return permissions[0];
  } catch (error) {
    console.error("[Aegis] Permission failed:", error);
    throw error;
  }
}

export async function executeRescue(aegis, { to, amount, token }) {
  console.log("[Aegis] Executing rescue...");
  console.log("[Aegis] To:", to);
  console.log("[Aegis] Amount:", amount);
  console.log("[Aegis] Token:", token);

  const { bundler, pimlico, smartAccount, publicClient } = aegis;
  
  // Get permission from storage
  const permStr = localStorage.getItem("metaaegis_permission");
  if (!permStr) {
    throw new Error("No protection permission found");
  }
  
  const permission = JSON.parse(permStr);
  const { context, signerMeta } = permission;
  
  if (!signerMeta || !context) {
    throw new Error("Invalid permission data");
  }

  const { delegationManager } = signerMeta;

  // Get gas prices
  const { fast: fee } = await pimlico.getUserOperationGasPrice();

  // Prepare transfer calldata
  let calldata;
  if (token === "ETH") {
    calldata = "0x";
  } else {
    // ERC20 transfer
    const transferAbi = [{
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" }
      ],
    }];
    
    calldata = encodeFunctionData({
      abi: transferAbi,
      functionName: "transfer",
      args: [to, amount],
    });
  }

  // Execute with delegation
  const hash = await bundler.sendUserOperationWithDelegation({
    publicClient,
    account: smartAccount,
    calls: [{
      to: token === "ETH" ? to : token,
      data: calldata,
      value: token === "ETH" ? amount : 0n,
      permissionsContext: context,
      delegationManager,
    }],
    ...fee,
  });

  console.log("[Aegis] Rescue executed:", hash);

  const { receipt } = await bundler.waitForUserOperationReceipt({ hash });
  
  return {
    hash,
    txHash: receipt.transactionHash,
  };
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("metaaegis_permission");
}
