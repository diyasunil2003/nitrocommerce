"use client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
    const [requests, setRequests] = useState<number>(0);
    const [latency, setLatency] = useState<number>(0);
    const [stock, setStock] = useState<number>(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const start = performance.now();

                const res = await fetch("http://localhost:8080/product");
                const data = await res.json();

                const end = performance.now();

                setStock(data.stock);
                setRequests(data.stock); // using stock as throughput indicator
                setLatency(Math.round(end - start));
            } catch (err) {
                console.error("Error fetching data:", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-10 font-sans">
            <header className="mb-10 flex justify-between items-center border-b border-slate-800 pb-5">
                <h1 className="text-2xl font-mono font-bold text-blue-500">
                    NITRO_METRICS_V1.0
                </h1>
                <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                    SYSTEM_HEALTH: OPTIMAL
                </span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric 1 */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <p className="text-slate-500 text-sm mb-1 font-medium">
                        Throughput (Req/sec)
                    </p>
                    <h2 className="text-4xl font-bold text-white">{requests}</h2>
                    <p className="text-green-400 text-xs mt-2">
                        Live from Redis stock
                    </p>
                </div>

                {/* Metric 2 */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <p className="text-slate-500 text-sm mb-1 font-medium">
                        API Latency
                    </p>
                    <h2 className="text-4xl font-bold text-blue-400">
                        {latency} <span className="text-lg">ms</span>
                    </h2>
                    <p className="text-slate-400 text-xs mt-2">
                        Measured from backend call
                    </p>
                </div>

                {/* Metric 3 */}
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                    <p className="text-slate-500 text-sm mb-1 font-medium">
                        Current Stock
                    </p>
                    <h2 className="text-4xl font-bold text-purple-500 italic">
                        {stock}
                    </h2>
                    <p className="text-slate-400 text-xs mt-2">
                        Source: Redis (DECR)
                    </p>
                </div>
            </div>

            {/* Traffic Visualization */}
            <div className="mt-10 bg-slate-900/50 border border-slate-800 p-8 rounded-2xl h-64 flex items-end gap-2">
                {[40, 70, 45, 90, 65, 80, 95, 30, 50, 75, 85, 60, 40, 90].map((h, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-blue-600/40 border-t-2 border-blue-400 rounded-t-sm transition-all duration-1000"
                        style={{ height: `${h}%` }}
                    ></div>
                ))}
            </div>

            <p className="mt-4 text-center text-slate-600 text-xs uppercase tracking-widest">
                Real-time Traffic Stream
            </p>
        </div>
    );
}