import React from "react";
import { Spedizione, Carrello, DettaglioCarrello, GradingItem, OggettoMagazzino } from "../../types";
import { ShippingLabelPrototype } from "../carrelli/ShippingLabelPrototype";
import { X } from "lucide-react";

interface ShipmentPrintModalProps {
  printingShipment: Spedizione | null;
  onClose: () => void;
  carrelli: Carrello[];
  dettagliCarrelli: DettaglioCarrello[];
  oggettiInGrading: GradingItem[];
  magazzino: OggettoMagazzino[];
  onSendWhatsApp: (shipment: Spedizione, cart?: Carrello) => void;
  onSaveCart?: (cart: Carrello, dettagli: DettaglioCarrello[], grading?: GradingItem[], silent?: boolean) => Promise<void>;
}

export function ShipmentPrintModal({
  printingShipment,
  onClose,
  carrelli,
  dettagliCarrelli,
  oggettiInGrading,
  magazzino,
  onSendWhatsApp,
  onSaveCart,
}: ShipmentPrintModalProps) {
  if (!printingShipment) return null;

  const cart = carrelli.find((c) => c.ID_Carrello === printingShipment.ID_Carrello);
  const cartDettagli = dettagliCarrelli.filter((d) => d.ID_Carrello === printingShipment.ID_Carrello);
  const cartGrading = oggettiInGrading.filter((g) => g.ID_Carrello === printingShipment.ID_Carrello);

  // Group standard items
  const groupedMap: Record<string, any> = {};
  cartDettagli.forEach((item) => {
    const prod = magazzino.find((m) => m.ID_Oggetto === item.ID_Oggetto);
    const name = prod?.Nome || item.ID_Oggetto;
    if (!groupedMap[item.ID_Oggetto]) {
      groupedMap[item.ID_Oggetto] = {
        ID_Oggetto: item.ID_Oggetto,
        nome: name,
        count: 0,
        items: [],
      };
    }
    groupedMap[item.ID_Oggetto].count += 1;
    groupedMap[item.ID_Oggetto].items.push(item);
  });
  const groupedCartItems = Object.values(groupedMap);

  let calcTotale = 0;
  let calcPagato = 0;
  let calcRemaining = 0;

  cartDettagli.forEach((item) => {
    const price = item.Prezzo_Registrato || 0;
    calcTotale += price;
    if (item.Pagato_Singolarmente) {
      calcPagato += price;
    } else {
      if (item.Acconto_Pagato) {
        calcPagato += item.Acconto_Pagato;
        calcRemaining += Math.max(0, price - item.Acconto_Pagato);
      } else {
        calcRemaining += price;
      }
    }
  });

  cartGrading.forEach((g) => {
    const cost = g.Costo_Cliente || 0;
    calcTotale += cost;
    if (g.Pagato_Singolarmente) {
      calcPagato += cost;
    } else {
      if (g.Acconto_Pagato) {
        calcPagato += g.Acconto_Pagato;
        calcRemaining += Math.max(0, cost - g.Acconto_Pagato);
      } else {
        calcRemaining += cost;
      }
    }
  });

  const cartTotalsCalc = {
    totaleCarrello: calcTotale,
    totalePagato: calcPagato,
    rimanenza: calcRemaining,
  };

  const clientName = cart?.Nome_Cliente || printingShipment.Nome_Cliente || "Cliente Sconosciuto";
  const clientPhone = cart?.Telefono || printingShipment.Telefono || "";
  const clientAddress = cart?.Indirizzo_Spedizione || printingShipment.Indirizzo_Spedizione || "";
  const tags = cart?.Tag || printingShipment.Tag || "";

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 border border-slate-800 shadow-2xl relative my-auto print:max-h-none print:border-none print:shadow-none print:p-0">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors z-10 print:hidden cursor-pointer"
          title="Chiudi"
        >
          <X className="h-5 w-5" />
        </button>

        <ShippingLabelPrototype
          cartId={printingShipment.ID_Carrello}
          clientName={clientName}
          clientPhone={clientPhone}
          clientAddress={clientAddress}
          cartStatus={cart?.Stato_Carrello || "Pronto_per_Spedizione"}
          shipmentStatus={printingShipment.Stato_Consegna}
          trackingNumber={printingShipment.Tracking}
          groupedCartItems={groupedCartItems}
          activeGradingItems={cartGrading}
          cartTotals={cartTotalsCalc}
          tags={tags}
          note={cart?.Note}
          onExportWhatsApp={() => onSendWhatsApp(printingShipment, cart)}
          onUpdateAddress={async (newAddr) => {
            if (cart && onSaveCart) {
              const currentCartDettagli = dettagliCarrelli.filter((d) => d.ID_Carrello === cart.ID_Carrello);
              await onSaveCart({ ...cart, Indirizzo_Spedizione: newAddr }, currentCartDettagli, cartGrading);
            }
          }}
          onUpdateNote={async (newNote) => {
            if (cart && onSaveCart) {
              const currentCartDettagli = dettagliCarrelli.filter((d) => d.ID_Carrello === cart.ID_Carrello);
              await onSaveCart({ ...cart, Note: newNote }, currentCartDettagli, cartGrading);
            }
          }}
        />
      </div>
    </div>
  );
}
