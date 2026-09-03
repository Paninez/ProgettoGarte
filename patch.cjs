const fs = require('fs');
let content = fs.readFileSync('src/hooks/useCarrelliSync.ts', 'utf8');

const target = `    // Clear and rewrite details
    await clearSheetRange(spreadsheetId, "Dettaglio_Carrello!A2:H2000", token);
    if (otherDetails.length > 0) {
      const valuesToWrite = otherDetails.map((d) => [
        d.ID_Carrello,
        d.ID_Oggetto,
        d.Pagato_Singolarmente ? "TRUE" : "FALSE",
        d.Prezzo_Registrato,
          d.Pagamento_Posticipato ? "TRUE" : "FALSE",
          d.Acconto_Pagato || 0,
          d.ID_Spedizione || "",
        d.Reso ? "TRUE" : "FALSE"
      ]);
      await updateSheetRows(spreadsheetId, \`Dettaglio_Carrello!A2:H\${otherDetails.length + 1}\`, valuesToWrite, token);
    }

    addSafetyLog(\`Dettagli carrello dell'ordine \${cartId} rimossi dal foglio Dettaglio_Carrello.\`);`;

const replacement = `    // Clear and rewrite details
    await clearSheetRange(spreadsheetId, "Dettaglio_Carrello!A2:H2000", token);
    if (otherDetails.length > 0) {
      const valuesToWrite = otherDetails.map((d) => [
        d.ID_Carrello,
        d.ID_Oggetto,
        d.Pagato_Singolarmente ? "TRUE" : "FALSE",
        d.Prezzo_Registrato,
          d.Pagamento_Posticipato ? "TRUE" : "FALSE",
          d.Acconto_Pagato || 0,
          d.ID_Spedizione || "",
        d.Reso ? "TRUE" : "FALSE"
      ]);
      await updateSheetRows(spreadsheetId, \`Dettaglio_Carrello!A2:H\${otherDetails.length + 1}\`, valuesToWrite, token);
    }

    // 3. Clear grading items belonging to this cart
    const allGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    const otherGrading = allGradingRows
      .map(rowToGradingItem)
      .filter((g) => g.ID_Carrello !== cartId && g.ID_Oggetto_Grading !== "");

    await clearSheetRange(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    if (otherGrading.length > 0) {
      const gradingValues = otherGrading.map((g) => [
        g.ID_Oggetto_Grading,
        g.ID_Carrello,
        g.Nome_Carta || (g as any).Nome_Oggetto || "",
        g.Tipologia_Servizio || (g as any).Compagnia_Grading || "",
        g.Costo_Cliente,
        g.Costo_Acquisto,
        g.Margine_Lordo,
        g.Link_Foto || "",
        g.Pagato_Singolarmente ? "TRUE" : "FALSE",
        g.ID_Gruppo_Grading || "",
        g.Link_Foto_Ritornata || "",
        g.Metodo_Consegna || "",
        g.Pagamento_Posticipato ? "TRUE" : "FALSE",
        g.Acconto_Pagato || 0,
        g.ID_Spedizione || "",
        g.Reso ? "TRUE" : "FALSE"
      ]);
      await updateSheetRows(spreadsheetId, \`Oggetti_In_Grading!A2:P\${otherGrading.length + 1}\`, gradingValues, token);
    }

    addSafetyLog(\`Dettagli carrello dell'ordine \${cartId} rimossi dal foglio Dettaglio_Carrello e Oggetti_In_Grading.\`);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/hooks/useCarrelliSync.ts', content);
