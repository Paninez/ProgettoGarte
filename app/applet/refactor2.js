import fs from 'fs';

let content = fs.readFileSync('src/components/magazzino/MagazzinoTable.tsx', 'utf8');

const desktop_start_str = '                {desktopVirtualizer.getVirtualItems().map((virtualRow) => {\n                  const item = filteredItems[virtualRow.index];\n                  const isSelected = selectedIds.includes(item.ID_Oggetto);\n                  const isEditing = editingId === item.ID_Oggetto;\n                  const total = item.Quantità_Disponibile;\n                  const allocated = allocatedCounts[item.ID_Oggetto] || 0;\n                  const available = total - allocated;\n                  const isLow = available <= 3;\n                  const isOut = available === 0;\n\n                  return (';
const d_start_idx = content.indexOf('                {desktopVirtualizer.getVirtualItems().map((virtualRow) => {');
const desktop_end_str = '                  })}\n                </>';
const d_end_idx = content.indexOf(desktop_end_str, d_start_idx);

const desktop_map_body = content.substring(d_start_idx, d_end_idx + desktop_end_str.length);

const mobile_start_str = '{mobileVirtualizer.getVirtualItems().map((virtualRow) => {\n              const item = filteredItems[virtualRow.index];\n              const isSelected = selectedIds.includes(item.ID_Oggetto);\n              const isEditing = editingId === item.ID_Oggetto;\n              const total = item.Quantità_Disponibile;\n              const allocated = allocatedCounts[item.ID_Oggetto] || 0;\n              const available = total - allocated;\n              const isLow = available <= 3;\n              const isOut = available === 0;\n\n              return (';
const m_start_idx = content.indexOf('            {mobileVirtualizer.getVirtualItems().map((virtualRow) => {');
const mobile_end_str = '            })}\n          </div>';
const m_end_idx = content.indexOf(mobile_end_str, m_start_idx);

const mobile_map_body = content.substring(m_start_idx, m_end_idx + mobile_end_str.length);

// We need to extract just the `return (...)` part.
const desktop_return_start = content.indexOf('return (', d_start_idx);
const desktop_return_end = content.lastIndexOf('                  })}', d_end_idx);
const desktop_return_body = content.substring(desktop_return_start + 8, desktop_return_end).trim();

const mobile_return_start = content.indexOf('return (', m_start_idx);
const mobile_return_end = content.lastIndexOf('            })}', m_end_idx);
const mobile_return_body = content.substring(mobile_return_start + 8, mobile_return_end).trim();

const components = `
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
    \${desktop_return_body}
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
    \${mobile_return_body}
  );
}, areMobileCardsEqual);
`;

const desktop_map_replace = \`                {desktopVirtualizer.getVirtualItems().map((virtualRow) => {
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
                })}
                </>\`;

const mobile_map_replace = \`            {mobileVirtualizer.getVirtualItems().map((virtualRow) => {
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
            })}
          </div>\`;

const import_end_str = 'interface MagazzinoTableProps {';
const import_end_idx = content.indexOf(import_end_str);

let new_content = content.substring(0, import_end_idx) + components + "\\n\\n" + content.substring(import_end_idx);

// Note: Because indices have shifted, we must replace using strings
new_content = new_content.replace(desktop_map_body, desktop_map_replace);
new_content = new_content.replace(mobile_map_body, mobile_map_replace);

fs.writeFileSync('src/components/magazzino/MagazzinoTable.tsx', new_content);
