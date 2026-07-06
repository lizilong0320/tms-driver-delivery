import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function generateWaybillNo(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ZT${dateStr}${rand}`
}

export function generateBatchNo(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `BC${dateStr}${rand}`
}

export const TEMPERATURE_MAP: Record<string, { label: string; color: string; bgColor: string }> = {
  '常温': { label: '常温', color: '#8C8C8C', bgColor: '#FAFAFA' },
  '冷藏': { label: '冷藏', color: '#1677FF', bgColor: '#E6F4FF' },
  '冷冻': { label: '冷冻', color: '#003EB3', bgColor: '#D6E4FF' },
}

export const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '待分派', color: '#8C8C8C' },
  1: { label: '待配送', color: '#1677FF' },
  2: { label: '配送中', color: '#FA8C16' },
  3: { label: '已签收', color: '#52C41A' },
  4: { label: '异常', color: '#F5222D' },
}

export const BATCH_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '待配送', color: '#1677FF' },
  1: { label: '配送中', color: '#FA8C16' },
  2: { label: '已完成', color: '#52C41A' },
}
