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
        { 
            label: "Pendentes", 
            value: stats.pending, 
            color: "bg-[#fffbeb] text-[#d97706] border-[#fef3c7]", // Amber/Gold matching the brand logo
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            )
        },
        { 
            label: "Finalizadas", 
            value: stats.finalized, 
            color: "bg-emerald-50 text-emerald-700 border-emerald-100", 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            )
        },
        { 
            label: "Atrasadas", 
            value: stats.delayed, 
            color: "bg-rose-50 text-rose-700 border-rose-100", 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
            )
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
