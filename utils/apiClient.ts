import { APIRequestContext, APIResponse } from '@playwright/test';

export const get = (
  request: APIRequestContext,
  endpoint: string,
  headers?: Record<string, string>
): Promise<APIResponse> => request.get(endpoint, { headers });

export const post = (
  request: APIRequestContext,
  endpoint: string,
  data?: object,
  headers?: Record<string, string>
): Promise<APIResponse> => request.post(endpoint, { data, headers });

export const put = (
  request: APIRequestContext,
  endpoint: string,
  data?: object,
  headers?: Record<string, string>
): Promise<APIResponse> => request.put(endpoint, { data, headers });

export const patch = (
  request: APIRequestContext,
  endpoint: string,
  data?: object,
  headers?: Record<string, string>
): Promise<APIResponse> => request.patch(endpoint, { data, headers });

export const del = (
  request: APIRequestContext,
  endpoint: string,
  headers?: Record<string, string>
): Promise<APIResponse> => request.delete(endpoint, { headers });
