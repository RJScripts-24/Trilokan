# API Configuration

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export const endpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },
  identity: {
    verify: '/identity/verify',
    status: '/identity/status',
    upload: '/identity/upload',
  },
  appChecker: {
    scan: '/appchecker/scan',
    results: '/appchecker/results/:id',
    history: '/appchecker/history',
  },
  complaints: {
    create: '/complaints',
    list: '/complaints',
    get: '/complaints/:id',
    update: '/complaints/:id',
    delete: '/complaints/:id',
  },
  wallet: {
    balance: '/wallet/balance',
    transactions: '/wallet/transactions',
    transfer: '/wallet/transfer',
    history: '/wallet/history',
  },
  support: {
    tickets: '/support/tickets',
    create: '/support/create',
    get: '/support/tickets/:id',
    update: '/support/tickets/:id',
  },
  news: {
    list: '/news',
    get: '/news/:id',
    categories: '/news/categories',
  },
};

// API Client helper
export class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload Error: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const apiClient = new ApiClient();
