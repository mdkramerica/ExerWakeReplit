import { QueryClient } from "@tanstack/react-query";

const makeRequest = async (url: string, options: RequestInit = {}) => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  
  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };
  
  const response = await fetch(`${baseUrl}${url}`, config);
  
  // Handle 401 responses by clearing auth and redirecting
  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    if (window.location.pathname.startsWith('/clinical')) {
      window.location.href = '/clinical/login';
    }
  }
  
  return response;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const response = await makeRequest(queryKey[0] as string);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401, 403, or 404 errors
        if (error.message.includes('401') || error.message.includes('403') || error.message.includes('404')) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Export a compatible apiRequest function for landing page
export async function apiRequest(method: string, endpoint: string, data?: any) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  console.log('Making API request:', { method, url: `${baseUrl}${endpoint}`, data });

  const response = await fetch(`${baseUrl}${endpoint}`, config);
  
  console.log('API response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API error response:', errorText);
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
  }
  
  return response;
}

export { makeRequest };
