import { useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const usePrevisionnelCalculations = () => {
  const {
    chargesFixes,
    budgetPrevisionnel,
    setBudgetPrevisionnel,
    dateCreationCompte,
    categoriesDepenses,
    categoriesEpargnes
  } = useFinance();

  // ── Mois de début d'affichage basé sur dateCreationCompte ──
  const moisDebutAffichage = useMemo(() => {
    if (!dateCreationCompte) return 0;
    const dateCreation = new Date(dateCreationCompte);
    const anneeActuelle = new Date().getFullYear();
    if (dateCreation.getFullYear() === anneeActuelle) {
      return dateCreation.getMonth();
    }
    return 0;
  }, [dateCreationCompte]);

  // ── Calcul automatique du budget prévisionnel ──
  // acceptedRecurrences : tableau de récurrences détectées que l'utilisateur a acceptées
  //   chaque élément ressemble à : { nom, montant, categorie, compte, frequence }
  const calculerPrevisionnelAutomatique = (acceptedRecurrences = []) => {
    const nouveauBudget = {
      revenus:  Array(12).fill(0),
      epargnes: Array(12).fill(0),
      factures: Array(12).fill(0),  // ← TOUJOURS 0 désormais (conservé pour compat)
      depenses: Array(12).fill(0)   // ← factures + dépenses fusionnées ici
    };

    // Combiner charges fixes officielles + récurrences acceptées
    const toutes = [
      ...chargesFixes,
      ...acceptedRecurrences.map(r => ({
        nom: r.nom,
        montant: r.montant,
        categorie: r.categorie,
        compte: r.compte,
        frequence: r.frequence || 'mensuelle',
        type: 'normale',
        _source: 'recurrence'
      }))
    ];

    toutes.forEach(charge => {
      const montantAbs = Math.abs(charge.montant);

      // ── Déterminer dans quelle ligne elle va ──
      if (charge.type === 'revenu' || charge.categorie === 'Salaire' || charge.categorie === 'Prime' ||
          charge.categorie === 'Freelance' || charge.categorie === 'Investissements' ||
          charge.categorie === 'Autres revenus') {
        // → revenus
        appliquerFrequence(nouveauBudget.revenus, montantAbs, charge.frequence, moisDebutAffichage);

      } else if (charge.categorie === 'Épargne' || charge.categorie === 'Épargne de précaution' ||
                 charge.categorie === 'Projet' || charge.categorie === 'Retraite' ||
                 charge.categorie === 'Investissement' || charge.categorie === 'Autres épargnes') {
        // → epargnes
        appliquerFrequence(nouveauBudget.epargnes, montantAbs, charge.frequence, moisDebutAffichage);

      } else {
        // → TOUT le reste va dans depenses (factures + anciennes dépenses fusionnées)
        appliquerFrequence(nouveauBudget.depenses, montantAbs, charge.frequence, moisDebutAffichage);
      }
    });

    setBudgetPrevisionnel(nouveauBudget);
    return nouveauBudget;
  };

  // ── Données formatées pour les graphiques (12 mois) ──
  const previsionnelData = useMemo(() => {
    if (!budgetPrevisionnel) return [];

    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    return mois.map((nom, i) => ({
      mois: nom,
      revenus:  budgetPrevisionnel.revenus[i] || 0,
      // factures + depenses fusionnées en une seule valeur "depenses"
      depenses: (budgetPrevisionnel.factures[i] || 0) + (budgetPrevisionnel.depenses[i] || 0),
      epargnes: budgetPrevisionnel.epargnes[i] || 0
    }));
  }, [budgetPrevisionnel]);

  return {
    calculerPrevisionnelAutomatique,
    previsionnelData,
    moisDebutAffichage
  };
};

// ─────────────────────────────────────────────────────────
// Helper : applique un montant selon la fréquence sur les mois concernés
// ─────────────────────────────────────────────────────────
function appliquerFrequence(arrayMois, montant, frequence, moisDebut = 0) {
  for (let m = moisDebut; m < 12; m++) {
    if (frequence === 'mensuelle') {
      arrayMois[m] += montant;
    } else if (frequence === 'trimestrielle') {
      // janvier (0), avril (3), juillet (6), octobre (9)
      if (m % 3 === 0) arrayMois[m] += montant;
    } else if (frequence === 'annuelle') {
      // janvier uniquement
      if (m === 0) arrayMois[m] += montant;
    }
  }
}