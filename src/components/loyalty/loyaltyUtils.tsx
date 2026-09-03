import React from "react";
import {
  ShoppingBag,
  PackageCheck,
  Coins,
  CreditCard,
  Gem,
  Calendar,
  Zap,
  Anchor,
  Flame,
  Smile,
  Crown,
  Gift,
  Medal,
  Trophy,
  Sparkles,
} from "lucide-react";
import {
  CustomerLoyalty,
  LoyaltyConfig,
} from "../../types";

export interface LoyaltyDashboardProps {
  onUpdateConfig: (newConfig: LoyaltyConfig) => void;
  onGrantManualXP: (customerId: string, xpAmount: number, tokensAmount: number, reason: string) => void;
  onUpdateProfile?: (updatedProfile: CustomerLoyalty) => void;
  addSafetyLog?: (msg: string) => void;
}

export function renderBadgeIcon(iconName: string, className: string = "h-4 w-4") {
  switch (iconName) {
    case "ShoppingBag":
      return <ShoppingBag className={className} />;
    case "PackageCheck":
      return <PackageCheck className={className} />;
    case "Coins":
      return <Coins className={className} />;
    case "CreditCard":
      return <CreditCard className={className} />;
    case "Gem":
      return <Gem className={className} />;
    case "Calendar":
      return <Calendar className={className} />;
    case "Zap":
      return <Zap className={className} />;
    case "Anchor":
      return <Anchor className={className} />;
    case "Flame":
      return <Flame className={className} />;
    case "Smile":
      return <Smile className={className} />;
    case "Crown":
      return <Crown className={className} />;
    case "Gift":
      return <Gift className={className} />;
    case "Medal":
      return <Medal className={className} />;
    case "Trophy":
      return <Trophy className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}
