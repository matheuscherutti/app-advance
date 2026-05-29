"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

interface ModalProps {
    onClose: () => void;
}

export default function NewTerminationModal({ onClose }: ModalProps) {
    const [formData, setFormData] = useState({
        name: "Erivaldo Porfirio dos Santos",
        modality: "dispensa_aviso_trabalhado",
        terminationDate: "2026-05-24",
        value: "13256.14",
        noticeType: "Aviso trabalhado",
        noticeDate: "2026-04-24",
        fgtsPenalty: "15656.41",
        fgtsIncludesMonthPrior: false,
        fgtsIncludesConsignment: false,
        observations: ""
    });

    const [calcData, setCalcData] = useState({
        originalPaymentDate: "-",
        adjustedPaymentDate: "-",
        rules: {} as any
    });

    // Calculate dates when termination date changes
    useEffect(() => {
        if (formData.terminationDate) {
            // Use the local components of the date string to avoid TZ shifts
            const [year, month, day] = formData.terminationDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);

            // Rule: Count 10 days including the start day (effectively +9 days)
            date.setDate(date.getDate() + 9);

            const original = new Date(date);
            let adjusted = new Date(date);

            // Sunday (0) -> Friday (-2), Saturday (6) -> Friday (-1)
            if (adjusted.getDay() === 0) adjusted.setDate(adjusted.getDate() - 2);
            else if (adjusted.getDay() === 6) adjusted.setDate(adjusted.getDate() - 1);

            // Check for specific holidays (simplified for MVP frontend, backend has full list)
            // If the user expects June 2 for May 24, it means my 10-day logic might be 
            // interpreted as "within 10 days" (so the 9th day?) or June 3 is a holiday.
            // I'll adjust to match the user's expected June 2 if I can find a reason,
            // but I'll stick to the standard +10 rules.

            const format = (d: Date) => {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            };

            setCalcData(prev => ({
                ...prev,
                originalPaymentDate: format(original),
                adjustedPaymentDate: format(adjusted)
            }));
        }
    }, [formData.terminationDate]);

    const handleDateChange = (newDate: string) => {
        setFormData({ ...formData, terminationDate: newDate });

        if (newDate) {
            const day = parseInt(newDate.split('-')[2]);
            if (day >= 1 && day <= 9 && formData.modality.includes('dispensa')) {
                alert("Lembrar de incluir o FGTS do mês anterior");
            }
        }
    };

    const handlePrint = async () => {
        try {
            const modalityName = modalities.find(m => m.id === formData.modality)?.name || formData.modality;
            const formattedValue = formatCurrency(formData.value);

            await addDoc(collection(db, "terminations"), {
                name: formData.name,
                modality: modalityName,
                date: formatDateStr(formData.terminationDate),
                paymentDate: calcData.adjustedPaymentDate,
                value: formattedValue,
                status: "Aguardando pagamento",
                createdAt: Date.now(),
            });
        } catch (error) {
            console.error("Erro ao salvar no Firestore: ", error);
        }
        window.print();
        onClose();
    };

    const formatDateStr = (dateStr: string) => {
        if (!dateStr) return "-";
        const parts = dateStr.split("-");
        if (parts.length !== 3) return dateStr;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (val: string) => {
        const n = parseFloat(val);
        if (isNaN(n)) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    };

    const modalities = [
        { id: "dispensa_aviso_indenizado", name: "Dispensa com aviso indenizado" },
        { id: "dispensa_aviso_trabalhado", name: "Dispensa com aviso trabalhado" },
        { id: "pedido_demissao_desconto_aviso", name: "Pedido de demissão com desconto do aviso" },
        { id: "pedido_demissao_aviso_trabalhado", name: "Pedido de demissão com aviso trabalhado" },
        { id: "termino_experiencia", name: "Término de contrato de experiência" },
        { id: "justa_causa", name: "Dispensa por justa causa" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col md:flex-row print:hidden">
                {/* Form Section */}
                <div className="flex-1 p-8 border-r border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Nova Rescisão</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Funcionário</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ex: João Silva"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Modalidade</label>
                                <select
                                    className="input-field"
                                    value={formData.modality}
                                    onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                                >
                                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data do Desligamento</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={formData.terminationDate}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor a ser pago Funcionário</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="R$ 0,00"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Valor Multa 40% FGTS</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="R$ 0,00"
                                    value={formData.fgtsPenalty}
                                    onChange={(e) => setFormData({ ...formData, fgtsPenalty: e.target.value })}
                                />
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={formData.fgtsIncludesMonthPrior}
                                            onChange={(e) => setFormData({ ...formData, fgtsIncludesMonthPrior: e.target.checked })}
                                        />
                                        FGTS Mês Anterior
                                    </label>
                                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={formData.fgtsIncludesConsignment}
                                            onChange={(e) => setFormData({ ...formData, fgtsIncludesConsignment: e.target.checked })}
                                        />
                                        Parcela Consignado
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                            <textarea
                                className="input-field h-24 resize-none"
                                placeholder="Notas adicionais..."
                                value={formData.observations}
                                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                            ></textarea>
                        </div>
                    </form>
                </div>

                {/* Preview Section */}
                <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-900 mb-6">Preview do Roteiro</h3>

                    <div className="flex-1 space-y-6 text-sm">
                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-slate-500 mb-1">Prazo de Pagamento</p>
                            <p className="text-lg font-bold text-blue-600">{calcData.adjustedPaymentDate}</p>
                            <p className="text-xs text-slate-400 mt-1 italic">Vencimento original: {calcData.originalPaymentDate}</p>
                        </div>

                        <div className="space-y-4">
                            <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Resumo de Valores</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-slate-600">
                                    <span>Líquido:</span>
                                    <span className="font-bold text-rose-600">{formatCurrency(formData.value)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Multa FGTS:</span>
                                    <span className="font-bold text-rose-600">{formatCurrency(formData.fgtsPenalty)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="btn-primary w-full mt-auto py-3"
                    >
                        Gerar Roteiro PDF
                    </button>
                </div>
            </div>

            {/* HIGH FIDELITY PRINT TEMPLATE (Hidden from screen, visible in print) */}
            <div className="hidden print:block print:fixed print:inset-0 bg-[#fafaf9] z-[100] p-0 font-sans text-slate-900 print:h-screen print:w-screen print:overflow-hidden flex flex-col">
                {/* Visual Artifacts */}
                <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-[#8b5a2b] via-[#5c3d2e] to-[#8b5a2b] z-20" />

                {/* Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <div className="transform -rotate-45 scale-[3] text-[#8b5a2b]">
                        <svg width="200" height="200" viewBox="0 0 200 200">
                            <polygon points="100,15 40,165 72,165 100,95" fill="currentColor" />
                            <polygon points="100,15 160,165 128,165 100,95" fill="currentColor" />
                            <polygon points="76,120 124,120 100,90 100,130" fill="currentColor" />
                        </svg>
                    </div>
                </div>

                {/* Full-width header */}
                <div className="w-full bg-[#121824] pl-12 pr-10 py-5 flex items-center justify-between text-white border-b-2 border-[#8b5a2b]/80 relative z-10 shadow-md">
                    <div className="flex items-center gap-4">
                        <img src="/logo_advance.png" alt="Advance Contabilidade" className="h-14 w-auto object-contain" />
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] text-[#dfb76c] font-black uppercase tracking-[0.15em]">Consultoria Empresarial</span>
                        <p className="text-[7.5px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Soluções Inteligentes e Seguras</p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="pl-14 pr-10 py-7 relative z-10 flex-1 flex flex-col justify-between box-border">
                    <div className="flex-1">
                        {/* Title */}
                        <h1 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Roteiro de Orientação Operacional</h1>

                        <h2 className="text-center text-[15px] font-black text-[#8b5a2b] uppercase mb-5 tracking-wider">
                            {modalities.find(m => m.id === formData.modality)?.name}
                        </h2>

                        {/* Intro */}
                        <div className="mb-5 leading-relaxed text-[12px] text-slate-700 bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b5a2b]" />
                            <p className="mb-2">Olá, tudo bem? Segue anexo os documentos de rescisão do colaborador <span className="font-bold text-slate-900">{formData.name}</span>, com aviso em <span className="text-[#8b5a2b] font-bold">{formatDateStr(formData.noticeDate)}</span> e dispensa em <span className="text-[#8b5a2b] font-bold">{formatDateStr(formData.terminationDate)}</span>.</p>
                            <p className="mb-2">A data limite para o pagamento das verbas rescisórias e entrega de vias é <span className="text-[#8b5a2b] font-bold">{calcData.adjustedPaymentDate}</span>.</p>
                            <p className="text-[#a16207] font-bold flex items-center gap-1.5 mt-2 text-[11px]">
                                ⚠️ Importante: Providenciar exame demissional do colaborador.
                            </p>
                        </div>

                        <p className="mb-4 font-extrabold text-[11.5px] text-slate-800 uppercase tracking-wider">Fazer a impressão e distribuição das seguintes vias:</p>

                        {/* Lists */}
                        <div className="grid grid-cols-2 gap-6 mb-5">
                            <section className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden flex flex-col">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b5a2b]" />
                                <h3 className="font-black text-xs text-[#121824] uppercase mb-3 pb-1 border-b border-slate-100 tracking-wider">VIAS EMPRESA</h3>
                                <ul className="space-y-2 flex-1">
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Recibo de rescisão do contrato de trabalho;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Relatório analítico do cálculo de rescisão;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Termo de quitação de rescisão do contrato;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Extrato de conta do fundo de garantia – FGTS;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Comprovante de pagamento das verbas (anexar na rescisão);</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Guia de recolhimento rescisório e detalhamento;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Segunda página do seguro-desemprego (recortar protocolo).</span>
                                    </li>
                                </ul>
                            </section>

                            <section className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden flex flex-col">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b5a2b]" />
                                <h3 className="font-black text-xs text-[#121824] uppercase mb-3 pb-1 border-b border-slate-100 tracking-wider">VIAS COLABORADOR</h3>
                                <ul className="space-y-2 flex-1">
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Carta de referência;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Recibo de rescisão do contrato de trabalho;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Termo de quitação de rescisão do contrato;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Extrato de conta do fundo de garantia – FGTS;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>01 via – Comprovante de pagamento das verbas;</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                        <span>1 e ½ – Formulário do Seguro Desemprego.</span>
                                    </li>
                                </ul>
                            </section>
                        </div>

                        {/* Summary Values */}
                        <div className="bg-gradient-to-r from-[#121824] to-[#1a202c] text-white p-5 rounded-xl border border-[#8b5a2b]/35 shadow-md flex justify-between gap-4 mb-5 relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-[#8b5a2b]/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div className="flex-1 border-r border-slate-800/80 pr-4 last:border-0 last:pr-0">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Valor Líquido a ser Pago</span>
                                <div className="text-xl font-black text-[#dfb76c] mt-0.5 leading-none">{formatCurrency(formData.value)}</div>
                            </div>
                            
                            <div className="flex-1 pl-4">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Multa 40% sobre o FGTS</span>
                                <div className="text-xl font-black text-[#dfb76c] mt-0.5 leading-none">{formatCurrency(formData.fgtsPenalty)}</div>
                                {(formData.fgtsIncludesMonthPrior || formData.fgtsIncludesConsignment) && (
                                    <div className="text-[10px] mt-2 py-1 px-2.5 inline-block italic normal-case text-slate-900 font-bold bg-[#dfb76c] rounded border border-[#8b5a2b]/20">
                                        está incluso: {[
                                            formData.fgtsIncludesMonthPrior && "FGTS mês anterior",
                                            formData.fgtsIncludesConsignment && "Parcela do consignado"
                                        ].filter(Boolean).join(" + ")}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Instructions */}
                    <div className="space-y-5">
                        <p className="text-[11px] text-slate-500 font-medium italic text-center">
                            Orientamos que o pagamento seja feito através de Ordem de pagamento, transferência bancária, cheque administrativo ou Pix.
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-[11px] bg-white p-3.5 rounded-xl border border-slate-200/50">
                            <p className="text-[#8b5a2b] font-bold flex items-center gap-1.5 justify-center">
                                <svg className="w-4 h-4 flex-shrink-0 text-[#8b5a2b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                Saque FGTS: no App "FGTS CAIXA"
                            </p>
                            <p className="text-[#8b5a2b] font-bold flex items-center gap-1.5 justify-center">
                                <svg className="w-4 h-4 flex-shrink-0 text-[#8b5a2b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                                Seguro-Desemprego: no App "Carteira de Trabalho Digital"
                            </p>
                        </div>

                        <div className="bg-amber-50/80 p-3 text-center text-[10.5px] font-black uppercase text-[#991b1b] border border-red-200/60 rounded-xl">
                            ATENÇÃO: O PAGAMENTO DA RESCISÃO FORA DO PRAZO ACARRETARÁ EM MULTA DE UM SALÁRIO DO COLABORADOR.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
