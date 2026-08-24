import { api } from '../../api/client';

export interface CatorcenaInfo {
  anchorDate: string;
  periodNumber: number;
  periodStart: string;
  periodEnd: string;
}

export async function getCatorcenaInfo() {
  const res = await api.get<CatorcenaInfo>('/settings/catorcena');
  return res.data;
}

export async function updateCatorcenaAnchor(anchorDate: string) {
  const res = await api.put<CatorcenaInfo>('/settings/catorcena', { anchorDate });
  return res.data;
}
