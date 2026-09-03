const fs = require('fs');

let lines = fs.readFileSync('src/components/magazzino/MagazzinoTable.tsx', 'utf8').split('\n');

const desktop_body = lines.slice(490 + 12, 916).join('\n'); // skips to 'return ('
const mobile_body = lines.slice(939 + 11, 1356).join('\n'); // skips to 'return ('

const comps = `
const areDesktopRowsEqual = (prev: any, next: any) => {
  if (prev.item !== next.item) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.allocated !== next.allocated) return false;
  if (prev.inlineEditingDateId !== next.inlineEditingDateId) return false;
  if (prev.inlineLoadingId !== next.inlineLoadingId) return false;
  if (prev.loading !== next.loading) return false;
  if (next.isEditing) {
    if (prev.editName !== next.editName) return false;
    if (prev.editQty !== next.editQty) return false;
    if (prev.editCosto !== next.editCosto) return false;
    if (prev.editPrezzo !== next.editPrezzo) return false;
    if (prev.editDataSpedizionePresunta !== next.editDataSpedizionePresunta) return false;
    if (prev.editTag !== next.editTag) return false;
  }
  const isInline = next.inlineEditingDateId === next.item.ID_Oggetto;
  if (isInline) {
    if (prev.inlineDateValue !== next.inlineDateValue) return false;
  }
  return true;
};

const MagazzinoDesktopRow = React.memo((props: any) => {
  const {
    item, virtualRow, isSelected, isEditing, allocated,
    desktopVirtualizer, handleToggleSelect, editName, setEditName,
    editDataSpedizionePresunta, setEditDataSpedizionePresunta,
    getPresetValue, editTag, setEditTag, inlineEditingDateId,
    inlineLoadingId, inlineDateValue, setInlineDateValue,
    handleSaveInlineDate, setInlineEditingDateId, editQty, setEditQty,
    editCosto, setEditCosto, editPrezzo, setEditPrezzo, userRole, loading,
    handleSaveEdit, setEditingId, handleStartEdit,
    onStartDistribute, onSettlePreorder, onStartMeet,
    setDeleteConfirmText, setItemIdToDelete
  } = props;
  const total = item.Quantità_Disponibile;
  const available = total - allocated;
  const isLow = available <= 3;
  const isOut = available === 0;
  return (
` + desktop_body + `
  );
}, areDesktopRowsEqual);

const areMobileCardsEqual = (prev: any, next: any) => {
  if (prev.item !== next.item) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.allocated !== next.allocated) return false;
  if (prev.inlineEditingDateId !== next.inlineEditingDateId) return false;
  if (prev.inlineLoadingId !== next.inlineLoadingId) return false;
  if (prev.loading !== next.loading) return false;
  if (next.isEditing) {
    if (prev.editName !== next.editName) return false;
    if (prev.editQty !== next.editQty) return false;
    if (prev.editCosto !== next.editCosto) return false;
    if (prev.editPrezzo !== next.editPrezzo) return false;
    if (prev.editDataSpedizionePresunta !== next.editDataSpedizionePresunta) return false;
    if (prev.editTag !== next.editTag) return false;
  }
  const isInline = next.inlineEditingDateId === next.item.ID_Oggetto;
  if (isInline) {
    if (prev.inlineDateValue !== next.inlineDateValue) return false;
  }
  return true;
};

const MagazzinoMobileCard = React.memo((props: any) => {
  const {
    item, virtualRow, isSelected, isEditing, allocated,
    mobileVirtualizer, handleToggleSelect, editName, setEditName,
    editDataSpedizionePresunta, setEditDataSpedizionePresunta,
    getPresetValue, editTag, setEditTag, inlineEditingDateId,
    inlineLoadingId, inlineDateValue, setInlineDateValue,
    handleSaveInlineDate, setInlineEditingDateId, editQty, setEditQty,
    editCosto, setEditCosto, editPrezzo, setEditPrezzo, userRole, loading,
    handleSaveEdit, setEditingId, handleStartEdit,
    onStartDistribute, onSettlePreorder, onStartMeet,
    setDeleteConfirmText, setItemIdToDelete
  } = props;
  const total = item.Quantità_Disponibile;
  const available = total - allocated;
  const isLow = available <= 3;
  const isOut = available === 0;
  return (
` + mobile_body + `
  );
}, areMobileCardsEqual);
`;

