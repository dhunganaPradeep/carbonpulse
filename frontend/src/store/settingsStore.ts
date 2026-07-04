import { create } from 'zustand'

export type Currency = 'USD' | 'EUR' | 'GBP' | 'NPR'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  NPR: 'रु',
}

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NPR: 133.5,
}

interface SettingsState {
  currency: Currency
  setCurrency: (c: Currency) => void
  currencySymbol: string
  exchangeRate: number
}

export const useSettingsStore = create<SettingsState>((set) => {
  const saved = (localStorage.getItem('currency') as Currency) || 'NPR'
  
  return {
    currency: saved,
    currencySymbol: CURRENCY_SYMBOLS[saved] || 'रु',
    exchangeRate: EXCHANGE_RATES[saved] || 133.5,
    setCurrency: (c: Currency) => {
      localStorage.setItem('currency', c)
      set({ currency: c, currencySymbol: CURRENCY_SYMBOLS[c], exchangeRate: EXCHANGE_RATES[c] })
    },
  }
})
