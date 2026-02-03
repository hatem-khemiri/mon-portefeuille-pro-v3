import { useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';

// ─────────────────────────────────────────────
// Normalise une description pour le groupement :
//   - lowercase, trim, supprime les accents,
//     les caractères spéciaux et les nombres isolés
// ─────────────────────────────────────────────
function normaliserDescription(desc) {
  if (!desc) return '';
  return desc
    .toLowerCase()
    .trim()
    .normalize('NFD')                       // décompose les accents
    .replace(/[\u0300-\u036f]/g, '')        // supprime les diacritiques
    .replace(/[^a-z0-9\s]/g, ' ')          // garde lettres, chiffres, espaces
    .replace(/\b\d+\b/g, '')              // supprime les nombres isolés (ex: "facture 2024")
    .replace(/\s+/g, ' ')                  // espaces multiples → un seul
    .trim();
}

// ─────────────────────────────────────────────
// Calcule la similarité entre deux chaînes
// avec un algorithme simple basé sur les mots communs
// Retourne un score entre 0 et 1
// ─────────────────────────────────────────────
function similariteTexte(a, b) {
  const mots1 = new Set(normaliserDescription(a).split(' ').filter(m => m.length > 1));
  const mots2 = new Set(normaliserDescription(b).split(' ').filter(m => m.length > 1));

  if (mots1.size === 0 || mots2.size === 0) return 0;

  let communs = 0;
  mots1.forEach(m => { if (mots2.has(m)) communs++; });

  // Coefficient de Jaccard
  const union = new Set([...mots1, ...mots2]).size;
  return communs / union;
}

// ─────────────────────────────────────────────
// Vérifie si deux montants sont "proches"
// Tolérance par défaut ±5 %
// ─────────────────────────────────────────────
function montantsProches(m1, m2, tolerancePct = 0.05) {
  const abs1 = Math.abs(m1);
  const abs2 = Math.abs(m2);
  if (abs1 === 0 && abs2 === 0) return true;
  const max = Math.max(abs1, abs2);
  return Math.abs(abs1 - abs2) / max <= tolerancePct;
}

// ─────────────────────────────────────────────────────────
// HOOK PRINCIPAL : usePrevisionnel
// ─────────────────────────────────────────────────────────
export const usePrevisionnel = () => {
  const {
    transactions,
    chargesFixes,
    comptes
  } = useFinance();

  // ── 1. Détection des récurrences depuis les transactions syncées ──
  const recurrencesDetectees = useMemo(() => {
    // On ne considère que les transactions réalisées (pas les "a_venir" générées par charges fixes)
    const syncees = transactions.filter(
      t => t.isSynced && t.statut === 'realisee' && !t.isFromChargeFixe
    );

    if (syncees.length === 0) return [];

    // Grouper par description normalisée
    const groupes = {};
    syncees.forEach(t => {
      const cle = normaliserDescription(t.description);
      if (!cle) return; // ignorer descriptions vides après normalisation
      if (!groupes[cle]) groupes[cle] = [];
      groupes[cle].push(t);
    });

    const recurrences = [];

    Object.entries(groupes).forEach(([cle, txns]) => {
      // Collecter les mois distincts (année-mois) où la transaction apparaît
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

      // Déterminer la catégorie la plus utilisée dans le groupe
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

      // Description la plus lisible : celle de la transaction la plus récente
      const txnRecente = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      // Déterminer la fréquence estimée
      const frequence = estimerFrequence(moisDistincts);

      recurrences.push({
        id: `recurrence-${cle}-${Date.now()}`,
        nom: txnRecente.description,
        montant: montantMoyen,
        categorie: categoriePrincipale,
        compte: comptePrincipal,
        frequence,
        nombreOccurrences: moisDistincts.size,
        derniereMention: txnRecente.date,
        _cle: cle // pour le dedup interne
      });
    });

    return recurrences;
  }, [transactions]);

  // ── 2. Filtrer les récurrences qui font doublon avec une charge fixe ──
  const recurrencesNouvellesUniques = useMemo(() => {
    if (recurrencesDetectees.length === 0) return [];

    return recurrencesDetectees.filter(rec => {
      // Chercher un match parmi les charges fixes existantes
      const matchTrouve = chargesFixes.some(cf => {
        const sim = similariteTexte(rec.nom, cf.nom);
        const proches = montantsProches(rec.montant, cf.montant);
        const memeCompte = rec.compte === cf.compte;

        // Match si : similarité texte >= 0.5 ET montant proche ET même compte
        return sim >= 0.5 && proches && memeCompte;
      });

      return !matchTrouve; // on garde uniquement celles sans match
    });
  }, [recurrencesDetectees, chargesFixes]);

  return {
    recurrencesDetectees,
    recurrencesNouvellesUniques,
    nombreSuggestions: recurrencesNouvellesUniques.length
  };
};

// ─────────────────────────────────────────────
// Estimer la fréquence à partir des mois distincts
// ─────────────────────────────────────────────
function estimerFrequence(moisDistincts) {
  const count = moisDistincts.size;
  if (count >= 6) return 'mensuelle';
  if (count >= 2 && count <= 4) return 'trimestrielle';
  return 'mensuelle';
}