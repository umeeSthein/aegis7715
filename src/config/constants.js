import { sepolia } from "viem/chains";

export const CHAIN = sepolia;
export const CHAIN_ID = 11155111;
export const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; 

export const DEFAULT_ETH_THRESHOLD = "0.1"; 
export const DEFAULT_USDC_THRESHOLD = "10"; 
