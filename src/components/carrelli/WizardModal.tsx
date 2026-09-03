import React, { useState } from "react";
import { X, Award, CheckCircle, Camera, RefreshCw, Plus, Trash2 } from "lucide-react";
import { ListinoGradingItem } from "../../types";

interface WizardItemState {
  id: string;
  name: string;
  service: string;
  photoUrls: string[];
  uploadProgress: boolean;
}

interface WizardModalProps {
  isAddingGrading: boolean;
  setIsAddingGrading: (val: boolean) => void;
  listinoGrading: ListinoGradingItem[];
  onUploadPhoto: (file: File, folderType: string, customName: string, subFolderName: string) => Promise<string>;
  selectedCartName: string;
  selectedCartId: string | null;
  handleSaveMultipleWizardItems: (itemsToSave: { name: string; service: string; photoUrls: string[] }[]) => void;
}

export function WizardModal({
  isAddingGrading,
  setIsAddingGrading,
  listinoGrading,
  onUploadPhoto,
  selectedCartName,
  selectedCartId,
  handleSaveMultipleWizardItems
}: WizardModalProps) {
  const createEmptyItem = (): WizardItemState => ({
    id: Math.random().toString(36).substring(7),
    name: "",
    service: "",
    photoUrls: [],
    uploadProgress: false
  });

  const [items, setItems] = useState<WizardItemState[]>([createEmptyItem()]);

  if (!isAddingGrading) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<WizardItemState>) => {
    setItems((prev) => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleWizardFileChange = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const item = items.find(i => i.id === id);
      if (!item) return;

      updateItem(id, { uploadProgress: true });
      try {
        const cartSuffix = selectedCartId ? selectedCartId : "NuovoCarrello";
        const subFolderName = `${selectedCartName}-${cartSuffix}`;
        const customName = `${item.name.trim() || "Carta"}-${cartSuffix}`;
        const url = await onUploadPhoto(file, "fotoCartaAggiuntaId", customName, subFolderName);
        updateItem(id, { photoUrls: [...item.photoUrls, url].slice(0, 2) });
      } catch (err: any) {
        alert("Errore durante il caricamento dell'immagine: " + err.message);
      } finally {
        updateItem(id, { uploadProgress: false });
      }
    }
  };

  const isAnyUploading = items.some(item => item.uploadProgress);
  const isAllValid = items.every(item => item.name.trim() !== "" && item.service !== "");

  const handleSave = () => {
    if (!isAllValid) {
      alert("Compila tutti i campi obbligatori (Nome e Servizio) per ogni carta.");
      return;
    }
    handleSaveMultipleWizardItems(items);
    setItems([createEmptyItem()]);
  };

  const handleCancel = () => {
    setIsAddingGrading(false);
    setItems([createEmptyItem()]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full animate-scale-up my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Aggiungi Carta (Grading)</h3>
              <p className="text-[10px] text-slate-400 font-bold">Wizard di caricamento multiplo con acquisizione foto</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          {items.map((item, index) => (
            <div key={item.id} className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl space-y-4 relative">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Carta {index + 1}</h4>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nome Carta / Descrizione Breve</label>
                <input
                  type="text"
                  placeholder="Es. Charizard VMAX 074/073"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Livello di Servizio Grading</label>
                <select
                  value={item.service}
                  onChange={(e) => updateItem(item.id, { service: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Seleziona un livello dal listino --</option>
                  {listinoGrading.map((listItem) => (
                    <option key={listItem.Tipologia_Servizio} value={listItem.Tipologia_Servizio}>
                      {listItem.Tipologia_Servizio} | € {listItem.Costo_Cliente.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live margins calculator preview based on selected service */}
              {item.service && (
                (() => {
                  const selectedServiceItem = listinoGrading.find((l) => l.Tipologia_Servizio === item.service);
                  if (!selectedServiceItem) return null;
                  const calculatedMargin = selectedServiceItem.Costo_Cliente - selectedServiceItem.Costo_Acquisto;
                  return (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Costo Cliente</span>
                        <span className="font-bold text-slate-800 font-mono">€ {selectedServiceItem.Costo_Cliente.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block uppercase mb-1">Costo Spesa</span>
                        <span className="font-semibold text-slate-500 font-mono">€ {selectedServiceItem.Costo_Acquisto.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-600 font-bold block uppercase flex items-center justify-center gap-1 mb-1">
                          Margine Lordo
                        </span>
                        <span className="font-bold text-emerald-600 font-mono">€ {calculatedMargin.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Photo Upload area */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Acquisizione Foto Carta</label>
                  
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors p-4">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center space-y-1">
                      {item.uploadProgress ? (
                        <>
                          <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
                          <p className="text-xs font-semibold text-slate-600">Caricamento in corso...</p>
                        </>
                      ) : item.photoUrls.length > 0 ? (
                        <>
                          <CheckCircle className="h-6 w-6 text-emerald-600" />
                          <p className="text-xs font-bold text-emerald-600">Foto {item.photoUrls.length}/2 Caricate!</p>
                        </>
                      ) : (
                        <>
                          <Camera className="h-6 w-6 text-slate-400" />
                          <p className="text-xs font-semibold text-slate-600">Scatta Foto o Seleziona File</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleWizardFileChange(e, item.id)}
                      disabled={item.uploadProgress || item.photoUrls.length >= 2}
                      className="hidden"
                    />
                  </label>
                </div>

                {item.photoUrls.length > 0 && (
                  <div className="flex justify-center pt-2 gap-2">
                    {item.photoUrls.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                        <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = [...item.photoUrls];
                            newUrls.splice(idx, 1);
                            updateItem(item.id, { photoUrls: newUrls });
                          }}
                          className="absolute top-1 right-1 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer"
                          title="Rimuovi foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Aggiungi un'altra carta</span>
          </button>
        </div>

        {/* Footer buttons */}
        <div className="p-6 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 rounded-b-2xl">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={isAnyUploading || !isAllValid}
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95 flex items-center gap-1"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Salva {items.length} Carte e Chiudi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
