import { useState } from "react";

interface CodeLine {
  line: number;
  code: string;
  annotation?: string;
  highlight?: "declaration" | "function" | "integrator" | "comb" | "transition" | "output";
}

const codeLines: CodeLine[] = [
  { line: 1, code: "static int16_t i_s0za1, i_s0zb0, i_s0zb1, i_s1za1, i_s1zb0, i_s1zb1;", annotation: "I-channel CIC filter state variables (integrator + comb stages)", highlight: "declaration" },
  { line: 2, code: "static int16_t q_s0za1, q_s0zb0, q_s0zb1, q_s1za1, q_s1zb0, q_s1zb1, q_ac2;", annotation: "Q-channel CIC filter state variables + final output", highlight: "declaration" },
  { line: 3, code: "", annotation: "" },
  { line: 4, code: "#define M_SR  1  // CIC N=3", annotation: "Shift amount for gain normalization. M_SR=1 means divide by 2.", highlight: "declaration" },
  { line: 5, code: "", annotation: "" },
  { line: 6, code: "void sdr_rx_00(){", annotation: "STATE 0: I-channel output state", highlight: "function" },
  { line: 7, code: "  int16_t ac = sdr_rx_common_i();", annotation: "Read I sample from ADC", highlight: "integrator" },
  { line: 8, code: "  func_ptr = sdr_rx_01;", annotation: "Next state: read Q", highlight: "transition" },
  { line: 9, code: "  int16_t i_s1za0 = (ac + (i_s0za1 + i_s0zb0) * 3 + i_s0zb1) >> M_SR;", annotation: "Integrator: binomial [1,3,3,1] applied to delayed samples, then decimate", highlight: "integrator" },
  { line: 10, code: "  i_s0za1 = ac;", annotation: "Update integrator state", highlight: "integrator" },
  { line: 11, code: "  int16_t ac2 = (i_s1za0 + (i_s1za1 + i_s1zb0) * 3 + i_s1zb1);", annotation: "Comb stage: difference of integrator outputs with binomial weighting", highlight: "comb" },
  { line: 12, code: "  i_s1za1 = i_s1za0;", annotation: "Update comb state", highlight: "comb" },
  { line: 13, code: "  process(ac2, q_ac2);", annotation: "★ OUTPUT: Pass I and Q to demodulator/audio pipeline", highlight: "output" },
  { line: 14, code: "}", annotation: "" },
  { line: 15, code: "", annotation: "" },
  { line: 16, code: "void sdr_rx_02(){", annotation: "STATE 2: I-channel store state", highlight: "function" },
  { line: 17, code: "  int16_t ac = sdr_rx_common_i();", annotation: "Read I sample", highlight: "integrator" },
  { line: 18, code: "  func_ptr = sdr_rx_03;", annotation: "Next state: Q integrator", highlight: "transition" },
  { line: 19, code: "  i_s0zb1 = i_s0zb0; i_s0zb0 = ac;", annotation: "Shift delay line: z⁻² ← z⁻¹ ← new", highlight: "integrator" },
  { line: 20, code: "}", annotation: "" },
  { line: 21, code: "", annotation: "" },
  { line: 22, code: "void sdr_rx_04(){", annotation: "STATE 4: I-channel integrator state", highlight: "function" },
  { line: 23, code: "  int16_t ac = sdr_rx_common_i();", annotation: "Read I sample", highlight: "integrator" },
  { line: 24, code: "  func_ptr = sdr_rx_05;", annotation: "Next state: Q store", highlight: "transition" },
  { line: 25, code: "  i_s1zb1 = i_s1zb0;", annotation: "Shift comb delay line", highlight: "comb" },
  { line: 26, code: "  i_s1zb0 = (ac + (i_s0za1 + i_s0zb0) * 3 + i_s0zb1) >> M_SR;", annotation: "Compute integrator output → store as comb input", highlight: "integrator" },
  { line: 27, code: "  i_s0za1 = ac;", annotation: "Update integrator state", highlight: "integrator" },
  { line: 28, code: "}", annotation: "" },
  { line: 29, code: "", annotation: "" },
  { line: 30, code: "void sdr_rx_06(){", annotation: "STATE 6: I-channel store state", highlight: "function" },
  { line: 31, code: "  int16_t ac = sdr_rx_common_i();", annotation: "Read I sample", highlight: "integrator" },
  { line: 32, code: "  func_ptr = sdr_rx_07;", annotation: "Next state: Q output", highlight: "transition" },
  { line: 33, code: "  i_s0zb1 = i_s0zb0; i_s0zb0 = ac;", annotation: "Shift delay line", highlight: "integrator" },
  { line: 34, code: "}", annotation: "" },
  { line: 35, code: "", annotation: "" },
  { line: 36, code: "void sdr_rx_01(){", annotation: "STATE 1: Q-channel store state", highlight: "function" },
  { line: 37, code: "  int16_t ac = sdr_rx_common_q();", annotation: "Read Q sample", highlight: "integrator" },
  { line: 38, code: "  func_ptr = sdr_rx_02;", annotation: "Next state: I store", highlight: "transition" },
  { line: 39, code: "  q_s0zb1 = q_s0zb0; q_s0zb0 = ac;", annotation: "Shift delay line", highlight: "integrator" },
  { line: 40, code: "}", annotation: "" },
  { line: 41, code: "", annotation: "" },
  { line: 42, code: "void sdr_rx_03(){", annotation: "STATE 3: Q-channel integrator state", highlight: "function" },
  { line: 43, code: "  int16_t ac = sdr_rx_common_q();", annotation: "Read Q sample", highlight: "integrator" },
  { line: 44, code: "  func_ptr = sdr_rx_04;", annotation: "Next state: I integrator", highlight: "transition" },
  { line: 45, code: "  q_s1zb1 = q_s1zb0;", annotation: "Shift comb delay line", highlight: "comb" },
  { line: 46, code: "  q_s1zb0 = (ac + (q_s0za1 + q_s0zb0) * 3 + q_s0zb1) >> M_SR;", annotation: "Compute integrator output → store as comb input", highlight: "integrator" },
  { line: 47, code: "  q_s0za1 = ac;", annotation: "Update integrator state", highlight: "integrator" },
  { line: 48, code: "}", annotation: "" },
  { line: 49, code: "", annotation: "" },
  { line: 50, code: "void sdr_rx_05(){", annotation: "STATE 5: Q-channel store state", highlight: "function" },
  { line: 51, code: "  int16_t ac = sdr_rx_common_q();", annotation: "Read Q sample", highlight: "integrator" },
  { line: 52, code: "  func_ptr = sdr_rx_06;", annotation: "Next state: I store", highlight: "transition" },
  { line: 53, code: "  q_s0zb1 = q_s0zb0; q_s0zb0 = ac;", annotation: "Shift delay line", highlight: "integrator" },
  { line: 54, code: "}", annotation: "" },
  { line: 55, code: "", annotation: "" },
  { line: 56, code: "void sdr_rx_07(){", annotation: "STATE 7: Q-channel output state", highlight: "function" },
  { line: 57, code: "  int16_t ac = sdr_rx_common_q();", annotation: "Read Q sample from ADC", highlight: "integrator" },
  { line: 58, code: "  func_ptr = sdr_rx_00;", annotation: "Next state: back to start (I output)", highlight: "transition" },
  { line: 59, code: "  int16_t q_s1za0 = (ac + (q_s0za1 + q_s0zb0) * 3 + q_s0zb1) >> M_SR;", annotation: "Integrator: binomial [1,3,3,1] applied", highlight: "integrator" },
  { line: 60, code: "  q_s0za1 = ac;", annotation: "Update integrator state", highlight: "integrator" },
  { line: 61, code: "  q_ac2 = (q_s1za0 + (q_s1za1 + q_s1zb0) * 3 + q_s1zb1);", annotation: "Comb stage: final Q output computed", highlight: "comb" },
  { line: 62, code: "  q_s1za1 = q_s1za0;", annotation: "Update comb state", highlight: "comb" },
  { line: 63, code: "}", annotation: "" },
];

