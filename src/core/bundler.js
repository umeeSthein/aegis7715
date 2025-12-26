import { createBundlerClient } from "viem/account-abstraction";
import { erc7710BundlerActions } from "@metamask/smart-accounts-kit/actions";
import { http } from "viem";

const PIMLICO_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

if (!PIMLICO_KEY) {
  throw new Error("Missing Pimlico API key");
}

export function createBundler(chainId) {
  return createBundlerClient({
    transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_KEY}`),
    paymaster: true,
  }).extend(erc7710BundlerActions());
}
