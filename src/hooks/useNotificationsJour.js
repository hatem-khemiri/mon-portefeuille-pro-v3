import { useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const useNotificationsJour = () => {
  const { transactions, chargesFixes } = useFinance();

  const notifications = useMemo(() => {
    const aujourd_hui   = new Date();
    const jourActuel    = aujourd_hui.getDate();
    const moisActuel    = aujourd_hui.getMonth();
    const anneeActuelle = aujourd_hui.getFullYear();

    const notifs = [];

    // ─────────────────────────────────────────────
    // CAS 1 — Charges récurrentes non confirmées aujourd'hui
    // → redirige vers Paramétrage > Mes Transactions Récurrentes
    // ─────────────────────────────────────────────
    const chargesAConfirmerAujourdhui = chargesFixes.filter(charge => {
      if (charge.type === 'transfert') return false;
      if (parseInt(charge.jourMois) !== jourActuel) return false;

      const dejaConfirmee = transactions.some(t =>
        t.isFromChargeFixe &&
        t.chargeFixeId === charge.id &&
        t.confirme === true &&
        new Date(t.date).getMonth()    === moisActuel &&
        new Date(t.date).getFullYear() === anneeActuelle
      );

      return !dejaConfirmee;
    });

    if (chargesAConfirmerAujourdhui.length > 0) {
      notifs.push({
        id: 'recurrentes',
        type: 'warning',
        emoji: '📌',
        titre: `${chargesAConfirmerAujourdhui.length} transaction${chargesAConfirmerAujourdhui.length > 1 ? 's' : ''} récurrente${chargesAConfirmerAujourdhui.length > 1 ? 's' : ''} à confirmer aujourd'hui`,
        detail: chargesAConfirmerAujourdhui.map(c => c.nom).join(', '),
        cta: 'Gérer',
        // ✅ CORRIGÉ : redirige vers Paramétrage > Mes Transactions Récurrentes
        lien: 'parametrage',
        section: 'recurrentes'
      });
    }

    // ─────────────────────────────────────────────
    // CAS 2 — Transactions synchronisées mal/non catégorisées
    // → redirige vers Transactions
    // ─────────────────────────────────────────────
    const il_y_a_7_jours = new Date();
    il_y_a_7_jours.setDate(il_y_a_7_jours.getDate() - 7);

    const categoriesInconnues = ['', null, undefined, 'Autre', 'Non catégorisé', 'Inconnu'];

    const transactionsACategoriser = transactions.filter(t => {
      if (!t.isSynced) return false;
      if (!categoriesInconnues.includes(t.categorie)) return false;
      const dateT = new Date(t.date);
      return dateT >= il_y_a_7_jours && dateT <= aujourd_hui;
    });

    if (transactionsACategoriser.length > 0) {
      notifs.push({
        id: 'categorisation',
        type: 'info',
        emoji: '🏦',
        titre: `${transactionsACategoriser.length} transaction${transactionsACategoriser.length > 1 ? 's' : ''} bancaire${transactionsACategoriser.length > 1 ? 's' : ''} à catégoriser`,
        detail: 'Une mauvaise catégorisation peut fausser vos statistiques et votre prévisionnel',
        cta: 'Catégoriser',
        lien: 'transactions',
        section: null
      });
    }

    // ─────────────────────────────────────────────
    // CAS 3 — Transactions prévues ce mois non réalisées (jour dépassé)
    // → redirige vers Paramétrage > Mes Transactions Récurrentes
    // ─────────────────────────────────────────────
    const chargesEnRetard = chargesFixes.filter(charge => {
      if (charge.type === 'transfert') return false;
      const jourCharge = parseInt(charge.jourMois);
      if (jourCharge >= jourActuel) return false;

      const transactionExiste = transactions.some(t =>
        t.isFromChargeFixe &&
        t.chargeFixeId === charge.id &&
        new Date(t.date).getMonth()    === moisActuel &&
        new Date(t.date).getFullYear() === anneeActuelle
      );

      return !transactionExiste;
    });

    if (chargesEnRetard.length > 0) {
      notifs.push({
        id: 'enretard',
        type: 'danger',
        emoji: '⚠️',
        titre: `${chargesEnRetard.length} transaction${chargesEnRetard.length > 1 ? 's' : ''} prévue${chargesEnRetard.length > 1 ? 's' : ''} ce mois non réalisée${chargesEnRetard.length > 1 ? 's' : ''}`,
        detail: chargesEnRetard.map(c => `${c.nom} (prévu le ${c.jourMois})`).join(', '),
        cta: 'Vérifier',
        // ✅ CORRIGÉ : redirige vers Paramétrage > Mes Transactions Récurrentes
        lien: 'parametrage',
        section: 'recurrentes'
      });
    }

    return notifs;
  }, [transactions, chargesFixes]);

  return { notifications };
};