const highlightColors: Record<string, string> = {
  declaration: "bg-purple-500/10 border-l-purple-500",
  function: "bg-blue-500/10 border-l-blue-500",
  integrator: "bg-cyan-500/10 border-l-cyan-500",
  comb: "bg-green-500/10 border-l-green-500",
  transition: "bg-amber-500/10 border-l-amber-500",
  output: "bg-red-500/10 border-l-red-500",
};

export default function CodeViewer() {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  const filteredLines = filterType === "all" 
    ? codeLines 
    : codeLines.filter(l => !l.highlight || l.highlight === filterType || l.line <= 5);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showAnnotations}
              onChange={(e) => setShowAnnotations(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
            />
            Show annotations
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Highlight:</span>
            {["all", "integrator", "comb", "transition", "output"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  filterType === type
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-400 hover:text-gray-200 bg-gray-800"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-800">
          <LegendItem color="bg-purple-500" label="Declarations" />
          <LegendItem color="bg-blue-500" label="Function" />
          <LegendItem color="bg-cyan-500" label="Integrator" />
          <LegendItem color="bg-green-500" label="Comb" />
          <LegendItem color="bg-amber-500" label="Transition" />
          <LegendItem color="bg-red-500" label="Output" />
        </div>
      </div>

      {/* Code Display */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <pre className="text-sm leading-relaxed">
            {filteredLines.map((line) => (
              <div
                key={line.line}
                className={`flex border-l-2 ${
                  line.highlight && showAnnotations
                    ? highlightColors[line.highlight]
                    : "border-l-transparent"
                }`}
              >
                {/* Line number */}
                <span className="select-none w-10 text-right pr-3 text-gray-600 bg-gray-800/50 py-0.5 text-xs flex-shrink-0">
                  {line.line}
                </span>
                {/* Code */}
                <span className="px-3 py-0.5 font-mono whitespace-pre text-gray-200 flex-1">
                  {highlightSyntax(line.code)}
                </span>
                {/* Annotation */}
                {showAnnotations && line.annotation && (
                  <span className="px-3 py-0.5 text-xs text-gray-400 italic max-w-xs flex-shrink-0 hidden lg:block">
                    // {line.annotation}
                  </span>
                )}
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Key Patterns */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Code Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PatternCard
            title="Binomial Integrator"
            code="(ac + (prev1 + prev2) * 3 + prev3) >> M_SR"
            explanation="Applies [1,3,3,1] binomial coefficients to the 4 most recent samples, then decimates by shifting right by M_SR."
            color="cyan"
          />
          <PatternCard
            title="Comb Stage"
            code="(s1za0 + (s1za1 + s1zb0) * 3 + s1zb1)"
            explanation="Second CIC stage computes the comb (difference) filter output using the same binomial structure but without the final shift."
            color="green"
          />
          <PatternCard
            title="State Transition"
            code="func_ptr = sdr_rx_XX;"
            explanation="Each function sets the next state's function pointer, creating a zero-cost state machine without switch/if overhead."
            color="amber"
          />
          <PatternCard
            title="Delay Line Update"
            code="s0zb1 = s0zb0; s0zb0 = ac;"
            explanation="Classic shift-register pattern: oldest sample falls off, new sample enters. Implements z⁻¹ delays."
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-sm ${color}`} />
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function PatternCard({ title, code, explanation, color }: { title: string; code: string; explanation: string; color: string }) {
  const borderColors: Record<string, string> = {
    cyan: "border-cyan-500/30",
    green: "border-green-500/30",
    amber: "border-amber-500/30",
    purple: "border-purple-500/30",
  };
  const textColors: Record<string, string> = {
    cyan: "text-cyan-300",
    green: "text-green-300",
    amber: "text-amber-300",
    purple: "text-purple-300",
  };
  return (
    <div className={`rounded-lg border p-4 ${borderColors[color]} bg-gray-800/30`}>
      <h4 className={`text-sm font-semibold ${textColors[color]} mb-2`}>{title}</h4>
      <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 block mb-2 overflow-x-auto">
        {code}
      </code>
      <p className="text-xs text-gray-400">{explanation}</p>
    </div>
  );
}

function highlightSyntax(code: string): JSX.Element {
  if (!code) return <>{code}</>;
  
  // Simple syntax highlighting
  const parts: JSX.Element[] = [];
  let remaining = code;
  let key = 0;

  // Keywords
  const keywords = /\b(void|int16_t|static|#define|return)\b/g;
  const functions = /\b(sdr_rx_\w+|sdr_rx_common_\w+|process)\b/g;
  const numbers = /\b(\d+)\b/g;
  const operators = /(>>|<<|\+|-|\*|=)/g;

  // Simple approach: just colorize the whole thing with basic patterns
  const highlighted = remaining
    .replace(/(void|int16_t|static)/g, '§KW§$1§/KW§')
    .replace(/(#define)/g, '§PRE§$1§/PRE§')
    .replace(/(sdr_rx_\w+|sdr_rx_common_\w+|process|func_ptr)/g, '§FN§$1§/FN§')
    .replace(/(M_SR)/g, '§MACRO§$1§/MACRO§');

  // Split and render
  const segments = highlighted.split(/(§\w+§.*?§\/\w+§)/g);
  
  segments.forEach((seg) => {
    if (seg.startsWith("§KW§")) {
      parts.push(<span key={key++} className="text-purple-400">{seg.replace(/§\w+§|§\/\w+§/g, "")}</span>);
    } else if (seg.startsWith("§PRE§")) {
      parts.push(<span key={key++} className="text-pink-400">{seg.replace(/§\w+§|§\/\w+§/g, "")}</span>);
    } else if (seg.startsWith("§FN§")) {
      parts.push(<span key={key++} className="text-cyan-400">{seg.replace(/§\w+§|§\/\w+§/g, "")}</span>);
    } else if (seg.startsWith("§MACRO§")) {
      parts.push(<span key={key++} className="text-amber-400">{seg.replace(/§\w+§|§\/\w+§/g, "")}</span>);
    } else if (seg) {
      parts.push(<span key={key++}>{seg}</span>);
    }
  });

  return <>{parts}</>;
}
