import React from "react";
import { MagazzinoProps, useMagazzinoLogic } from "./magazzino/useMagazzinoLogic";
import { MagazzinoHeader } from "./magazzino/MagazzinoHeader";
import { MagazzinoDashboard } from "./magazzino/MagazzinoDashboard";
import { MagazzinoAddItem } from "./magazzino/MagazzinoAddItem";
import { MagazzinoAddSingleCards } from "./magazzino/MagazzinoAddSingleCards";
import { MagazzinoTable } from "./magazzino/MagazzinoTable";
import { MagazzinoDistributeModal } from "./magazzino/MagazzinoDistributeModal";
import { MagazzinoSettlePreorderModal } from "./magazzino/MagazzinoSettlePreorderModal";
import { ScheduleMeetModal } from "./magazzino/ScheduleMeetModal";
import { MagazzinoDeleteModal } from "./magazzino/MagazzinoDeleteModal";

const Magazzino: React.FC<MagazzinoProps> = (props) => {
  const { onAddItem, onRestockItem, onSettlePreorder, onDistributeItemToCarts, onEditItem, onDeleteItem } = props;

  const {
    items,
    carrelli,
    dettagli,
    userRole,
    loyaltyProfiles,
    search,
    setSearch,
    selectedTag,
    setSelectedTag,
    allUniqueTags,
    isAdding,
    setIsAdding,
    isAddingSingleCards,
    setIsAddingSingleCards,
    editingId,
    setEditingId,
    settlingPreorderItem,
    setSettlingPreorderItem,
    allocatedCounts,
    editName,
    setEditName,
    editQty,
    setEditQty,
    editCosto,
    setEditCosto,
    editPrezzo,
    setEditPrezzo,
    editDataSpedizionePresunta,
    setEditDataSpedizionePresunta,
    editTag,
    setEditTag,
    loading,
    itemIdToDelete,
    setItemIdToDelete,
    deleteConfirmText,
    setDeleteConfirmText,
    distributingItem,
    setDistributingItem,
    meetItem,
    setMeetItem,
    activeTab,
    setActiveTab,
    subTab,
    setSubTab,
    filteredItems,
    handleStartEdit,
    handleSaveEdit,
    handleConfirmDelete,
  } = useMagazzinoLogic(props);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900" id="magazzino-root">
      <MagazzinoHeader
        userRole={userRole}
        isAdding={isAdding}
        setIsAdding={setIsAdding}
        isAddingSingleCards={isAddingSingleCards}
        setIsAddingSingleCards={setIsAddingSingleCards}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {isAddingSingleCards && (
        <MagazzinoAddSingleCards
          onAddItem={onAddItem}
          setIsAddingSingleCards={setIsAddingSingleCards}
          setActiveTab={setActiveTab}
        />
      )}

      {isAdding && (
        <MagazzinoAddItem
          onAddItem={onAddItem}
          onRestockItem={onRestockItem}
          items={items}
          setIsAdding={setIsAdding}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === "dashboard" ? (
        <MagazzinoDashboard items={items} allocatedCounts={allocatedCounts} />
      ) : (
        <div className="space-y-4">
          {(activeTab === "inventario" || activeTab === "esauriti") && (
            <div className="flex items-center gap-2 border-b border-slate-200/85 pb-2">
              {[
                { id: "standard", label: "Prodotti Standard" },
                { id: "singole", label: "Carte Singole" },
                { id: "tutti", label: "Tutti" },
              ].map((tab) => {
                if (activeTab === "esauriti" && tab.id === "tutti") return null;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSubTab(tab.id)}
                    className={`px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-t-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
                      subTab === tab.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <MagazzinoTable
        filteredItems={filteredItems}
        allocatedCounts={allocatedCounts}
        search={search}
        setSearch={setSearch}
        selectedTag={selectedTag}
        setSelectedTag={setSelectedTag}
        allUniqueTags={allUniqueTags}
        userRole={userRole}
        editingId={editingId}
        editName={editName}
        setEditName={setEditName}
        editQty={editQty}
        setEditQty={setEditQty}
        editCosto={editCosto}
        setEditCosto={setEditCosto}
        editPrezzo={editPrezzo}
        setEditPrezzo={setEditPrezzo}
        editDataSpedizionePresunta={editDataSpedizionePresunta}
        setEditDataSpedizionePresunta={setEditDataSpedizionePresunta}
        editTag={editTag}
        setEditTag={setEditTag}
        handleStartEdit={handleStartEdit}
        handleSaveEdit={handleSaveEdit}
        setEditingId={setEditingId}
        loading={loading}
        onDeleteItem={onDeleteItem}
        setItemIdToDelete={setItemIdToDelete}
        setDeleteConfirmText={setDeleteConfirmText}
        onStartDistribute={setDistributingItem}
        onSettlePreorder={setSettlingPreorderItem}
        onStartMeet={setMeetItem}
        dettagli={dettagli}
        onEditItem={onEditItem}
        onBulkUpdateDates={props.onBulkUpdateDates}
      />

      {settlingPreorderItem && onSettlePreorder && (
        <MagazzinoSettlePreorderModal
          item={settlingPreorderItem}
          allocatedCount={allocatedCounts[settlingPreorderItem.ID_Oggetto] || 0}
          onClose={() => setSettlingPreorderItem(null)}
          onConfirm={onSettlePreorder}
        />
      )}

      {meetItem && (
        <ScheduleMeetModal
          item={meetItem}
          carrelli={carrelli}
          dettagli={dettagli}
          onClose={() => setMeetItem(null)}
        />
      )}

      {distributingItem && onDistributeItemToCarts && (
        <MagazzinoDistributeModal
          item={distributingItem}
          carrelli={carrelli}
          dettagli={dettagli}
          onClose={() => setDistributingItem(null)}
          onDistribute={onDistributeItemToCarts}
          loyaltyProfiles={loyaltyProfiles}
        />
      )}

      {/* CUSTOM DELETE ITEM CONFIRMATION MODAL */}
      <MagazzinoDeleteModal
        itemIdToDelete={itemIdToDelete}
        items={items}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        loading={loading}
        onClose={() => {
          setItemIdToDelete(null);
          setDeleteConfirmText("");
        }}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default React.memo(Magazzino);
