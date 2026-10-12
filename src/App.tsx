import { useState } from "react";
import CICFilterDiagram from "./components/CICFilterDiagram";
import StateMachineView from "./components/StateMachineView";
import CodeViewer from "./components/CodeViewer";
import Simulator from "./components/Simulator";

type Tab = "architecture" | "state-machine" | "code" | "simulator";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("architecture");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "architecture", label: "Filter Architecture", icon: "🔬" },
    { id: "state-machine", label: "State Machine", icon: "🔄" },
    { id: "code", label: "Annotated Code", icon: "📝" },
    { id: "simulator", label: "Live Simulator", icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl">
              📡
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                SDR CIC Filter Visualizer
              </h1>
              <p className="text-xs text-gray-400">
                Cascaded Integrator-Comb Decimation Filter — N=3, M=1
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "architecture" && <CICFilterDiagram />}
        {activeTab === "state-machine" && <StateMachineView />}
        {activeTab === "code" && <CodeViewer />}
        {activeTab === "simulator" && <Simulator />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        CIC Filter: y[n] = R<sup>M·N</sup> · (1 - z<sup>-1</sup>)<sup>N</sup> / (1 - z<sup>-R</sup>)<sup>N</sup>
        &nbsp;|&nbsp; N=3 stages, Decimation factor R=2, Shift M_SR=1
      </footer>
    </div>
  );
}
