/**
 * Transformer-Based EV Charging Cyber Attack Detection
 * Complete Single-Page Application (React 18 + Tailwind + Chart.js)
 */

const { useState, useEffect, useRef, useMemo } = React;

// --- Helper Utilities ---
// Configurable API Base: Uses environment-injected API base URL or defaults to relative same-origin path
const API_BASE = (typeof window !== "undefined" && window.__API_BASE__ && window.__API_BASE__.trim() !== "")
    ? window.__API_BASE__.trim().replace(/\/+$/, "")
    : "";

const ATTACK_COLORS = {
    "NORMAL": { bg: "bg-emerald-500/20", border: "border-emerald-500", text: "text-emerald-400", hex: "#10b981" },
    "DoS ATTACK": { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-400", hex: "#ef4444" },
    "DATA TAMPERING": { bg: "bg-amber-500/20", border: "border-amber-500", text: "text-amber-400", hex: "#f59e0b" },
    "UNAUTHORIZED ACCESS": { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-400", hex: "#f97316" },
    "MALWARE ACTIVITY": { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-400", hex: "#a855f7" }
};

const SEVERITY_BADGES = {
    "CRITICAL": "bg-red-950/80 text-red-400 border border-red-600 animate-pulse",
    "HIGH": "bg-orange-950/80 text-orange-400 border border-orange-500",
    "MEDIUM": "bg-yellow-950/80 text-yellow-400 border border-yellow-500",
    "LOW": "bg-emerald-950/80 text-emerald-400 border border-emerald-600"
};

// --- Main App Component ---
function App() {
    const [activeTab, setActiveTab] = useState("overview");
    const [systemStatus, setSystemStatus] = useState({ online: true, mode: "Simulated Data" });
    const [analytics, setAnalytics] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simSpeed, setSimSpeed] = useState(2000);
    const [selectedStation, setSelectedStation] = useState(null);
    const [stationModalData, setStationModalData] = useState(null);
    const [lastInjectedEvent, setLastInjectedEvent] = useState(null);
    const [activePipelineStage, setActivePipelineStage] = useState(1);
    const [notification, setNotification] = useState(null);

    // Refresh dashboard data
    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/analytics/overview`);
            const json = await res.json();
            if (json.status === "success") {
                setAnalytics(json.data);
            }
        } catch (err) {
            console.error("Error loading analytics:", err);
        }
    };

    // Refresh model information
    const fetchModelInfo = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/model/info`);
            const json = await res.json();
            if (json.status === "success") {
                setModelInfo(json.data);
            }
        } catch (err) {
            console.error("Error loading model info:", err);
        }
    };

    // Initial load
    useEffect(() => {
        fetchAnalytics();
        fetchModelInfo();
        const interval = setInterval(fetchAnalytics, 3500);
        return () => clearInterval(interval);
    }, []);

    // Simulation auto-tick loop
    useEffect(() => {
        let timer = null;
        if (isSimulating) {
            timer = setInterval(async () => {
                await triggerSimulation("RANDOM");
            }, simSpeed);
        }
        return () => clearInterval(timer);
    }, [isSimulating, simSpeed]);

    // Trigger simulation helper
    const triggerSimulation = async (attackType = "RANDOM", targetStation = null) => {
        try {
            // Animate pipeline stages
            setActivePipelineStage(1);
            setTimeout(() => setActivePipelineStage(2), 250);
            setTimeout(() => setActivePipelineStage(3), 500);
            setTimeout(() => setActivePipelineStage(4), 750);
            setTimeout(() => setActivePipelineStage(5), 1000);

            const url = `${API_BASE}/api/telemetry/simulate?attack_type=${encodeURIComponent(attackType)}${targetStation ? `&station_id=${targetStation}` : ""}`;
            const res = await fetch(url, { method: "POST" });
            const data = await res.json();
            if (data.status === "success") {
                setLastInjectedEvent(data.data);
                fetchAnalytics();

                if (data.data.prediction !== "NORMAL") {
                    showNotification(`ALERT: ${data.data.prediction} detected on ${data.data.raw_telemetry.charging_station_id}! (${data.data.confidence}% confidence)`, "danger");
                }
            }
        } catch (err) {
            console.error("Simulation error:", err);
        }
    };

    const showNotification = (msg, type = "info") => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Open Station Drilldown Modal
    const handleStationClick = async (stationId) => {
        try {
            const res = await fetch(`${API_BASE}/api/stations/${stationId}`);
            const json = await res.json();
            if (json.status === "success") {
                setStationModalData(json.data);
                setSelectedStation(stationId);
            }
        } catch (err) {
            console.error("Error opening station:", err);
        }
    };

    return (
        <div className="flex flex-col min-h-screen text-slate-100">
            {/* Top Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-2xl border flex items-center space-x-3 transition-all transform animate-bounce ${
                    notification.type === 'danger' 
                        ? 'bg-red-950/95 border-red-500 text-red-200' 
                        : 'bg-cyan-950/95 border-cyan-500 text-cyan-200'
                }`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
                    <span className="font-mono text-sm font-semibold">{notification.msg}</span>
                </div>
            )}

            {/* HEADER */}
            <header className="border-b border-slate-800/80 bg-[#0a0f1d]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center">
                                    TRANSFORMER-BASED EV CHARGING CYBER ATTACK DETECTION
                                </h1>
                            </div>
                            <p className="text-xs text-slate-400 font-medium tracking-wide">
                                AI-Powered Security Monitoring for Electric Vehicle Infrastructure
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Prototype Badge */}
                        <span className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-slate-800/90 text-slate-300 border border-slate-700 rounded-md">
                            Simulated / Prototype Data
                        </span>

                        {/* AI Engine Status Indicator */}
                        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-glow-green"></span>
                            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
                                AI ENGINE: ONLINE
                            </span>
                        </div>

                        {/* Quick Simulation Toggle */}
                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition flex items-center space-x-1.5 border ${
                                isSimulating 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse' 
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500 hover:bg-cyan-500/30'
                            }`}
                        >
                            <span>{isSimulating ? "PAUSE SIM" : "LIVE SIM"}</span>
                        </button>
                    </div>
                </div>

                {/* Sub-Header Navigation Tabs */}
                <div className="max-w-7xl mx-auto mt-4 flex items-center space-x-1 overflow-x-auto pb-1 text-sm border-t border-slate-800/60 pt-2 font-medium">
                    {[
                        { id: "overview", label: "Dashboard", icon: "Activity" },
                        { id: "map", label: "Station Map", icon: "MapPin" },
                        { id: "attacks", label: "Attack Detection", icon: "ShieldAlert" },
                        { id: "ai-model", label: "AI Transformer Model", icon: "Cpu" },
                        { id: "live-demo", label: "Live Simulation Lab", icon: "Zap" },
                        { id: "features", label: "Feature Pipeline", icon: "Sliders" },
                        { id: "logs", label: "Security Event Log", icon: "FileText" },
                        { id: "architecture", label: "System Architecture", icon: "GitCommit" }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3.5 py-1.5 rounded-md whitespace-nowrap transition flex items-center space-x-2 font-mono text-xs tracking-wider uppercase ${
                                activeTab === tab.id
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm shadow-cyan-500/20"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            }`}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
                {activeTab === "overview" && (
                    <OverviewView 
                        analytics={analytics} 
                        onStationClick={handleStationClick} 
                        onNavigate={setActiveTab} 
                        triggerSimulation={triggerSimulation}
                    />
                )}
                {activeTab === "map" && (
                    <StationMapView 
                        stations={analytics?.stations || []} 
                        onStationClick={handleStationClick} 
                    />
                )}
                {activeTab === "attacks" && (
                    <AttackDetectionView 
                        analytics={analytics} 
                        triggerSimulation={triggerSimulation}
                    />
                )}
                {activeTab === "ai-model" && (
                    <AIModelView 
                        modelInfo={modelInfo} 
                        onRetrainComplete={fetchModelInfo}
                    />
                )}
                {activeTab === "live-demo" && (
                    <LiveDemoView 
                        isSimulating={isSimulating}
                        setIsSimulating={setIsSimulating}
                        simSpeed={simSpeed}
                        setSimSpeed={setSimSpeed}
                        triggerSimulation={triggerSimulation}
                        lastEvent={lastInjectedEvent}
                        activeStage={activePipelineStage}
                        onRefreshAnalytics={fetchAnalytics}
                    />
                )}
                {activeTab === "features" && (
                    <FeaturePipelineView lastEvent={lastInjectedEvent} />
                )}
                {activeTab === "logs" && (
                    <SecurityLogsView />
                )}
                {activeTab === "architecture" && (
                    <ArchitectureView />
                )}
            </main>

            {/* STATION DETAIL MODAL */}
            {selectedStation && stationModalData && (
                <StationDetailModal 
                    data={stationModalData} 
                    onClose={() => { setSelectedStation(null); setStationModalData(null); }} 
                    triggerSimulation={triggerSimulation}
                />
            )}

            {/* FOOTER */}
            <footer className="border-t border-slate-800/80 bg-[#070b14] py-4 text-center text-xs text-slate-500 font-mono">
                Academic Cybersecurity Prototype • Transformer-Based EV Charging Cyber Attack Detection • Powered by PyTorch & FastAPI
            </footer>
        </div>
    );
}

