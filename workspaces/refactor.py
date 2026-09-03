import re

with open('src/components/magazzino/MagazzinoTable.tsx', 'r') as f:
    content = f.read()

desktop_start_str = '{desktopVirtualizer.getVirtualItems().map((virtualRow) => {'
d_start_idx = content.find(desktop_start_str)
print("desktop found:", d_start_idx)
desktop_end_str = '                  })}'
d_end_idx = content.find(desktop_end_str, d_start_idx)
print("desktop end:", d_end_idx)

mobile_start_str = '{mobileVirtualizer.getVirtualItems().map((virtualRow) => {'
m_start_idx = content.find(mobile_start_str)
print("mobile found:", m_start_idx)
mobile_end_str = '            })}'
m_end_idx = content.find(mobile_end_str, m_start_idx)
print("mobile end:", m_end_idx)

desktop_map_body = content[d_start_idx + len(desktop_start_str) : d_end_idx]
mobile_map_body = content[m_start_idx + len(mobile_start_str) : m_end_idx]

print("Desktop body starts with:", desktop_map_body[:50].strip())
print("Desktop body ends with:", desktop_map_body[-50:].strip())
print("Mobile body starts with:", mobile_map_body[:50].strip())
print("Mobile body ends with:", mobile_map_body[-50:].strip())

desktop_component = """
const areDesktopRowsEqual = (prev: any, next: any) => {
  if (prev.item !== next.item) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.allocated !== next.allocated) return false;
  if (prev.inlineEditingDateId !== next.inlineEditingDateId) return false;
  
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
    if (prev.inlineLoadingId !== next.inlineLoadingId) return false;
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
""" + desktop_map_body.replace('return (', 'return (\n', 1) + """
}, areDesktopRowsEqual);
"""

mobile_component = """
const areMobileCardsEqual = (prev: any, next: any) => {
  if (prev.item !== next.item) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.allocated !== next.allocated) return false;
  if (prev.inlineEditingDateId !== next.inlineEditingDateId) return false;
  
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
    if (prev.inlineLoadingId !== next.inlineLoadingId) return false;
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
""" + mobile_map_body.replace('return (', 'return (\n', 1) + """
}, areMobileCardsEqual);
"""

# Now write back to MagazzinoTable.tsx
# Insert components after imports
import_end_str = 'interface MagazzinoTableProps {'
import_end_idx = content.find(import_end_str)

desktop_map_replace = """{desktopVirtualizer.getVirtualItems().map((virtualRow) => {
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
                })}"""

mobile_map_replace = """{mobileVirtualizer.getVirtualItems().map((virtualRow) => {
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
            })}"""

new_content = content[:import_end_idx] + desktop_component + "\n" + mobile_component + "\n\n" + content[import_end_idx:]

new_content = new_content.replace(content[d_start_idx : d_end_idx + len(desktop_end_str)], desktop_map_replace)
new_content = new_content.replace(content[m_start_idx : m_end_idx + len(mobile_end_str)], mobile_map_replace)

with open('src/components/magazzino/MagazzinoTable.tsx', 'w') as f:
    f.write(new_content)

print("Done")
