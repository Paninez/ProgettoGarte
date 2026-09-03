import re

with open('/tmp/MagazzinoTable.tsx', 'r') as f:
    content = f.read()

# Extract Desktop Row block
desktop_start_str = r'{desktopVirtualizer.getVirtualItems().map((virtualRow) => {'
desktop_end_str = r'                  })}
                </>'
# Find indices
d_start_idx = content.find(desktop_start_str)
d_end_idx = content.find(desktop_end_str, d_start_idx) + len('                  })}')

# Extract Mobile Card block
mobile_start_str = r'{mobileVirtualizer.getVirtualItems().map((virtualRow) => {'
mobile_end_str = r'            })}
          </div>'
m_start_idx = content.find(mobile_start_str)
m_end_idx = content.find(mobile_end_str, m_start_idx) + len('            })}')

print(f"Desktop: {d_start_idx} to {d_end_idx}")
print(f"Mobile: {m_start_idx} to {m_end_idx}")

