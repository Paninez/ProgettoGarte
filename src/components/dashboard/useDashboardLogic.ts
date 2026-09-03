import { useMemo, useState } from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { OggettoMagazzino } from "../../types";
import { DashboardStats, MonthlyFinancialPoint } from "./dashboardUtils";

export function useDashboardLogic() {
  const { magazzino, finanze, carrelli, dettagli } = useDatabase();

  // 1. CALCULATE KPIs
  const stats: DashboardStats = useMemo(() => {
    let speseTotali = 0;
    let entrateTotali = 0;

    finanze.forEach((f) => {
      if (f.Tipo === "Uscita") speseTotali += f.Importo;
      else entrateTotali += f.Importo;
    });

    const utile = entrateTotali - speseTotali;

    let valoreVenditaMagazzino = 0;
    let valoreCostoMagazzino = 0;

    magazzino.forEach((o) => {
      valoreVenditaMagazzino += o.Quantità_Disponibile * o.Prezzo_Vendita;
      valoreCostoMagazzino += o.Quantità_Disponibile * o.Costo_Acquisto;
    });

    // Calculate Top Performers & Dead Stock
    const itemSalesCount: Record<string, number> = {};
    const itemRevenue: Record<string, number> = {};

    let forecastEntrate = 0;

    if (carrelli.length > 0 && dettagli.length > 0) {
      const openCarts = new Set(
        carrelli
          .filter((c) => c.Stato_Carrello === "Aperto" || c.Stato_Carrello === "Pronto_per_Spedizione")
          .map((c) => c.ID_Carrello)
      );
      dettagli.forEach((d) => {
        if (openCarts.has(d.ID_Carrello)) {
          forecastEntrate += d.Prezzo_Registrato || 0;
        }
      });
    }

    dettagli.forEach((d) => {
      itemSalesCount[d.ID_Oggetto] = (itemSalesCount[d.ID_Oggetto] || 0) + 1;
      itemRevenue[d.ID_Oggetto] = (itemRevenue[d.ID_Oggetto] || 0) + (d.Prezzo_Registrato || 0);
    });

    const topPerformers = [...magazzino]
      .filter((m) => itemSalesCount[m.ID_Oggetto])
      .sort((a, b) => itemRevenue[b.ID_Oggetto] - itemRevenue[a.ID_Oggetto])
      .slice(0, 5);

    const deadStock = [...magazzino]
      .filter((m) => !itemSalesCount[m.ID_Oggetto] && m.Quantità_Disponibile > 0)
      .sort((a, b) => b.Quantità_Disponibile * b.Costo_Acquisto - a.Quantità_Disponibile * a.Costo_Acquisto)
      .slice(0, 5);

    // Cart Metrics
    const totaleCarrelli = carrelli.length;
    const carrelliAperti = carrelli.filter(
      (c) => c.Stato_Carrello !== "Completato" && c.Stato_Carrello !== "Spedizione_Ricevuta_da_Consegnare"
    ).length;
    const totaleOggettiAcquistati = dettagli.length;
    const mediaOggettiPerCarrello = totaleCarrelli > 0 ? totaleOggettiAcquistati / totaleCarrelli : 0;

    let spesaTotaleCarrelli = 0;
    dettagli.forEach((d) => {
      spesaTotaleCarrelli += d.Prezzo_Registrato || 0;
    });

    const spesaMediaPerCarrello = totaleCarrelli > 0 ? spesaTotaleCarrelli / totaleCarrelli : 0;

    return {
      valoreVenditaMagazzino,
      valoreCostoMagazzino,
      utile,
      forecastEntrate,
      topPerformers,
      deadStock,
      itemSalesCount,
      itemRevenue,
      cartStats: {
        totaleCarrelli,
        carrelliAperti,
        totaleOggettiAcquistati,
        mediaOggettiPerCarrello,
        spesaTotaleCarrelli,
        spesaMediaPerCarrello,
      },
    };
  }, [magazzino, finanze, carrelli, dettagli]);

  const chartData: MonthlyFinancialPoint[] = useMemo(() => {
    const monthly: Record<string, { name: string; dataObj: Date; Entrate: number; Uscite: number; Utile: number }> = {};

    finanze.forEach((f) => {
      let dateObj: Date;
      if (f.Data && f.Data.includes("/")) {
        const parts = f.Data.split("/");
        dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        dateObj = new Date(f.Data || Date.now());
      }

      let monthKey = "";
      if (!isNaN(dateObj.getTime())) {
        monthKey = dateObj.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
      } else {
        monthKey = "Sconosciuto";
        dateObj = new Date(0);
      }

      if (!monthly[monthKey]) {
        monthly[monthKey] = { name: monthKey, dataObj: dateObj, Entrate: 0, Uscite: 0, Utile: 0 };
      }

      if (f.Tipo === "Entrata") {
        monthly[monthKey].Entrate += f.Importo;
      } else {
        monthly[monthKey].Uscite += f.Importo;
      }
    });

    return Object.values(monthly)
      .sort((a, b) => a.dataObj.getTime() - b.dataObj.getTime())
      .map((item) => {
        item.Utile = item.Entrate - item.Uscite;
        return item;
      });
  }, [finanze]);

  // 2. GRANULAR MANAGEMENT & GROUPING
  const [filterPill, setFilterPill] = useState<string>("Tutti");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Columns visibility
  const [showCols, setShowCols] = useState({
    sku: true,
    costo: true,
    roi: true,
    giacenza: true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const tableData = useMemo<Record<string, OggettoMagazzino[]>>(() => {
    const list = magazzino || [];
    let filtered = list;
    if (filterPill === "Box Sigillati") {
      filtered = list.filter((m) => (m?.Nome || "").toLowerCase().includes("box"));
    } else if (filterPill === "Singole") {
      filtered = list.filter((m) => !(m?.Nome || "").toLowerCase().includes("box"));
    } else if (filterPill === "JAP") {
      filtered = list.filter((m) => (m?.Nome || "").toLowerCase().includes("jap"));
    } else if (filterPill === "ENG") {
      filtered = list.filter((m) => (m?.Nome || "").toLowerCase().includes("eng"));
    }

    const grouped: Record<string, OggettoMagazzino[]> = {};

    filtered.forEach((item) => {
      if (!item) return;
      const nome = (item.Nome || "").trim() || "Articolo Senza Nome";
      const words = nome.split(" ");
      const baseName = words.slice(0, 2).join(" ") || "Sconosciuto";

      if (!grouped[baseName]) grouped[baseName] = [];
      grouped[baseName].push(item);
    });

    return grouped;
  }, [magazzino, filterPill]);

  return {
    stats,
    chartData,
    filterPill,
    setFilterPill,
    expandedGroups,
    toggleGroup,
    showCols,
    setShowCols,
    tableData,
  };
}
