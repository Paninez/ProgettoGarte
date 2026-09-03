import React from "react";
import { GradingDashboardProps } from "./grading/gradingUtils";
import { useGradingDashboardLogic } from "./grading/useGradingDashboardLogic";
import { GradingHeader } from "./grading/GradingHeader";
import { GradingGroupList } from "./grading/GradingGroupList";
import { GradingGroupDetail } from "./grading/GradingGroupDetail";
import { GradingPriceList } from "./grading/GradingPriceList";
import { CreateGroupModal } from "./grading/CreateGroupModal";

const GradingDashboard = React.memo(function GradingDashboard(props: GradingDashboardProps) {
  const {
    listinoGrading,
    carrelli,
    userRole,
    activeSubTab,
    setActiveSubTab,
    selectedGroupId,
    setSelectedGroupId,
    lottiFilter,
    setLottiFilter,
    selectedUnassignedCards,
    setSelectedUnassignedCards,
    isCreatingGroup,
    setIsCreatingGroup,
    newGroupName,
    setNewGroupName,
    saveLoading,
    localListino,
    setLocalListino,
    isEditingListino,
    setIsEditingListino,
    listinoSaveLoading,
    startEditingListino,
    selectedGroup,
    filteredGroups,
    filteredOggettiInGrading,
    groupCards,
    groupStats,
    unassignedCards,
    unassignedPage,
    setUnassignedPage,
    totalUnassignedPages,
    paginatedUnassignedCards,
    handleCreateGroup,
    handleStatusChange,
    handleAssignCard,
    handleToggleUnassignedCard,
    handleAssignMultipleCards,
    handleUnassignCard,
    handleSavePriceList,
    handleExportCSV,
  } = useGradingDashboardLogic(props);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800" id="grading-dashboard-root">
      <GradingHeader
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        userRole={userRole}
        setIsCreatingGroup={setIsCreatingGroup}
      />

      {activeSubTab === "lotti" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <GradingGroupList
              userRole={userRole}
              setIsCreatingGroup={setIsCreatingGroup}
              lottiFilter={lottiFilter}
              setLottiFilter={setLottiFilter}
              filteredGroups={filteredGroups}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
              filteredOggettiInGrading={filteredOggettiInGrading}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <GradingGroupDetail
              selectedGroup={selectedGroup}
              userRole={userRole}
              groupStats={groupStats}
              groupCards={groupCards}
              carrelli={carrelli}
              unassignedCards={unassignedCards}
              paginatedUnassignedCards={paginatedUnassignedCards}
              selectedUnassignedCards={selectedUnassignedCards}
              unassignedPage={unassignedPage}
              setUnassignedPage={setUnassignedPage}
              totalUnassignedPages={totalUnassignedPages}
              handleStatusChange={handleStatusChange}
              handleExportCSV={handleExportCSV}
              handleUnassignCard={handleUnassignCard}
              handleAssignCard={handleAssignCard}
              handleToggleUnassignedCard={handleToggleUnassignedCard}
              handleAssignMultipleCards={handleAssignMultipleCards}
              setSelectedUnassignedCards={setSelectedUnassignedCards}
              onUpdateCard={props.onUpdateCard}
              onUploadPhoto={props.onUploadPhoto}
            />
          </div>
        </div>
      )}

      {activeSubTab === "listino" && (
        <GradingPriceList
          userRole={userRole}
          isEditingListino={isEditingListino}
          setIsEditingListino={setIsEditingListino}
          startEditingListino={startEditingListino}
          localListino={localListino}
          setLocalListino={setLocalListino}
          listinoGrading={listinoGrading}
          handleSavePriceList={handleSavePriceList}
          listinoSaveLoading={listinoSaveLoading}
        />
      )}

      <CreateGroupModal
        isOpen={isCreatingGroup}
        onClose={() => setIsCreatingGroup(false)}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        handleCreateGroup={handleCreateGroup}
        saveLoading={saveLoading}
      />
    </div>
  );
});

export default GradingDashboard;
