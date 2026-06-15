"use client";

import { useState, useEffect } from "react";
import DashboardStats from "@/components/DashboardStats";
import TerminationList from "@/components/TerminationList";
import NewTerminationModal from "@/components/NewTerminationModal";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTerminations(list);

      // Calcular estatísticas com base nos dados do Firestore
      const total = list.length;
      setStats({ total, pending: 0, finalized: 0, delayed: 0, upcoming: 0 });
    });

    return () => unsubscribe();
  }, []);

  const filteredTerminations = terminations.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#fafbfc] p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8 print:hidden">
        
        {/* Branded Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border-l-4 border-[var(--primary)] border-t border-b border-r border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,18,154,0.03)] relative overflow-hidden">
          {/* Subtle gold decoration top line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-gold)]" />
          
          <div className="flex items-center gap-4">
            <img src="/logo_novo.jpg" alt="Advance Contabilidade" className="h-12 w-auto object-contain" />
            <div className="h-10 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Painel de Controle</h1>
              <p className="text-slate-400 text-xs mt-0.5">Operações de Departamento Pessoal & Desligamentos</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="glass-card p-6 bg-white overflow-hidden border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,18,154,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 rounded-full bg-[var(--accent-gold)]" />
                <h2 className="text-lg font-bold text-slate-800">Histórico de Rescisões</h2>
              </div>
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm bg-slate-50/50"
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
