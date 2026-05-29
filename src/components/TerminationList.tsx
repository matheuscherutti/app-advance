export default function TerminationList() {
    const mockData = [
        { id: 1, name: "João Silva", modality: "Dispensa sem Justa Causa", date: "20/05/2026", paymentDate: "29/05/2026", status: "Aguardando pagamento", value: "R$ 4.500,00" },
        { id: 2, name: "Maria Oliveira", modality: "Pedido de Demissão", date: "18/05/2026", paymentDate: "28/05/2026", status: "Finalizada", value: "R$ 3.200,00" },
        { id: 3, name: "Carlos Souza", modality: "Término de Experiência", date: "22/05/2026", paymentDate: "01/06/2026", status: "Em andamento", value: "R$ 2.800,00" },
        { id: 4, name: "Ana Santos", modality: "Dispensa com Aviso Indenizado", date: "10/05/2026", paymentDate: "20/05/2026", status: "Atrasada", value: "R$ 7.100,00" },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Finalizada": return "bg-emerald-100 text-emerald-700";
            case "Atrasada": return "bg-rose-100 text-rose-700";
            case "Aguardando pagamento": return "bg-amber-100 text-amber-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="py-4 px-4 font-semibold text-slate-700">Funcionário</th>
                        <th className="py-4 px-4 font-semibold text-slate-700">Modalidade</th>
                        <th className="py-4 px-4 font-semibold text-slate-700">Desligamento</th>
                        <th className="py-4 px-4 font-semibold text-slate-700">Vencimento</th>
                        <th className="py-4 px-4 font-semibold text-slate-700">Valor</th>
                        <th className="py-4 px-4 font-semibold text-slate-700">Status</th>
                        <th className="py-4 px-4 font-semibold text-slate-700 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {mockData.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-4 px-4 font-medium text-slate-900">{item.name}</td>
                            <td className="py-4 px-4 text-slate-600 text-sm">{item.modality}</td>
                            <td className="py-4 px-4 text-slate-600 text-sm">{item.date}</td>
                            <td className="py-4 px-4 text-slate-600 text-sm">{item.paymentDate}</td>
                            <td className="py-4 px-4 text-slate-900 font-medium text-sm">{item.value}</td>
                            <td className="py-4 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ver Detalhes
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
