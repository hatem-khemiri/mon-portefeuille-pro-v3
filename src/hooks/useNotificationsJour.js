import { useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { usePrevisionnel } from './usePrevisionnel';

export const useNotificationsJour = () => {
  const { transactions, chargesFixes } = useFinance();
  const { nombreSuggestions } = usePrevisionnel();

  const notifications = useMemo(() => {
    console.log('🔔 useNotificationsJour calcul...');
    console.log('  transactions:', transactions?.length);
    console.log('  chargesFixes:', chargesFixes?.length);
    console.log('  récurrences Bridge détectées:', nombreSuggestions);

    if (!transactions || !chargesFixes) return [];

    const aujourd_hui   = new Date();
    const jourActuel    = aujourd_hui.getDate();
    const moisActuel    = aujourd_hui.getMonth();
    const anneeActuelle = aujourd_hui.getFullYear();
    const dateAujourdhui = aujourd_hui.toISOString().split('T')[0];

    const notifs = [];

    // ─────────────────────────────────────────────
    // CAS 1 — Charges récurrentes non confirmées AUJOURD'HUI
    // → Paramétrage > Mes Transactions Récurrentes
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

    console.log('  Cas 1 - charges à confirmer aujourd\'hui:', chargesAConfirmerAujourdhui.length);

    if (chargesAConfirmerAujourdhui.length > 0) {
      notifs.push({
        id: 'recurrentes',
        type: 'warning',
        emoji: '📌',
        titre: `${chargesAConfirmerAujourdhui.length} transaction${chargesAConfirmerAujourdhui.length > 1 ? 's' : ''} récurrente${chargesAConfirmerAujourdhui.length > 1 ? 's' : ''} à confirmer aujourd'hui`,
        detail: chargesAConfirmerAujourdhui.map(c => c.nom).join(', '),
        cta: 'Gérer',
        lien: 'parametrage',
        section: 'recurrentes',
        dismissible: false
      });
    }

    // ─────────────────────────────────────────────
    // CAS 2 — Transactions synchronisées DU JOUR à vérifier
    // → Transactions (avec scroll + surbrillance sur le jour)
    // ─────────────────────────────────────────────
    const transactionsDuJour = transactions.filter(t => {
      if (!t.isSynced) return false;
      const dateT = new Date(t.date).toISOString().split('T')[0];
      return dateT === dateAujourdhui;
    });

    console.log('  Cas 2 - transactions syncées du jour:', transactionsDuJour.length);

    if (transactionsDuJour.length > 0) {
      notifs.push({
        id: 'categorisation',
        type: 'info',
        emoji: '🏦',
        titre: `${transactionsDuJour.length} transaction${transactionsDuJour.length > 1 ? 's' : ''} bancaire${transactionsDuJour.length > 1 ? 's' : ''} du jour à vérifier`,
        detail: 'Vérifiez que la catégorisation automatique est correcte — une erreur peut fausser vos statistiques et votre prévisionnel annuel',
        cta: 'Vérifier',
        lien: 'transactions',
        section: null,
        filtreDate: dateAujourdhui,
        dismissible: false
      });
    }

    // ─────────────────────────────────────────────
    // CAS 3 — Transactions prévues ce mois non réalisées (jour dépassé)
    // → Paramétrage > Mes Transactions Récurrentes
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

    console.log('  Cas 3 - charges en retard:', chargesEnRetard.length);

    if (chargesEnRetard.length > 0) {
      notifs.push({
        id: 'enretard',
        type: 'danger',
        emoji: '⚠️',
        titre: `${chargesEnRetard.length} transaction${chargesEnRetard.length > 1 ? 's' : ''} prévue${chargesEnRetard.length > 1 ? 's' : ''} ce mois non réalisée${chargesEnRetard.length > 1 ? 's' : ''}`,
        detail: chargesEnRetard.map(c => `${c.nom} (prévu le ${c.jourMois})`).join(', '),
        cta: 'Vérifier',
        lien: 'parametrage',
        section: 'recurrentes',
        dismissible: false
      });
    }

    // ─────────────────────────────────────────────
    // CAS 4 — Récurrences détectées par Bridge non encore traitées
    // → Paramétrage > Mes Transactions Récurrentes
    // ─────────────────────────────────────────────
    console.log('  Cas 4 - récurrences Bridge à traiter:', nombreSuggestions);

    if (nombreSuggestions > 0) {
      notifs.push({
        id: 'suggestions_bridge',
        type: 'warning',
        emoji: '🔄',
        titre: `${nombreSuggestions} récurrence${nombreSuggestions > 1 ? 's' : ''} détectée${nombreSuggestions > 1 ? 's' : ''} dans votre historique bancaire`,
        detail: 'Votre banque a identifié des transactions régulières. Validez-les pour améliorer votre prévisionnel.',
        cta: 'Traiter',
        lien: 'parametrage',
        section: 'recurrentes',
        dismissible: false
      });
    }

    console.log('  TOTAL notifs générées:', notifs.length);
    return notifs;

  // ✅ nombreSuggestions ajouté aux dépendances
  }, [transactions, chargesFixes, nombreSuggestions]);

  return { notifications };
};