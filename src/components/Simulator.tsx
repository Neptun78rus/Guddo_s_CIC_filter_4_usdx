import { useState, useRef, useCallback, useEffect } from "react";

interface FilterState {
  i_s0za1: number;
  i_s0zb0: number;
  i_s0zb1: number;
  i_s1za1: number;
  i_s1zb0: number;
  i_s1zb1: number;
  q_s0za1: number;
  q_s0zb0: number;
  q_s0zb1: number;
  q_s1za1: number;
  q_s1zb0: number;
  q_s1zb1: number;
}

const M_SR = 1;

function createInitialState(): FilterState {
  return {
    i_s0za1: 0, i_s0zb0: 0, i_s0zb1: 0,
    i_s1za1: 0, i_s1zb0: 0, i_s1zb1: 0,
    q_s0za1: 0, q_s0zb0: 0, q_s0zb1: 0,
    q_s1za1: 0, q_s1zb0: 0, q_s1zb1: 0,
  };
}

export default function Simulator() {
  const [filterState, setFilterState] = useState<FilterState>(createInitialState());
  const [iOutput, setIOutput] = useState<number[]>([]);
  const [qOutput, setQOutput] = useState<number[]>([]);
  const [iInput, setIInput] = useState<number[]>([]);
  const [qInput, setQInput] = useState<number[]>([]);
  const [currentState, setCurrentState] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [signalType, setSignalType] = useState<"sine" | "square" | "noise" | "pulse">("sine");
  const [frequency, setFrequency] = useState(0.1);
  const [sampleCount, setSampleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(filterState);
  const sampleCountRef = useRef(0);

  useEffect(() => {
    stateRef.current = filterState;
  }, [filterState]);

  const generateSample = useCallback((n: number, channel: "i" | "q"): number => {
    const phase = channel === "q" ? Math.PI / 2 : 0;
    switch (signalType) {
      case "sine":
        return Math.round(Math.sin(2 * Math.PI * frequency * n + phase) * 1000);
      case "square":
        return Math.sin(2 * Math.PI * frequency * n + phase) > 0 ? 1000 : -1000;
      case "noise":
        return Math.round((Math.random() * 2 - 1) * 1000);
      case "pulse":
        return (n % 20 < 2) ? 1000 : 0;
      default:
        return 0;
    }
  }, [signalType, frequency]);

  const processOneCycle = useCallback(() => {
    const n = sampleCountRef.current;
    const state = { ...stateRef.current };
    
    const iSamples: number[] = [];
    const qSamples: number[] = [];
    let iOut = 0, qOut = 0;

    // Generate 4 I and 4 Q samples per cycle
    for (let k = 0; k < 4; k++) {
      iSamples.push(generateSample(n * 4 + k, "i"));
      qSamples.push(generateSample(n * 4 + k, "q"));
    }

    // Process I channel through CIC
    // State 0: full CIC on I
    const i_ac0 = iSamples[0];
    const i_s1za0_0 = (i_ac0 + (state.i_s0za1 + state.i_s0zb0) * 3 + state.i_s0zb1) >> M_SR;
    state.i_s0za1 = i_ac0;
    iOut = (i_s1za0_0 + (state.i_s1za1 + state.i_s1zb0) * 3 + state.i_s1zb1);
    state.i_s1za1 = i_s1za0_0;

    // State 2: store I
    const i_ac2 = iSamples[1];
    state.i_s0zb1 = state.i_s0zb0;
    state.i_s0zb0 = i_ac2;

    // State 4: integrator I
    const i_ac4 = iSamples[2];
    state.i_s1zb1 = state.i_s1zb0;
    state.i_s1zb0 = (i_ac4 + (state.i_s0za1 + state.i_s0zb0) * 3 + state.i_s0zb1) >> M_SR;
    state.i_s0za1 = i_ac4;

    // State 6: store I
    const i_ac6 = iSamples[3];
    state.i_s0zb1 = state.i_s0zb0;
    state.i_s0zb0 = i_ac6;

    // Process Q channel through CIC
    // State 1: store Q
    const q_ac1 = qSamples[0];
    state.q_s0zb1 = state.q_s0zb0;
    state.q_s0zb0 = q_ac1;

    // State 3: integrator Q
    const q_ac3 = qSamples[1];
    state.q_s1zb1 = state.q_s1zb0;
    state.q_s1zb0 = (q_ac3 + (state.q_s0za1 + state.q_s0zb0) * 3 + state.q_s0zb1) >> M_SR;
    state.q_s0za1 = q_ac3;

    // State 5: store Q
    const q_ac5 = qSamples[2];
    state.q_s0zb1 = state.q_s0zb0;
    state.q_s0zb0 = q_ac5;

    // State 7: full CIC on Q
    const q_ac7 = qSamples[3];
    const q_s1za0_7 = (q_ac7 + (state.q_s0za1 + state.q_s0zb0) * 3 + state.q_s0zb1) >> M_SR;
    state.q_s0za1 = q_ac7;
    qOut = (q_s1za0_7 + (state.q_s1za1 + state.q_s1zb0) * 3 + state.q_s1zb1);
    state.q_s1za1 = q_s1za0_7;

    setFilterState(state);
    stateRef.current = state;
    setIOutput(prev => [...prev.slice(-100), iOut]);
    setQOutput(prev => [...prev.slice(-100), qOut]);
    setIInput(prev => [...prev.slice(-400), ...iSamples]);
    setQInput(prev => [...prev.slice(-400), ...qSamples]);
    sampleCountRef.current = n + 1;
    setSampleCount(n + 1);
    setCurrentState(prev => (prev + 1) % 8);
  }, [generateSample]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(processOneCycle, 200);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, processOneCycle]);

  const reset = () => {
    setIsRunning(false);
    setFilterState(createInitialState());
    stateRef.current = createInitialState();
    setIOutput([]);
    setQOutput([]);
    setIInput([]);
    setQInput([]);
    setCurrentState(0);
    setSampleCount(0);
    sampleCountRef.current = 0;
  };

  const stepOnce = () => {
    processOneCycle();
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-2xl font-bold text-cyan-300 mb-4">Live CIC Filter Simulator</h2>
        <p className="text-gray-400 text-sm mb-4">
          Watch the CIC filter process I/Q samples in real-time. The filter decimates the input by 2× 
          while applying low-pass filtering.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Signal Type */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Signal Type</label>
            <select
              value={signalType}
              onChange={(e) => setSignalType(e.target.value as typeof signalType)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
            >
              <option value="sine">Sine Wave</option>
              <option value="square">Square Wave</option>
              <option value="noise">White Noise</option>
              <option value="pulse">Pulse Train</option>
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Frequency: {frequency.toFixed(2)}</label>
            <input
              type="range"
              min="0.01"
              max="0.45"
              step="0.01"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                isRunning
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "bg-green-500/20 text-green-300 border border-green-500/30"
              }`}
            >
              {isRunning ? "⏸ Stop" : "▶ Run"}
            </button>
            <button
              onClick={stepOnce}
              disabled={isRunning}
              className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 disabled:opacity-30"
            >
              Step
            </button>
          </div>

          {/* Reset */}
          <div>
            <button
              onClick={reset}
              className="w-full px-4 py-2 rounded-lg font-medium text-sm bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* State indicator */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-xs text-gray-500">Current State:</span>
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div
                key={i}
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold transition-all ${
                  i === currentState
                    ? i % 2 === 0 ? "bg-cyan-500 text-white" : "bg-green-500 text-white"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {i}
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-4">
            Output samples: {sampleCount}
          </span>
        </div>
      </div>

      {/* Waveform Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* I Channel */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-2">I-Channel (In-Phase)</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500">Input (raw ADC samples)</span>
              <WaveformDisplay data={iInput} color="#06b6d4" height={60} />
            </div>
            <div>
              <span className="text-xs text-gray-500">Output (CIC filtered, decimated)</span>
              <WaveformDisplay data={iOutput} color="#22d3ee" height={80} />
            </div>
          </div>
        </div>

        {/* Q Channel */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-green-400 mb-2">Q-Channel (Quadrature)</h3>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500">Input (raw ADC samples)</span>
              <WaveformDisplay data={qInput} color="#10b981" height={60} />
            </div>
            <div>
              <span className="text-xs text-gray-500">Output (CIC filtered, decimated)</span>
              <WaveformDisplay data={qOutput} color="#34d399" height={80} />
            </div>
          </div>
        </div>
      </div>

      {/* State Variables */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Filter State Variables</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(filterState).map(([key, value]) => (
            <div key={key} className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-[10px] text-gray-500 font-mono">{key}</div>
              <div className={`text-sm font-mono font-bold ${
                key.startsWith("i_") ? "text-cyan-300" : "text-green-300"
              }`}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-gradient-to-r from-cyan-950/50 to-blue-950/50 rounded-xl border border-cyan-800/50 p-6">
        <h3 className="text-sm font-semibold text-cyan-300 mb-2">📊 What to Observe</h3>
        <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
          <li>The <strong className="text-white">output sample rate</strong> is half the input rate (2× decimation)</li>
          <li>High-frequency content is <strong className="text-white">attenuated</strong> by the CIC filter's sinc-shaped frequency response</li>
          <li>Try <strong className="text-white">square wave</strong> input — observe how harmonics are filtered out</li>
          <li>Try <strong className="text-white">noise</strong> — the filter smooths the random fluctuations</li>
          <li>Increase <strong className="text-white">frequency</strong> near 0.4 — observe aliasing and the filter's cutoff behavior</li>
        </ul>
      </div>
    </div>
  );
}

function WaveformDisplay({ data, color, height }: { data: number[]; color: string; height: number }) {
  if (data.length === 0) {
    return (
      <div 
        className="w-full rounded bg-gray-800/50 border border-gray-700/50 flex items-center justify-center"
        style={{ height }}
      >
        <span className="text-xs text-gray-600">No data — press Run or Step</span>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map(Math.abs));
  const width = 100; // percentage

  return (
    <div className="w-full rounded bg-gray-800/50 border border-gray-700/50 overflow-hidden relative" style={{ height }}>
      {/* Zero line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700/50" />
      
      {/* Waveform */}
      <svg
        viewBox={`0 0 ${data.length} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          points={data
            .map((v, i) => `${i},${height / 2 - (v / maxVal) * (height / 2 - 4)}`)
            .join(" ")}
        />
      </svg>

      {/* Scale labels */}
      <span className="absolute top-0.5 right-1 text-[8px] text-gray-600">{maxVal}</span>
      <span className="absolute bottom-0.5 right-1 text-[8px] text-gray-600">-{maxVal}</span>
    </div>
  );
}
