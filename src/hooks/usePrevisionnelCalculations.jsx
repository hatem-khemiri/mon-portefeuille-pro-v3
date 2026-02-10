import { useEffect, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const usePrevisionnelCalculations = () => {
  const {
    transactions,
    chargesFixes,
    memosBudgetaires,
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

  // ✅ RECALCUL AUTOMATIQUE à chaque changement de transactions
  useEffect(() => {
    calculerPrevisionnelAutomatique();
  }, [transactions, chargesFixes, memosBudgetaires]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calcul automatique du budget prévisionnel ──
  const calculerPrevisionnelAutomatique = (acceptedRecurrences = []) => {
    const anneeActuelle = new Date().getFullYear();
    
    const nouveauBudget = {
      revenus:  Array(12).fill(0),
      epargnes: Array(12).fill(0),
      factures: Array(12).fill(0),
      depenses: Array(12).fill(0)
    };

    // ═══════════════════════════════════════════════════════
    // 1. COMPTER LES TRANSACTIONS RÉALISÉES + À VENIR
    // ═══════════════════════════════════════════════════════
    (transactions || []).forEach(t => {
      const dateT = new Date(t.date);
      
      // Seulement l'année en cours
      if (dateT.getFullYear() !== anneeActuelle) return;
      
      const moisIndex = dateT.getMonth();
      const montant = Math.abs(t.montant || 0);
      
      // Déterminer la catégorie
      const categorie = t.categorie || '';
      
      // REVENUS
      if (t.montant > 0) {
        if (categorie === 'Épargne' || categorie === 'Épargne de précaution' ||
            categorie === 'Projet' || categorie === 'Retraite' ||
            categorie === 'Investissement' || categorie === 'Autres épargnes') {
          nouveauBudget.epargnes[moisIndex] += montant;
        } else {
          nouveauBudget.revenus[moisIndex] += montant;
        }
      }
      
      // DÉPENSES
      if (t.montant < 0) {
        if (categorie === 'Épargne' || categorie === 'Épargne de précaution' ||
            categorie === 'Projet' || categorie === 'Retraite' ||
            categorie === 'Investissement' || categorie === 'Autres épargnes') {
          nouveauBudget.epargnes[moisIndex] += montant;
        } else {
          nouveauBudget.depenses[moisIndex] += montant;
        }
      }
    });

    // ═══════════════════════════════════════════════════════
    // 2. AJOUTER LES CHARGES FIXES (pour mois futurs non générés)
    // ═══════════════════════════════════════════════════════
    const moisActuel = new Date().getMonth();
    
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

      // Vérifier pour chaque mois si une transaction existe déjà
      for (let m = moisActuel; m < 12; m++) {
        // Vérifier si une transaction générée existe déjà
        const transactionExiste = (transactions || []).some(t => {
          const dateT = new Date(t.date);
          return dateT.getFullYear() === anneeActuelle &&
                 dateT.getMonth() === m &&
                 t.isFromChargeFixe &&
                 t.chargeFixeId === charge.id;
        });
        
        // Si pas de transaction générée, ajouter au prévisionnel
        if (!transactionExiste) {
          // Déterminer dans quelle ligne elle va
          if (charge.type === 'revenu' || charge.categorie === 'Salaire' || 
              charge.categorie === 'Prime' || charge.categorie === 'Freelance' || 
              charge.categorie === 'Investissements' || charge.categorie === 'Autres revenus') {
            // Appliquer fréquence
            if (charge.frequence === 'mensuelle') {
              nouveauBudget.revenus[m] += montantAbs;
            } else if (charge.frequence === 'trimestrielle' && m % 3 === 0) {
              nouveauBudget.revenus[m] += montantAbs;
            } else if (charge.frequence === 'annuelle' && m === 0) {
              nouveauBudget.revenus[m] += montantAbs;
            }
          } else if (charge.categorie === 'Épargne' || charge.categorie === 'Épargne de précaution' ||
                     charge.categorie === 'Projet' || charge.categorie === 'Retraite' ||
                     charge.categorie === 'Investissement' || charge.categorie === 'Autres épargnes') {
            // Appliquer fréquence
            if (charge.frequence === 'mensuelle') {
              nouveauBudget.epargnes[m] += montantAbs;
            } else if (charge.frequence === 'trimestrielle' && m % 3 === 0) {
              nouveauBudget.epargnes[m] += montantAbs;
            } else if (charge.frequence === 'annuelle' && m === 0) {
              nouveauBudget.epargnes[m] += montantAbs;
            }
          } else {
            // Dépenses
            if (charge.frequence === 'mensuelle') {
              nouveauBudget.depenses[m] += montantAbs;
            } else if (charge.frequence === 'trimestrielle' && m % 3 === 0) {
              nouveauBudget.depenses[m] += montantAbs;
            } else if (charge.frequence === 'annuelle' && m === 0) {
              nouveauBudget.depenses[m] += montantAbs;
            }
          }
        }
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