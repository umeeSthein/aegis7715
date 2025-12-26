import { createPimlicoClient } from "permissionless/clients/pimlico";
import { http } from "viem";

const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

if (!pimlicoKey) {
  throw new Error("Pimlico API key is not set");
}

export const pimlicoClientFactory = (chainId) => createPimlicoClient({
  transport: http(
    `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoKey}`
  ),
});
