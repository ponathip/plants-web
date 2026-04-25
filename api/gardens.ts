// src/api/gardens.ts
import { apiFetch } from './client'

/* ---------- LIST ---------- */
export const listGardens = () =>
  apiFetch('/gardens', 'get')

/* ---------- GET BY ID ---------- */
export const getGarden = (id: string) =>
  apiFetch('/gardens/{id}', 'get', {
    params: { id }
  })

/* ---------- CREATE ---------- */
export const createGarden = (name: string) =>
  apiFetch('/gardens', 'post', {
    body: { name }
  })

/* ---------- DELETE ---------- */
export const deleteGarden = (id: string) =>
  apiFetch('/gardens/{id}', 'delete', {
    params: { id }
  })
