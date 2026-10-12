import { useState, useEffect } from "react";

interface StateInfo {
  id: string;
  label: string;
  channel: "I" | "Q";
  next: string;
  action: string;
  description: string;
}

const states: StateInfo[] = [
  { id: "00", label: "sdr_rx_00", channel: "I", next: "01", action: "Read I sample → CIC integrator → CIC comb → process()", description: "Start of cycle. Reads I input, computes full CIC filter, outputs processed sample." },
  { id: "01", label: "sdr_rx_01", channel: "Q", next: "02", action: "Read Q sample → store to q_s0zb0", description: "Reads Q input, stores into integrator delay line." },
  { id: "02", label: "sdr_rx_02", channel: "I", next: "03", action: "Read I sample → store to i_s0zb0", description: "Reads I input, stores into integrator delay line." },
  { id: "03", label: "sdr_rx_03", channel: "Q", next: "04", action: "Read Q sample → CIC integrator → store comb", description: "Reads Q input, computes integrator stage, stores comb result." },
  { id: "04", label: "sdr_rx_04", channel: "I", next: "05", action: "Read I sample → CIC integrator → store comb", description: "Reads I input, computes integrator stage, stores comb result." },
  { id: "05", label: "sdr_rx_05", channel: "Q", next: "06", action: "Read Q sample → store to q_s0zb0", description: "Reads Q input, stores into integrator delay line." },
  { id: "06", label: "sdr_rx_06", channel: "I", next: "07", action: "Read I sample → store to i_s0zb0", description: "Reads I input, stores into integrator delay line." },
  { id: "07", label: "sdr_rx_07", channel: "Q", next: "00", action: "Read Q sample → CIC integrator → CIC comb → output", description: "Reads Q input, computes full CIC filter, produces final Q output." },
];

export default function StateMachineView() {
  const [activeState, setActiveState] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setActiveState((prev) => (prev + 1) % 8);
    }, 800);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300">State Machine</h2>
            <p className="text-gray-400 text-sm mt-1">
              The receiver alternates between I and Q processing in 8 states, cycling through 
              the CIC filter stages across multiple sample periods.
            </p>
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              isRunning
                ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                : "bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
            }`}
          >
            {isRunning ? "⏸ Pause" : "▶ Run"}
          </button>
        </div>

        {/* State Diagram */}
        <div className="relative flex flex-wrap justify-center gap-3 py-4">
          {states.map((state, idx) => (
            <button
              key={state.id}
              onClick={() => { setActiveState(idx); setIsRunning(false); }}
              className={`relative w-24 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-300 ${
                idx === activeState
                  ? state.channel === "I"
                    ? "border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20 scale-110"
                    : "border-green-400 bg-green-500/20 shadow-lg shadow-green-500/20 scale-110"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <span className={`text-xs font-bold ${
                state.channel === "I" ? "text-cyan-400" : "text-green-400"
              }`}>
                {state.channel}
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {state.id}
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5">
                → {state.next}
              </span>
              {idx === activeState && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Active State Detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Current State: sdr_rx_{states[activeState].id}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                states[activeState].channel === "I" 
                  ? "bg-cyan-500/20 text-cyan-300" 
                  : "bg-green-500/20 text-green-300"
              }`}>
                {states[activeState].channel}-Channel
              </span>
              <span className="text-gray-500 text-sm">→ next: sdr_rx_{states[activeState].next}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 font-mono text-sm text-amber-300">
              {states[activeState].action}
            </div>
            <p className="text-gray-400 text-sm">
              {states[activeState].description}
            </p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Timing Diagram</h3>
          <div className="space-y-2">
            {states.map((state, idx) => (
              <div
                key={state.id}
                className={`flex items-center gap-2 py-1 px-2 rounded text-sm transition-all ${
                  idx === activeState ? "bg-gray-800" : "opacity-40"
                }`}
              >
                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                  state.channel === "I" ? "bg-cyan-500/20 text-cyan-300" : "bg-green-500/20 text-green-300"
                }`}>
                  {idx}
                </span>
                <span className="font-mono text-gray-300 min-w-[90px]">sdr_rx_{state.id}</span>
                <span className="text-gray-500">reads</span>
                <span className={`font-medium ${state.channel === "I" ? "text-cyan-400" : "text-green-400"}`}>
                  {state.channel === "I" ? "sdr_rx_common_i()" : "sdr_rx_common_q()"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-3">How the State Machine Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              The 8-state machine implements a <strong className="text-white">time-interleaved CIC filter</strong>. 
              Instead of computing the full CIC filter in one step, it spreads the computation across 8 clock cycles.
            </p>
            <p>
              <strong className="text-cyan-300">States 00 & 07</strong> are the "output" states — they compute the 
              full integrator + comb chain and produce the final decimated output sample.
            </p>
            <p>
              <strong className="text-amber-300">States 03 & 04</strong> compute the intermediate integrator stage, 
              preparing data for the final comb computation.
            </p>
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              <strong className="text-gray-400">States 01, 02, 05, 06</strong> are "store" states — they simply 
              read the input sample and store it into the delay line (z⁻¹ register).
            </p>
            <p>
              The <code className="text-cyan-300 bg-gray-800 px-1 rounded">func_ptr</code> pattern enables 
              <strong className="text-white"> zero-overhead state transitions</strong> — each function sets the 
              next function pointer before returning, creating a tight processing loop.
            </p>
            <p>
              I and Q channels are processed in <strong className="text-white">alternating fashion</strong>, 
              sharing the same filter structure but with separate state variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
