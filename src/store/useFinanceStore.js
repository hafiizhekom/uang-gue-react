import { create } from 'zustand'

export const useFinanceStore = create((set) => ({
  balance: 25000000,
  transactions: [
    { id: 1, title: 'Gaji Pokok', amount: 10000000, type: 'income', date: '2026-02-19' },
    { id: 2, title: 'Bayar Listrik', amount: 500000, type: 'expense', date: '2026-02-18' },
  ],
  // Fungsi buat nambah transaksi
  addTransaction: (newTransaction) => set((state) => {
    const newBalance = newTransaction.type === 'income' 
      ? state.balance + newTransaction.amount 
      : state.balance - newTransaction.amount;

    return {
      balance: newBalance,
      transactions: [newTransaction, ...state.transactions]
    }
  }),
}))