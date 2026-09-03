import React, { useState, useMemo } from "react";
import { Package } from "lucide-react";
import { SpedizioniProps, getTrackingUrl } from "./spedizioni/spedizioniUtils";
import { useSpedizioniLogic } from "./spedizioni/useSpedizioniLogic";
import { ShipmentHeaderFilters } from "./spedizioni/ShipmentHeaderFilters";
import { ShipmentCard } from "./spedizioni/ShipmentCard";
import { ShipmentPrintModal } from "./spedizioni/ShipmentPrintModal";
import { PacklinkExportModal } from "./spedizioni/PacklinkExportModal";

export { getTrackingUrl };

export const Spedizioni = React.memo(function Spedizioni(props: SpedizioniProps) {
  const [isPacklinkModalOpen, setIsPacklinkModalOpen] = useState(false);

  const {
    spedizioni,
    carrelli,
    dettagliCarrelli,
    magazzino,
    oggettiInGrading,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    operatorFilter,
    setOperatorFilter,
    printingShipment,
    setPrintingShipment,
    editingShipmentId,
    setEditingShipmentId,
    uploadingShipmentId,
    setUploadingShipmentId,
    editingAddressValue,
    setEditingAddressValue,
    isSavingAddress,
    currentPage,
    setCurrentPage,
    totalPages,
    filtered,
    paginatedShipments,
    isShipmentPaid,
    handleToggleShipmentPaid,
    handleStartEditAddress,
    handleToggleOperatorTag,
    handleToggleSingleTag,
    handleSetDeliveryMethod,
    handleSaveAddress,
    handleSendWhatsApp,
  } = useSpedizioniLogic(props);

  const pendingCorriereCount = useMemo(() => {
    return spedizioni.filter((s) => {
      const isCorriere =
        s.Corriere === "Corriere" ||
        (s.Tag || "").toLowerCase().includes("corriere") ||
        (s.Tag || "").toLowerCase().includes("spedizione con corriere");

      const isLabelCreationState =
        s.Stato_Consegna === "Preparazione Pacco" ||
        s.Stato_Consegna === "Creazione Etichetta" ||
        !s.Stato_Consegna ||
        s.Stato_Consegna === "In attesa";

      return isCorriere && isLabelCreationState;
    }).length;
  }, [spedizioni]);

  return (
    <div className="space-y-5 animate-fade-in text-slate-900">
      <ShipmentHeaderFilters
        search={search}
        setSearch={setSearch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        operatorFilter={operatorFilter}
        setOperatorFilter={setOperatorFilter}
        onOpenPacklinkExport={() => setIsPacklinkModalOpen(true)}
        pendingCorriereCount={pendingCorriereCount}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedShipments.map((shipment) => {
          const cart = carrelli.find((c) => c.ID_Carrello === shipment.ID_Carrello);
          return (
            <ShipmentCard
              key={shipment.ID_Spedizione}
              shipment={shipment}
              cart={cart}
              dettagliCarrelli={dettagliCarrelli}
              oggettiInGrading={oggettiInGrading}
              magazzino={magazzino}
              editingShipmentId={editingShipmentId}
              setEditingShipmentId={setEditingShipmentId}
              editingAddressValue={editingAddressValue}
              setEditingAddressValue={setEditingAddressValue}
              isSavingAddress={isSavingAddress}
              handleStartEditAddress={handleStartEditAddress}
              handleSaveAddress={handleSaveAddress}
              isShipmentPaid={isShipmentPaid}
              handleToggleShipmentPaid={handleToggleShipmentPaid}
              handleToggleOperatorTag={handleToggleOperatorTag}
              handleToggleSingleTag={handleToggleSingleTag}
              handleSetDeliveryMethod={handleSetDeliveryMethod}
              handleSendWhatsApp={handleSendWhatsApp}
              setPrintingShipment={setPrintingShipment}
              uploadingShipmentId={uploadingShipmentId}
              setUploadingShipmentId={setUploadingShipmentId}
              onUpdateShipmentStatus={props.onUpdateShipmentStatus}
              onUpdateShipmentTag={props.onUpdateShipmentTag}
              onUpdateShipmentCost={props.onUpdateShipmentCost}
              onNavigateToCart={props.onNavigateToCart}
              onReturnItem={props.onReturnItem}
              onUploadShipmentPhotos={props.onUploadShipmentPhotos}
            />
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <Package className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nessuna spedizione trovata.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">
            Pagina <span className="text-slate-900 font-bold">{currentPage}</span> di{" "}
            <span className="text-slate-900 font-bold">{totalPages}</span>
            <span className="ml-2">({filtered.length} spedizioni totali)</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Precedente
            </button>
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                const isNearCurrent = Math.abs(p - currentPage) <= 1;
                const isEdge = p === 1 || p === totalPages;

                if (isNearCurrent || isEdge) {
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === p
                          ? "bg-indigo-600 text-white"
                          : "bg-transparent text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  );
                }

                if (p === 2 || p === totalPages - 1) {
                  return (
                    <span key={p} className="text-slate-400 px-1">
                      ...
                    </span>
                  );
                }

                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Successiva
            </button>
          </div>
        </div>
      )}

      <ShipmentPrintModal
        printingShipment={printingShipment}
        onClose={() => setPrintingShipment(null)}
        carrelli={carrelli}
        dettagliCarrelli={dettagliCarrelli}
        oggettiInGrading={oggettiInGrading}
        magazzino={magazzino}
        onSendWhatsApp={handleSendWhatsApp}
        onSaveCart={props.onSaveCart}
      />

      <PacklinkExportModal
        isOpen={isPacklinkModalOpen}
        onClose={() => setIsPacklinkModalOpen(false)}
        onSaveCart={props.onSaveCart}
      />
    </div>
  );
});
