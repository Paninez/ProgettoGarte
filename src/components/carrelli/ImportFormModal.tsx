import React, { useState, useMemo } from "react";
import { X, FileText, Loader2, CheckCircle, ArrowRight, Save, Plus, Table2, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { getAccessToken } from "../../lib/firebase";
import { fetchWithRetry } from "../../lib/googleApi";
import { OggettoMagazzino, Carrello, DettaglioCarrello, CustomerLoyalty } from "../../types";
import { TIERS_CONFIG } from "../../lib/loyaltyEngine";
import Papa from "papaparse";


const CartSearchSelect = ({
  value,
  onChange,
  disabled,
  clientName,
  carrelli
}: {
  value: string | null;
  onChange: (val: string | null) => void;
  disabled: boolean;
  clientName: string;
  carrelli: Carrello[];
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCarts = React.useMemo(() => carrelli.filter(c => c.Stato_Carrello !== "Completato"), [carrelli]);
  
  const filteredCarts = React.useMemo(() => {
    if (!search) return openCarts;
    const normalizeString = (str: string): string => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[\s\u00a0]+/g, " ")
        .trim();
    };
    const searchTerms = normalizeString(search).split(" ").filter(Boolean);
    return openCarts.filter(c => {
      const normName = normalizeString(c.Nome_Cliente);
      const normId = normalizeString(c.ID_Carrello);
      return searchTerms.every(term => normName.includes(term) || normId.includes(term));
    });
  }, [search, openCarts]);

  const selectedCart = React.useMemo(() => openCarts.find(c => c.ID_Carrello === value), [value, openCarts]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm rounded-lg border text-left flex justify-between items-center transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          !value ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}
      >
        <span className="truncate">
          {value ? `Aggiorna: ${selectedCart?.Nome_Cliente || value}` : `+ Crea nuovo carrello per "${clientName}"`}
        </span>
        <span className="text-slate-400 text-xs ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              type="text"
              autoFocus
              placeholder="Cerca per nome o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <button
              type="button"
              onClick={() => { onChange(null); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-100 ${!value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
            >
              + Crea nuovo carrello per "{clientName}"
            </button>
            {filteredCarts.map((c, idx) => (
              <button
                key={`${c.ID_Carrello}-${idx}`}
                type="button"
                onClick={() => { onChange(c.ID_Carrello); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-slate-100 flex flex-col ${value === c.ID_Carrello ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
              >
                <span>{c.Nome_Cliente}</span>
                <span className="text-[10px] text-slate-400 font-mono">{c.ID_Carrello}</span>
              </button>
            ))}
            {filteredCarts.length === 0 && (
              <div className="px-3 py-4 text-sm text-center text-slate-500">
                Nessun carrello trovato.
              </div>
            )}


          </div>
        </div>
      )}
    </div>
  );
};

export interface ImportProposal {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientTag?: string;
  itemDescription: string;
  requestedQuantity?: number;
  isPaid?: boolean;
  matchedCartId: string | null;
  matchedItemId: string | null;
  selected: boolean;
  rowIndex?: number;
  rawRowData?: any;
}

interface ImportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  magazzino: OggettoMagazzino[];
  carrelli: Carrello[];
  dettagli: DettaglioCarrello[];
  onApplyProposals: (proposals: ImportProposal[]) => Promise<any>;
  onImportSuccess: (report: any) => void;
  loyaltyProfiles?: CustomerLoyalty[];
}

export const ImportFormModal: React.FC<ImportFormModalProps> = ({
  isOpen,
  onClose,
  magazzino,
  carrelli,
  dettagli,
  onApplyProposals,
  onImportSuccess,
  loyaltyProfiles = [],
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [importMethod, setImportMethod] = useState<"forms" | "excel">("forms");
  const [formUrl, setFormUrl] = useState("");
  const [excelData, setExcelData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form metadata & responses
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<any[]>([]);
  
  // Mappings
  const [nameQuestion, setNameQuestion] = useState("");
  const [itemQuestion, setItemQuestion] = useState("");
  const [emailQuestion, setEmailQuestion] = useState("");
  const [phoneQuestion, setPhoneQuestion] = useState("");
  const [addressQuestion, setAddressQuestion] = useState("");
  const [tagQuestion, setTagQuestion] = useState("");
  const [quantityQuestion, setQuantityQuestion] = useState("");
  const [isPaidQuestion, setIsPaidQuestion] = useState("");
  
  // Proposals
  const [proposals, setProposals] = useState<ImportProposal[]>([]);
  
  // Apply state
  const [isApplying, setIsApplying] = useState(false);
  const isApplyingRef = React.useRef(false);


  const handleParseExcel = () => {
    if (!excelData.trim()) {
      setError("Incolla dei dati prima di procedere.");
      return;
    }
    setError("");
    setIsLoading(true);
    
    try {
      const result = Papa.parse(excelData.trim(), {
        header: true,
        skipEmptyLines: true,
      });
      
      if (result.errors.length > 0) {
        console.warn("Papaparse errors:", result.errors);
      }
      
      const headers = result.meta.fields || [];
      if (headers.length === 0) {
        throw new Error("Nessuna colonna trovata nei dati incollati.");
      }
      
      const qMap: Record<string, string> = {};
      headers.forEach(h => {
        qMap[h] = h;
      });
      setQuestionsMap(qMap);
      
      const parsedResponses = result.data.map((row: any, i: number) => ({
        responseId: `excel-${Date.now()}-${i}`,
        timestamp: new Date().toISOString(),
        answers: row,
        rowIndex: i + 2, // +2 because 1-based and header row
        rawRowData: row
      }));
      
      setResponses(parsedResponses);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Errore nell'analisi dei dati.");
    } finally {
      setIsLoading(false);
    }
  };

  const extractFormId = (url: string) => {
    try {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  const handleFetchResponses = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Utente non autenticato. Fai il login.");
      const formId = extractFormId(formUrl);
      if (!formId) throw new Error("ID modulo non valido");

      // 1. Fetch form metadata to get question names
      const formRes = await fetchWithRetry(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!formRes.ok) throw new Error("Errore nel recupero del modulo (verifica permessi e ID)");
      
      const formData = await formRes.json();
      const qMap: Record<string, string> = {};
      if (formData.items) {
        formData.items.forEach((item: any) => {
          if (item.questionItem && item.questionItem.question) {
            qMap[item.questionItem.question.questionId] = item.title;
          }
        });
      }
      setQuestionsMap(qMap);

      // 2. Fetch responses
      const res = await fetchWithRetry(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Errore nel recupero delle risposte");
      
      const responsesData = await res.json();
      if (!responsesData.responses) {
         setResponses([]);
      } else {
         const parsedResponses = responsesData.responses.map((resp: any, i: number) => {
           const answers: Record<string, string> = {};
           if (resp.answers) {
             Object.values(resp.answers).forEach((ans: any) => {
               const questionTitle = qMap[ans.questionId] || ans.questionId;
               answers[questionTitle] = ans.textAnswers?.answers?.[0]?.value || "";
             });
           }
           return {
             responseId: resp.responseId,
             timestamp: resp.createTime,
             answers,
             rowIndex: i + 1,
             rawRowData: answers
           };
         });
         parsedResponses.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
         setResponses(parsedResponses);
      }
      
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore");
    } finally {
      setIsLoading(false);
    }
  };
  

  const reservedInOpenCarts = useMemo(() => {
    const counts: Record<string, number> = {};
    const openCartIds = new Set(carrelli.filter(c => c.Stato_Carrello === "Aperto" || c.Stato_Carrello === "Pronto_per_Spedizione").map(c => c.ID_Carrello));
    
    dettagli.forEach(d => {
      if (openCartIds.has(d.ID_Carrello)) {
        counts[d.ID_Oggetto] = (counts[d.ID_Oggetto] || 0) + 1;
      }
    });
    return counts;
  }, [carrelli, dettagli]);

  const getAvailableQuantity = (itemId: string, currentProposals: ImportProposal[]) => {
    const item = magazzino.find(m => m.ID_Oggetto === itemId);
    if (!item) return 0;
    
    const reserved = reservedInOpenCarts[itemId] || 0;
    
    let selectedInProposals = 0;
    currentProposals.forEach(p => {
      if (p.selected && p.matchedItemId === itemId) {
        selectedInProposals += (p.requestedQuantity || 1);
      }
    });

    return item.Quantità_Disponibile - reserved - selectedInProposals;
  };

  const getClientLoyalty = (name: string, email?: string) => {
    const normEmail = email?.trim().toLowerCase();
    const normName = name.trim().toLowerCase();
    
    let p = loyaltyProfiles.find(profile => {
      const profileEmail = profile.email?.trim().toLowerCase();
      return normEmail && profileEmail && profileEmail === normEmail;
    });
    if (!p) {
      p = loyaltyProfiles.find(profile => {
        const profileName = profile.customerName.trim().toLowerCase();
        return profileName === normName || profile.customerId === normName;
      });
    }
    return p ? { level: p.level, xp: p.xp, tier: p.tier } : { level: 1, xp: 0, tier: "Rookie Collector" as const };
  };

  const getTierColor = (tierName: string) => {
    const t = TIERS_CONFIG.find(x => x.tier === tierName);
    return t ? t.color : "#64748b";
  };

  const handleGenerateProposals = () => {
    if (!nameQuestion) {
      alert("Seleziona almeno la domanda per il Nome Cliente per continuare.");
      return;
    }

    // Sort responses to prioritize higher level & higher XP clients first
    const sortedResponses = [...responses].sort((a, b) => {
      const aName = a.answers[nameQuestion] || "";
      const aEmail = emailQuestion ? (a.answers[emailQuestion] || "") : "";
      const bName = b.answers[nameQuestion] || "";
      const bEmail = emailQuestion ? (b.answers[emailQuestion] || "") : "";

      const aLoyalty = getClientLoyalty(aName, aEmail);
      const bLoyalty = getClientLoyalty(bName, bEmail);

      // Sort descending by level
      if (bLoyalty.level !== aLoyalty.level) {
        return bLoyalty.level - aLoyalty.level;
      }
      // Sort descending by XP
      if (bLoyalty.xp !== aLoyalty.xp) {
        return bLoyalty.xp - aLoyalty.xp;
      }
      // Keep original order as tie-breaker
      return (a.rowIndex || 0) - (b.rowIndex || 0);
    });
    
    const newProposals: ImportProposal[] = [];
    
    // We iterate sequentially on the sorted responses so higher-priority clients get assigned first
    for (const resp of sortedResponses) {
      const clientName = resp.answers[nameQuestion] || "";
      const itemDescription = resp.answers[itemQuestion] || "";
      const clientEmail = emailQuestion ? (resp.answers[emailQuestion] || "") : "";
      const clientPhone = phoneQuestion ? (resp.answers[phoneQuestion] || "") : "";
      const clientAddress = addressQuestion ? (resp.answers[addressQuestion] || "") : "";
      const clientTag = tagQuestion ? (resp.answers[tagQuestion] || "") : "";
      
      const requestedQuantityStr = quantityQuestion ? (resp.answers[quantityQuestion] || "1") : "1";
      const requestedQuantity = parseInt(requestedQuantityStr, 10) || 1;
      
      const isPaidStr = isPaidQuestion ? (resp.answers[isPaidQuestion] || "").toString().trim().toLowerCase() : "false";
      const isPaid = isPaidStr === "true" || isPaidStr === "si" || isPaidStr === "sì" || isPaidStr === "yes" || isPaidStr === "1" || isPaidStr === "pagato" || isPaidStr === "vero";
      
      const matchedCart = carrelli.find(c => c.Nome_Cliente.trim().toLowerCase() === clientName.trim().toLowerCase() && c.Stato_Carrello !== "Spedizione_Ricevuta_da_Consegnare" && c.Stato_Carrello !== "Completato");
      
      const itemDescLower = itemDescription.toLowerCase();
      let matchedItem = undefined;
      if (itemDescLower) {
        matchedItem = magazzino.find(m => {
          const available = getAvailableQuantity(m.ID_Oggetto, newProposals);
          return available > 0 && 
          (m.Nome.toLowerCase().includes(itemDescLower) || itemDescLower.includes(m.Nome.toLowerCase()))
        });
      }
      
      newProposals.push({
        id: resp.responseId,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        clientTag,
        itemDescription,
        requestedQuantity,
        isPaid,
        matchedCartId: matchedCart ? matchedCart.ID_Carrello : null,
        matchedItemId: matchedItem ? matchedItem.ID_Oggetto : null,
        selected: true,
        rowIndex: resp.rowIndex,
        rawRowData: resp.rawRowData
      });
    }
    
    setProposals(newProposals);
    setStep(3);
  };
  
  const handleToggleProposal = (id: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };
  
  const handleChangeProposalItem = (id: string, itemId: string) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, matchedItemId: itemId } : p));
  };

  const handleChangeProposalCart = (id: string, cartId: string | null) => {
    setProposals(prev => prev.map(p => p.id === id ? { ...p, matchedCartId: cartId } : p));
  };

  const handleApply = async () => {
    if (isApplyingRef.current) return;
    const selectedProps = proposals.filter(p => p.selected);
    if (selectedProps.length === 0) {
      alert("Seleziona almeno una proposta valida da applicare.");
      return;
    }
    
    isApplyingRef.current = true;
    setIsApplying(true);
    try {
      const result = await onApplyProposals(selectedProps);
      if (result && result.success) {
        const totalSourceRows = responses.length;
        const importedRows = selectedProps.length;
        
        const emailsNotLoaded = [];
        const missingEmailsInSource = [];
        
        // Find which selected proposals had no email parsed
        selectedProps.forEach(p => {
          if (!p.clientEmail || !p.clientEmail.trim()) {
            missingEmailsInSource.push(p);
          }
        });
        
        onImportSuccess({
           totalSourceRows,
           importedRows,
           emailsNotLoaded: missingEmailsInSource,
           resultUpdates: result.updates || []
        });
        
        // Reset state and close modal
        setStep(1);
        setResponses([]);
        setProposals([]);
        setExcelData("");
        onClose();
      }
    } catch (err) {
      // error handled by parent mostly
    } finally {
      setIsApplying(false);
      isApplyingRef.current = false;
    }
  };

  const questionOptions = Object.values(questionsMap);
  
  const getDropdownAvailableQuantity = (itemId: string, currentProposalId: string) => {
    const item = magazzino.find(m => m.ID_Oggetto === itemId);
    if (!item) return 0;
    
    const reserved = reservedInOpenCarts[itemId] || 0;
    let selectedInProposals = 0;
    proposals.forEach(p => {
      if (p.selected && p.matchedItemId === itemId && p.id !== currentProposalId) {
        selectedInProposals += (p.requestedQuantity || 1);
      }
    });

    return item.Quantità_Disponibile - reserved - selectedInProposals;
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Creazione Multipla da Modulo
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>1. CONNESSIONE</span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
                <span className={`text-[10px] font-bold ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>2. MAPPATURA</span>
                <ArrowRight className="w-3 h-3 text-slate-300" />
                <span className={`text-[10px] font-bold ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>3. REVISIONE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
          
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in w-full">
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setImportMethod("forms")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === "forms" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <FileText className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                  Google Forms
                </button>
                <button
                  onClick={() => setImportMethod("excel")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${importMethod === "excel" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Table2 className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                  Incolla Excel / CSV
                </button>
              </div>

              {importMethod === "forms" ? (
                <>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-slate-800">Collega un Modulo Google</h3>
                    <p className="text-sm text-slate-500">Incolla l'URL del modulo (quello in modalità modifica, che contiene /d/) per importare le risposte.</p>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      URL del Modulo Google
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder="https://docs.google.com/forms/d/..."
                        className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 shadow-sm"
                      />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-2 font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleFetchResponses}
                      disabled={!formUrl || isLoading}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connetti e Scarica"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-slate-800">Incolla Dati da Excel / CSV</h3>
                    <p className="text-sm text-slate-500">Copia le celle da Excel (inclusa l'intestazione) e incollale qui sotto, oppure inserisci i dati in formato CSV.</p>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Dati
                    </label>
                    <textarea 
                      value={excelData}
                      onChange={(e) => setExcelData(e.target.value)}
                      placeholder="Nome Cliente	Articolo Richiesto
Mario Rossi	Pikachu Base Set"
                      className="w-full h-48 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900 shadow-sm whitespace-pre"
                    />
                    {error && <p className="text-red-500 text-xs mt-2 font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleParseExcel}
                      disabled={!excelData.trim() || isLoading}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analizza Dati"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
               <div className="text-center space-y-2">
                 <h3 className="text-lg font-bold text-slate-800">Trovate {responses.length} risposte!</h3>
                 <p className="text-sm text-slate-500">Seleziona le domande del modulo che contengono le informazioni necessarie per creare i carrelli.</p>
               </div>
               
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                 <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Domanda per "Nome e Cognome Cliente"
                    </label>
                    <select
                      value={nameQuestion}
                      onChange={(e) => setNameQuestion(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="">-- Seleziona la domanda --</option>
                      {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Domanda per "Articolo Richiesto" (Opzionale per aggiornamento clienti)
                    </label>
                    <select
                      value={itemQuestion}
                      onChange={(e) => setItemQuestion(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="">-- Seleziona la domanda --</option>
                      {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                    </select>
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-4">Informazioni di Contatto (Opzionali)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Email
                          </label>
                          <select
                            value={emailQuestion}
                            onChange={(e) => setEmailQuestion(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          >
                            <option value="">-- Opzionale --</option>
                            {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Telefono
                          </label>
                          <select
                            value={phoneQuestion}
                            onChange={(e) => setPhoneQuestion(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          >
                            <option value="">-- Opzionale --</option>
                            {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Indirizzo
                          </label>
                          <select
                            value={addressQuestion}
                            onChange={(e) => setAddressQuestion(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          >
                            <option value="">-- Opzionale --</option>
                            {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Tag / Piattaforma
                          </label>
                          <select
                            value={tagQuestion}
                            onChange={(e) => setTagQuestion(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          >
                            <option value="">-- Opzionale --</option>
                            {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Quantità Richiesta
                          </label>
                          <select
                            value={quantityQuestion}
                            onChange={(e) => setQuantityQuestion(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          >
                            <option value="">-- Opzionale (Default: 1) --</option>
                            {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            È stato pagato?
                          </label>
                          <select
                            value={isPaidQuestion}
                            onChange={(e) => setIsPaidQuestion(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                          >
                            <option value="">-- Opzionale (Default: No) --</option>
                            {questionOptions.map((q, i) => <option key={i} value={q}>{q}</option>)}
                          </select>
                       </div>
                    </div>
                 </div>
               </div>
               
               <div className="flex justify-between pt-4">
                 <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
                 >
                   Indietro
                 </button>
                 <button
                    onClick={handleGenerateProposals}
                    disabled={!nameQuestion}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                 >
                   Genera Anteprima <ArrowRight className="w-4 h-4" />
                 </button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in flex flex-col h-full">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-600 font-medium">
                  Rivedi le azioni proposte. I carrelli esistenti verranno aggiornati, altrimenti ne verranno creati di nuovi.
                </p>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-lg">
                  {proposals.filter(p => p.selected).length} selezionati su {proposals.length}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {proposals.map((prop, idx) => {
                  const loyalty = getClientLoyalty(prop.clientName, prop.clientEmail);
                  
                  // Check if this item is in the warehouse
                  const isItemInWarehouse = prop.itemDescription ? magazzino.some(m => 
                    m.Nome.toLowerCase().includes(prop.itemDescription.toLowerCase()) || 
                    prop.itemDescription.toLowerCase().includes(m.Nome.toLowerCase())
                  ) : false;

                  return (
                    <div 
                      key={prop.id} 
                      className={`p-4 rounded-xl border transition-all ${prop.selected ? 'bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-500/10' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`}
                    >
                      <div className="flex gap-4 items-start">
                        <div className="pt-1">
                          <input 
                            type="checkbox"
                            checked={prop.selected}
                            onChange={() => handleToggleProposal(prop.id)}
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Cliente & Carrello */}
                           <div className="space-y-2">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                               <span>Cliente (dal modulo)</span>
                               <div className="flex items-center gap-1.5">
                                 {loyalty.level > 1 && (
                                   <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 shadow-2xs">
                                     <Sparkles className="w-2.5 h-2.5" /> Livello {loyalty.level}
                                   </span>
                                 )}
                                 {prop.rowIndex && (
                                   <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-[9px] lowercase tracking-normal font-mono border border-slate-300">
                                     Riga {prop.rowIndex}
                                   </span>
                                 )}
                               </div>
                             </div>
                             
                             <div className="flex flex-col gap-0.5">
                               <div className="font-bold text-slate-800 flex items-center gap-2">
                                 <span>{prop.clientName || <span className="text-rose-500 italic">Mancante</span>}</span>
                                 {loyalty.level > 1 && (
                                   <span 
                                     className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-white" 
                                     style={{ backgroundColor: getTierColor(loyalty.tier) }}
                                   >
                                     {loyalty.tier}
                                   </span>
                                 )}
                               </div>
                               {loyalty.level > 1 && (
                                 <div className="text-[10px] text-slate-500 font-bold">
                                   XP Cliente: {loyalty.xp} • Priorità Assegnazione: Alta
                                 </div>
                               )}
                             </div>
                             
                             {/* Dettagli della riga per double check */}
                             {prop.rawRowData && (
                               <details className="text-[10px] text-slate-600 font-mono mt-2">
                                 <summary className="cursor-pointer text-indigo-500 hover:text-indigo-700 font-bold outline-none mb-1 select-none">
                                   Vedi Dati Originali Riga
                                 </summary>
                                 <div className="bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto">
                                   {Object.entries(prop.rawRowData).map(([k, v]) => (
                                     <div key={k} className="flex gap-2 border-b border-slate-100 last:border-0 py-0.5">
                                       <span className="font-bold text-slate-700 w-1/3 shrink-0 truncate" title={k}>{k}:</span>
                                       <span className="text-slate-500 break-words flex-1">{String(v || '-')}</span>
                                     </div>
                                   ))}
                                 </div>
                               </details>
                             )}
  
                             <div className="text-xs">
                               <CartSearchSelect
                                 value={prop.matchedCartId}
                                 onChange={(val) => handleChangeProposalCart(prop.id, val)}
                                 disabled={!prop.selected}
                                 clientName={prop.clientName}
                                 carrelli={carrelli}
                               />
                             </div>
                           </div>
                           
                           {/* Articolo */}
                           <div className="space-y-2">
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                               <span>Articolo Richiesto</span>
                               {prop.matchedItemId ? (
                                 <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                   <ShieldCheck className="w-3 h-3" /> Assegnato
                                 </span>
                               ) : (
                                 <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                                   <AlertTriangle className="w-3 h-3" /> Non Assegnato
                                 </span>
                               )}
                             </div>
                             <div className="text-sm text-slate-600 italic">"{prop.itemDescription}"</div>
                             
                             <div>
                               <select
                                 value={prop.matchedItemId || ""}
                                 onChange={(e) => handleChangeProposalItem(prop.id, e.target.value)}
                                 disabled={!prop.selected}
                                 className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${!prop.matchedItemId ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                               >
                                 <option value="">-- Seleziona o verifica articolo --</option>
                                 {magazzino.filter(m => getDropdownAvailableQuantity(m.ID_Oggetto, prop.id) > 0 || prop.matchedItemId === m.ID_Oggetto).map((m, mIdx) => (
                                    <option key={`${m.ID_Oggetto}-${mIdx}`} value={m.ID_Oggetto}>
                                      {m.Nome} (Disp: {getDropdownAvailableQuantity(m.ID_Oggetto, prop.id)})
                                    </option>
                                  ))}
                               </select>
                             </div>

                             {/* Priority warning if stock is depleted */}
                             {!prop.matchedItemId && prop.itemDescription && (
                               <div className="mt-1 text-[10px] leading-tight font-semibold">
                                 {isItemInWarehouse ? (
                                   <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md block">
                                     ⚠️ Stock esaurito in magazzino per questa richiesta. I pezzi disponibili sono stati assegnati prioritariamente ai clienti di livello superiore.
                                   </span>
                                 ) : (
                                   <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md block">
                                     ⚠️ Nessun articolo corrispondente trovato a magazzino.
                                   </span>
                                 )}
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between pt-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-6 p-6">
                <button
                   onClick={() => setStep(2)}
                   className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Indietro
                </button>
                <button
                   onClick={handleApply}
                   disabled={isApplying || proposals.filter(p => p.selected).length === 0}
                   className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                >
                   {isApplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                   Conferma Selezionati
                </button>
              </div>
            </div>
          )}

</div>
      </div>
    </div>
  );
};