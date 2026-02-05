/**
 * API Interceptor - Centralized request/response handling
 * 
 * Features:
 * - Automatic auth header injection
 * - Request/response logging (dev only)
 * - Error handling and transformation
 * - Rate limiting headers
 * - Retry logic for failed requests
 */

type RequestConfig = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
};

type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

class ApiInterceptor {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = "";
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Set auth token for subsequent requests
   */
  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders["Authorization"];
    }
  }

  /**
   * Get stored auth token from localStorage (client-side only)
   */
  private getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("apiToken");
  }

  /**
   * Request interceptor - runs before every request
   */
  private beforeRequest(url: string, config: RequestConfig): RequestInit {
    const token = this.getStoredToken();
    
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...config.headers,
    };

    // Auto-inject auth token if available and not already set
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const requestInit: RequestInit = {
      method: config.method || "GET",
      headers,
    };

    if (config.body && config.method !== "GET") {
      requestInit.body = JSON.stringify(config.body);
    }

    // Dev logging
    if (process.env.NODE_ENV === "development") {
      console.log(`[API] ${config.method || "GET"} ${url}`);
    }

    return requestInit;
  }

  /**
   * Response interceptor - runs after every response
   */
  private async afterResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const status = response.status;

    // Handle empty responses
    const text = await response.text();
    let data: T | null = null;
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Response is not JSON
        data = text as unknown as T;
      }
    }

    // Handle error responses
    if (!response.ok) {
      const errorMessage = 
        (data as { error?: string })?.error || 
        (data as { message?: string })?.message || 
        `Request failed with status ${status}`;

      // Handle specific error codes
      if (status === 401) {
        // Clear stored token on auth failure
        if (typeof window !== "undefined") {
          localStorage.removeItem("apiToken");
        }
      }

      return {
        data: null,
        error: errorMessage,
        status,
      };
    }

    return {
      data,
      error: null,
      status,
    };
  }

  /**
   * Main request method with retry logic
   */
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith("http") 
      ? endpoint 
      : `${this.baseUrl}${endpoint}`;

    const retries = config.retries ?? 0;
    const retryDelay = config.retryDelay ?? 1000;

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const requestInit = this.beforeRequest(url, config);
        const response = await fetch(url, requestInit);
        const result = await this.afterResponse<T>(response);

        // Don't retry on client errors (4xx)
        if (result.status >= 400 && result.status < 500) {
          return result;
        }

        // Retry on server errors (5xx)
        if (result.error && result.status >= 500 && attempt < retries) {
          lastError = result.error;
          await this.delay(retryDelay * (attempt + 1));
          continue;
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Network error";
        
        if (attempt < retries) {
          await this.delay(retryDelay * (attempt + 1));
          continue;
        }
      }
    }

    return {
      data: null,
      error: lastError || "Request failed",
      status: 0,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: Omit<RequestConfig, "method" | "body">) {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, "method" | "body">) {
    return this.request<T>(endpoint, { ...config, method: "POST", body });
  }

  async put<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, "method" | "body">) {
    return this.request<T>(endpoint, { ...config, method: "PUT", body });
  }

  async patch<T>(endpoint: string, body?: unknown, config?: Omit<RequestConfig, "method" | "body">) {
    return this.request<T>(endpoint, { ...config, method: "PATCH", body });
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, "method" | "body">) {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }
}

// Export singleton instance
export const api = new ApiInterceptor();

// Export class for custom instances
export { ApiInterceptor };
