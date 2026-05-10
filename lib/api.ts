const DEFAULT_API_URL = 'http://localhost:3000'
const REQUEST_TIMEOUT_MS = 10000

export type AdminUser = {
  id: string
  username: string
  name: string | null
  role: string
}

export type LicensePlan = {
  id: string
  name: string
  slug: string
  description: string | null
  durationMonths: number | null
  isLifetime: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CompanyLicense = {
  id: string
  companyId: string
  planId: string
  status: string
  startsAt: string
  endsAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  plan?: LicensePlan
}

export type CompanyUser = {
  id: string
  username: string
  name: string | null
  phone: string | null
  role: string
  createdAt: string
}

export type CustomRole = {
  id: string
  name: string
  description: string | null
  active: boolean
}

export type CompanyMembership = {
  id: string
  userId: string
  companyId: string
  role: 'admin' | 'cashier' | 'waiter'
  systemRole: 'ADMIN' | 'CUSTOM'
  customRoleId: string | null
  createdAt: string
  updatedAt?: string
  user?: CompanyUser
  company?: {
    id: string
    name: string
    isTest: boolean
    platformAccessStatus: Company['platformAccessStatus']
  }
  customRole?: CustomRole | null
}

export type PlatformUser = CompanyUser & {
  photoBase64?: string | null
  memberships: CompanyMembership[]
  _count?: { memberships?: number }
}

export type Company = {
  id: string
  name: string
  isTest: boolean
  createdAt: string
  platformAccessStatus: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'
  platformBlockedAt: string | null
  platformBlockedReason: string | null
  memberships?: CompanyMembership[]
  accessRoles?: CustomRole[]
  platformLicenses?: CompanyLicense[]
  _count?: {
    orders?: number
    products?: number
    customers?: number
    memberships?: number
    eventDates?: number
  }
}

export type ApiResult<T> = T & {
  ok: boolean
}

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  if (apiUrl && apiUrl.trim()) {
    return apiUrl.trim().replace(/\/$/, '')
  }

  return DEFAULT_API_URL
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController()

  const timeout = window.setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeout),
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiUrl = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${apiUrl}${normalizedPath}`
  const timeout = createTimeoutSignal(REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      signal: timeout.signal,
      headers: {
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers || {}),
      },
    })

    const text = await response.text()
    let data: unknown = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text ? { raw: text } : null
    }

    if (!response.ok) {
      const errorMessage =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: unknown }).error)
          : response.statusText || `Erro ${response.status}`

      throw new Error(errorMessage)
    }

    return data as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`A API não respondeu em ${REQUEST_TIMEOUT_MS / 1000}s.`)
    }

    throw error instanceof Error
      ? error
      : new Error('Não foi possível conectar ao servidor.')
  } finally {
    timeout.clear()
  }
}

export const adminApi = {
  login(username: string, password: string) {
    return apiFetch<ApiResult<{ admin: AdminUser }>>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  me() {
    return apiFetch<ApiResult<{ admin: AdminUser }>>('/admin/auth/me')
  },

  logout() {
    return apiFetch<ApiResult<Record<string, never>>>('/admin/auth/logout', {
      method: 'POST',
    })
  },

  listLicensePlans() {
    return apiFetch<ApiResult<{ plans: LicensePlan[] }>>('/admin/license-plans')
  },

  createLicensePlan(input: {
    name: string
    slug: string
    description?: string | null
    durationMonths?: number | null
    isLifetime: boolean
    active?: boolean
  }) {
    return apiFetch<ApiResult<{ plan: LicensePlan }>>('/admin/license-plans', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateLicensePlan(
    id: string,
    input: Partial<{
      name: string
      slug: string
      description: string | null
      durationMonths: number | null
      isLifetime: boolean
      active: boolean
    }>
  ) {
    return apiFetch<ApiResult<{ plan: LicensePlan }>>(`/admin/license-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  listCompanies() {
    return apiFetch<ApiResult<{ companies: Company[] }>>('/admin/companies')
  },

  listUsers() {
    return apiFetch<ApiResult<{ users: PlatformUser[] }>>('/admin/users')
  },

  createCompany(input: {
    name: string
    isTest: boolean
    ownerUsername: string
    ownerPassword: string
    ownerName?: string | null
    ownerPhone?: string | null
    licensePlanId?: string | null
    licenseNotes?: string | null
  }) {
    return apiFetch<ApiResult<{ company: Company }>>('/admin/companies', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateCompany(
    companyId: string,
    input: Partial<{
      name: string
      isTest: boolean
      platformAccessStatus: Company['platformAccessStatus']
      platformBlockedReason: string | null
    }>
  ) {
    return apiFetch<ApiResult<{ company: Company }>>(`/admin/companies/${companyId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  updateCompanyAccess(
    companyId: string,
    input: {
      platformAccessStatus: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CANCELLED'
      platformBlockedReason?: string | null
    }
  ) {
    return apiFetch<ApiResult<{ company: Company }>>(
      `/admin/companies/${companyId}/access`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    )
  },

  upsertCompanyMembership(input: {
    companyId: string
    userId: string
    systemRole: 'ADMIN' | 'CUSTOM'
    customRoleId?: string | null
    role?: 'admin' | 'cashier' | 'waiter'
  }) {
    return apiFetch<ApiResult<{ membership: CompanyMembership }>>('/admin/company-memberships', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updateCompanyMembership(
    membershipId: string,
    input: Partial<{
      systemRole: 'ADMIN' | 'CUSTOM'
      customRoleId: string | null
      role: 'admin' | 'cashier' | 'waiter'
    }>
  ) {
    return apiFetch<ApiResult<{ membership: CompanyMembership }>>(`/admin/company-memberships/${membershipId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  deleteCompanyMembership(membershipId: string) {
    return apiFetch<ApiResult<Record<string, never>>>(`/admin/company-memberships/${membershipId}`, {
      method: 'DELETE',
    })
  },

  assignCompanyLicense(
    companyId: string,
    input: {
      planId: string
      notes?: string | null
    }
  ) {
    return apiFetch<ApiResult<{ license: CompanyLicense }>>(
      `/admin/companies/${companyId}/license`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    )
  },
}
