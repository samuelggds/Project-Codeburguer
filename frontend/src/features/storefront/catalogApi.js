import axios from 'axios';
import { normalizeCatalog } from './catalogModel.js';
const baseURL = import.meta.env.VITE_API_URL || '/api';
// Public reads never send an admin token or change login state.
const publicApi = axios.create({ baseURL, timeout: 15000 });
export async function fetchCatalog(signal) {
  const { data } = await publicApi.get('/catalog', { signal, headers: { 'Cache-Control': 'no-cache' } });
  return normalizeCatalog(data, baseURL);
}
