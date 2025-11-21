import axios, { AxiosInstance } from 'axios';

const baseURL = 'https://example.com/api'; // Placeholder base URL

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000
});

export async function getExample(): Promise<any> {
  const response = await apiClient.get('/example');
  return response.data;
}
