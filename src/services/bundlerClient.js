import { createBundlerClient } from "viem/account-abstraction";
import { erc7710BundlerActions } from "@metamask/smart-accounts-kit/actions";
import { http } from "viem";

const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

if (!pimlicoKey) {
  throw new Error("Pimlico API key is not set");
}

export const bundlerClientFactory = (chainId) => createBundlerClient({
  transport: http(
    `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoKey}`
  ),
  paymaster: true,
}).extend(erc7710BundlerActions());
