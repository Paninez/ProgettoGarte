
import { useCarrelliEditor } from "./carrelli/useCarrelliEditor";
import { CarrelliProps, getDirectImageUrl } from "./carrelli/carrelliUtils";
import React from "react";
import { WizardModal } from "./carrelli/WizardModal";
import { CartList } from "./carrelli/CartList";
import { CartDetailsReadOnly } from "./carrelli/CartDetailsReadOnly";
import { CartDetailsEditable } from "./carrelli/CartDetailsEditable";
import { ImportFormModal } from "./carrelli/ImportFormModal";
import { CartDeleteModal } from "./carrelli/CartDeleteModal";
import { GradingStatusModal } from "./carrelli/GradingStatusModal";
import { ImportReportNotification } from "./carrelli/ImportReportNotification";
import { ShipmentModal } from "./spedizioni/ShipmentModal";
import { PayPalSyncModal } from "./carrelli/PayPalSyncModal";
const Carrelli: React.FC<CarrelliProps> = (props) => {
  const {
    activeCartItems,
    activeClientAddress,
    activeClientCattivoData,
    activeClientEmail,
    activeClientName,
    activeClientNote,
    activeClientNoteInterne,
    activeClientPhone,
    activeClientStrike,
    activeClientTag,
    activeGradingItems,
    carrelli,
    cartIdToDelete,
    cartTotals,
    clientNameValidation,
    copiedField,
    customGlobalTags,
    deleteConfirmText,
    dettagli,
    emptyCartsOnly,
    filterProduct,
    filteredCarts,
    groupedCartItems,
    gruppiGrading,
    handleAccontoChangeForGroup,
    handleAccontoChangeGradingItem,
    handleAddItemToCart,
    handleApplyFormProposals,
    handleConfirmShipment,
    handleCopy,
    handleCreateCart,
    handleDecrementQuantity,
    handleGoToLiveCart,
    handleGoToShipment,
    handleIncrementQuantity,
    handlePriceChangeForGroup,
    handleRemoveGradingItem,
    handleRemoveGroupFromCart,
    handleReopenCart,
    handleSaveActiveCart,
    handleSaveMultipleWizardItems,
    handleSelectCart,
    handleSelectQuantityForGroup,
    handleSplitGroupItem,
    handleStartShipment,
    handleTogglePaidForGroup,
    handleTogglePaidGradingItem,
    handleTogglePaymentTag,
    handleTogglePosticipatoForGroup,
    handleTogglePosticipatoGradingItem,
    handleToggleSelectForGroup,
    handleToggleShipmentTag,
    handleUpdateCartAddress,
    handleUpdateCartNote,
    handleUpdateCartPhone,
    handleUpdateCartLastMessage,
    handleUpdateCartStrikes,
    handleUpdateCartTag,
    hasObjectsOnly,
    importReport,
    isAddingGrading,
    isCreating,
    isDeletingProcess,
    isEditable,
    isEditingClient,
    isEditingItems,
    isImportFormModalOpen,
    isPayPalSyncModalOpen,
    isShipped,
    listinoGrading,
    loyaltyTierFilter,
    magazzino,
    newClientName,
    oggettiInGrading,
    readyForShippingOnly,
    relatedShipments,
    reservedInOtherCarts,
    search,
    selectedCart,
    selectedCartId,
    selectedCartShipment,
    selectedGradingIds,
    selectedItemIndexes,
    setActiveClientAddress,
    setActiveClientCattivoData,
    setActiveClientEmail,
    setActiveClientName,
    setActiveClientNote,
    setActiveClientNoteInterne,
    setActiveClientPhone,
    setActiveClientStrike,
    setActiveClientTag,
    setCartIdToDelete,
    setCustomGlobalTags,
    setDeleteConfirmText,
    setEmptyCartsOnly,
    setFilterProduct,
    setHasObjectsOnly,
    setImportReport,
    setIsAddingGrading,
    setIsCreating,
    setIsDeletingProcess,
    setIsEditingClient,
    setIsEditingItems,
    setIsImportFormModalOpen,
    setIsPayPalSyncModalOpen,
    setLoyaltyTierFilter,
    setNewClientName,
    setReadyForShippingOnly,
    setSearch,
    setSelectedCartId,
    setSelectedGradingIds,
    setSelectedItemIndexes,
    setShowShipmentModal,
    setSortOption,
    setStatusFilter,
    setStrikeFilter,
    setTagFilter,
    setUnpaidOnly,
    setViewedGradingStatusId,
    shipmentLoading,
    showShipmentModal,
    sortOption,
    statusFilter,
    strikeFilter,
    tagFilter,
    unpaidOnly,
    userRole,
    viewedGradingStatusId,
  } = useCarrelliEditor(props);
  const {
    showClosedOnly,
    loyaltyProfiles,
    onUpdateShipmentStatus,
    onUploadPhoto,
    onUpdateCard,
    onNavigate,
    onDeleteCart,
    token,
    onUpdateCartPayment,
    addSafetyLog
  } = props;

  return (
    <div className={`grid grid-cols-1 ${selectedCartId ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-8 animate-fade-in text-slate-900`}>
      {/* LEFT COLUMN: Carrelli list & Create */}
      

      <CartList
        loyaltyProfiles={loyaltyProfiles}
        loyaltyTierFilter={loyaltyTierFilter}
        setLoyaltyTierFilter={setLoyaltyTierFilter}
        onOpenImportModal={() => setIsImportFormModalOpen(true)}
        onOpenPayPalSyncModal={() => setIsPayPalSyncModalOpen(true)}
        showClosedOnly={showClosedOnly}
        selectedCartId={selectedCartId}
        userRole={userRole}
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        newClientName={newClientName}
        setNewClientName={setNewClientName}
        handleCreateCart={handleCreateCart}
        clientNameValidation={clientNameValidation}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        uniqueTags={Array.from(new Set([...["🔴 Cattivi", "📦 Spedizione Richiesta", "⏳ Pagamento Posticipato", "Pronto Per Spedire", "Spedizione con corriere", "Consegna a Mano", "Consegna a Mano Roma", "Consegna a Mano Napoli", "Consegna Vinted", "Consegna Corriere", "Aspetto Dopo Le Vacanze"], ...customGlobalTags, ...carrelli.flatMap(c => (c.Tag || "").split(",").map(t => t.trim())).filter(Boolean)])) as string[]}
        filterProduct={filterProduct}
        setFilterProduct={setFilterProduct}
        
        sortOption={sortOption}
        setSortOption={setSortOption}
        hasObjectsOnly={hasObjectsOnly}
        setHasObjectsOnly={setHasObjectsOnly}
        emptyCartsOnly={emptyCartsOnly}
        setEmptyCartsOnly={setEmptyCartsOnly}
        strikeFilter={strikeFilter}
        setStrikeFilter={setStrikeFilter}
        unpaidOnly={unpaidOnly}
        setUnpaidOnly={setUnpaidOnly}
        readyForShippingOnly={readyForShippingOnly}
        setReadyForShippingOnly={setReadyForShippingOnly}
        filteredCarts={filteredCarts}
        handleSelectCart={handleSelectCart}
        onUpdateCartPhone={handleUpdateCartPhone}
        onUpdateCartLastMessage={handleUpdateCartLastMessage}
        onUpdateCartTag={handleUpdateCartTag}
        onUpdateCartStrikes={handleUpdateCartStrikes}
        onToggleShipmentTag={handleToggleShipmentTag}
        onTogglePaymentTag={handleTogglePaymentTag}
        dettagli={dettagli}
        gruppiGrading={gruppiGrading}
        oggettiInGrading={oggettiInGrading}
        magazzino={magazzino}
        uniqueProductNames={Array.from(new Set(magazzino.map(m => m.Nome).filter(Boolean)))}
        uniqueClientNames={Array.from(new Set(carrelli.map(c => c.Nome_Cliente).filter(Boolean)))}
      />

      {/* MIDDLE & RIGHT COLUMN: Cart Editor Details */}
      {selectedCartId && (
      <div className="lg:col-span-2 space-y-6">
        {selectedCart && !isEditable ? (
          <CartDetailsReadOnly
            magazzino={magazzino}
            selectedCart={selectedCart}
            setSelectedCartId={setSelectedCartId}
            activeClientName={activeClientName}
            activeClientEmail={activeClientEmail}
            activeClientPhone={activeClientPhone}
            activeClientAddress={activeClientAddress}
            activeClientTag={activeClientTag}
            activeClientNote={activeClientNote}
            activeClientNoteInterne={activeClientNoteInterne}
            activeClientStrike={activeClientStrike}
            activeClientCattivoData={activeClientCattivoData}
            copiedField={copiedField}
            handleCopy={handleCopy}
            selectedCartShipment={selectedCartShipment}
            handleUpdateShipmentStatus={onUpdateShipmentStatus}
            handleGoToLiveCart={handleGoToLiveCart}
            relatedShipments={relatedShipments}
            groupedCartItems={groupedCartItems}
            getDirectImageUrl={getDirectImageUrl}
            activeGradingItems={activeGradingItems}
            gruppiGrading={gruppiGrading}
            isShipped={isShipped}
            onUploadPhoto={onUploadPhoto}
            onUpdateCard={onUpdateCard}
            onUpdateCartTag={handleUpdateCartTag}
            onUpdateCartAddress={handleUpdateCartAddress}
            onUpdateCartNote={handleUpdateCartNote}
            onUpdateCartStrikes={handleUpdateCartStrikes}
            onReopenCart={handleReopenCart}
            userRole={userRole}
            loyaltyProfiles={loyaltyProfiles}
            carrelli={carrelli}
            dettagli={dettagli}
            onNavigate={onNavigate}
          />
        ) : selectedCart ? (
          <CartDetailsEditable
            customGlobalTags={customGlobalTags}
            setCustomGlobalTags={setCustomGlobalTags}
            loyaltyProfiles={loyaltyProfiles}
            carrelli={carrelli}
            dettagli={dettagli}
            onNavigate={onNavigate}
            onOpenImportModal={() => setIsImportFormModalOpen(true)}
            selectedCart={selectedCart}
            setSelectedCartId={setSelectedCartId}
            onUpdateCartStrikes={handleUpdateCartStrikes}
            activeClientName={activeClientName}
            setActiveClientName={setActiveClientName}
            activeClientEmail={activeClientEmail}
            setActiveClientEmail={setActiveClientEmail}
            activeClientPhone={activeClientPhone}
            setActiveClientPhone={setActiveClientPhone}
            activeClientAddress={activeClientAddress}
            setActiveClientAddress={setActiveClientAddress}
            activeClientTag={activeClientTag}
            activeClientNote={activeClientNote}
            activeClientNoteInterne={activeClientNoteInterne}
            activeClientStrike={activeClientStrike}
            activeClientCattivoData={activeClientCattivoData}
            setActiveClientTag={setActiveClientTag}
            setActiveClientNote={setActiveClientNote}
            setActiveClientNoteInterne={setActiveClientNoteInterne}
            setActiveClientStrike={setActiveClientStrike}
            setActiveClientCattivoData={setActiveClientCattivoData}
            copiedField={copiedField}
            handleCopy={handleCopy}
            isEditingClient={isEditingClient}
            setIsEditingClient={setIsEditingClient}
            userRole={userRole}
            setDeleteConfirmText={setDeleteConfirmText}
            setCartIdToDelete={setCartIdToDelete}
            groupedCartItems={groupedCartItems}
            selectedItemIndexes={selectedItemIndexes}
            setSelectedItemIndexes={setSelectedItemIndexes}
            handleToggleSelectForGroup={handleToggleSelectForGroup}
            handleSelectQuantityForGroup={handleSelectQuantityForGroup}
            handleDecrementQuantity={handleDecrementQuantity}
            handleIncrementQuantity={handleIncrementQuantity}
            handlePriceChangeForGroup={handlePriceChangeForGroup}
            handleAccontoChangeForGroup={handleAccontoChangeForGroup}
            handleAccontoChangeGradingItem={handleAccontoChangeGradingItem}
            handleTogglePaidForGroup={handleTogglePaidForGroup}
            handleTogglePosticipatoForGroup={handleTogglePosticipatoForGroup}
            handleRemoveGroupFromCart={handleRemoveGroupFromCart}
            handleSplitGroupItem={handleSplitGroupItem}
            activeGradingItems={activeGradingItems}
            isEditable={isEditable}
            gruppiGrading={gruppiGrading}
            selectedGradingIds={selectedGradingIds}
            setSelectedGradingIds={setSelectedGradingIds}
            isShipped={isShipped}
            listinoGrading={listinoGrading}
            viewedGradingStatusId={viewedGradingStatusId}
            setViewedGradingStatusId={setViewedGradingStatusId}
            getDirectImageUrl={getDirectImageUrl}
            onUpdateCard={onUpdateCard}
            handleTogglePaidGradingItem={handleTogglePaidGradingItem}
            handleTogglePosticipatoGradingItem={handleTogglePosticipatoGradingItem}
            onUploadPhoto={onUploadPhoto}
            handleRemoveGradingItem={handleRemoveGradingItem}
            setIsAddingGrading={setIsAddingGrading}
            cartTotals={cartTotals}
            handleSaveActiveCart={handleSaveActiveCart}
            isEditingItems={isEditingItems}
            handleStartShipment={handleStartShipment}

            selectedCartShipment={selectedCartShipment}
            handleUpdateShipmentStatus={onUpdateShipmentStatus}
            handleGoToLiveCart={handleGoToLiveCart}
            relatedShipments={relatedShipments}
            onDeleteCart={onDeleteCart}
            showClosedOnly={showClosedOnly}
            handleGoToShipment={handleGoToShipment}
            magazzino={magazzino}
            reservedInOtherCarts={reservedInOtherCarts}
            activeCartItems={activeCartItems}
            setIsEditingItems={setIsEditingItems}
            handleAddItemToCart={handleAddItemToCart}
          />
        ) : null}
      </div>
      )}
            {/* Shipment Quality Control & File Upload Modal */}
      {showShipmentModal && selectedCart && (
        <ShipmentModal
          selectedCart={selectedCart}
          activeClientName={activeClientName}
          setActiveClientName={setActiveClientName}
          activeClientAddress={activeClientAddress}
          setActiveClientAddress={setActiveClientAddress}
          activeClientPhone={activeClientPhone}
          setActiveClientPhone={setActiveClientPhone}
          activeClientEmail={activeClientEmail}
          setActiveClientEmail={setActiveClientEmail}
          selectedItemIndexes={selectedItemIndexes}
          activeCartItems={activeCartItems}
          magazzino={magazzino}
          selectedGradingIds={selectedGradingIds}
          activeGradingItems={activeGradingItems}
          handleConfirmShipment={handleConfirmShipment}
          shipmentLoading={shipmentLoading}
          setShowShipmentModal={setShowShipmentModal}
        />
      )}

      <ImportFormModal
        isOpen={isImportFormModalOpen}
        onClose={() => setIsImportFormModalOpen(false)}
        magazzino={magazzino}
        carrelli={carrelli}
        dettagli={dettagli}
        onApplyProposals={handleApplyFormProposals}
        onImportSuccess={(report) => setImportReport(report)}
        loyaltyProfiles={loyaltyProfiles}
      />


      <ImportReportNotification
        importReport={importReport}
        onClose={() => setImportReport(null)}
      />

      <CartDeleteModal
        cartIdToDelete={cartIdToDelete}
        carrelli={carrelli}
        deleteConfirmText={deleteConfirmText}
        setDeleteConfirmText={setDeleteConfirmText}
        isDeletingProcess={isDeletingProcess}
        onClose={() => {
          setCartIdToDelete(null);
          setDeleteConfirmText("");
        }}
        onConfirmDelete={async () => {
          if (deleteConfirmText !== "ELIMINA" || !cartIdToDelete) return;
          setIsDeletingProcess(true);
          try {
            await onDeleteCart!(cartIdToDelete);
            setSelectedCartId(null);
            setCartIdToDelete(null);
            setDeleteConfirmText("");
          } catch (err: any) {
            alert("Errore di eliminazione: " + err.message);
          } finally {
            setIsDeletingProcess(false);
          }
        }}
      />

      <GradingStatusModal
        viewedGradingStatusId={viewedGradingStatusId}
        setViewedGradingStatusId={setViewedGradingStatusId}
        activeGradingItems={activeGradingItems}
        gruppiGrading={gruppiGrading}
        isEditable={isEditable}
        carrelli={carrelli}
        onUpdateCard={onUpdateCard}
        onUploadPhoto={onUploadPhoto}
      />

      <WizardModal
        isAddingGrading={isAddingGrading}
        setIsAddingGrading={setIsAddingGrading}
        listinoGrading={listinoGrading}
        onUploadPhoto={onUploadPhoto}
        selectedCartName={carrelli.find(c => c.ID_Carrello === selectedCartId)?.Nome_Cliente || "NuovoCarrello"}
        selectedCartId={selectedCartId}
        handleSaveMultipleWizardItems={handleSaveMultipleWizardItems}
      />

      <PayPalSyncModal
        isOpen={isPayPalSyncModalOpen}
        onClose={() => setIsPayPalSyncModalOpen(false)}
        carts={carrelli}
        dettagli={dettagli}
        magazzino={magazzino}
        oggettiInGrading={oggettiInGrading}
        token={token || null}
        onUpdateCartPayment={onUpdateCartPayment || (async () => {})}
        addSafetyLog={addSafetyLog || (() => {})}
      />
    </div>
  );
};

export default React.memo(Carrelli);
