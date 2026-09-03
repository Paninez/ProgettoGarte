import React, { useState, useMemo, useEffect } from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { CustomerLoyalty, TierConfig } from "../../types";
import {
  TIERS_CONFIG,
  calculateNextTierThreshold,
  calculateXPForLevel,
} from "../../lib/loyaltyEngine";
import { LoyaltyDashboardProps } from "./loyaltyUtils";

const ITEMS_PER_PAGE_LEADERBOARD = 12;

export function useLoyaltyLogic(props: LoyaltyDashboardProps) {
  const { onGrantManualXP, onUpdateProfile, addSafetyLog } = props;
  const { loyaltyProfiles, loyaltyHistory, loyaltyConfig, userRole } = useDatabase();

  const [activeSubTab, setActiveSubTab] = useState<"leaderboard" | "customer" | "admin">("leaderboard");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"spent" | "xp" | "orders" | "tokens">("spent");

  // Admin Manual Adjustment State
  const [showManualModal, setShowManualModal] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState("");
  const [manualXP, setManualXP] = useState(500);
  const [manualTokens, setManualTokens] = useState(10);
  const [manualReason, setManualReason] = useState("Bonus speciale fidelizzazione");

  // State for Admin Profile Editing & Creation
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // States for editing a profile
  const [editLevel, setEditLevel] = useState<number>(1);
  const [editXP, setEditXP] = useState<number>(0);
  const [editTier, setEditTier] = useState<string>("Rookie Collector");
  const [editTokens, setEditTokens] = useState<number>(0);
  const [editPrestige, setEditPrestige] = useState<number>(0);
  const [editIsManuallyManaged, setEditIsManuallyManaged] = useState<boolean>(false);
  const [editSpent, setEditSpent] = useState<number>(0);
  const [editOrders, setEditOrders] = useState<number>(0);

  // States for creating a profile
  const [newCustId, setNewCustId] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustLevel, setNewCustLevel] = useState<number>(1);
  const [newCustXP, setNewCustXP] = useState<number>(0);
  const [newCustTier, setNewCustTier] = useState<string>("Rookie Collector");

  // Lucky Pull State
  const [luckyPullResult, setLuckyPullResult] = useState<{ title: string; reward: string } | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Celebration Modal State
  const [celebrationTier, setCelebrationTier] = useState<TierConfig | null>(null);

  // Computed summary stats
  const totalSystemXP = useMemo(() => {
    return loyaltyProfiles.reduce((acc, p) => acc + p.xp, 0);
  }, [loyaltyProfiles]);

  const totalSystemSpent = useMemo(() => {
    return loyaltyProfiles.reduce((acc, p) => acc + p.totalSpent, 0);
  }, [loyaltyProfiles]);

  const avgLevel = useMemo(() => {
    if (loyaltyProfiles.length === 0) return 1;
    return Math.round(
      loyaltyProfiles.reduce((acc, p) => acc + p.level, 0) / loyaltyProfiles.length
    );
  }, [loyaltyProfiles]);

  // Filtered & Sorted Leaderboard
  const filteredProfiles = useMemo(() => {
    let result = [...loyaltyProfiles];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.customerName.toLowerCase().includes(q) ||
          p.customerId.toLowerCase().includes(q) ||
          (p.email && p.email.toLowerCase().includes(q))
      );
    }
    if (tierFilter !== "ALL") {
      result = result.filter((p) => p.tier === tierFilter);
    }
    result.sort((a, b) => {
      if (sortBy === "spent") return b.totalSpent - a.totalSpent;
      if (sortBy === "xp") return b.xp - a.xp;
      if (sortBy === "orders") return b.totalOrders - a.totalOrders;
      if (sortBy === "tokens") return b.collectorTokens - a.collectorTokens;
      return 0;
    });
    return result;
  }, [loyaltyProfiles, searchQuery, tierFilter, sortBy]);

  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const totalLeaderboardPages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE_LEADERBOARD);

  // Reset page when filters change
  useEffect(() => {
    setLeaderboardPage(1);
  }, [searchQuery, tierFilter, sortBy]);

  const paginatedProfiles = useMemo(() => {
    const startIndex = (leaderboardPage - 1) * ITEMS_PER_PAGE_LEADERBOARD;
    return filteredProfiles.slice(startIndex, startIndex + ITEMS_PER_PAGE_LEADERBOARD);
  }, [filteredProfiles, leaderboardPage]);

  // Selected active profile for customer view
  const activeProfile = useMemo(() => {
    if (!selectedCustomerId) {
      return loyaltyProfiles[0] || null;
    }
    return loyaltyProfiles.find((p) => p.customerId === selectedCustomerId) || loyaltyProfiles[0] || null;
  }, [selectedCustomerId, loyaltyProfiles]);

  // Next tier progress for active customer
  const activeTierThreshold = useMemo(() => {
    if (!activeProfile) return null;
    return calculateNextTierThreshold(activeProfile.totalSpent);
  }, [activeProfile]);

  const activeTierConfig = useMemo(() => {
    if (!activeProfile) return TIERS_CONFIG[0];
    return TIERS_CONFIG.find((t) => t.tier === activeProfile.tier) || TIERS_CONFIG[0];
  }, [activeProfile]);

  // Handle Lucky Pull Wheel
  const handleTriggerLuckyPull = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setLuckyPullResult(null);

    setTimeout(() => {
      const rewards = [
        { title: "🎯 EXTRA XP BOOST!", reward: "+500 XP Aggiunti al tuo account!" },
        { title: "💎 TOKENS EXTRA!", reward: "+10 Collector Tokens vinti!" },
        { title: "🌟 MISTER CARD REWARD!", reward: "1x Sleeves Edizione Limitata OMAGGIO!" },
        { title: "🚀 DOUBLE XP PASS!", reward: "2x XP pass valido per il tuo prossimo ordine!" },
      ];
      const prize = rewards[Math.floor(Math.random() * rewards.length)];
      setLuckyPullResult(prize);
      setIsSpinning(false);
      if (activeProfile) {
        onGrantManualXP(activeProfile.customerId, 500, 10, "Vincita Lucky Pull Wheel");
      }
    }, 1500);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (loyaltyProfiles.length === 0) return;
    const headers = [
      "ID Cliente",
      "Nome Cliente",
      "Spesa Totale (€)",
      "Ordini Completati",
      "Livello",
      "XP Totali",
      "Tier",
      "Collector Tokens",
      "Badges Sbloccati",
    ];
    const rows = loyaltyProfiles.map((p) => [
      p.customerId,
      `"${p.customerName.replace(/"/g, '""')}"`,
      p.totalSpent,
      p.totalOrders,
      p.level,
      p.xp,
      `"${p.tier}"`,
      p.collectorTokens,
      p.badges.length,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_Loyalty_Clienti_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEditModal = (profile: CustomerLoyalty) => {
    setEditLevel(profile.level);
    setEditXP(profile.xp);
    setEditTier(profile.tier);
    setEditTokens(profile.collectorTokens);
    setEditPrestige(profile.prestigeLevel || 0);
    setEditIsManuallyManaged(!!profile.isManuallyManaged);
    setEditSpent(profile.totalSpent || 0);
    setEditOrders(profile.totalOrders || 0);
    setShowEditModal(true);
  };

  const handleSaveEditProfile = () => {
    if (!activeProfile || !onUpdateProfile) return;
    const updated: CustomerLoyalty = {
      ...activeProfile,
      level: editLevel,
      xp: editXP,
      tier: editTier as any,
      collectorTokens: editTokens,
      prestigeLevel: editPrestige,
      isManuallyManaged: editIsManuallyManaged,
      totalSpent: editSpent,
      totalOrders: editOrders,
    };
    onUpdateProfile(updated);
    addSafetyLog?.(`Modificato profilo loyalty manualmente per ${activeProfile.customerName}`);
    setShowEditModal(false);
  };

  const handleSaveCreateProfile = () => {
    if (!newCustId.trim() || !newCustName.trim() || !onUpdateProfile) return;
    const newProfile: CustomerLoyalty = {
      customerId: newCustId.trim(),
      customerName: newCustName.trim(),
      email: newCustEmail.trim() || undefined,
      level: newCustLevel,
      xp: newCustXP,
      tier: newCustTier as any,
      collectorTokens: 0,
      prestigeLevel: 0,
      nextTierXP: calculateXPForLevel(newCustLevel + 1),
      totalSpent: 0,
      totalOrders: 0,
      badges: [],
      completedMissions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTierUpdate: new Date().toISOString(),
      isManuallyManaged: true,
    };
    onUpdateProfile(newProfile);
    addSafetyLog?.(`Creato nuovo profilo loyalty per ${newCustName}`);
    setShowCreateModal(false);
    setNewCustId("");
    setNewCustName("");
    setNewCustEmail("");
  };

  return {
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
    setLuckyPullResult,
    isSpinning,
    celebrationTier,
    setCelebrationTier,
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
    handleSaveEditProfile,
    handleSaveCreateProfile,
  };
}
