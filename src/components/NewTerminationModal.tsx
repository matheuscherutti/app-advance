"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const EXCLUDE_FGTS_MODALITIES = [
    "pedido_demissao_desconto_aviso",
    "pedido_demissao_sem_desconto_aviso",
    "rescisao_antecipada_experiencia_empregado",
    "pedido_demissao_aviso_trabalhado",
    "justa_causa",
    "termino_estagio"
];

const getModalityWarningText = (modality: string) => {
    switch (modality) {
        case "pedido_demissao_desconto_aviso":
        case "pedido_demissao_sem_desconto_aviso":
        case "rescisao_antecipada_experiencia_empregado":
        case "pedido_demissao_aviso_trabalhado":
            return "PEDIDO DE DEMISSÃO NÃO DÁ DIREITO AO SAQUE DO FGTS E NÃO TERÁ DIREITO A RECEBER SEGURO-DESEMPREGO.";
        case "rescisao_antecipada_experiencia_empregador":
            return "SE O FUNCIONÁRIO OPTOU POR SAQUE ANIVERSÁRIO DO FGTS, NÃO TERÁ DIREITO AO SAQUE RESCISÃO, TERÁ DIREITO SOMENTE AO SAQUE DA MULTA DO FGTS.";
        case "acordo_partes":
            return "ACORDO ENTRE AS PARTES NÃO DÁ DIREITO A RECEBER SEGURO-DESEMPREGO E O SAQUE DE FGTS SERÁ DETERMINADO PELA CAIXA .";
        case "justa_causa":
            return "DISPENSA POR JUSTA CAUSA NÃO DÁ DIREITO AO SAQUE DO FGTS E NÃO TERÁ DIREITO A RECEBER SEGURO-DESEMPREGO.";
        default:
            return null;
    }
};

interface PageData {
    dataUrl: string;
    isLandscape: boolean;
}

interface AttachedFile {
    id: string;
    name: string;
    pages: PageData[];
}

interface ModalProps {
    onClose: () => void;
}

interface SortableGridFileItemProps {
    file: AttachedFile;
    index: number;
    selectedFileId: string | null;
    setSelectedFileId: (id: string | null) => void;
    removeFile: (id: string) => void;
}

