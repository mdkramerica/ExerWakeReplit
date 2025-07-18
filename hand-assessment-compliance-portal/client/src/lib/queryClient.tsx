import { QueryCache, QueryClient } from "@tanstack/react-query";

class ApiError extends Error {
  constructor(public response: Response, message?: string) {
    super(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: any,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new ApiError(res, `${method} ${url} failed: ${res.statusText}`);
  }

  return res;
}

type GetQueryFnOptions = {
  on401?: "returnNull" | "throw";
};

export function getQueryFn<T>(
  { on401 = "throw" }: GetQueryFnOptions = {},
): (context: { queryKey: any[] }) => Promise<T> {
  return async ({ queryKey }) => {
    const url = queryKey[0];
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 401 && on401 === "returnNull") {
        return null as T;
      }
      throw new ApiError(res, `GET ${url} failed: ${res.statusText}`);
    }
    const data = await res.json();
    return data as T;
  };
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.response.status === 401) {
        // Redirect to login on 401
        window.location.href = "/";
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn(),
      staleTime: 1000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.response.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});