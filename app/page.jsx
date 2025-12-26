"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect, usePublicClient, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { createSessionAccount, grantPermissions, initSmartAccountContext } from "../src/lib/smartAccount";
import Dashboard from "../src/components/Dashboard";

const SEPOLIA_CHAIN_ID = 11155111;

function HomePage() {
  const [sessionAccount, setSessionAccount] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [permission, setPermission] = useState(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("metaaegis_permission");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("[Aegis] Failed to parse saved permission:", e);
      }
    }
    return null;
  });
  const [safeAddress, setSafeAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [switchingChain, setSwitchingChain] = useState(false);

  const { address, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  
  const { data: walletClient, error: walletError, isLoading: walletLoading, refetch: refetchWallet } = useWalletClient();

  // Debug logging
  useEffect(() => {
    console.log("[DEBUG] ====== Wallet State ======");
    console.log("[DEBUG] isConnected:", isConnected);
    console.log("[DEBUG] address:", address);
    console.log("[DEBUG] chainId:", chainId);
    console.log("[DEBUG] connector:", connector?.name);
    console.log("[DEBUG] walletClient:", walletClient ? "exists" : "undefined");
    console.log("[DEBUG] walletError:", walletError?.message || "none");
    console.log("[DEBUG] walletLoading:", walletLoading);
    console.log("[DEBUG] ===========================");
  }, [isConnected, address, chainId, connector, walletClient, walletError, walletLoading]);

  // Handle chain mismatch - force switch to Sepolia
  const handleChainSwitch = useCallback(async () => {
    if (!isConnected || !switchChainAsync || switchingChain) return;
    
    // If there's a chain mismatch error, try to switch
    if (walletError?.message?.includes("chain") || walletError?.message?.includes("Chain")) {
      console.log("[Aegis] Chain mismatch detected, requesting switch to Sepolia...");
      setSwitchingChain(true);
      
      try {
        await switchChainAsync({ chainId: SEPOLIA_CHAIN_ID });
        console.log("[Aegis] ✅ Chain switched to Sepolia!");
        // Refetch wallet client after chain switch
        setTimeout(() => {
          refetchWallet?.();
        }, 500);
      } catch (error) {
        console.error("[Aegis] Failed to switch chain:", error);
        alert("Please manually switch MetaMask Flask to Sepolia network!");
      } finally {
        setSwitchingChain(false);
      }
    }
  }, [isConnected, switchChainAsync, switchingChain, walletError, refetchWallet]);

  // Auto-switch chain when error detected
  useEffect(() => {
    if (walletError && isConnected) {
      handleChainSwitch();
    }
  }, [walletError, isConnected, handleChainSwitch]);

  // Auto-create session account when connected
  useEffect(() => {
    async function setup() {
      if (!isConnected || !publicClient || sessionAccount) return;
      
      try {
        console.log("[Aegis] Creating session account...");
        const sa = await createSessionAccount(publicClient);
        setSessionAccount(sa);
        
        console.log("[Aegis] Creating context...");
        const context = await initSmartAccountContext(publicClient);
        setCtx(context);
      } catch (e) {
        console.error("[Aegis] Setup error:", e);
      }
    }
    
    setup();
  }, [isConnected, publicClient, sessionAccount]);

  async function handleConnect() {
    const connector = connectors[0];
    if (connector) {
      console.log("[Aegis] Connecting with connector:", connector.name);
      try {
        await connect({ connector });
      } catch (error) {
        console.error("[Aegis] Connect error:", error);
      }
    }
  }

  async function handleGrantProtection() {
    if (!sessionAccount) {
      alert("Session account not ready!");
      return;
    }
    
    if (!walletClient) {
      // Try to switch chain first
      if (walletError) {
        await handleChainSwitch();
        return;
      }
      alert("Wallet client not ready!");
      return;
    }
    
    try {
      setLoading(true);
      console.log("[Aegis] Granting permissions...");
      const perm = await grantPermissions(sessionAccount, walletClient, chainId);
      setPermission(perm);
      
      localStorage.setItem("metaaegis_permission", JSON.stringify(perm));
      
      console.log("[Aegis] ✅ Permissions granted!");
    } catch (error) {
      console.error("[Aegis] Permission error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const ready = isConnected && sessionAccount;
  const walletReady = !!walletClient;
  const hasChainError = walletError?.message?.includes("chain") || walletError?.message?.includes("Chain");

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-100">
      {/* Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
      
      {/* Scanlines Effect */}
      <div className="fixed inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15),rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)] pointer-events-none"></div>

      {/* Header */}
      <header className="relative border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/metaaegis.png" 
              alt="MetaAegis" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-lg font-bold tracking-tight">META<span className="text-cyan-400">AEGIS</span></h1>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-500">{connector?.name}</span>
              <div className="flex items-center gap-2 border border-zinc-700 px-3 py-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">EOA</span>
                <span className="text-xs font-mono text-zinc-300">
                  {address.slice(0, 4)}···{address.slice(-4)}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-cyan-400/50 px-5 py-2 text-sm font-medium transition-all"
            >
              CONNECT
            </button>
          )}
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 py-20">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-20">
          <img 
            src="/metaaegis.png" 
            alt="MetaAegis" 
            className="w-40 h-40 object-contain mb-8 opacity-90"
          />
          
          <div className="inline-block mb-6 px-4 py-1 border border-zinc-800">
            <span className="text-xs text-cyan-400 font-mono uppercase tracking-wider">ERC-7715 PROTOCOL</span>
          </div>
          
          <h2 className="text-5xl font-black mb-4 text-center tracking-tight">
            AUTONOMOUS ASSET
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
              PROTECTION LAYER
            </span>
          </h2>
          
          <p className="text-center text-zinc-400 max-w-2xl text-sm leading-relaxed">
            Advanced on-chain guardian system that autonomously rescues digital assets
            during unauthorized access attempts. Single permission grant enables
            continuous protection without manual intervention.
          </p>
        </div>

        {/* Status Display */}
        <div className="border border-zinc-800">
          {!isConnected ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-6 opacity-50">⚡</div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">INITIALIZE CONNECTION</h3>
              <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">
                Connect MetaMask Flask to initialize the protection protocol
              </p>
              <button
                onClick={handleConnect}
                className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-10 py-3 font-bold tracking-wide transition-all"
              >
                CONNECT WALLET
              </button>
            </div>
          ) : !ready ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-6 opacity-50">🔧</div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">INITIALIZING</h3>
              <p className="text-zinc-500 text-sm mb-8 max-w-md mx-auto">
                Setting up your protected smart account...
              </p>
            </div>
          ) : !permission ? (
            <div className="p-8">
              <h3 className="text-xl font-bold mb-6 tracking-tight border-b border-zinc-800 pb-3">
                CONFIGURE PROTECTION
              </h3>
              
              {/* Connection Info */}
              <div className="mb-6 bg-zinc-900/50 border border-zinc-800 p-4 space-y-2">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Your EOA</div>
                <div className="text-sm text-green-400 font-mono">
                  {address.slice(0, 8)}...{address.slice(-6)}
                </div>
                
                <div className="text-xs text-zinc-500 uppercase tracking-wide mt-3">Your Smart Account (Session)</div>
                <div className="text-sm text-emerald-400 font-mono">
                  {sessionAccount.address.slice(0, 8)}...{sessionAccount.address.slice(-6)}
                </div>

                <div className="text-xs text-zinc-500 mt-3 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${walletReady ? 'bg-emerald-400' : hasChainError ? 'bg-orange-400' : 'bg-yellow-400'} animate-pulse`} />
                  Wallet Client: {walletReady ? "Ready ✅" : walletLoading ? "Loading..." : hasChainError ? "Wrong Network ⚠️" : "Error ❌"}
                </div>
                
                {hasChainError && (
                  <div className="mt-2">
                    <button
                      onClick={handleChainSwitch}
                      disabled={switchingChain}
                      className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition-all disabled:opacity-50"
                    >
                      {switchingChain ? "Switching..." : "Switch to Sepolia"}
                    </button>
                  </div>
                )}
                
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${chainId === SEPOLIA_CHAIN_ID ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  Chain: {chainId} {chainId === SEPOLIA_CHAIN_ID ? "✅" : "(need 11155111)"}
                </div>
              </div>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2 font-mono">
                    Safe Vault Address
                  </label>
                  <input
                    type="text"
                    value={safeAddress}
                    onChange={(e) => setSafeAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full border border-zinc-800 focus:border-cyan-400/50 px-4 py-3 font-mono text-xs text-zinc-300 outline-none transition-all bg-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="border border-zinc-800 px-4 py-3">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">ETH Threshold</div>
                    <div className="text-sm font-mono text-zinc-400">0.1 ETH</div>
                  </div>
                  <div className="border border-zinc-800 px-4 py-3">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">USDC Threshold</div>
                    <div className="text-sm font-mono text-zinc-400">10 USDC</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGrantProtection}
                disabled={loading || !safeAddress || !walletReady}
                className="w-full bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-8 py-4 font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "AUTHORIZING..." : !walletReady ? (hasChainError ? "SWITCH NETWORK FIRST" : "WAITING FOR WALLET...") : "GRANT PROTECTION"}
              </button>
            </div>
          ) : (
            <Dashboard sessionAccount={sessionAccount} ctx={ctx} safeAddress={safeAddress} />
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 mt-12">
          <div className="p-6">
            <div className="text-2xl mb-3">⚡</div>
            <div className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Autonomous</div>
            <div className="text-sm text-zinc-400">24/7 monitoring with zero manual intervention required</div>
          </div>
          <div className="p-6">
            <div className="text-2xl mb-3">🔐</div>
            <div className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Secure</div>
            <div className="text-sm text-zinc-400">ERC-7715 permission layer with strict allowlists</div>
          </div>
          <div className="p-6">
            <div className="text-2xl mb-3">⚙️</div>
            <div className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Efficient</div>
            <div className="text-sm text-zinc-400">Gasless rescue operations via Pimlico network</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-zinc-800 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-zinc-600">
          <div className="font-mono">
            <span className="text-zinc-500">POWERED BY</span> ERC-7715 • PIMLICO • VIEM
          </div>
          <div className="font-mono">
            METAAEGIS v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return <HomePage />;
}
