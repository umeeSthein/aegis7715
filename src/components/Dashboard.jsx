"use client";

import { useState, useEffect } from "react";
import { formatEther, parseEther } from "viem";

export default function Dashboard({ aegis, safeAddress }) {
  const [ethBalance, setEthBalance] = useState("0");
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [safeEthBalance, setSafeEthBalance] = useState("0");
  const [safeUsdcBalance, setSafeUsdcBalance] = useState("0");
  const [logs, setLogs] = useState([]);
  const [monitoring, setMonitoring] = useState(false);

  const ETH_THRESHOLD = parseEther("0.1");
  const USDC_THRESHOLD = 10n * 10n ** 6n; // 10 USDC (6 decimals)

  // Monitor balances
  useEffect(() => {
    if (!aegis || !monitoring) return;

    const interval = setInterval(async () => {
      try {
        // Get Smart Account balances
        const ethBal = await aegis.publicClient.getBalance({
          address: aegis.address,
        });
        setEthBalance(formatEther(ethBal));

        // TODO: Get USDC balance
        // const usdcBal = await aegis.publicClient.readContract({...});
        // setUsdcBalance(formatUnits(usdcBal, 6));

        // Get Safe balances if address provided
        if (safeAddress) {
          const safeEthBal = await aegis.publicClient.getBalance({
            address: safeAddress,
          });
          setSafeEthBalance(formatEther(safeEthBal));
        }

        // Check thresholds
        if (ethBal < ETH_THRESHOLD) {
          addLog("⚠️ ETH below threshold! Rescue triggered...");
          // TODO: Trigger rescue
        }

      } catch (error) {
        console.error("Monitor error:", error);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [aegis, monitoring, safeAddress]);

  // Load initial balances
  useEffect(() => {
    if (!aegis) return;

    async function loadBalances() {
      try {
        const ethBal = await aegis.publicClient.getBalance({
          address: aegis.address,
        });
        setEthBalance(formatEther(ethBal));

        if (safeAddress) {
          const safeEthBal = await aegis.publicClient.getBalance({
            address: safeAddress,
          });
          setSafeEthBalance(formatEther(safeEthBal));
        }
      } catch (error) {
        console.error("Load error:", error);
      }
    }

    loadBalances();
  }, [aegis, safeAddress]);

  function addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, message }, ...prev].slice(0, 10));
  }

  function startMonitoring() {
    setMonitoring(true);
    addLog("🛡️ Protection monitoring started");
  }

  function stopMonitoring() {
    setMonitoring(false);
    addLog("⏸️ Protection monitoring paused");
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold tracking-tight">PROTECTION DASHBOARD</h3>
          <div className="flex items-center gap-3">
            {monitoring ? (
              <>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-cyan-400 font-mono uppercase">MONITORING ACTIVE</span>
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
          {/* Smart Account */}
          <div className="border border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Protected Account</div>
            <div className="font-mono text-xs text-zinc-500 mb-4 break-all">{aegis.address}</div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">ETH</span>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold">{parseFloat(ethBalance).toFixed(4)}</div>
                  <div className="text-[10px] text-zinc-600">Threshold: 0.1000</div>
                </div>
              </div>
              
              <div className="h-px bg-zinc-800"></div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">USDC</span>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold">{parseFloat(usdcBalance).toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-600">Threshold: 10.00</div>
                </div>
              </div>
            </div>
          </div>

          {/* Safe Vault */}
          <div className="border border-zinc-800 p-4">
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Safe Vault</div>
            <div className="font-mono text-xs text-zinc-500 mb-4 break-all">
              {safeAddress || "Not configured"}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">ETH</span>
                <div className="font-mono text-lg font-bold text-emerald-400">
                  {parseFloat(safeEthBalance).toFixed(4)}
                </div>
              </div>
              
              <div className="h-px bg-zinc-800"></div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">USDC</span>
                <div className="font-mono text-lg font-bold text-emerald-400">
                  {parseFloat(safeUsdcBalance).toFixed(2)}
                </div>
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

      {/* Manual Actions */}
      <div className="border border-zinc-800 p-6">
        <h4 className="text-sm font-bold tracking-tight uppercase mb-4">Test Actions</h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            className="border border-zinc-700 hover:border-red-500 px-6 py-3 text-sm font-mono uppercase transition"
            onClick={() => addLog("🔴 Manual ETH drain simulated")}
          >
            SIMULATE ETH DRAIN
          </button>
          <button
            className="border border-zinc-700 hover:border-red-500 px-6 py-3 text-sm font-mono uppercase transition"
            onClick={() => addLog("🔴 Manual USDC drain simulated")}
          >
            SIMULATE USDC DRAIN
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          For real testing, manually send funds from the Protected Account using MetaMask
        </p>
      </div>
    </div>
  );
}
