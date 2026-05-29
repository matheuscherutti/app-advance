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
        { label: "Total no Mês", value: stats.total, icon: "📊", color: "bg-blue-50 text-blue-600" },
        { label: "Pendentes", value: stats.pending, icon: "⏳", color: "bg-amber-50 text-amber-600" },
        { label: "Finalizadas", value: stats.finalized, icon: "✅", color: "bg-emerald-50 text-emerald-600" },
        { label: "Atrasadas", value: stats.delayed, icon: "⚠️", color: "bg-rose-50 text-rose-600" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item, idx) => (
                <div key={idx} className="glass-card p-6 bg-white flex items-center gap-4 border border-slate-100">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${item.color}`}>
                        {item.icon}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">{item.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
