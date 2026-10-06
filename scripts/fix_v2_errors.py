import re

def patch(path, pairs):
    s = open(path, encoding='utf-8').read()
    changed = False
    for old, new in pairs:
        if old not in s:
            print(f"WARN not found in {path}: {old[:60]!r}")
        else:
            s = s.replace(old, new)
            changed = True
    if changed:
        open(path, 'w', encoding='utf-8').write(s)
        print(f"patched {path}")

# 1) RetryButton: use destructured children
patch('src/features/v2/shared/components/RetryButton.tsx', [
    ("      {props.children}\n", "      {children}\n"),
])

# 2) LoadingState: remove styled-jsx attr
s = open('src/features/v2/shared/components/LoadingState.tsx', encoding='utf-8').read()
s = s.replace('<style jsx>{`', '<style>{`')

# SkeletonLoader marginBottom support
s = s.replace(
    "export function SkeletonLoader({\n  width = '100%',\n  height = '1rem',\n  borderRadius = '0.375rem',\n  animated = true,\n}: {\n  width?: string | number;\n  height?: string | number;\n  borderRadius?: string;",
    "export function SkeletonLoader({\n  width = '100%',\n  height = '1rem',\n  marginBottom,\n  borderRadius = '0.375rem',\n  animated = true,\n}: {\n  width?: string | number;\n  height?: string | number;\n  marginBottom?: string;\n  borderRadius?: string;"
)
s = s.replace("        height,\n        borderRadius,", "        height,\n        marginBottom,\n        borderRadius,")
open('src/features/v2/shared/components/LoadingState.tsx', 'w', encoding='utf-8').write(s)
print("patched LoadingState")

# 3) EmptyState/ErrorDisplay import path
patch('src/features/v2/shared/components/EmptyState.tsx', [("from '../../types'", "from '../types'")])
patch('src/features/v2/shared/components/ErrorDisplay.tsx', [("from '../../types'", "from '../types'")])

# 4) Tabs: flexDirection map + style prop + createTabs
s = open('src/features/v2/shared/components/Tabs.tsx', encoding='utf-8').read()
s = s.replace(
    "style={{ display: 'flex', flexDirection: orientation }}",
    "style={{ display: 'flex', flexDirection: orientation === 'vertical' ? 'column' : 'row' }}"
)
s = s.replace(
    "  children: React.ReactNode;\n  className?: string;\n  orientation?: 'horizontal' | 'vertical';\n}",
    "  children: React.ReactNode;\n  className?: string;\n  style?: React.CSSProperties;\n  orientation?: 'horizontal' | 'vertical';\n}"
)
s = s.replace(
    "  children,\n  className = '',\n  orientation = 'horizontal',\n}: TabsProps) {",
    "  children,\n  className = '',\n  style,\n  orientation = 'horizontal',\n}: TabsProps) {"
)
s = s.replace(
    "        style={{ display: 'flex', flexDirection: orientation === 'vertical' ? 'column' : 'row' }}\n      >",
    "        style={{ display: 'flex', flexDirection: orientation === 'vertical' ? 'column' : 'row', ...style }}\n      >"
)
s = s.replace(
    "export const TabsComponents = { Tabs, TabList, Tab, TabPanels, TabPanel };",
    "export const TabsComponents = { Tabs, TabList, Tab, TabPanels, TabPanel };\n\nexport function createTabs() {\n  return { Root: Tabs, List: TabList, Tab, Panels: TabPanels, Panel: TabPanel };\n}"
)
open('src/features/v2/shared/components/Tabs.tsx', 'w', encoding='utf-8').write(s)
print("patched Tabs")

# 5) apiClient.get widen params
patch('src/features/v2/shared/services/apiClient.ts', [
    ("async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {",
     "async get<T>(endpoint: string, params?: object): Promise<ApiResponse<T>> {"),
])

# 6) authService: add role CRUD + role-permission methods
s = open('src/features/v2/auth/services/authService.ts', encoding='utf-8').read()
anchor = """  async removeRole(userId: string, roleId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/auth/users/${userId}/roles/${roleId}`);
  }
}"""
addition = """  async removeRole(userId: string, roleId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/auth/users/${userId}/roles/${roleId}`);
  }

  // ---- Role & permission administration (server-side verified) ----
  async createRole(data: { name: string; description?: string; level: number }): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post<{ id: string }>('/auth/roles', data);
  }

  async updateRole(roleId: string, updates: { name?: string; description?: string; level?: number }): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/auth/roles/${roleId}`, updates);
  }

  async deleteRole(roleId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/auth/roles/${roleId}`);
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/auth/roles/${roleId}/permissions`, { permissionIds });
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/auth/roles/${roleId}/permissions/${permissionId}`);
  }
}"""
if anchor in s:
    s = s.replace(anchor, addition)
    open('src/features/v2/auth/services/authService.ts', 'w', encoding='utf-8').write(s)
    print("patched authService")
else:
    print("WARN authService anchor not found")

# 7) V2Router fixes
patch('src/features/v2/routing/V2Router.tsx', [
    ("import { V2ErrorBoundary } from '../shared/components/ErrorBoundary';",
     "import { ErrorBoundary as V2ErrorBoundary } from '../shared/components/ErrorBoundary';"),
    ("""        if (response.success?.featureFlags) {
          setFeatureFlags(response.data.featureFlags);
        }""",
     """        if (response.success && response.data?.featureFlags) {
          setFeatureFlags(response.data.featureFlags);
        }"""),
])

# 8) AuthPanel metadata fullName unknown
patch('src/features/v2/auth/components/AuthPanel.tsx', [
    ("{user.metadata.fullName || user.email || 'User'}",
     "{String(user.metadata.fullName || user.email || 'User')}"),
])

# 9) RoleManager: EditRoleModal tab state
s = open('src/features/v2/rbac/components/RoleManager.tsx', encoding='utf-8').read()
s = s.replace(
    '<Tabs activeTab="details" onChange={setShowPermissions}>',
    '<Tabs activeTab={activeModalTab} onChange={(id) => setActiveModalTab(id)}>'
)
s = s.replace(
    "  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n  const [showPermissions, setShowPermissions] = useState(false);",
    "  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n  const [activeModalTab, setActiveModalTab] = useState<'details' | 'permissions'>('details');"
)
s = s.replace(
    'onClick={() => setShowPermissions(true)}',
    "onClick={() => setActiveModalTab('permissions')}"
)
open('src/features/v2/rbac/components/RoleManager.tsx', 'w', encoding='utf-8').write(s)
print("patched RoleManager")

# 10) useUsage: ApiResponse from types
patch('src/features/v2/usage/hooks/useUsage.ts', [
    ("import { apiClient, ApiResponse } from '../../shared/services/apiClient';",
     "import { apiClient } from '../../shared/services/apiClient';\nimport { ApiResponse } from '../../shared/types';"),
])

# 11) AIChatPanel messages typing
s = open('src/features/v2/ai/components/AIChatPanel.tsx', encoding='utf-8').read()
s = s.replace(
    "if (response.success && response.data) {\n          setMessages(prev => [...prev, { role: 'assistant', content: response.data.choices[0]?.message?.content || '' }]);\n        }",
    "if (response.success && response.data) {\n          const reply = response.data.choices[0]?.message?.content;\n          setMessages(prev => [...prev, { role: 'assistant', content: typeof reply === 'string' ? reply : '' }]);\n        }"
)
open('src/features/v2/ai/components/AIChatPanel.tsx', 'w', encoding='utf-8').write(s)
print("patched AIChatPanel")
