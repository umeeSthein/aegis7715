"use client";

import { useState, useEffect } from "react";
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

  const ETH_THRESHOLD = parseEther("0.005"); // If ETH drops below 0.005 → rescue remaining USDC
  const USDC_THRESHOLD = 500000n; // 0.5 USDC (6 decimals) - If USDC drops below 0.5 → rescue remaining ETH
  const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // Monitor balances
  useEffect(() => {
    if (!ctx || !monitoring) return;

    const interval = setInterval(async () => {
      try {
        // Get EOA balance (not Smart Account!)
        const ethBal = await ctx.publicClient.getBalance({
          address: eoaAddress,
        });
        setEthBalance(formatEther(ethBal));

        // Get USDC balance
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

        // Get Safe balances
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

        // Smart rescue logic with cooldown
        const now = Date.now();
        const cooldown = 30000; // 30 seconds between rescues
        
        if (now - lastRescueTime < cooldown) {
          console.log("[Rescue] Cooldown active, skipping...");
          return;
        }
        
        const ethLow = ethBal < ETH_THRESHOLD && ethBal > 0n;
        const usdcLow = usdcBal < USDC_THRESHOLD && usdcBal > 0n;
        
        if (ethLow && !usdcLow && usdcBal > 0n && !rescuingUSDC) {
          // ETH stolen → rescue USDC
          setRescuingUSDC(true);
          setLastRescueTime(now);
          const msg = `⚠️ ETH below threshold! Rescuing ${(Number(usdcBal) / 1000000).toFixed(2)} USDC...`;
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
        
        if (usdcLow && !ethLow && ethBal > 0n && !rescuingETH) {
          // USDC stolen → rescue ETH
          setRescuingETH(true);
          setLastRescueTime(now);
          const msg = `⚠️ USDC below threshold! Rescuing ${formatEther(ethBal)} ETH...`;
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
        
        if (ethLow && usdcLow) {
          // Both stolen → rescue both!
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
      }
    }, 3000); // Every 3 seconds

    return () => clearInterval(interval);
  }, [ctx, monitoring, safeAddress, sessionAccount]);

  // Load initial balances
  async function loadInitialBalances() {
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
  }

  useEffect(() => {
    loadInitialBalances();
  }, [ctx, safeAddress, eoaAddress]);

  function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, message }, ...prev].slice(0, 10));
  }

  function startMonitoring() {
    setMonitoring(true);
    addLog("🛡️ Protection monitoring started");
    
    // Load balances immediately when starting
    loadInitialBalances();
  }

  function stopMonitoring() {
    setMonitoring(false);
    addLog("⏸️ Protection monitoring paused");
  }

  return (
    <div className="space-y-6 p-8">
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
          {/* Protected Account */}
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

          {/* Safe Vault */}
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
            onClick={() => addLog("💡 Use MetaMask to send ETH from Protected Account")}
          >
            SIMULATE ETH DRAIN
          </button>
          <button
            className="border border-zinc-700 hover:border-cyan-400 px-6 py-3 text-sm font-mono uppercase transition"
            onClick={() => addLog("💡 Use MetaMask to send USDC from Protected Account")}
          >
            SIMULATE USDC DRAIN
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Open MetaMask and manually send funds from your EOA ({eoaAddress.slice(0,8)}...) to test the rescue system.
        </p>
      </div>
    </div>
  );
}
