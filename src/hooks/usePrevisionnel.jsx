import { useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';

// ── Normalise une description pour le groupement ──
function normaliserDescription(desc) {
  if (!desc) return '';
  return desc
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Calcule la similarité entre deux chaînes ──
function similariteTexte(a, b) {
  const mots1 = new Set(normaliserDescription(a).split(' ').filter(m => m.length > 1));
  const mots2 = new Set(normaliserDescription(b).split(' ').filter(m => m.length > 1));

  if (mots1.size === 0 || mots2.size === 0) return 0;

  let communs = 0;
  mots1.forEach(m => { if (mots2.has(m)) communs++; });

  const union = new Set([...mots1, ...mots2]).size;
  return communs / union;
}

// ── Vérifie si deux montants sont "proches" ──
function montantsProches(m1, m2, tolerancePct = 0.05) {
  const abs1 = Math.abs(m1);
  const abs2 = Math.abs(m2);
  if (abs1 === 0 && abs2 === 0) return true;
  const max = Math.max(abs1, abs2);
  return Math.abs(abs1 - abs2) / max <= tolerancePct;
}

// 🆕 DÉTECTION AUTOMATIQUE DE FRÉQUENCE
function detectFrequency(dates) {
  if (dates.length < 2) return 'Unique';
  
  // Trier les dates
  const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);
  
  // Calculer les écarts en jours entre chaque transaction
  const gaps = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const diffTime = sortedDates[i] - sortedDates[i - 1];
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    gaps.push(diffDays);
  }
  
  // Calculer l'écart moyen
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  
  // Déterminer la fréquence selon l'écart moyen
  if (avgGap >= 1 && avgGap <= 1) return 'Quotidienne';
  if (avgGap >= 6 && avgGap <= 8) return 'Hebdomadaire';
  if (avgGap >= 13 && avgGap <= 16) return 'Bimensuelle';
  if (avgGap >= 28 && avgGap <= 32) return 'Mensuelle';
  if (avgGap >= 85 && avgGap <= 95) return 'Trimestrielle';
  if (avgGap >= 175 && avgGap <= 185) return 'Semestrielle';
  if (avgGap >= 360 && avgGap <= 370) return 'Annuelle';
  
  // Par défaut, si écart atypique
  return `Tous les ${Math.round(avgGap)} jours`;
}

export const usePrevisionnel = () => {
  const { transactions, chargesFixes } = useFinance();

  // ── 1. Détection des récurrences depuis les transactions syncées ──
  const recurrencesDetectees = useMemo(() => {
    const syncees = transactions.filter(
      t => t.isSynced && t.statut === 'realisee' && !t.isFromChargeFixe && !t.isProjection
    );

    if (syncees.length === 0) return [];

    // Grouper par description normalisée
    const groupes = {};
    syncees.forEach(t => {
      const cle = normaliserDescription(t.description);
      if (!cle) return;
      if (!groupes[cle]) groupes[cle] = [];
      groupes[cle].push(t);
    });

    const recurrences = [];

    Object.entries(groupes).forEach(([cle, txns]) => {
      // Collecter les mois distincts
      const moisDistincts = new Set(
        txns.map(t => {
          const d = new Date(t.date);
          return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        })
      );

      // Critère : >= 2 mois différents
      if (moisDistincts.size < 2) return;

      // Montant moyen (valeur absolue)
      const montantMoyen =
        txns.reduce((sum, t) => sum + Math.abs(t.montant), 0) / txns.length;

      // Catégorie la plus utilisée
      const categoriesCount = {};
      txns.forEach(t => {
        if (t.categorie) {
          categoriesCount[t.categorie] = (categoriesCount[t.categorie] || 0) + 1;
        }
      });
      const categoriePhase = Object.entries(categoriesCount).sort((a, b) => b[1] - a[1])[0];
      const categoriePrincipale = categoriePhase ? categoriePhase[0] : 'Autres dépenses';

      // Compte le plus utilisé
      const comptesCount = {};
      txns.forEach(t => {
        if (t.compte) comptesCount[t.compte] = (comptesCount[t.compte] || 0) + 1;
      });
      const comptePhase = Object.entries(comptesCount).sort((a, b) => b[1] - a[1])[0];
      const comptePrincipal = comptePhase ? comptePhase[0] : null;

      // Description la plus récente
      const txnRecente = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      // 🆕 Détecter automatiquement la fréquence
      const dates = txns.map(t => t.date);
      const frequence = detectFrequency(dates);

      recurrences.push({
        id: `recurrence-${cle}-${Date.now()}`,
        nom: txnRecente.description,
        montant: montantMoyen,
        categorie: categoriePrincipale,
        compte: comptePrincipal,
        frequence: frequence, // ✅ Fréquence auto-détectée
        nombreOccurrences: moisDistincts.size,
        derniereMention: txnRecente.date,
        dates: dates,
        _cle: cle
      });
    });

    return recurrences;
  }, [transactions]);

  // ── 2. Filtrer les récurrences qui font doublon avec une charge fixe ──
  const recurrencesNouvellesUniques = useMemo(() => {
    if (recurrencesDetectees.length === 0) return [];

    return recurrencesDetectees.filter(rec => {
      const matchTrouve = chargesFixes.some(cf => {
        const sim = similariteTexte(rec.nom, cf.nom);
        const proches = montantsProches(rec.montant, cf.montant);
        const memeCompte = rec.compte === cf.compte;

        return sim >= 0.5 && proches && memeCompte;
      });

      return !matchTrouve;
    });
  }, [recurrencesDetectees, chargesFixes]);

  return {
    recurrencesDetectees,
    recurrencesNouvellesUniques,
    nombreSuggestions: recurrencesNouvellesUniques.length
  };
};