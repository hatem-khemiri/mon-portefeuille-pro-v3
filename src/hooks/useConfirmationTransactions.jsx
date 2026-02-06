import { useState, useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const useConfirmationTransactions = () => {
  const { transactions, setTransactions } = useFinance();
  const [transactionsAConfirmer, setTransactionsAConfirmer] = useState([]);

  useEffect(() => {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    const aConfirmer = (transactions || []).filter(t => {
      const dateT = new Date(t.date);
      dateT.setHours(0, 0, 0, 0);
      return t.statut === 'a_venir' && dateT.getTime() === aujourdhui.getTime() && 
             (t.isFromChargeFixe || t.isMemo);
    });

    setTransactionsAConfirmer(aConfirmer);
  }, [transactions]);

  const marquerRealisee = (transactionId) => {
    setTransactions(transactions.map(t =>
      t.id === transactionId ? { ...t, statut: 'realisee' } : t
    ));
    setTransactionsAConfirmer(prev => prev.filter(t => t.id !== transactionId));
  };

  const reporter = (transactionId) => {
    setTransactions(transactions.map(t => {
      if (t.id === transactionId) {
        const nouvelleDate = new Date(t.date);
        nouvelleDate.setDate(nouvelleDate.getDate() + 1);
        return { ...t, date: nouvelleDate.toISOString().split('T')[0] };
      }
      return t;
    }));
    setTransactionsAConfirmer(prev => prev.filter(t => t.id !== transactionId));
  };

  const annuler = (transactionId) => {
    setTransactions(transactions.filter(t => t.id !== transactionId));
    setTransactionsAConfirmer(prev => prev.filter(t => t.id !== transactionId));
  };

  return { transactionsAConfirmer, marquerRealisee, reporter, annuler };
};