// ==========================================
// VIEW 1: OVERVIEW DASHBOARD
// ==========================================
function OverviewView({ analytics, onStationClick, onNavigate, triggerSimulation }) {
    const kpis = analytics?.kpis || {
        total_stations: 6,
        active_sessions: 8,
        network_events: 24,
        threats_detected: 4,
        detection_accuracy: 100.0,
        stations_status_summary: { normal: 4, suspicious: 1, under_attack: 1 }
    };

    return (
        <div className="space-y-6">
            {/* Top Operational Status Banner */}
            <div className="cyber-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-l-cyan-500">
                <div className="flex items-center space-x-3">
                    <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500"></span>
                    </span>
                    <div>
                        <div className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                            <span>SYSTEM MONITORING ACTIVE</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                                6 STATIONS ONLINE
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Ingesting OCPP telemetry, physical charging metrics, and real-time self-attention anomaly vectors.
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => triggerSimulation("RANDOM")}
                        className="btn-cyber-primary px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white"
                    >
                        + Inject Random Telemetry
                    </button>
                    <button
                        onClick={() => onNavigate("live-demo")}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    >
                        Open Simulation Lab →
                    </button>
                </div>
            </div>

            {/* Top 5 KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Charging Stations</div>
                    <div className="text-2xl font-bold font-mono text-white mt-1 flex items-baseline justify-between">
                        <span>{kpis.total_stations}</span>
                        <span className="text-xs font-sans text-emerald-400 font-medium">All Online</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">DC Fast + Level 2 Grid</div>
                </div>

                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Sessions</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 mt-1 flex items-baseline justify-between">
                        <span>{kpis.active_sessions}</span>
                        <span className="text-xs font-sans text-cyan-300 font-medium">EVs Connected</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Nominal Power Flowing</div>
                </div>

                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Network Events</div>
                    <div className="text-2xl font-bold font-mono text-blue-400 mt-1 flex items-baseline justify-between">
                        <span>{kpis.network_events}</span>
                        <span className="text-xs font-sans text-blue-300 font-medium">Processed</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Telemetry & OCPP Packets</div>
                </div>

                <div className="cyber-card p-4 rounded-xl border-red-900/50">
                    <div className="text-xs font-mono text-red-400 uppercase tracking-wider">Threats Detected</div>
                    <div className="text-2xl font-bold font-mono text-red-400 mt-1 flex items-baseline justify-between">
                        <span>{kpis.threats_detected}</span>
                        <span className="text-xs font-sans px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                            Flagged
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Intrusions Intercepted</div>
                </div>

                <div className="cyber-card p-4 rounded-xl border-emerald-900/50">
                    <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Model Accuracy</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 flex items-baseline justify-between">
                        <span>{kpis.detection_accuracy}%</span>
                        <span className="text-xs font-sans text-emerald-300">Prototype</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">Transformer Test Split</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Traffic & Latency Real-time Chart */}
                <div className="cyber-card p-5 rounded-xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                <span>REAL-TIME NETWORK TRAFFIC & LATENCY</span>
                            </h3>
                            <p className="text-xs text-slate-400">Request Frequency (req/s) vs Response Latency (ms)</p>
                        </div>
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded border border-cyan-800">
                            Live Telemetry Stream
                        </span>
                    </div>
                    <div className="h-64">
                        <TrafficLineChart series={analytics?.recent_traffic_series || []} />
                    </div>
                </div>

                {/* Threat Distribution Donut */}
                <div className="cyber-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span>ATTACK DISTRIBUTION</span>
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">All Events</span>
                    </div>
                    <div className="h-48 flex items-center justify-center">
                        <ThreatDistributionChart distribution={analytics?.attack_distribution || {}} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono">
                        {Object.entries(analytics?.attack_distribution || {}).map(([name, count]) => (
                            <div key={name} className="flex items-center justify-between p-1.5 rounded bg-slate-900/80 border border-slate-800">
                                <span className="text-slate-400 truncate mr-1">{name}</span>
                                <span className="font-bold text-cyan-400">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stations Overview Cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>CHARGING STATION INFRASTRUCTURE STATUS</span>
                    </h3>
                    <span className="text-xs text-slate-400">Click any station for real-time telemetry drilldown</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(analytics?.stations || []).map(st => (
                        <div
                            key={st.id}
                            onClick={() => onStationClick(st.id)}
                            className={`cyber-card p-3.5 rounded-xl cursor-pointer hover:border-cyan-400 transition transform hover:-translate-y-1 ${
                                st.status === 'UNDER_ATTACK' ? 'border-red-500 bg-red-950/20' :
                                st.status === 'SUSPICIOUS' ? 'border-amber-500 bg-amber-950/20' :
                                'border-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-white">{st.id}</span>
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                    st.status === 'UNDER_ATTACK' ? 'bg-red-500 pulse-glow-red' :
                                    st.status === 'SUSPICIOUS' ? 'bg-amber-400 animate-pulse' :
                                    'bg-emerald-400'
                                }`}></span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-1">{st.name.split('(')[0]}</div>
                            <div className="mt-3 space-y-1 text-[11px] font-mono">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Power:</span>
                                    <span className="text-cyan-300 font-bold">{st.current_power} kW</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Voltage:</span>
                                    <span className="text-slate-300">{st.current_voltage} V</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Status:</span>
                                    <span className={
                                        st.status === 'UNDER_ATTACK' ? 'text-red-400 font-bold' :
                                        st.status === 'SUSPICIOUS' ? 'text-amber-400 font-bold' :
                                        'text-emerald-400'
                                    }>{st.status}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Alerts Feed */}
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>RECENT INTRUSION ALERTS (SOC FEED)</span>
                    </h3>
                    <button
                        onClick={() => onNavigate("logs")}
                        className="text-xs font-mono text-cyan-400 hover:underline"
                    >
                        View Full Security Log →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="p-2.5">Alert ID</th>
                                <th className="p-2.5">Station</th>
                                <th className="p-2.5">Detected Attack</th>
                                <th className="p-2.5">Confidence</th>
                                <th className="p-2.5">Severity</th>
                                <th className="p-2.5">Triggered Telemetry</th>
                                <th className="p-2.5">Recommended Response</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {(analytics?.recent_alerts || []).length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-4 text-center text-slate-500">
                                        No active intrusion alerts. System running nominally.
                                    </td>
                                </tr>
                            ) : (
                                (analytics?.recent_alerts || []).map(alt => (
                                    <tr key={alt.id} className="hover:bg-slate-800/40 transition">
                                        <td className="p-2.5 text-cyan-300 font-bold">{alt.id}</td>
                                        <td className="p-2.5 text-white">{alt.station_id}</td>
                                        <td className="p-2.5">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                ATTACK_COLORS[alt.detected_attack_type]?.bg || "bg-red-500/20"
                                            } ${ATTACK_COLORS[alt.detected_attack_type]?.text || "text-red-400"}`}>
                                                {alt.detected_attack_type}
                                            </span>
                                        </td>
                                        <td className="p-2.5 font-bold text-emerald-400">{alt.confidence_score}%</td>
                                        <td className="p-2.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                SEVERITY_BADGES[alt.severity] || "bg-red-950 text-red-400"
                                            }`}>
                                                {alt.severity}
                                            </span>
                                        </td>
                                        <td className="p-2.5 text-slate-300 max-w-xs truncate" title={alt.triggered_features}>
                                            {alt.triggered_features}
                                        </td>
                                        <td className="p-2.5 text-slate-400 max-w-xs truncate" title={alt.recommended_response}>
                                            {alt.recommended_response}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// VIEW 2: STATION MAP & DRILLDOWN
// ==========================================
function StationMapView({ stations, onStationClick }) {
    return (
        <div className="space-y-6">
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
                            <span>EV CHARGING STATION INFRASTRUCTURE MAP</span>
                        </h2>
                        <p className="text-xs text-slate-400">
                            Geospatial & telemetry status grid for smart connected charging terminals.
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-mono">
                        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span><span>Normal</span></span>
                        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span><span>Suspicious</span></span>
                        <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-glow-red"></span><span>Under Attack</span></span>
                    </div>
                </div>
            </div>

            {/* Station Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map(st => {
                    const isAttack = st.status === "UNDER_ATTACK";
                    const isSuspicious = st.status === "SUSPICIOUS";
                    const loadPct = Math.min(100, Math.round((st.current_power / st.max_power) * 100));

                    return (
                        <div
                            key={st.id}
                            onClick={() => onStationClick(st.id)}
                            className={`cyber-card p-5 rounded-xl cursor-pointer hover:border-cyan-400 transition-all transform hover:-translate-y-1 relative overflow-hidden ${
                                isAttack ? 'border-red-500 shadow-lg shadow-red-500/10' :
                                isSuspicious ? 'border-amber-500 shadow-lg shadow-amber-500/10' :
                                'border-slate-800'
                            }`}
                        >
                            {/* Top Banner Tag */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div>
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                                        {st.id}
                                    </span>
                                    <h3 className="font-bold text-white text-sm mt-1">{st.name}</h3>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                                    isAttack ? 'bg-red-950 text-red-400 border border-red-500 pulse-glow-red' :
                                    isSuspicious ? 'bg-amber-950 text-amber-400 border border-amber-500' :
                                    'bg-emerald-950 text-emerald-400 border border-emerald-500'
                                }`}>
                                    {st.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Power Gauge Bar */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs font-mono mb-1">
                                    <span className="text-slate-400">Power Output:</span>
                                    <span className="font-bold text-cyan-300">{st.current_power} / {st.max_power} kW ({loadPct}%)</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            isAttack ? 'bg-red-500' :
                                            loadPct > 80 ? 'bg-amber-400' : 'bg-cyan-400'
                                        }`}
                                        style={{ width: `${loadPct}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Detailed Telemetry Grid */}
                            <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                                    <div className="text-slate-500">Terminal Voltage</div>
                                    <div className="text-white font-bold">{st.current_voltage} V</div>
                                </div>
                                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                                    <div className="text-slate-500">Active Current</div>
                                    <div className="text-white font-bold">{st.current_current} A</div>
                                </div>
                                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                                    <div className="text-slate-500">Active Sessions</div>
                                    <div className="text-cyan-300 font-bold">{st.active_sessions} EVs</div>
                                </div>
                                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                                    <div className="text-slate-500">Total Energy</div>
                                    <div className="text-slate-200 font-bold">{st.total_energy_kwh} kWh</div>
                                </div>
                            </div>

                            {/* Threat Alert Tag */}
                            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                                <span className="text-slate-400">Last Pattern:</span>
                                <span className={isAttack ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                    {st.last_attack_type}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// VIEW 3: ATTACK DETECTION & MONITORING
// ==========================================
function AttackDetectionView({ analytics, triggerSimulation }) {
    const attacks = [
        {
            type: "DoS ATTACK",
            title: "Denial of Service (DoS)",
            desc: "Simulates abnormal high-frequency requests, packet flooding, and response latency surges on station controllers.",
            indicators: ["RPS spike: 180-600 req/s", "Latency surge: >300ms", "Packet surge: >20,000 pkts", "Session suspended"],
            severity: "CRITICAL",
            color: "red"
        },
        {
            type: "DATA TAMPERING",
            title: "Data Tampering / Telemetry Spoofing",
            desc: "Simulates physical-electrical inconsistencies where recorded voltage, current, and energy violate conservation laws.",
            indicators: ["P != V * I mismatch", "Energy skew: 15%-380%", "Integrity score < 0.70", "Checksum failure"],
            severity: "HIGH",
            color: "amber"
        },
        {
            type: "UNAUTHORIZED ACCESS",
            title: "Unauthorized Access / Credential Stuffing",
            desc: "Simulates repeated authentication failures, rogue IP / MAC addresses, and invalid RFID authorization tokens.",
            indicators: ["Auth status: Failed (0)", "Rogue IP identifier", "OCPP_Authorize loop", "Brute-force stuffing"],
            severity: "HIGH",
            color: "orange"
        },
        {
            type: "MALWARE ACTIVITY",
            title: "Malware Activity / Malicious Command Sequences",
            desc: "Simulates safe out-of-order OCPP command sequences, rogue firmware triggers, and unexpected contactor commands.",
            indicators: ["Command freq: 45-140 cmds/min", "Out-of-order firmware call", "Abnormal relay cycle", "Integrity drops"],
            severity: "CRITICAL",
            color: "purple"
        }
    ];

    const distribution = analytics?.attack_distribution || {};

    return (
        <div className="space-y-6">
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
                            <span>ATTACK DETECTION & THREAT INTELLIGENCE</span>
                        </h2>
                        <p className="text-xs text-slate-400">
                            Real-time monitoring across the 4 simulated cyber-attack categories on EV charging systems.
                        </p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 bg-red-950/60 text-red-400 border border-red-800 rounded">
                        4 Attack Vectors Armed
                    </span>
                </div>
            </div>

            {/* 4 Attack Vector Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attacks.map(atk => {
                    const count = distribution[atk.type] || 0;
                    return (
                        <div key={atk.type} className="cyber-card p-5 rounded-xl border-l-4 border-l-red-500 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold font-mono text-white text-base">{atk.title}</h3>
                                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded ${SEVERITY_BADGES[atk.severity]}`}>
                                        {atk.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{atk.desc}</p>

                                <div className="mt-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                                    <div className="text-[11px] font-mono text-slate-400 font-semibold mb-2 uppercase">
                                        Key Attack Indicators:
                                    </div>
                                    <ul className="grid grid-cols-2 gap-1.5 text-xs font-mono text-slate-300">
                                        {atk.indicators.map((ind, i) => (
                                            <li key={i} className="flex items-center space-x-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                                <span>{ind}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                                <div className="text-xs font-mono">
                                    <span className="text-slate-400">Total Intercepted: </span>
                                    <span className="font-bold text-red-400 text-sm">{count} incidents</span>
                                </div>
                                <button
                                    onClick={() => triggerSimulation(atk.type)}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500 hover:bg-red-500/30 transition"
                                >
                                    + Simulate {atk.type.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ==========================================
// VIEW 4: AI MODEL & TRANSFORMER ATTENTION
// ==========================================
function AIModelView({ modelInfo, onRetrainComplete }) {
    const [isRetraining, setIsRetraining] = useState(false);
    const [selectedAttentionClass, setSelectedAttentionClass] = useState("DoS ATTACK");

    const overall = modelInfo?.overall_metrics || { accuracy: 100.0, precision: 100.0, recall: 100.0, f1_score: 100.0 };
    const perClass = modelInfo?.per_class_metrics || {};
    const cm = modelInfo?.confusion_matrix || [];
    const cmLabels = modelInfo?.confusion_matrix_labels || ["NORMAL", "DoS", "DATA TAMPER", "UNAUTH", "MALWARE"];
    const history = modelInfo?.training_history || { epochs: [], train_loss: [], val_loss: [], train_acc: [], val_acc: [] };
    const classAttn = modelInfo?.feature_attention_weights || {};

    const handleRetrain = async () => {
        setIsRetraining(true);
        try {
            const res = await fetch(`${API_BASE}/api/model/retrain?epochs=15&samples=3500`, { method: "POST" });
            const json = await res.json();
            if (json.status === "success") {
                onRetrainComplete();
            }
        } catch (err) {
            console.error("Retrain error:", err);
        } finally {
            setIsRetraining(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Specs Card */}
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-lg font-bold font-mono text-white">
                                TRANSFORMER-BASED CYBER ATTACK CLASSIFIER
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[11px] font-mono">
                                PyTorch 2.14 Tabular
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Multi-Head Self-Attention model analyzing continuous and categorical EV telemetry tokens.
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-600 text-xs font-mono">
                            {modelInfo?.evaluation_mode || "Prototype evaluation on synthetic dataset"}
                        </span>
                        <button
                            onClick={handleRetrain}
                            disabled={isRetraining}
                            className="btn-cyber-primary px-4 py-2 rounded-lg text-xs font-mono font-bold text-white flex items-center space-x-2"
                        >
                            {isRetraining ? (
                                <>
                                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                    <span>Retraining PyTorch...</span>
                                </>
                            ) : (
                                <span>Retrain Prototype Model</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Overall Metric KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400">TEST ACCURACY</div>
                    <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">{overall.accuracy}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Prototype Synthetic Validation</div>
                </div>
                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400">MACRO PRECISION</div>
                    <div className="text-3xl font-bold font-mono text-cyan-400 mt-1">{overall.precision}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">False-Positive Prevention</div>
                </div>
                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400">MACRO RECALL</div>
                    <div className="text-3xl font-bold font-mono text-blue-400 mt-1">{overall.recall}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Threat Interception Rate</div>
                </div>
                <div className="cyber-card p-4 rounded-xl">
                    <div className="text-xs font-mono text-slate-400">MACRO F1-SCORE</div>
                    <div className="text-3xl font-bold font-mono text-purple-400 mt-1">{overall.f1_score}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">Harmonic Balance Metric</div>
                </div>
            </div>

            {/* Confusion Matrix and Per-Class Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 5x5 Confusion Matrix */}
                <div className="cyber-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span>5x5 CONFUSION MATRIX (VALIDATION SET)</span>
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">800 Val Samples</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-xs font-mono border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-2 text-left text-slate-500">True \ Pred</th>
                                    {cmLabels.map((l, i) => (
                                        <th key={i} className="p-2 text-cyan-300 font-bold truncate max-w-[70px]" title={l}>
                                            {l.replace(' ATTACK', '').slice(0, 7)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cm.map((row, rIdx) => (
                                    <tr key={rIdx} className="border-t border-slate-800">
                                        <td className="p-2 text-left font-bold text-slate-300 truncate max-w-[80px]" title={cmLabels[rIdx]}>
                                            {cmLabels[rIdx].replace(' ATTACK', '').slice(0, 7)}
                                        </td>
                                        {row.map((val, cIdx) => {
                                            const isDiag = rIdx === cIdx;
                                            return (
                                                <td
                                                    key={cIdx}
                                                    className={`p-2.5 font-bold rounded ${
                                                        isDiag && val > 0 
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                                            : val > 0 ? 'bg-red-500/20 text-red-300' : 'text-slate-600'
                                                    }`}
                                                >
                                                    {val}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-400 font-mono text-center">
                        Horizontal: Predicted Class • Vertical: Ground Truth Label
                    </div>
                </div>

                {/* Per-Class Metrics Table */}
                <div className="cyber-card p-5 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span>PER-CLASS CLASSIFICATION BREAKDOWN</span>
                        </h3>
                        <span className="text-[11px] font-mono text-emerald-400">100% Stratified</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th className="p-2.5">Class Name</th>
                                    <th className="p-2.5">Precision</th>
                                    <th className="p-2.5">Recall</th>
                                    <th className="p-2.5">F1-Score</th>
                                    <th className="p-2.5">Support</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {Object.entries(perClass).map(([cName, metrics]) => (
                                    <tr key={cName} className="hover:bg-slate-800/40 transition">
                                        <td className="p-2.5 font-bold text-white flex items-center space-x-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                cName === 'NORMAL' ? 'bg-emerald-400' : 'bg-red-400'
                                            }`}></span>
                                            <span>{cName}</span>
                                        </td>
                                        <td className="p-2.5 text-cyan-300">{metrics.precision}%</td>
                                        <td className="p-2.5 text-blue-300">{metrics.recall}%</td>
                                        <td className="p-2.5 text-purple-300 font-bold">{metrics.f1_score}%</td>
                                        <td className="p-2.5 text-slate-400">{metrics.support}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Feature Self-Attention Weights (Explainable AI) */}
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                            <span>TRANSFORMER SELF-ATTENTION WEIGHTS (EXPLAINABILITY)</span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            Shows how the Multi-Head Attention layer directs attention from the [CLS] token to individual features.
                        </p>
                    </div>

                    <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-mono">
                        {["NORMAL", "DoS ATTACK", "DATA TAMPERING", "UNAUTHORIZED ACCESS", "MALWARE ACTIVITY"].map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedAttentionClass(c)}
                                className={`px-2.5 py-1 rounded transition whitespace-nowrap ${
                                    selectedAttentionClass === c
                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500"
                                        : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                            >
                                {c.replace(' ATTACK', '')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-64">
                    <AttentionBarChart weights={classAttn[selectedAttentionClass] || {}} />
                </div>
            </div>
        </div>
    );
}

// ==========================================
// VIEW 5: LIVE SIMULATION LAB
// ==========================================
function LiveDemoView({ isSimulating, setIsSimulating, simSpeed, setSimSpeed, triggerSimulation, lastEvent, activeStage, onRefreshAnalytics }) {
    const [selectedTargetStation, setSelectedTargetStation] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus("Uploading and classifying CSV through Transformer...");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_BASE}/api/telemetry/upload-csv`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (data.status === "success") {
                setUploadStatus(`Processed ${data.processed_records} records! Threats intercepted: ${data.threats_detected}`);
                onRefreshAnalytics();
            } else {
                setUploadStatus(`Upload error: ${data.detail || "Invalid format"}`);
            }
        } catch (err) {
            setUploadStatus(`Upload failed: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Controller Bar */}
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
                            <span>CYBER ATTACK SIMULATION & INTRUSION LAB</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Safely simulate cyber-attack vectors on EV charging stations and observe pipeline reactions.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Target Station Selector */}
                        <div className="flex items-center space-x-2 text-xs font-mono">
                            <span className="text-slate-400">Target Station:</span>
                            <select
                                value={selectedTargetStation}
                                onChange={(e) => setSelectedTargetStation(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 focus:border-cyan-400 outline-none"
                            >
                                <option value="">Random Station</option>
                                <option value="EV-CS-01">EV-CS-01 (North Campus)</option>
                                <option value="EV-CS-02">EV-CS-02 (Fleet Depot)</option>
                                <option value="EV-CS-03">EV-CS-03 (Commercial Hub)</option>
                                <option value="EV-CS-04">EV-CS-04 (Express Plaza)</option>
                                <option value="EV-CS-05">EV-CS-05 (Tech Park)</option>
                                <option value="EV-CS-06">EV-CS-06 (Terminal Grid)</option>
                            </select>
                        </div>

                        {/* Continuous Simulation Toggle */}
                        <button
                            onClick={() => setIsSimulating(!isSimulating)}
                            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition flex items-center space-x-2 ${
                                isSimulating
                                    ? "btn-cyber-danger text-white animate-pulse"
                                    : "btn-cyber-primary text-white"
                            }`}
                        >
                            <span>{isSimulating ? "■ STOP AUTO-SIMULATION" : "▶ START CONTINUOUS SIMULATION"}</span>
                        </button>
                    </div>
                </div>

                {/* 5 Instant Attack Simulation Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <button
                        onClick={() => triggerSimulation("NORMAL", selectedTargetStation)}
                        className="px-3 py-2.5 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500 hover:bg-emerald-500/30 transition text-center"
                    >
                        🟢 Normal Traffic
                    </button>
                    <button
                        onClick={() => triggerSimulation("DoS ATTACK", selectedTargetStation)}
                        className="px-3 py-2.5 rounded-lg text-xs font-mono font-bold bg-red-500/20 text-red-300 border border-red-500 hover:bg-red-500/30 transition text-center"
                    >
                        🔴 DoS Simulation
                    </button>
                    <button
                        onClick={() => triggerSimulation("DATA TAMPERING", selectedTargetStation)}
                        className="px-3 py-2.5 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500 hover:bg-amber-500/30 transition text-center"
                    >
                        🟡 Data Tampering
                    </button>
                    <button
                        onClick={() => triggerSimulation("UNAUTHORIZED ACCESS", selectedTargetStation)}
                        className="px-3 py-2.5 rounded-lg text-xs font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500 hover:bg-orange-500/30 transition text-center"
                    >
                        🟠 Unauthorized Access
                    </button>
                    <button
                        onClick={() => triggerSimulation("MALWARE ACTIVITY", selectedTargetStation)}
                        className="px-3 py-2.5 rounded-lg text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500 hover:bg-purple-500/30 transition text-center"
                    >
                        🟣 Malware Activity
                    </button>
                </div>
            </div>

            {/* LIVE ANIMATED 5-STAGE PIPELINE VISUALIZER */}
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                        <span>MAIN SYSTEM PIPELINE: REAL-TIME DATA FLOW</span>
                    </h3>
                    <span className="text-xs font-mono text-slate-400">Stage {activeStage} Active</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {[
                        { num: 1, title: "DATA INJECTION", desc: "Telemetry & OCPP Ingest", sub: "Packet Generator" },
                        { num: 2, title: "TRAFFIC ANALYSIS", desc: "Volume, Latency, RPS", sub: "Anomaly Profiler" },
                        { num: 3, title: "FEATURE EXTRACTION", desc: "Deviations & Integrity", sub: "16 Engineered Features" },
                        { num: 4, title: "TRANSFORMER CLASSIFIER", desc: "Multi-Head Attention", sub: "5-Class Softmax" },
                        { num: 5, title: "INTRUSION ALERT", desc: "Tactical SOC Mitigation", sub: "Threat Interception" }
                    ].map(st => {
                        const isActive = activeStage === st.num;
                        return (
                            <div
                                key={st.num}
                                className={`p-4 rounded-xl border transition-all text-center flex flex-col justify-between ${
                                    isActive
                                        ? "pipeline-step-active border-cyan-400 bg-cyan-950/40"
                                        : "border-slate-800 bg-slate-900/60"
                                }`}
                            >
                                <div>
                                    <div className="w-7 h-7 rounded-full bg-slate-800 text-cyan-400 font-mono text-xs font-bold mx-auto flex items-center justify-center mb-2 border border-slate-700">
                                        0{st.num}
                                    </div>
                                    <div className="font-mono text-xs font-bold text-white">{st.title}</div>
                                    <div className="text-[11px] text-slate-400 mt-1">{st.desc}</div>
                                </div>
                                <div className="text-[10px] font-mono text-cyan-400/80 mt-3 pt-2 border-t border-slate-800/80">
                                    {st.sub}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* REAL-TIME CLASSIFICATION RESULT CARD */}
            {lastEvent && (
                <div className={`cyber-card p-5 rounded-xl border-2 transition-all ${
                    lastEvent.prediction === 'NORMAL' ? 'border-emerald-500/70 bg-emerald-950/20' : 'border-red-500 bg-red-950/30'
                }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                        <div className="flex items-center space-x-3">
                            <span className={`w-3.5 h-3.5 rounded-full ${
                                lastEvent.prediction === 'NORMAL' ? 'bg-emerald-400' : 'bg-red-500 pulse-glow-red'
                            }`}></span>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-base font-bold font-mono text-white">
                                        PREDICTED: {lastEvent.prediction}
                                    </h3>
                                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded ${
                                        SEVERITY_BADGES[lastEvent.severity] || "bg-red-950 text-red-400"
                                    }`}>
                                        {lastEvent.severity}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Station: <span className="font-bold text-white">{lastEvent.raw_telemetry?.charging_station_id}</span> | 
                                    EV ID: <span className="text-cyan-300">{lastEvent.raw_telemetry?.ev_id}</span> | 
                                    OCPP Protocol: <span className="text-slate-300">{lastEvent.raw_telemetry?.protocol_message_type}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 font-mono">
                            <div className="text-right">
                                <div className="text-xs text-slate-400">AI Confidence</div>
                                <div className="text-2xl font-bold text-emerald-400">{lastEvent.confidence}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Class Probability Distribution Bars */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                        {Object.entries(lastEvent.probabilities || {}).map(([cName, prob]) => (
                            <div key={cName} className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                                <div className="flex justify-between text-[11px] font-mono mb-1">
                                    <span className="text-slate-400 truncate mr-1">{cName.replace(' ATTACK', '')}</span>
                                    <span className="font-bold text-white">{prob}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            cName === lastEvent.prediction 
                                                ? (cName === 'NORMAL' ? 'bg-emerald-400' : 'bg-red-500') 
                                                : 'bg-slate-600'
                                        }`}
                                        style={{ width: `${prob}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Alert & Triggered Narrative */}
                    {lastEvent.alert && (
                        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/50 space-y-2 text-xs font-mono">
                            <div className="text-red-300 font-bold flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
                                <span>INTRUSION ALERT GENERATED: {lastEvent.alert.id}</span>
                            </div>
                            <div className="text-slate-200">
                                <span className="text-slate-400">Triggered Features: </span>
                                {lastEvent.alert.triggered_features}
                            </div>
                            <div className="text-amber-300">
                                <span className="text-slate-400">Recommended Response: </span>
                                {lastEvent.alert.recommended_response}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CSV DATASET MANAGEMENT CARD */}
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                            <span>DATASET MANAGEMENT & CSV INGESTION</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Upload a custom CSV file or download the built-in synthetic dataset (4,000 samples).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            disabled={isUploading}
                            className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
                        >
                            {isUploading ? "Processing CSV..." : "Upload CSV Telemetry"}
                        </button>
                        <a
                            href={`${API_BASE}/api/telemetry/download-sample`}
                            download
                            className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        >
                            Download Sample Test CSV (100 rows)
                        </a>
                        <a
                            href={`${API_BASE}/api/telemetry/download-dataset`}
                            download
                            className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold btn-cyber-primary text-white"
                        >
                            Download Full Dataset (4,000 samples)
                        </a>
                    </div>
                </div>

                {uploadStatus && (
                    <div className="mt-3 p-3 rounded bg-slate-900 border border-cyan-800 text-xs font-mono text-cyan-300">
                        {uploadStatus}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// VIEW 6: FEATURE PIPELINE
// ==========================================
function FeaturePipelineView({ lastEvent }) {
    const raw = lastEvent?.raw_telemetry || {
        charging_station_id: "EV-CS-04",
        voltage: 231.2,
        current: 31.8,
        power: 7.35,
        energy_consumed: 14.7,
        charging_duration: 45.0,
        network_packet_count: 240,
        request_frequency: 2.1,
        response_time: 38.5,
        authentication_status: 1,
        command_frequency: 4.2,
        data_integrity_score: 0.985,
        protocol_message_type: "OCPP_MeterValues"
    };

    const features = lastEvent?.extracted_features || {
        norm_voltage: 0.514,
        norm_current: 0.159,
        norm_power: 0.049,
        norm_energy: 0.147,
        voltage_dev: 0.005,
        energy_rate_dev: 0.012,
        packet_rate: 0.088,
        request_freq: 2.1,
        response_time_ms: 38.5,
        auth_fail_rate: 0.0,
        command_freq: 4.2,
        integrity_score: 0.985,
        traffic_intensity: 0.244,
        session_duration: 45.0,
        protocol_type_idx: 0.0,
        station_load_factor: 0.049
    };

    return (
        <div className="space-y-6">
            <div className="cyber-card p-5 rounded-xl">
                <h2 className="text-lg font-bold font-mono text-white">
                    FEATURE EXTRACTION & CYBER-PHYSICAL PREPROCESSING PIPELINE
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Converts raw electrical and network protocol telemetry into normalized tensors for the Transformer.
                </p>
            </div>

            {/* Mathematical Formulas Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="cyber-card p-4 rounded-xl border-l-4 border-l-cyan-500">
                    <div className="text-xs font-mono text-cyan-400 font-bold uppercase">1. Voltage Deviation</div>
                    <div className="font-mono text-sm text-white mt-1 bg-slate-900 p-2 rounded">
                        ΔV = |V - V_nominal| / V_nominal
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                        Detects voltage spoofing and grid-tie over/under-voltage tampering.
                    </p>
                </div>

                <div className="cyber-card p-4 rounded-xl border-l-4 border-l-amber-500">
                    <div className="text-xs font-mono text-amber-400 font-bold uppercase">2. Energy Consistency Dev</div>
                    <div className="font-mono text-sm text-white mt-1 bg-slate-900 p-2 rounded">
                        ΔE = |(P * t/60) - E_meter| / E
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                        Verifies electrical conservation laws: prevents billing fraud and meter tampering.
                    </p>
                </div>

                <div className="cyber-card p-4 rounded-xl border-l-4 border-l-red-500">
                    <div className="text-xs font-mono text-red-400 font-bold uppercase">3. Traffic Intensity Index</div>
                    <div className="font-mono text-sm text-white mt-1 bg-slate-900 p-2 rounded">
                        T = (RPS/25) + (Latency/250) + (Pkts/15)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                        Composite stress indicator sensitive to DoS flooding and packet bursts.
                    </p>
                </div>
            </div>

            {/* Extracted Features Table */}
            <div className="cyber-card p-5 rounded-xl">
                <h3 className="font-mono text-sm font-bold text-white mb-4">
                    16 ENGINEERED FEATURES (CURRENT INGESTED SAMPLE)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    {Object.entries(features).map(([fKey, fVal]) => (
                        <div key={fKey} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400 truncate mr-2">{fKey}</span>
                            <span className="font-bold text-cyan-300">{typeof fVal === 'number' ? fVal.toFixed(3) : fVal}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// VIEW 7: SECURITY EVENT LOG
// ==========================================
function SecurityLogsView() {
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState("");
    const [severityFilter, setSeverityFilter] = useState("ALL");
    const [stationFilter, setStationFilter] = useState("ALL");
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (severityFilter !== "ALL") params.append("severity", severityFilter);
            if (stationFilter !== "ALL") params.append("station_id", stationFilter);

            const res = await fetch(`${API_BASE}/api/logs?${params.toString()}`);
            const json = await res.json();
            if (json.status === "success") {
                setLogs(json.data);
            }
        } catch (err) {
            console.error("Error fetching logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [search, severityFilter, stationFilter]);

    const handleClearLogs = async () => {
        if (!confirm("Are you sure you want to clear all security logs?")) return;
        try {
            await fetch(`${API_BASE}/api/logs/clear`, { method: "DELETE" });
            fetchLogs();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="cyber-card p-5 rounded-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold font-mono text-white">
                            SECURITY EVENT LOG & AUDIT TRAIL
                        </h2>
                        <p className="text-xs text-slate-400">
                            Immutable audit trail of all classified EV charging telemetry packets.
                        </p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <a
                            href={`${API_BASE}/api/logs/export-csv`}
                            download
                            className="btn-cyber-primary px-3.5 py-2 rounded-lg text-xs font-mono font-bold text-white flex items-center space-x-2"
                        >
                            <span>Download CSV Audit Log</span>
                        </a>
                        <button
                            onClick={handleClearLogs}
                            className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 border border-slate-700 transition"
                        >
                            Clear Logs
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
                    <input
                        type="text"
                        placeholder="Search logs by keyword..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-xs font-mono focus:border-cyan-400 outline-none"
                    />

                    <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-xs font-mono focus:border-cyan-400 outline-none"
                    >
                        <option value="ALL">All Severities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                    </select>

                    <select
                        value={stationFilter}
                        onChange={(e) => setStationFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-3 py-1.5 text-xs font-mono focus:border-cyan-400 outline-none"
                    >
                        <option value="ALL">All Stations</option>
                        <option value="EV-CS-01">EV-CS-01</option>
                        <option value="EV-CS-02">EV-CS-02</option>
                        <option value="EV-CS-03">EV-CS-03</option>
                        <option value="EV-CS-04">EV-CS-04</option>
                        <option value="EV-CS-05">EV-CS-05</option>
                        <option value="EV-CS-06">EV-CS-06</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="cyber-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                            <tr>
                                <th className="p-3">Time (UTC)</th>
                                <th className="p-3">Station</th>
                                <th className="p-3">Event Type</th>
                                <th className="p-3">Prediction</th>
                                <th className="p-3">Confidence</th>
                                <th className="p-3">Severity</th>
                                <th className="p-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-slate-500">
                                        No log events found matching the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-800/40 transition">
                                        <td className="p-3 text-slate-400 whitespace-nowrap">
                                            {row.timestamp ? row.timestamp.replace('T', ' ').slice(0, 19) : '-'}
                                        </td>
                                        <td className="p-3 text-white font-bold">{row.station_id}</td>
                                        <td className="p-3 text-slate-300 truncate max-w-[150px]">{row.event_type}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                ATTACK_COLORS[row.prediction]?.bg || "bg-slate-800"
                                            } ${ATTACK_COLORS[row.prediction]?.text || "text-slate-300"}`}>
                                                {row.prediction}
                                            </span>
                                        </td>
                                        <td className="p-3 text-emerald-400 font-bold">{row.confidence}%</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                SEVERITY_BADGES[row.severity] || "bg-slate-800 text-slate-400"
                                            }`}>
                                                {row.severity}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-400 max-w-xs truncate" title={row.details}>
                                            {row.details}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// VIEW 8: SYSTEM ARCHITECTURE
// ==========================================
function ArchitectureView() {
    const steps = [
        {
            title: "EV Charging Stations",
            sub: "Physical Terminals & Fast DC / AC Level 2 Inverters",
            desc: "Charging stations EV-CS-01 through 06 delivering up to 150 kW while recording voltage, current, and energy.",
            icon: "⚡"
        },
        {
            title: "Network / Telemetry Data",
            sub: "OCPP 1.6J / 2.0.1 WebSocket Protocol",
            desc: "Transmits MeterValues, StatusNotification, Heartbeat, and Authorize frames over encrypted channels.",
            icon: "📡"
        },
        {
            title: "Data Injection",
            sub: "Telemetry Ingestion & Simulated Attack Generator",
            desc: "Continuous ingestion engine capable of simulating safe DoS, tampering, unauthorized access, and malware patterns.",
            icon: "📥"
        },
        {
            title: "Traffic Analysis",
            sub: "Protocol & Request Profiling",
            desc: "Calculates real-time packet counts, requests per second (RPS), response latency (ms), and authentication outcomes.",
            icon: "🔍"
        },
        {
            title: "Feature Extraction",
            sub: "Cyber-Physical Feature Engineering",
            desc: "Extracts 16 physical and cyber features (voltage deviation, power-energy consistency, traffic intensity index).",
            icon: "⚙️"
        },
        {
            title: "Transformer Classifier",
            sub: "Tabular Multi-Head Self-Attention",
            desc: "PyTorch Transformer Encoder projecting continuous features into tokens and extracting self-attention weights.",
            icon: "🧠"
        },
        {
            title: "Attack Classification",
            sub: "5-Class Softmax Posterior Distribution",
            desc: "Outputs probability distribution over NORMAL, DoS, DATA TAMPERING, UNAUTHORIZED ACCESS, MALWARE.",
            icon: "🎯"
        },
        {
            title: "Intrusion Alert",
            sub: "Dynamic Severity & Actionable Response Engine",
            desc: "Assigns CRITICAL / HIGH / MEDIUM / LOW severity, explains top attention features, and prescribes mitigation.",
            icon: "🚨"
        },
        {
            title: "Security Dashboard",
            sub: "Executive SOC Operational Interface",
            desc: "Real-time interactive React dashboard with station drilldown, live graphs, and downloadable audit logs.",
            icon: "🖥️"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="cyber-card p-5 rounded-xl">
                <h2 className="text-lg font-bold font-mono text-white">
                    END-TO-END SYSTEM PIPELINE ARCHITECTURE
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Visual representation of the cybersecurity data processing flow designed for faculty and project presentations.
                </p>
            </div>

            <div className="relative pl-6 md:pl-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {steps.map((st, i) => (
                        <div key={i} className="cyber-card p-5 rounded-xl border-l-4 border-l-cyan-500 relative flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-2xl">{st.icon}</span>
                                    <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                                        STAGE 0{i + 1}
                                    </span>
                                </div>
                                <h3 className="font-mono text-sm font-bold text-white mt-1">{st.title}</h3>
                                <div className="text-[11px] font-mono text-cyan-300 font-semibold mt-0.5">{st.sub}</div>
                                <p className="text-xs text-slate-300 mt-3 leading-relaxed">{st.desc}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                                <span>Status: Verified</span>
                                <span>Output: Stage 0{i < 8 ? i + 2 : 1}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// DRILLDOWN: STATION DETAIL MODAL
// ==========================================
function StationDetailModal({ data, onClose, triggerSimulation }) {
    const st = data.station;
    const alerts = data.alerts || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="cyber-card max-w-2xl w-full rounded-2xl p-6 border-cyan-500 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-lg"
                >
                    ✕
                </button>

                <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {st.id}
                    </span>
                    <div>
                        <h2 className="text-lg font-bold font-mono text-white">{st.name}</h2>
                        <p className="text-xs text-slate-400">{st.station_type} • Max Output: {st.max_power} kW</p>
                    </div>
                </div>

                {/* Real-time Status Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-500">Current Power</div>
                        <div className="text-lg font-bold text-cyan-400 mt-1">{st.current_power} kW</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-500">Voltage</div>
                        <div className="text-lg font-bold text-white mt-1">{st.current_voltage} V</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-500">Current</div>
                        <div className="text-lg font-bold text-white mt-1">{st.current_current} A</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-500">Threat Status</div>
                        <div className={`text-sm font-bold mt-1 ${
                            st.status === 'UNDER_ATTACK' ? 'text-red-400' : 'text-emerald-400'
                        }`}>{st.status}</div>
                    </div>
                </div>

                {/* Quick Simulation Trigger on this station */}
                <div className="mt-5 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-xs font-mono text-slate-300 font-bold mb-2 uppercase">
                        Inject Safe Simulated Attack on {st.id}:
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                        <button
                            onClick={() => { triggerSimulation("DoS ATTACK", st.id); onClose(); }}
                            className="px-2.5 py-1.5 rounded bg-red-500/20 text-red-300 border border-red-500 hover:bg-red-500/30"
                        >
                            DoS Flood
                        </button>
                        <button
                            onClick={() => { triggerSimulation("DATA TAMPERING", st.id); onClose(); }}
                            className="px-2.5 py-1.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500 hover:bg-amber-500/30"
                        >
                            Data Tampering
                        </button>
                        <button
                            onClick={() => { triggerSimulation("UNAUTHORIZED ACCESS", st.id); onClose(); }}
                            className="px-2.5 py-1.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500 hover:bg-orange-500/30"
                        >
                            Unauthorized Auth
                        </button>
                        <button
                            onClick={() => { triggerSimulation("MALWARE ACTIVITY", st.id); onClose(); }}
                            className="px-2.5 py-1.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500 hover:bg-purple-500/30"
                        >
                            Malware Commands
                        </button>
                    </div>
                </div>

                {/* Station Alerts */}
                <div className="mt-5">
                    <h4 className="text-xs font-mono font-bold text-white mb-2 uppercase">Recent Alerts on {st.id}</h4>
                    {alerts.length === 0 ? (
                        <div className="text-xs font-mono text-slate-500 p-3 rounded bg-slate-900 text-center">
                            No active security alerts recorded for this station.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {alerts.map(a => (
                                <div key={a.id} className="p-3 rounded-lg bg-red-950/30 border border-red-500/40 text-xs font-mono">
                                    <div className="flex justify-between items-center text-red-300 font-bold">
                                        <span>{a.id} • {a.detected_attack_type}</span>
                                        <span className="text-emerald-400">{a.confidence_score}%</span>
                                    </div>
                                    <div className="text-slate-300 mt-1">{a.triggered_features}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// CHART HELPERS (Chart.js based with fallback)
// ==========================================
function TrafficLineChart({ series }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;

        const ctx = canvasRef.current.getContext('2d');
        const labels = series.map((s, idx) => `T-${series.length - idx}`);
        const rpsData = series.map(s => s.request_frequency);
        const latencyData = series.map(s => s.response_time);

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Requests / sec (RPS)',
                        data: rpsData,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Latency (ms)',
                        data: latencyData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#06b6d4', font: { family: 'JetBrains Mono', size: 10 } },
                        title: { display: true, text: 'RPS', color: '#06b6d4', font: { size: 10 } }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#ef4444', font: { family: 'JetBrains Mono', size: 10 } },
                        title: { display: true, text: 'Latency (ms)', color: '#ef4444', font: { size: 10 } }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#cbd5e1', font: { family: 'JetBrains Mono', size: 11 } }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [series]);

    return <canvas ref={canvasRef} />;
}

function ThreatDistributionChart({ distribution }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;

        const ctx = canvasRef.current.getContext('2d');
        const labels = Object.keys(distribution);
        const values = Object.values(distribution);

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        chartInstanceRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values.length > 0 ? values : [1],
                    backgroundColor: [
                        '#10b981', // Normal
                        '#ef4444', // DoS
                        '#f59e0b', // Data Tampering
                        '#f97316', // Unauthorized Access
                        '#a855f7'  // Malware
                    ],
                    borderWidth: 2,
                    borderColor: '#070b14'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                cutout: '70%'
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [distribution]);

    return <canvas ref={canvasRef} />;
}

function AttentionBarChart({ weights }) {
    const canvasRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !window.Chart) return;

        const ctx = canvasRef.current.getContext('2d');
        const labels = Object.keys(weights);
        const values = Object.values(weights);

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Self-Attention Weight (%)',
                    data: values,
                    backgroundColor: '#a855f7',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 45, minRotation: 45 },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [weights]);

    return <canvas ref={canvasRef} />;
}

// Render React App
const rootElement = document.getElementById("root");
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(<App />);
}

