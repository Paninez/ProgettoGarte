import React from "react";
import { LoyaltyDashboardProps } from "./loyalty/loyaltyUtils";
import { useLoyaltyLogic } from "./loyalty/useLoyaltyLogic";
import { LoyaltyHeader } from "./loyalty/LoyaltyHeader";
import { LoyaltyLeaderboard } from "./loyalty/LoyaltyLeaderboard";
import { LoyaltyCustomerDetail } from "./loyalty/LoyaltyCustomerDetail";
import { LoyaltyAdminSettings } from "./loyalty/LoyaltyAdminSettings";
import { LoyaltyModals } from "./loyalty/LoyaltyModals";

export const LoyaltyDashboard = React.memo(function LoyaltyDashboard(props: LoyaltyDashboardProps) {
  const {
    loyaltyProfiles,
    loyaltyHistory,
    loyaltyConfig,
    userRole,
    activeSubTab,
    setActiveSubTab,
    selectedCustomerId,
    setSelectedCustomerId,
    searchQuery,
    setSearchQuery,
    tierFilter,
    setTierFilter,
    sortBy,
    setSortBy,
    showManualModal,
    setShowManualModal,
    targetCustomer,
    setTargetCustomer,
    manualXP,
    setManualXP,
    manualTokens,
    setManualTokens,
    manualReason,
    setManualReason,
    showEditModal,
    setShowEditModal,
    showCreateModal,
    setShowCreateModal,
    editLevel,
    setEditLevel,
    editXP,
    setEditXP,
    editTier,
    setEditTier,
    editTokens,
    setEditTokens,
    editPrestige,
    setEditPrestige,
    editIsManuallyManaged,
    setEditIsManuallyManaged,
    editSpent,
    setEditSpent,
    editOrders,
    setEditOrders,
    newCustId,
    setNewCustId,
    newCustName,
    setNewCustName,
    newCustEmail,
    setNewCustEmail,
    newCustLevel,
    setNewCustLevel,
    newCustXP,
    setNewCustXP,
    newCustTier,
    setNewCustTier,
    luckyPullResult,
    isSpinning,
    totalSystemXP,
    totalSystemSpent,
    avgLevel,
    filteredProfiles,
    leaderboardPage,
    setLeaderboardPage,
    totalLeaderboardPages,
    paginatedProfiles,
    activeProfile,
    activeTierThreshold,
    activeTierConfig,
    handleTriggerLuckyPull,
    handleExportCSV,
    handleOpenEditModal,
  } = useLoyaltyLogic(props);

  return (
    <div className="space-y-6" id="loyalty-dashboard-root">
      <LoyaltyHeader
        loyaltyConfig={loyaltyConfig}
        loyaltyProfiles={loyaltyProfiles}
        totalSystemSpent={totalSystemSpent}
        totalSystemXP={totalSystemXP}
        avgLevel={avgLevel}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />

      {/* ================= TAB 1: LEADERBOARD & CUSTOMER LIST ================= */}
      {activeSubTab === "leaderboard" && (
        <LoyaltyLeaderboard
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          tierFilter={tierFilter}
          setTierFilter={setTierFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          handleExportCSV={handleExportCSV}
          filteredProfiles={filteredProfiles}
          paginatedProfiles={paginatedProfiles}
          leaderboardPage={leaderboardPage}
          setLeaderboardPage={setLeaderboardPage}
          totalLeaderboardPages={totalLeaderboardPages}
          setSelectedCustomerId={setSelectedCustomerId}
          setActiveSubTab={setActiveSubTab}
        />
      )}

      {/* ================= TAB 2: SCHEDA LOYALTY CLIENTE ================= */}
      {activeSubTab === "customer" && (
        <LoyaltyCustomerDetail
          loyaltyProfiles={loyaltyProfiles}
          loyaltyHistory={loyaltyHistory}
          activeProfile={activeProfile}
          activeTierThreshold={activeTierThreshold}
          activeTierConfig={activeTierConfig}
          selectedCustomerId={selectedCustomerId}
          setSelectedCustomerId={setSelectedCustomerId}
          userRole={userRole}
          setTargetCustomer={setTargetCustomer}
          setShowManualModal={setShowManualModal}
          handleOpenEditModal={handleOpenEditModal}
          setShowCreateModal={setShowCreateModal}
          luckyPullResult={luckyPullResult}
          isSpinning={isSpinning}
          handleTriggerLuckyPull={handleTriggerLuckyPull}
        />
      )}

      {/* ================= TAB 3: ADMIN CONFIGURATION & EVENT MULTIPLIERS ================= */}
      {activeSubTab === "admin" && (
        <LoyaltyAdminSettings
          loyaltyConfig={loyaltyConfig}
          onUpdateConfig={props.onUpdateConfig}
        />
      )}

      {/* ================= MODALS ================= */}
      <LoyaltyModals
        loyaltyProfiles={loyaltyProfiles}
        activeProfile={activeProfile}
        onGrantManualXP={props.onGrantManualXP}
        onUpdateProfile={props.onUpdateProfile}
        showManualModal={showManualModal}
        setShowManualModal={setShowManualModal}
        targetCustomer={targetCustomer}
        setTargetCustomer={setTargetCustomer}
        manualXP={manualXP}
        setManualXP={setManualXP}
        manualTokens={manualTokens}
        setManualTokens={setManualTokens}
        manualReason={manualReason}
        setManualReason={setManualReason}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editLevel={editLevel}
        setEditLevel={setEditLevel}
        editXP={editXP}
        setEditXP={setEditXP}
        editTier={editTier}
        setEditTier={setEditTier}
        editTokens={editTokens}
        setEditTokens={setEditTokens}
        editPrestige={editPrestige}
        setEditPrestige={setEditPrestige}
        editIsManuallyManaged={editIsManuallyManaged}
        setEditIsManuallyManaged={setEditIsManuallyManaged}
        editSpent={editSpent}
        setEditSpent={setEditSpent}
        editOrders={editOrders}
        setEditOrders={setEditOrders}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        newCustId={newCustId}
        setNewCustId={setNewCustId}
        newCustName={newCustName}
        setNewCustName={setNewCustName}
        newCustEmail={newCustEmail}
        setNewCustEmail={setNewCustEmail}
        newCustLevel={newCustLevel}
        setNewCustLevel={setNewCustLevel}
        newCustXP={newCustXP}
        setNewCustXP={setNewCustXP}
        newCustTier={newCustTier}
        setNewCustTier={setNewCustTier}
        setSelectedCustomerId={setSelectedCustomerId}
        setActiveSubTab={setActiveSubTab}
      />
    </div>
  );
});
