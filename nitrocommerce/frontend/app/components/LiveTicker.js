// Add this as a new file: components/LiveTicker.js
export default function LiveTicker({ stockCount = 42, totalStock = 100 }) {
    const percentage = (stockCount / totalStock) * 100;

    return (
        <div className="bg-slate-900 border border-red-900/30 p-4 rounded-xl shadow-inner">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-tighter text-slate-400">Live Inventory</span>
                </div>
                <span className="font-mono text-red-500 font-bold">{stockCount} units left</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                    className="bg-gradient-to-r from-red-600 to-orange-500 h-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}