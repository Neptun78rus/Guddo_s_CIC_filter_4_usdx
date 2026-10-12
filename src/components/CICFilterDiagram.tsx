export default function CICFilterDiagram() {
  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-2xl font-bold text-cyan-300 mb-4">CIC Filter Architecture</h2>
        <p className="text-gray-300 mb-4">
          This implementation uses a <strong className="text-white">3rd-order (N=3) Cascaded Integrator-Comb</strong> decimation 
          filter to downsample I/Q samples from the SDR receiver. The CIC filter is computationally efficient 
          — it requires no multiplications, only additions and shifts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            title="Filter Order"
            value="N = 3"
            description="3 cascaded stages for sharp rolloff"
            color="cyan"
          />
          <InfoCard
            title="Decimation"
            value="R = 2"
            description="Input rate halved at output"
            color="blue"
          />
          <InfoCard
            title="Differential Delay"
            value="M = 1"
            description="M_SR shift register = 1"
            color="purple"
          />
        </div>
      </div>

      {/* Filter Structure Diagram */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Two-Stage CIC Structure (per I/Q channel)</h3>
        <div className="overflow-x-auto">
          <svg viewBox="0 0 900 340" className="w-full max-w-4xl mx-auto" style={{ minWidth: 600 }}>
            {/* Background grid */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
              </marker>
              <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
              </marker>
              <linearGradient id="stageGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Stage 1: Integrator */}
            <rect x="40" y="40" width="200" height="100" rx="8" fill="url(#stageGrad)" stroke="#06b6d4" strokeWidth="2" />
            <text x="140" y="70" textAnchor="middle" fill="#06b6d4" fontSize="14" fontWeight="bold">Stage 1: Integrator</text>
            <text x="140" y="95" textAnchor="middle" fill="#94a3b8" fontSize="11">y[n] = x[n] + y[n-1]</text>
            <text x="140" y="115" textAnchor="middle" fill="#64748b" fontSize="10">H(z) = 1/(1-z⁻¹)</text>
            
            {/* Delay element in integrator */}
            <rect x="100" y="105" width="80" height="25" rx="4" fill="#1e3a5f" stroke="#334155" strokeWidth="1" />
            <text x="140" y="122" textAnchor="middle" fill="#67e8f9" fontSize="10">z⁻¹ (delay)</text>

            {/* Arrow from Stage 1 to Stage 2 */}
            <line x1="240" y1="90" x2="310" y2="90" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="275" y="80" textAnchor="middle" fill="#fbbf24" fontSize="10">×3</text>

            {/* Stage 2: Comb */}
            <rect x="310" y="40" width="200" height="100" rx="8" fill="url(#stageGrad)" stroke="#10b981" strokeWidth="2" />
            <text x="410" y="70" textAnchor="middle" fill="#10b981" fontSize="14" fontWeight="bold">Stage 2: Comb</text>
            <text x="410" y="95" textAnchor="middle" fill="#94a3b8" fontSize="11">y[n] = x[n] - x[n-1]</text>
            <text x="410" y="115" textAnchor="middle" fill="#64748b" fontSize="10">H(z) = 1 - z⁻¹</text>

            {/* Delay element in comb */}
            <rect x="370" y="105" width="80" height="25" rx="4" fill="#1e3a5f" stroke="#334155" strokeWidth="1" />
            <text x="410" y="122" textAnchor="middle" fill="#6ee7b7" fontSize="10">z⁻¹ (delay)</text>

            {/* Arrow to output */}
            <line x1="510" y1="90" x2="600" y2="90" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowhead-green)" />

            {/* Output */}
            <rect x="600" y="65" width="120" height="50" rx="8" fill="#1e3a5f" stroke="#8b5cf6" strokeWidth="2" />
            <text x="660" y="85" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontWeight="bold">Output</text>
            <text x="660" y="102" textAnchor="middle" fill="#94a3b8" fontSize="10">ac2 / q_ac2</text>

            {/* Input */}
            <rect x="0" y="65" width="40" height="50" rx="8" fill="#1e3a5f" stroke="#f59e0b" strokeWidth="2" />
            <text x="20" y="85" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold">Input</text>
            <text x="20" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9">sdr_rx</text>
            <line x1="40" y1="90" x2="40" y2="90" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* Binomial coefficients explanation */}
            <rect x="40" y="180" width="820" height="140" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
            <text x="450" y="210" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">
              Binomial Coefficient Expansion (N=3): (1 + z⁻¹)³ = 1 + 3z⁻¹ + 3z⁻² + z⁻³
            </text>
            <text x="450" y="240" textAnchor="middle" fill="#94a3b8" fontSize="12">
              This is why the code uses: (ac + (prev1 + prev2) × 3 + prev3) &gt;&gt; M_SR
            </text>
            
            {/* Coefficient boxes */}
            <rect x="180" y="260" width="60" height="35" rx="4" fill="#164e63" stroke="#06b6d4" strokeWidth="1" />
            <text x="210" y="282" textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="bold">1</text>
            
            <rect x="280" y="260" width="60" height="35" rx="4" fill="#164e63" stroke="#06b6d4" strokeWidth="1" />
            <text x="310" y="282" textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="bold">×3</text>
            
            <rect x="380" y="260" width="60" height="35" rx="4" fill="#164e63" stroke="#06b6d4" strokeWidth="1" />
            <text x="410" y="282" textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="bold">×3</text>
            
            <rect x="480" y="260" width="60" height="35" rx="4" fill="#164e63" stroke="#06b6d4" strokeWidth="1" />
            <text x="510" y="282" textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="bold">1</text>

            <text x="600" y="282" textAnchor="start" fill="#94a3b8" fontSize="11">← Coefficients applied to delayed samples</text>
          </svg>
        </div>
      </div>

      {/* Variable Mapping */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">State Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">I-Channel (In-Phase)</h4>
            <div className="space-y-1 font-mono text-sm">
              <VarRow name="i_s0za1" desc="Integrator stage 0, current accumulator" />
              <VarRow name="i_s0zb0" desc="Integrator stage 0, delay z⁻¹" />
              <VarRow name="i_s0zb1" desc="Integrator stage 0, delay z⁻²" />
              <VarRow name="i_s1za1" desc="Comb stage 1, current accumulator" />
              <VarRow name="i_s1zb0" desc="Comb stage 1, delay z⁻¹" />
              <VarRow name="i_s1zb1" desc="Comb stage 1, delay z⁻²" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-2">Q-Channel (Quadrature)</h4>
            <div className="space-y-1 font-mono text-sm">
              <VarRow name="q_s0za1" desc="Integrator stage 0, current accumulator" />
              <VarRow name="q_s0zb0" desc="Integrator stage 0, delay z⁻¹" />
              <VarRow name="q_s0zb1" desc="Integrator stage 0, delay z⁻²" />
              <VarRow name="q_s1za1" desc="Comb stage 1, current accumulator" />
              <VarRow name="q_s1zb0" desc="Comb stage 1, delay z⁻¹" />
              <VarRow name="q_s1zb1" desc="Comb stage 1, delay z⁻²" />
              <VarRow name="q_ac2" desc="Final Q output sample" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Insight */}
      <div className="bg-gradient-to-r from-cyan-950/50 to-blue-950/50 rounded-xl border border-cyan-800/50 p-6">
        <h3 className="text-lg font-semibold text-cyan-300 mb-2">💡 Key Insight: Multiplication-Free Design</h3>
        <p className="text-gray-300 text-sm">
          The CIC filter is ideal for FPGA/microcontroller SDR implementations because it uses <strong className="text-white">only additions 
          and bit-shifts</strong> (the <code className="text-cyan-300 bg-gray-800 px-1 rounded">&gt;&gt; M_SR</code> operation). 
          The binomial expansion of (1+z⁻¹)³ gives coefficients [1, 3, 3, 1], and the ×3 multiplication 
          is implemented as <code className="text-cyan-300 bg-gray-800 px-1 rounded">(a + b) * 3</code> which 
          the compiler optimizes to shifts and adds. This makes the filter extremely fast on resource-constrained hardware.
        </p>
      </div>
    </div>
  );
}

function InfoCard({ title, value, description, color }: { title: string; value: string; description: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: "border-cyan-500/30 bg-cyan-500/5",
    blue: "border-blue-500/30 bg-blue-500/5",
    purple: "border-purple-500/30 bg-purple-500/5",
  };
  const textColors: Record<string, string> = {
    cyan: "text-cyan-300",
    blue: "text-blue-300",
    purple: "text-purple-300",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-xs text-gray-400 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${textColors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  );
}

function VarRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-800/50">
      <span className="text-amber-300 min-w-[80px]">{name}</span>
      <span className="text-gray-500">→</span>
      <span className="text-gray-400">{desc}</span>
    </div>
  );
}
