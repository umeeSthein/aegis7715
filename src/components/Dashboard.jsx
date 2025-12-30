"use client";

import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther } from "viem";
import { rescueAssets } from "../lib/smartAccount";

export default function Dashboard({ sessionAccount, ctx, safeAddress, permission, eoaAddress }) {
  const [ethBalance, setEthBalance] = useState("0");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [safeEthBalance, setSafeEthBalance] = useState("0");
  const [safeUsdcBalance, setSafeUsdcBalance] = useState("0");
  const [logs, setLogs] = useState([]);
  const [monitoring, setMonitoring] = useState(false);
  const [rescuingETH, setRescuingETH] = useState(false);
  const [rescuingUSDC, setRescuingUSDC] = useState(false);
  const [lastRescueTime, setLastRescueTime] = useState(0);
  const [showAlert, setShowAlert] = useState(null); 

  const ETH_THRESHOLD = parseEther("0.005");
  const USDC_THRESHOLD = 500000n; 
  const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  const addLog = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[Log] ${timestamp} - ${message}`);
    setLogs(prev => [{ time: timestamp, message }, ...prev].slice(0, 10));
  }, []);

  
  useEffect(() => {
    console.log("[Monitor] useEffect triggered", { ctx: !!ctx, monitoring, permission: !!permission });
    
    if (!ctx || !monitoring) {
      console.log("[Monitor] Not starting - ctx or monitoring false");
      return;
    }

    console.log("[Monitor] Starting interval...");
    
    const interval = setInterval(async () => {
      try {
        console.log("[Monitor] 🔄 Checking balances...");
        
        const ethBal = await ctx.publicClient.getBalance({
          address: eoaAddress,
        });
        setEthBalance(formatEther(ethBal));

        const usdcBal = await ctx.publicClient.readContract({
          address: USDC_ADDRESS,
          abi: [{
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ type: "address" }],
            outputs: [{ type: "uint256" }],
          }],
          functionName: "balanceOf",
          args: [eoaAddress],
        });
        setUsdcBalance((Number(usdcBal) / 1000000).toFixed(2));

        console.log(`[Monitor] 💰 Balances: ETH=${formatEther(ethBal)}, USDC=${(Number(usdcBal) / 1000000).toFixed(2)}`);

        if (safeAddress) {
          const safeEthBal = await ctx.publicClient.getBalance({
            address: safeAddress,
          });
          setSafeEthBalance(formatEther(safeEthBal));

          const safeUsdcBal = await ctx.publicClient.readContract({
            address: USDC_ADDRESS,
            abi: [{
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ type: "address" }],
              outputs: [{ type: "uint256" }],
            }],
            functionName: "balanceOf",
            args: [safeAddress],
          });
          setSafeUsdcBalance((Number(safeUsdcBal) / 1000000).toFixed(2));
        }

        const now = Date.now();
        const cooldown = 30000;
        
        if (now - lastRescueTime < cooldown) {
          console.log("[Rescue] Cooldown active, skipping...");
          return;
        }
        
        const ethStolen = ethBal < ETH_THRESHOLD;
        const usdcStolen = usdcBal < USDC_THRESHOLD;
        
        console.log(`[Rescue] 🎯 Status: ethStolen=${ethStolen}, usdcStolen=${usdcStolen}`);
        console.log(`[Rescue] ETH: ${formatEther(ethBal)} (threshold: ${formatEther(ETH_THRESHOLD)})`);
        console.log(`[Rescue] USDC: ${Number(usdcBal)} (threshold: ${Number(USDC_THRESHOLD)})`);
        
        if (ethStolen && !usdcStolen && usdcBal > 0n && !rescuingUSDC) {
          console.log("[Rescue] 🚨 ETH STOLEN! Rescuing remaining USDC...");
          setRescuingUSDC(true);
          setLastRescueTime(now);
          const msg = `⚠️ ETH below ${formatEther(ETH_THRESHOLD)}! Rescuing ${(Number(usdcBal) / 1000000).toFixed(2)} USDC...`;
          addLog(msg);
          
          try {
            const result = await rescueAssets(ctx, permission.usdc, {
              to: safeAddress,
              amount: usdcBal,
              token: USDC_ADDRESS,
            });
            addLog(`✅ USDC rescued! Tx: ${result.txHash.slice(0,10)}...`);
          } catch (error) {
            addLog(`❌ USDC rescue failed: ${error.message}`);
          } finally {
            setRescuingUSDC(false);
          }
        }
        
        if (usdcStolen && !ethStolen && ethBal > 0n && !rescuingETH) {
          console.log("[Rescue] 🚨 USDC STOLEN! Rescuing remaining ETH...");
          setRescuingETH(true);
          setLastRescueTime(now);
          const msg = `⚠️ USDC below 0.5! Rescuing ${formatEther(ethBal)} ETH...`;
          addLog(msg);
          
          try {
            const result = await rescueAssets(ctx, permission.eth, {
              to: safeAddress,
              amount: ethBal,
              token: "ETH",
            });
            addLog(`✅ ETH rescued! Tx: ${result.txHash.slice(0,10)}...`);
          } catch (error) {
            addLog(`❌ ETH rescue failed: ${error.message}`);
          } finally {
            setRescuingETH(false);
          }
        }
        
        if (ethStolen && usdcStolen) {
          console.log("[Rescue] 🚨🚨 BOTH STOLEN! Critical rescue...");
          addLog("🚨 CRITICAL! Both assets below threshold!");
          
          if (ethBal > 0n && !rescuingETH) {
            setRescuingETH(true);
            try {
              const result = await rescueAssets(ctx, permission.eth, {
                to: safeAddress,
                amount: ethBal,
                token: "ETH",
              });
              addLog(`✅ ETH rescued! Tx: ${result.txHash.slice(0,10)}...`);
            } catch (error) {
              addLog(`❌ ETH rescue failed: ${error.message}`);
            } finally {
              setRescuingETH(false);
            }
          }
          
          if (usdcBal > 0n && !rescuingUSDC) {
            setRescuingUSDC(true);
            try {
              const result = await rescueAssets(ctx, permission.usdc, {
                to: safeAddress,
                amount: usdcBal,
                token: USDC_ADDRESS,
              });
              addLog(`✅ USDC rescued! Tx: ${result.txHash.slice(0,10)}...`);
            } catch (error) {
              addLog(`❌ USDC rescue failed: ${error.message}`);
            } finally {
              setRescuingUSDC(false);
            }
          }
        }

      } catch (error) {
        console.error("[Monitor] Error:", error);
        addLog(`❌ Monitor error: ${error.message}`);
      }
    }, 3000);

    return () => {
      console.log("[Monitor] Cleanup interval");
      clearInterval(interval);
    };
  }, [ctx, monitoring, safeAddress, permission, eoaAddress, rescuingETH, rescuingUSDC, lastRescueTime, addLog]);

  const loadInitialBalances = useCallback(async () => {
    if (!ctx) return;
    
    try {
      const ethBal = await ctx.publicClient.getBalance({
        address: eoaAddress,
      });
      setEthBalance(formatEther(ethBal));

      const usdcBal = await ctx.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [{
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ type: "address" }],
          outputs: [{ type: "uint256" }],
        }],
        functionName: "balanceOf",
        args: [eoaAddress],
      });
      setUsdcBalance((Number(usdcBal) / 1000000).toFixed(2));

      if (safeAddress) {
        const safeEthBal = await ctx.publicClient.getBalance({
          address: safeAddress,
        });
        setSafeEthBalance(formatEther(safeEthBal));

        const safeUsdcBal = await ctx.publicClient.readContract({
          address: USDC_ADDRESS,
          abi: [{
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [{ type: "address" }],
            outputs: [{ type: "uint256" }],
          }],
          functionName: "balanceOf",
          args: [safeAddress],
        });
        setSafeUsdcBalance((Number(safeUsdcBal) / 1000000).toFixed(2));
      }
    } catch (error) {
      console.error("[Load] Error:", error);
    }
  }, [ctx, safeAddress, eoaAddress]);

  useEffect(() => {
    loadInitialBalances();
  }, [loadInitialBalances]);

  function startMonitoring() {
    console.log("[Dashboard] START MONITORING clicked");
    setMonitoring(true);
    addLog("🛡️ Protection monitoring started");
    loadInitialBalances();
  }

  function stopMonitoring() {
    console.log("[Dashboard] STOP MONITORING clicked");
    setMonitoring(false);
    addLog("⏸️ Protection monitoring paused");
  }

  return (
    <div className="space-y-6 p-8">
      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-gradient-to-br from-zinc-900 to-zinc-950 border border-red-500/50 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-2xl font-black mb-2 text-red-400">SIMULATE ATTACK</h3>
              <div className="text-sm text-zinc-500 uppercase tracking-wider">
                {showAlert === 'eth' ? 'ETH Drain Simulation' : 'USDC Drain Simulation'}
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
              <div className="text-sm text-zinc-300 space-y-3">
                <p className="font-bold text-red-400">👤 Pretend you're the hacker:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Open MetaMask Flask</li>
                  <li>Select your Protected Account:<br/>
                    <code className="text-xs bg-black/30 px-2 py-1 rounded mt-1 inline-block break-all">
                      {eoaAddress}
                    </code>
                  </li>
                  <li>Send {showAlert === 'eth' ? 'ALL ETH' : 'ALL USDC'} to any address</li>
                  <li>Watch MetaAegis automatically rescue the remaining {showAlert === 'eth' ? 'USDC' : 'ETH'}!</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAlert(null);
                  addLog(`🎭 Simulating ${showAlert === 'eth' ? 'ETH' : 'USDC'} drain - waiting for attack...`);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition"
              >
                I Understand
              </button>
              <button
                onClick={() => setShowAlert(null)}
                className="px-6 py-3 border border-zinc-700 hover:border-zinc-500 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="border-b border-zinc-800 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight">PROTECTION DASHBOARD</h3>
          <div className="flex items-center gap-3">
            {monitoring ? (
              <>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-cyan-400 font-mono uppercase">ACTIVE</span>
                <button
                  onClick={stopMonitoring}
                  className="border border-zinc-700 hover:border-red-500 px-4 py-1.5 text-xs font-mono uppercase transition"
                >
                  PAUSE
                </button>
              </>
            ) : (
              <button
                onClick={startMonitoring}
                className="bg-cyan-400 hover:bg-cyan-300 text-zinc-950 px-6 py-1.5 text-xs font-bold uppercase transition"
              >
                START MONITORING
              </button>
            )}
          </div>
        </div>

        {/* Balances Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Protected Account (EOA)</div>
            <div className="font-mono text-xs text-zinc-500 mb-4 break-all">{eoaAddress}</div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">ETH</span>
              <div className="text-right">
                <div className="font-mono text-lg font-bold">{parseFloat(ethBalance).toFixed(4)}</div>
                <div className="text-[10px] text-zinc-600">Alert: 0.0050</div>
              </div>
            </div>
            
            <div className="h-px bg-zinc-800 my-3"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">USDC</span>
              <div className="text-right">
                <div className="font-mono text-lg font-bold">{usdcBalance}</div>
                <div className="text-[10px] text-zinc-600">Alert: 0.50</div>
              </div>
            </div>
          </div>

          <div className="border border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Safe Vault</div>
            <div className="font-mono text-xs text-zinc-500 mb-4 break-all">
              {safeAddress || "Not configured"}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">ETH</span>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {parseFloat(safeEthBalance).toFixed(4)}
              </div>
            </div>
            
            <div className="h-px bg-zinc-800 my-3"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">USDC</span>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {safeUsdcBalance}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="border border-zinc-800">
        <div className="border-b border-zinc-800 px-6 py-3">
          <h4 className="text-sm font-bold tracking-tight uppercase">Activity Log</h4>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center text-zinc-600 text-sm py-8">
              No activity yet. Start monitoring to see events.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 text-xs font-mono">
                  <span className="text-zinc-600 shrink-0">{log.time}</span>
                  <span className="text-zinc-400">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Test Actions */}
      <div className="border border-zinc-800 p-6">
        <h4 className="text-sm font-bold tracking-tight uppercase mb-4">Test Protection</h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            className="border border-zinc-700 hover:border-red-500 px-6 py-3 text-sm font-mono uppercase transition"
            onClick={() => setShowAlert('eth')}
          >
            SIMULATE ETH DRAIN
          </button>
          <button
            className="border border-zinc-700 hover:border-cyan-400 px-6 py-3 text-sm font-mono uppercase transition"
            onClick={() => setShowAlert('usdc')}
          >
            SIMULATE USDC DRAIN
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Click buttons above to get instructions for testing the rescue system.
        </p>
      </div>
    </div>
  );
}
