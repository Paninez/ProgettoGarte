import re

with open('src/components/magazzino/MagazzinoTable.tsx', 'r') as f:
    content = f.read()

# Extract Desktop Row block
desktop_start_str = '{desktopVirtualizer.getVirtualItems().map((virtualRow) => {'
desktop_end_str = '                  })}\n                </>'
# Find indices
d_start_idx = content.find(desktop_start_str)
d_end_idx = content.find(desktop_end_str, d_start_idx)

# Extract Mobile Card block
mobile_start_str = '{mobileVirtualizer.getVirtualItems().map((virtualRow) => {'
mobile_end_str = '            })}\n          </div>'
m_start_idx = content.find(mobile_start_str)
m_end_idx = content.find(mobile_end_str, m_start_idx)

print(f"Desktop: {d_start_idx} to {d_end_idx}")
print(f"Mobile: {m_start_idx} to {m_end_idx}")