const desktop_map = `{desktopVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = filteredItems[virtualRow.index];
                  const isSelected = selectedIds.includes(item.ID_Oggetto);
                  const isEditing = editingId === item.ID_Oggetto;
                  const allocated = allocatedCounts[item.ID_Oggetto] || 0;
                  return (
                    <MagazzinoDesktopRow
                      key={item.ID_Oggetto}
                      item={item} virtualRow={virtualRow} isSelected={isSelected}
                      isEditing={isEditing} allocated={allocated}
                      desktopVirtualizer={desktopVirtualizer} handleToggleSelect={handleToggleSelect}
                      editName={editName} setEditName={setEditName}
                      editDataSpedizionePresunta={editDataSpedizionePresunta} setEditDataSpedizionePresunta={setEditDataSpedizionePresunta}
                      getPresetValue={getPresetValue} editTag={editTag} setEditTag={setEditTag}
                      inlineEditingDateId={inlineEditingDateId} inlineLoadingId={inlineLoadingId}
                      inlineDateValue={inlineDateValue} setInlineDateValue={setInlineDateValue}
                      handleSaveInlineDate={handleSaveInlineDate} setInlineEditingDateId={setInlineEditingDateId}
                      editQty={editQty} setEditQty={setEditQty} editCosto={editCosto} setEditCosto={setEditCosto}
                      editPrezzo={editPrezzo} setEditPrezzo={setEditPrezzo} userRole={userRole} loading={loading}
                      handleSaveEdit={handleSaveEdit} setEditingId={setEditingId} handleStartEdit={handleStartEdit}
                      onStartDistribute={onStartDistribute} onSettlePreorder={onSettlePreorder} onStartMeet={onStartMeet}
                      setDeleteConfirmText={setDeleteConfirmText} setItemIdToDelete={setItemIdToDelete}
                    />
                  );
                })}`.split('\n');

const mobile_map = `            mobileVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredItems[virtualRow.index];
              const isSelected = selectedIds.includes(item.ID_Oggetto);
              const isEditing = editingId === item.ID_Oggetto;
              const allocated = allocatedCounts[item.ID_Oggetto] || 0;
              return (
                <MagazzinoMobileCard
                  key={item.ID_Oggetto}
                  item={item} virtualRow={virtualRow} isSelected={isSelected}
                  isEditing={isEditing} allocated={allocated}
                  mobileVirtualizer={mobileVirtualizer} handleToggleSelect={handleToggleSelect}
                  editName={editName} setEditName={setEditName}
                  editDataSpedizionePresunta={editDataSpedizionePresunta} setEditDataSpedizionePresunta={setEditDataSpedizionePresunta}
                  getPresetValue={getPresetValue} editTag={editTag} setEditTag={setEditTag}
                  inlineEditingDateId={inlineEditingDateId} inlineLoadingId={inlineLoadingId}
                  inlineDateValue={inlineDateValue} setInlineDateValue={setInlineDateValue}
                  handleSaveInlineDate={handleSaveInlineDate} setInlineEditingDateId={setInlineEditingDateId}
                  editQty={editQty} setEditQty={setEditQty} editCosto={editCosto} setEditCosto={setEditCosto}
                  editPrezzo={editPrezzo} setEditPrezzo={setEditPrezzo} userRole={userRole} loading={loading}
                  handleSaveEdit={handleSaveEdit} setEditingId={setEditingId} handleStartEdit={handleStartEdit}
                  onStartDistribute={onStartDistribute} onSettlePreorder={onSettlePreorder} onStartMeet={onStartMeet}
                  setDeleteConfirmText={setDeleteConfirmText} setItemIdToDelete={setItemIdToDelete}
                />
              );
            })`.split('\n');

let newLines = [...lines];

newLines.splice(939, 1358 - 939 + 1, ...mobile_map); // line 940 to 1358
newLines.splice(490, 918 - 490 + 1, ...desktop_map); // line 491 to 918

const interface_idx = newLines.findIndex(l => l.includes('interface MagazzinoTableProps'));
newLines.splice(interface_idx, 0, ...comps.split('\n'));

fs.writeFileSync('src/components/magazzino/MagazzinoTable.tsx', newLines.join('\n'));
