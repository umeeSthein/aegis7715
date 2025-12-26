import { createPimlicoClient } from "permissionless/clients/pimlico";
import { http } from "viem";

const PIMLICO_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

if (!PIMLICO_KEY) {
  throw new Error("Missing Pimlico API key");
}

export function createPimlico(chainId) {
  return createPimlicoClient({
    transport: http(`https://api.pimlico.io/v2/${chainId}/rpc?apikey=${PIMLICO_KEY}`),
  });
}