function SortableGridFileItem({ file, index, selectedFileId, setSelectedFileId, removeFile }: SortableGridFileItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: file.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSelected = selectedFileId === file.id;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
        >
            <div 
                onClick={(e) => {
                    setSelectedFileId(file.id);
                }}
                className={`w-full aspect-[3/4] bg-white rounded-lg border-2 shadow-sm overflow-hidden flex flex-col items-center justify-center transition-all ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-300"
                }`}
            >
                {file.pages.length > 0 ? (
                    <img src={file.pages[0].dataUrl} className="w-full h-full object-cover pointer-events-none" alt={file.name} />
                ) : (
                    <span className="text-[10px] font-black text-rose-500">PDF</span>
                )}
            </div>
            
            <p className="text-[9px] font-bold text-slate-500 truncate mt-1 text-center w-full block px-0.5" title={file.name}>
                {index + 1}. {file.name}
            </p>


            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                }}
                className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-md transition-all scale-0 group-hover:scale-100 cursor-pointer z-10"
                title="Remover anexo"
            >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default function NewTerminationModal({ onClose }: ModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        modality: "",
        terminationDate: "",
        value: "",
        noticeType: "Aviso trabalhado",
        noticeDate: "",
        fgtsPenalty: "",
        fgtsIncludesMonthPrior: false,
        fgtsIncludesConsignment: false,
        observations: ""
    });

    const [calcData, setCalcData] = useState({
        originalPaymentDate: "-",
        adjustedPaymentDate: "-",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rules: {} as any
    });

    const [fgtsDetailsOpen, setFgtsDetailsOpen] = useState(false);
    const [fgtsNotAvailable, setFgtsNotAvailable] = useState(false);
    const [fgtsOpenGuides, setFgtsOpenGuides] = useState(false);
    const [customPaymentDate, setCustomPaymentDate] = useState("");

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setFgtsDetailsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isFgtsExcluded = formData.modality === "" || EXCLUDE_FGTS_MODALITIES.includes(formData.modality);

    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);

    const [activeTab, setActiveTab] = useState<"form" | "pdf">("form");
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    // Auto-selection is handled directly inside upload and remove event handlers to avoid cascading render warnings

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setAttachedFiles((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Calculate dates when termination date changes
    useEffect(() => {
        if (formData.terminationDate) {
            // Use the local components of the date string to avoid TZ shifts
            const [year, month, day] = formData.terminationDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);

            // Rule: Count 10 days including the start day (effectively +9 days)
            date.setDate(date.getDate() + 9);

            const original = new Date(date);
            const adjusted = new Date(date);

            // Sunday (0) -> Friday (-2), Saturday (6) -> Friday (-1)
            if (adjusted.getDay() === 0) adjusted.setDate(adjusted.getDate() - 2);
            else if (adjusted.getDay() === 6) adjusted.setDate(adjusted.getDate() - 1);

            const format = (d: Date) => {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            };

            const formatIso = (d: Date) => {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${yyyy}-${mm}-${dd}`;
            };

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCalcData(prev => ({
                ...prev,
                originalPaymentDate: format(original),
                adjustedPaymentDate: format(adjusted)
            }));

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCustomPaymentDate(formatIso(adjusted));
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

    const hasSeguroDesemprego = [
        "dispensa_aviso_indenizado",
        "dispensa_aviso_trabalhado",
        "rescisao_antecipada_experiencia_empregador"
    ].includes(formData.modality);

    const hasFgtsGuia = [
        "dispensa_aviso_indenizado",
        "dispensa_aviso_trabalhado",
        "termino_experiencia",
        "rescisao_antecipada_experiencia_empregador",
        "acordo_partes"
    ].includes(formData.modality);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setIsProcessingPdf(true);
        try {
            const pdfjs = await import("pdfjs-dist");
            pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

            const newAttachedFiles: AttachedFile[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type !== "application/pdf") continue;

                const pages: PageData[] = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const typedArray = new Uint8Array(event.target?.result as ArrayBuffer);
                            const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
                            const renderedPages: PageData[] = [];

                            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                                const page = await pdf.getPage(pageNum);
                                const viewport = page.getViewport({ scale: 3.0 });
                                const canvas = document.createElement("canvas");
                                const context = canvas.getContext("2d");
                                if (!context) continue;

                                canvas.width = viewport.width;
                                canvas.height = viewport.height;

                                // Garantir fundo branco para evitar transparência/sobreposição
                                context.fillStyle = "#ffffff";
                                context.fillRect(0, 0, canvas.width, canvas.height);

                                await page.render({
                                    canvasContext: context,
                                    viewport: viewport,
                                    canvas: canvas
                                }).promise;

                                const dataUrl = canvas.toDataURL("image/png");
                                const isLandscape = viewport.width > viewport.height;
                                renderedPages.push({ dataUrl, isLandscape });
                            }
                            resolve(renderedPages);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsArrayBuffer(file);
                });

                newAttachedFiles.push({
                    id: Math.random().toString(36).substring(7),
                    name: file.name,
                    pages: pages
                });
            }

            setAttachedFiles(prev => {
                const updated = [...prev, ...newAttachedFiles];
                if (newAttachedFiles.length > 0) {
                    setSelectedFileId(newAttachedFiles[newAttachedFiles.length - 1].id);
                    setActiveTab("pdf");
                }
                return updated;
            });
        } catch (error) {
            console.error("Erro ao processar PDF:", error);
            alert("Ocorreu um erro ao processar o arquivo PDF. Verifique se o arquivo não está corrompido ou protegido.");
        } finally {
            setIsProcessingPdf(false);
        }
    };

    const moveFile = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === attachedFiles.length - 1) return;

        const nextIndex = direction === "up" ? index - 1 : index + 1;
        const updated = [...attachedFiles];
        const temp = updated[index];
        updated[index] = updated[nextIndex];
        updated[nextIndex] = temp;
        setAttachedFiles(updated);
    };

    const removeFile = (id: string) => {
        setAttachedFiles(prev => {
            const filtered = prev.filter(f => f.id !== id);
            if (selectedFileId === id) {
                setSelectedFileId(filtered.length > 0 ? filtered[0].id : null);
            }
            return filtered;
        });
    };

    const handlePrint = () => {
        // eslint-disable-next-line react-hooks/purity
        const timestamp = Date.now();

        // Salva os dados no Firestore em segundo plano para não bloquear a thread visual
        try {
            const modalityName = modalities.find(m => m.id === formData.modality)?.name || formData.modality;
            const formattedValue = formatCurrency(formData.value);

            addDoc(collection(db, "terminations"), {
                name: formData.name,
                modality: modalityName,
                date: formatDateStr(formData.terminationDate),
                paymentDate: formatDateStr(customPaymentDate),
                value: formattedValue,
                status: "Emitido",
                createdAt: timestamp,
            }).catch((error) => {
                console.error("Erro ao salvar no Firestore: ", error);
            });
        } catch (error) {
            console.error("Erro ao processar dados de salvamento: ", error);
        }

        // Altera temporariamente o título do documento para definir o nome padrão do arquivo PDF
        const originalTitle = document.title;
        document.title = `Roteiro de Rescisão - ${formData.name.trim()}`;

        // Abre o diálogo de impressão de forma síncrona para garantir que o navegador não bloqueie a ação
        window.print();

        // Restaura o título após a captura do diálogo de impressão
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
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

    const isFormValid = formData.name.trim() !== "" &&
                        formData.modality !== "" &&
                        formData.terminationDate !== "" &&
                        formData.value.trim() !== "";

    const modalities = [
        { id: "", name: "Selecione..." },
        { id: "acordo_partes", name: "Acordo entre as partes" },
        { id: "dispensa_aviso_indenizado", name: "Dispensa com aviso indenizado" },
        { id: "dispensa_aviso_trabalhado", name: "Dispensa com aviso trabalhado" },
        { id: "justa_causa", name: "Dispensa por justa causa" },
        { id: "pedido_demissao_aviso_trabalhado", name: "Pedido de demissão com aviso trabalhado" },
        { id: "pedido_demissao_desconto_aviso", name: "Pedido de demissão com desconto do aviso" },
        { id: "pedido_demissao_sem_desconto_aviso", name: "Pedido de demissão sem desconto do aviso" },
        { id: "rescisao_antecipada_experiencia_empregado", name: "Rescisão antecipada do contrato de experiência a pedido do empregado" },
        { id: "rescisao_antecipada_experiencia_empregador", name: "Rescisão antecipada do contrato de experiência pelo empregador" },
        { id: "termino_estagio", name: "Término de contrato de estágio" },
        { id: "termino_experiencia", name: "Término de contrato de experiência" },
    ];

    const hasAttachments = attachedFiles.length > 0;
    const selectedFile = attachedFiles.find(f => f.id === selectedFileId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm print:relative print:block print:w-auto print:h-auto print:p-0 print:bg-white print:backdrop-blur-none">
            <div className={`bg-white w-full ${hasAttachments ? 'max-w-7xl lg:h-[90vh]' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto lg:overflow-hidden rounded-2xl shadow-2xl flex flex-col print:hidden transition-all duration-300`}>
                
                {/* Tab Header (visible on < lg screens only when attachments exist) */}
                {hasAttachments && (
                    <div className="flex border-b border-slate-100 lg:hidden flex-shrink-0 bg-white sticky top-0 z-30">
                        <button
                            type="button"
                            onClick={() => setActiveTab("form")}
                            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-colors ${activeTab === "form" ? "border-blue-600 text-blue-600 bg-slate-50/30" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                        >
                            Dados da Rescisão
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("pdf")}
                            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-colors ${activeTab === "pdf" ? "border-blue-600 text-blue-600 bg-slate-50/30" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                        >
                            Documentos Anexados ({attachedFiles.length})
                        </button>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
                    {/* Form + Preview Columns (visible on desktop, or when activeTab === "form" on mobile) */}
                    <div className={`flex-1 flex flex-col md:flex-row min-h-0 ${hasAttachments && activeTab !== "form" ? "hidden lg:flex" : "flex"}`}>
                        {/* Form Section */}
                        <div className={`flex-1 p-8 border-r border-slate-100 ${hasAttachments ? 'lg:overflow-y-auto' : ''}`}>
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

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Modalidade</label>
                                    <select
                                        className="input-field"
                                        value={formData.modality}
                                        onChange={(e) => {
                                            const nextModality = e.target.value;
                                            const excludeFgts = nextModality === "" || EXCLUDE_FGTS_MODALITIES.includes(nextModality);
                                            setFormData({
                                                ...formData,
                                                modality: nextModality,
                                                fgtsPenalty: excludeFgts ? "0" : "",
                                                fgtsIncludesMonthPrior: excludeFgts ? false : formData.fgtsIncludesMonthPrior,
                                                fgtsIncludesConsignment: excludeFgts ? false : formData.fgtsIncludesConsignment
                                            });
                                        }}
                                    >
                                        {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data do Desligamento</label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={formData.terminationDate}
                                            onChange={(e) => handleDateChange(e.target.value)}
                                        />
                                    </div>
                                    <div className="relative" ref={dropdownRef}>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Detalhes Extrato FGTS</label>
                                        <button
                                            type="button"
                                            onClick={() => setFgtsDetailsOpen(!fgtsDetailsOpen)}
                                            className="input-field flex items-center justify-between w-full text-left bg-white cursor-pointer"
                                        >
                                            <span className="truncate text-slate-700">
                                                {fgtsNotAvailable && fgtsOpenGuides
                                                    ? "Não disponível / Guias em aberto"
                                                    : fgtsNotAvailable
                                                    ? "Não disponível"
                                                    : fgtsOpenGuides
                                                    ? "Guias em aberto"
                                                    : "Selecione..."}
                                            </span>
                                            <svg
                                                className={`w-4 h-4 text-slate-400 transition-transform ${fgtsDetailsOpen ? "transform rotate-180" : ""}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {fgtsDetailsOpen && (
                                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 space-y-2.5">
                                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={fgtsNotAvailable}
                                                        onChange={(e) => setFgtsNotAvailable(e.target.checked)}
                                                    />
                                                    Não disponível
                                                </label>
                                                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        checked={fgtsOpenGuides}
                                                        onChange={(e) => setFgtsOpenGuides(e.target.checked)}
                                                    />
                                                    Guias em aberto
                                                </label>
                                            </div>
                                        )}
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
                                        <label className="block text-sm font-medium text-slate-700">Valor Multa {formData.modality === "acordo_partes" ? "20%" : "40%"} FGTS</label>
                                        <input
                                            type="number"
                                            className="input-field disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                            placeholder="R$ 0,00"
                                            value={isFgtsExcluded ? "0" : formData.fgtsPenalty}
                                            disabled={isFgtsExcluded}
                                            onChange={(e) => setFormData({ ...formData, fgtsPenalty: e.target.value })}
                                        />
                                        <div className="flex gap-4 mt-2">
                                            <label className={`flex items-center gap-2 text-[11px] font-medium text-slate-600 ${isFgtsExcluded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                    checked={!isFgtsExcluded && formData.fgtsIncludesMonthPrior}
                                                    disabled={isFgtsExcluded}
                                                    onChange={(e) => setFormData({ ...formData, fgtsIncludesMonthPrior: e.target.checked })}
                                                />
                                                FGTS Mês Anterior
                                            </label>
                                            <label className={`flex items-center gap-2 text-[11px] font-medium text-slate-600 ${isFgtsExcluded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                    checked={!isFgtsExcluded && formData.fgtsIncludesConsignment}
                                                    disabled={isFgtsExcluded}
                                                    onChange={(e) => setFormData({ ...formData, fgtsIncludesConsignment: e.target.checked })}
                                                />
                                                Parcela Consignado
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <label className="block text-sm font-semibold text-slate-800 mb-2">Arquivos PDFs Anexados (Complementares)</label>
                                    
                                    {/* Upload Area */}
                                    <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-colors bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer group">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            disabled={isProcessingPdf}
                                        />
                                        <div className="text-center space-y-1">
                                            {isProcessingPdf ? (
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                                            ) : (
                                                <svg className="w-8 h-8 text-slate-400 group-hover:text-blue-500 mx-auto transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                </svg>
                                            )}
                                            <p className="text-xs font-semibold text-slate-700">
                                                {isProcessingPdf ? "Processando arquivos..." : "Clique ou arraste para anexar PDFs"}
                                            </p>
                                            <p className="text-[10px] text-slate-400">Suporta múltiplos PDFs</p>
                                        </div>
                                    </div>


                                </div>
                            </form>
                        </div>

                        {/* Preview Section */}
                        <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col">
                            <h3 className="text-lg font-semibold text-slate-900 mb-6">Preview do Roteiro</h3>

                            <div className="flex-1 flex flex-col min-h-0 space-y-6 text-sm">
                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-slate-500 mb-1 text-xs">Prazo de Pagamento</p>
                                    <input
                                        type="date"
                                        className="w-full text-lg font-bold text-blue-600 bg-transparent border-0 border-b border-dashed border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-0 cursor-pointer p-0 pb-0.5"
                                        value={customPaymentDate}
                                        onChange={(e) => setCustomPaymentDate(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 mt-1 italic">Vencimento original: {calcData.originalPaymentDate}</p>
                                </div>

                                <div className="space-y-4">
                                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Resumo de Valores</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Líquido:</span>
                                            <span className="font-bold text-rose-600">{formatCurrency(formData.value)}</span>
                                        </div>
                                        {!isFgtsExcluded && (
                                            <div className="flex justify-between text-slate-600">
                                                <span>Multa FGTS:</span>
                                                <span className="font-bold text-rose-600">{formatCurrency(formData.fgtsPenalty)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {attachedFiles.length > 0 && (
                                    <div className="space-y-3 pt-4 border-t border-slate-200">
                                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Documentos Anexados</p>
                                        <div className="space-y-2 text-xs text-slate-600 pl-1">
                                            {attachedFiles.map((file, idx) => (
                                                <div key={file.id} className="font-semibold truncate pr-1" title={file.name}>
                                                    {idx + 1}. {file.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handlePrint}
                                disabled={!isFormValid}
                                className="btn-primary w-full mt-auto py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Gerar Roteiro PDF
                            </button>
                        </div>
                    </div>

                    {/* PDF Viewer Column (visible on desktop when attachments exist, or when activeTab === "pdf" on mobile) */}
                    {hasAttachments && (
                        <div className={`w-full lg:w-[450px] xl:w-[500px] border-l border-slate-100 bg-slate-50 flex flex-col min-h-0 ${activeTab !== "pdf" ? "hidden lg:flex" : "flex"}`}>
                            <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    Documentos Anexados
                                </h3>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                    {attachedFiles.length} {attachedFiles.length === 1 ? 'arquivo' : 'arquivos'}
                                </span>
                            </div>

                            {/* Scrollable grid of attachments with larger thumbnails */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={attachedFiles.map(f => f.id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            {attachedFiles.map((file, index) => (
                                                <SortableGridFileItem
                                                    key={file.id}
                                                    file={file}
                                                    index={index}
                                                    selectedFileId={selectedFileId}
                                                    setSelectedFileId={setSelectedFileId}
                                                    removeFile={removeFile}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* HIGH FIDELITY PRINT TEMPLATE (Hidden from screen, visible in print) */}
            <div className="hidden print:block font-sans text-slate-900 bg-[#fafaf9]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                {/* PAGE 1: ROADMAP */}
                <div 
                    className="print-page print:relative print:overflow-hidden print:flex print:flex-col print:justify-between relative w-full h-screen flex flex-col justify-between" 
                    style={attachedFiles.length > 0 ? { breakAfter: "page", pageBreakAfter: "always" } : undefined}
                >
                    {/* Visual Artifacts */}
                    <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-[#001bb3] via-[#00129a] to-[#fca311] z-20" />

                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035]">
                        <div className="scale-[2.2]">
                            <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                                {/* Blue circle arc with gap */}
                                <path d="M 140 60 A 65 65 0 1 0 160 110" stroke="#001bb3" strokeWidth="14" strokeLinecap="round" />
                                {/* Trendline arrow starting near bottom left, going right, bending up-right */}
                                <path d="M 65 130 L 95 110 L 140 65" stroke="#fca311" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M 105 65 L 140 65 L 140 100" stroke="#fca311" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                                {/* Gray dot at start */}
                                <circle cx="50" cy="138" r="9" fill="#888" />
                            </svg>
                        </div>
                    </div>

                    {/* Full-width header */}
                    <div className="w-full bg-white pl-12 pr-10 py-4 flex items-center justify-between text-slate-800 border-b-2 border-[#fca311] relative z-10 shadow-sm">
                        <div className="flex items-center gap-4">
                            <img src="/logo_novo.jpg" alt="Advance Contabilidade" className="h-14 w-auto object-contain" />
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] text-[#001bb3] font-black uppercase tracking-[0.15em]">Consultoria Empresarial</span>
                            <p className="text-[7.5px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Soluções Inteligentes e Seguras</p>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="pl-14 pr-10 py-7 relative z-10 flex-1 flex flex-col justify-between box-border">
                        <div className="flex-1">
                            {/* Title */}
                            <h1 className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Roteiro de Orientação Operacional</h1>

                             <h2 className="text-center text-[15px] font-black text-[#001bb3] uppercase mb-5 tracking-wider">
                                {modalities.find(m => m.id === formData.modality)?.name}
                            </h2>

                            {/* Intro */}
                            <div className="mb-5 leading-relaxed text-[12px] text-slate-700 bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#001bb3]" />
                                <p className="mb-2">Olá, tudo bem? Segue anexo os documentos de {formData.modality === "termino_estagio" ? "término de contrato" : "rescisão"} do {formData.modality === "termino_estagio" ? "estagiário" : "colaborador"} <span className="font-bold text-slate-900">{formData.name}</span>, com data de desligamento em <span className="text-[#001bb3] font-bold">{formatDateStr(formData.terminationDate)}</span>.</p>
                                <p className="mb-2">A data limite para o pagamento das verbas rescisórias e entrega de vias é <span className="text-[#001bb3] font-bold">{formatDateStr(customPaymentDate)}</span>.</p>
                                <p className="text-[#e27c00] font-bold flex items-center gap-1.5 mt-2 text-[11px]">
                                    ⚠️ Importante: Providenciar exame demissional do {formData.modality === "termino_estagio" ? "estagiário" : "colaborador"}.
                                </p>
                            </div>

                            <p className="mb-4 font-extrabold text-[11.5px] text-slate-800 uppercase tracking-wider">Fazer a impressão e distribuição das seguintes vias:</p>
                            {/* Lists */}
                            <div className="grid grid-cols-2 gap-6 mb-5">
                                <section className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden flex flex-col">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#001bb3]" />
                                    <h3 className="font-black text-xs text-[#121824] uppercase mb-3 pb-1 border-b border-slate-100 tracking-wider">VIAS EMPRESA</h3>
                                    <ul className="space-y-2 flex-1">
                                        {formData.modality === "termino_estagio" ? (
                                            <>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Relatório analítico do cálculo de rescisão;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Termo de rescisão do contrato de estágio;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Comprovante de pagamento das verbas (Ao fazer o pagamento anexar o comprovante)</span>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Relatório analítico do cálculo de rescisão;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Termo de rescisão;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Termo de quitação;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>
                                                        {fgtsNotAvailable && fgtsOpenGuides
                                                            ? "01 via – Extrato de FGTS (Não disponível / Guias em aberto);"
                                                            : fgtsNotAvailable
                                                            ? "01 via – Extrato de FGTS (Não disponível);"
                                                            : fgtsOpenGuides
                                                            ? "01 via – Extrato de FGTS (Guias em aberto);"
                                                            : "01 via – Extrato de FGTS;"}
                                                    </span>
                                                </li>
                                                {hasFgtsGuia && (
                                                    <>
                                                        <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                            <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                            <span>01 via – Guia de recolhimento de FGTS;</span>
                                                        </li>
                                                        <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                            <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                            <span>01 via – Detalhamento da guia FGTS;</span>
                                                        </li>
                                                    </>
                                                )}
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Comprovante de pagamento das verbas (anexar na rescisão).</span>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </section>

                                <section className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-sm relative overflow-hidden flex flex-col">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#001bb3]" />
                                    <h3 className="font-black text-xs text-[#121824] uppercase mb-3 pb-1 border-b border-slate-100 tracking-wider">
                                        {formData.modality === "termino_estagio" ? "VIAS ESTAGIÁRIO" : "VIAS COLABORADOR"}
                                    </h3>
                                    <ul className="space-y-2 flex-1">
                                        {formData.modality === "termino_estagio" ? (
                                            <>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Termo de rescisão do contrato de estágio;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Carta de referência;</span>
                                                </li>
                                            </>
                                        ) : (
                                            <>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Carta de referência;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Termo de rescisão;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Termo de quitação;</span>
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>
                                                        {fgtsNotAvailable && fgtsOpenGuides
                                                            ? "01 via – Extrato de FGTS (Não disponível / Guias em aberto);"
                                                            : fgtsNotAvailable
                                                            ? "01 via – Extrato de FGTS (Não disponível);"
                                                            : fgtsOpenGuides
                                                            ? "01 via – Extrato de FGTS (Guias em aberto);"
                                                            : "01 via – Extrato de FGTS;"}
                                                    </span>
                                                </li>
                                                {hasSeguroDesemprego && (
                                                    <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                        <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                        <span>01 via – Requerimento seguro desemprego;</span>
                                                    </li>
                                                )}
                                                <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                                                    <div className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-50 flex-shrink-0 mt-0.5" />
                                                    <span>01 via – Comprovante de pagamento das verbas.</span>
                                                </li>
                                            </>
                                        )}
                                    </ul>
                                </section>
                            </div>

                            {/* Summary Values */}
                            <div 
                                className="bg-gradient-to-r from-[#00129a] to-[#111827] text-white print:text-slate-800 p-5 rounded-xl border border-[#001bb3]/35 print:border-slate-350 shadow-md flex justify-between gap-4 mb-5 relative overflow-hidden print:bg-white print:bg-none print:shadow-none"
                            >
                                <div className="absolute right-0 top-0 w-32 h-32 bg-[#001bb3]/10 rounded-full blur-2xl pointer-events-none print:hidden" />
                                
                                <div className={`flex-1 ${!isFgtsExcluded ? "border-r border-slate-800/80 print:border-slate-200 pr-4" : ""} last:border-0 last:pr-0`}>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-500 font-bold block">
                                        {formData.modality === "termino_estagio" ? "VALOR LÍQUIDO A SER PAGO PARA ESTAGIÁRIO" : "Valor Líquido a ser Pago ao Colaborador"}
                                    </span>
                                    <div className="text-xl font-black text-[#fca311] print:text-[#00129a] mt-0.5 leading-none flex items-center flex-wrap">
                                        <span>{formatCurrency(formData.value)}</span>
                                        {(parseFloat(formData.value) === 0 || isNaN(parseFloat(formData.value)) || parseFloat(formData.value) < 0) && (
                                            <span className="text-[10px] text-red-400 print:text-red-750 font-black uppercase tracking-wider ml-2">
                                                - Não há valores a serem pagos para o {formData.modality === "termino_estagio" ? "estagiário" : "funcionário"} (Rescisão zerada / com estouro)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {!isFgtsExcluded && (
                                    <div className="flex-1 pl-4">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 print:text-slate-500 font-bold block">Multa {formData.modality === "acordo_partes" ? "20%" : "40%"} sobre o FGTS</span>
                                        <div className="text-xl font-black text-[#fca311] print:text-[#00129a] mt-0.5 leading-none">{formatCurrency(formData.fgtsPenalty)}</div>
                                        {(formData.fgtsIncludesMonthPrior || formData.fgtsIncludesConsignment) && (
                                            <div 
                                                className="text-[10px] mt-2 py-1 px-2.5 inline-block italic normal-case text-slate-900 font-bold bg-[#fca311] print:bg-slate-100 print:text-slate-900 rounded border border-[#001bb3]/20 print:border-slate-300"
                                            >
                                                está incluso: {[
                                                    formData.fgtsIncludesMonthPrior && "FGTS mês anterior",
                                                    formData.fgtsIncludesConsignment && "Parcela do consignado"
                                                 ].filter(Boolean).join(" + ")}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Instructions */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <p className="text-[11px] text-slate-500 font-medium italic text-center">
                                    Orientamos que o pagamento seja feito através de Ordem de pagamento, transferência bancária, cheque administrativo ou Pix.
                                </p>
                                {getModalityWarningText(formData.modality) && (
                                    <p className="text-[10.5px] text-[#991b1b] font-black text-center uppercase tracking-wide leading-relaxed">
                                        {getModalityWarningText(formData.modality)}
                                    </p>
                                )}
                            </div>

                            {(hasSeguroDesemprego || !isFgtsExcluded) && (
                                <div className={`grid ${hasSeguroDesemprego && !isFgtsExcluded ? "grid-cols-2" : "grid-cols-1"} gap-3 text-[11px] bg-white p-3.5 rounded-xl border border-slate-200/50`}>
                                    {!isFgtsExcluded && (
                                        <p className="text-[#001bb3] font-bold flex items-center gap-1.5 justify-center">
                                            <svg className="w-4 h-4 flex-shrink-0 text-[#001bb3]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                            Saque FGTS: no App &quot;FGTS CAIXA&quot;
                                        </p>
                                    )}
                                    {hasSeguroDesemprego && (
                                        <p className="text-[#001bb3] font-bold flex items-center gap-1.5 justify-center">
                                            <svg className="w-4 h-4 flex-shrink-0 text-[#001bb3]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                                            Seguro-Desemprego: no App &quot;Carteira de Trabalho Digital&quot;
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="bg-amber-50/80 p-3 text-center text-[10.5px] font-black uppercase text-[#991b1b] border border-red-200/60 rounded-xl">
                                ATENÇÃO: O PAGAMENTO DA RESCISÃO FORA DO PRAZO ACARRETARÁ EM MULTA DE UM SALÁRIO DO {formData.modality === "termino_estagio" ? "ESTAGIÁRIO" : "COLABORADOR"}.
                            </div>
                        </div>
                    </div>
                </div>

                {/* PAGE 2+: ATTACHED PDF PAGES */}
                {attachedFiles.map((file, fileIdx) => {
                    const isLastFile = fileIdx === attachedFiles.length - 1;
                    return file.pages.map((page, pageIdx) => {
                        const isLastPageOfFile = pageIdx === file.pages.length - 1;
                        const isAbsoluteLast = isLastFile && isLastPageOfFile;
                        return (
                            <div
                                key={`${file.id}-${pageIdx}`}
                                className={`print-page print:relative print:flex print:items-center print:justify-center bg-white p-0 ${page.isLandscape ? 'print-landscape' : ''}`}
                                style={isAbsoluteLast ? undefined : { breakAfter: "page", pageBreakAfter: "always" }}
                            >
                                <img src={page.dataUrl} className="w-full h-full object-contain" alt={`${file.name} - Página ${pageIdx + 1}`} />
                            </div>
                        );
                    });
                })}
            </div>
        </div>
    );
}
