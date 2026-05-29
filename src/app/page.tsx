"use client";

import { useState, useEffect } from "react";
import DashboardStats from "@/components/DashboardStats";
import TerminationList from "@/components/TerminationList";
import NewTerminationModal from "@/components/NewTerminationModal";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [terminations, setTerminations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    finalized: 0,
    delayed: 0,
    upcoming: 0
  });

  useEffect(() => {
    const q = query(collection(db, "terminations"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTerminations(list);

      // Calcular estatísticas com base nos dados do Firestore
      const total = list.length;
      const pending = list.filter(t => t.status === "Aguardando pagamento" || t.status === "Em andamento").length;
      const finalized = list.filter(t => t.status === "Finalizada").length;
      const delayed = list.filter(t => t.status === "Atrasada").length;
      const upcoming = list.filter(t => t.status === "Aguardando pagamento").length;

      setStats({ total, pending, finalized, delayed, upcoming });
    });

    return () => unsubscribe();
  }, []);

  const filteredTerminations = terminations.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8 print:hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestão de Rescisões</h1>
            <p className="text-slate-500 mt-1">Bem-vindo ao centro operacional do DP.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Nova Rescisão
          </button>
        </div>

        {/* Stats Grid */}
        <DashboardStats stats={stats} />

        {/* Content */}
        <div className="grid grid-cols-1 gap-8">
          <div className="glass-card p-6 bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Rescisões Recentes</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Pesquisar funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <TerminationList terminations={filteredTerminations} />
          </div>
        </div>
      </div>

      {
        isModalOpen && (
          <NewTerminationModal onClose={() => setIsModalOpen(false)} />
        )
      }
    </main >
  );
}
