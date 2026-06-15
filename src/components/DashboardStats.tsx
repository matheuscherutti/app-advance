interface StatsProps {
    stats: {
        total: number;
        pending: number;
        finalized: number;
        delayed: number;
        upcoming: number;
    };
}

export default function DashboardStats({ stats }: StatsProps) {
    const items = [
        { 
            label: "Total no Mês", 
            value: stats.total, 
            color: "bg-indigo-50 text-indigo-700 border-indigo-100",
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            )
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((item, idx) => (
                <div key={idx} className="glass-card p-6 bg-white flex items-center gap-5 border border-slate-100">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.color} shadow-sm`}>
                        {item.icon}
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                        <p className="text-3xl font-black text-slate-800 mt-1 leading-tight">{item.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
