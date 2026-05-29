import { db } from "@/lib/firebase";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

interface TerminationListProps {
    terminations: any[];
}

export default function TerminationList({ terminations }: TerminationListProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "Finalizada": return "bg-emerald-100 text-emerald-700";
            case "Atrasada": return "bg-rose-100 text-rose-700";
            case "Aguardando pagamento": return "bg-amber-100 text-amber-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === "Finalizada" ? "Aguardando pagamento" : "Finalizada";
            const docRef = doc(db, "terminations", id);
            await updateDoc(docRef, { status: newStatus });
        } catch (error) {
            console.error("Erro ao atualizar status: ", error);
        }
    };

    const deleteTermination = async (id: string) => {
        try {
            if (confirm("Deseja realmente excluir esta rescisão do histórico?")) {
                const docRef = doc(db, "terminations", id);
                await deleteDoc(docRef);
            }
        } catch (error) {
            console.error("Erro ao excluir documento: ", error);
        }
    };

    if (terminations.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Nenhuma rescisão cadastrada no histórico.
            </div>
        );
    }

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
                    {terminations.map((item) => (
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
                                <button
                                    onClick={() => toggleStatus(item.id, item.status)}
                                    className={`${item.status === "Finalizada" ? "text-slate-500 hover:text-slate-700" : "text-emerald-600 hover:text-emerald-800"} text-xs font-bold mr-3 opacity-0 group-hover:opacity-100 transition-opacity`}
                                >
                                    {item.status === "Finalizada" ? "Reabrir" : "Finalizar"}
                                </button>
                                <button
                                    onClick={() => deleteTermination(item.id)}
                                    className="text-rose-600 hover:text-rose-800 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Excluir
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
