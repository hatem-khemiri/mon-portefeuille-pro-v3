import { useMemo } from 'react';

export const useStatistiques = (transactions, comptes, vueTableauBord, compteSelectionne) => {
  return useMemo(() => {
    const aujourdHui = new Date();
    const moisActuel = aujourdHui.getMonth();
    const anneeActuelle = aujourdHui.getFullYear();
    
    let dateDebut, dateFin, dateFinPrevue;
    
    if (vueTableauBord === 'mensuel') {
      dateDebut = new Date(anneeActuelle, moisActuel, 1);
      dateFin = aujourdHui;
      dateFinPrevue = new Date(anneeActuelle, moisActuel + 1, 0, 23, 59, 59);
    } else {
      dateDebut = new Date(anneeActuelle, 0, 1);
      dateFin = aujourdHui;
      dateFinPrevue = new Date(anneeActuelle, 11, 31, 23, 59, 59);
    }
    
    // ✅ VÉRIFICATION : transactions et comptes existent
    if (!transactions || transactions.length === 0 || !comptes || comptes.length === 0) {
      return {
        soldeDebut: 0,
        revenusPeriode: 0,
        depensesPeriode: 0,
        epargnesPeriode: 0,
        soldeActuel: 0,
        revenusAVenir: 0,
        depensesAVenir: 0,
        epargnesAVenir: 0,
        soldePrevisionnel: 0,
        soldeAVenir: 0,
        dateDebut,
        dateFinPrevue,
        compteCourant: null
      };
    }
    
    // Utiliser le compte sélectionné ou le premier compte courant par défaut
    const compteActuel = compteSelectionne 
      ? comptes.find(c => c.nom === compteSelectionne)
      : comptes.find(c => c.nom === 'Compte Courant' || c.type === 'courant') || comptes[0];
    
    if (!compteActuel) {
      return {
        soldeDebut: 0,
        revenusPeriode: 0,
        depensesPeriode: 0,
        epargnesPeriode: 0,
        soldeActuel: 0,
        revenusAVenir: 0,
        depensesAVenir: 0,
        epargnesAVenir: 0,
        soldePrevisionnel: 0,
        soldeAVenir: 0,
        dateDebut,
        dateFinPrevue,
        compteCourant: null
      };
    }
    
    const soldeInitialCompte = compteActuel.soldeInitial !== undefined ? compteActuel.soldeInitial : 0;
    
    // ✅ HELPER : Normaliser date (évite bug timezone)
    const normaliserDate = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    
    const dateDebutNorm = normaliserDate(dateDebut);
    const dateFinNorm = normaliserDate(dateFin);
    const dateFinPrevueNorm = normaliserDate(dateFinPrevue);
    
    // ═══════════════════════════════════════════════════════
    // CALCUL SOLDE DÉBUT DE PÉRIODE
    // ═══════════════════════════════════════════════════════
    const toutesTransactionsRealisees = transactions.filter(t => 
      t.statut === 'realisee' && 
      t.compte === compteActuel.nom &&
      new Date(t.date).getFullYear() === anneeActuelle
    );
    
    const transactionsAvantPeriode = toutesTransactionsRealisees.filter(t => 
      normaliserDate(t.date) < dateDebutNorm
    );
    const mouvementsAvantPeriode = transactionsAvantPeriode.reduce((acc, t) => acc + (t.montant || 0), 0);
    const soldeDebut = soldeInitialCompte + mouvementsAvantPeriode;
    
    // ═══════════════════════════════════════════════════════
    // PÉRIODE RÉALISÉE (jusqu'à aujourd'hui)
    // ═══════════════════════════════════════════════════════
    const transactionsPeriode = toutesTransactionsRealisees.filter(t => {
      const dateT = normaliserDate(t.date);
      return dateT >= dateDebutNorm && dateT <= dateFinNorm;
    });
    
    const revenusPeriode = transactionsPeriode
      .filter(t => (t.montant || 0) > 0)
      .reduce((acc, t) => acc + (t.montant || 0), 0);
    
    const depensesPeriode = Math.abs(transactionsPeriode
      .filter(t => (t.montant || 0) < 0)
      .reduce((acc, t) => acc + (t.montant || 0), 0));
    
    const epargnesPeriode = Math.abs(transactionsPeriode.filter(t => {
      const compte = comptes.find(c => c.nom === t.compte);
      return (t.montant || 0) > 0 && compte && compte.type === 'epargne';
    }).reduce((acc, t) => acc + (t.montant || 0), 0));
    
    const totalMouvementsPeriode = transactionsPeriode.reduce((acc, t) => acc + (t.montant || 0), 0);
    const soldeActuel = soldeDebut + totalMouvementsPeriode;
    
    // ═══════════════════════════════════════════════════════
    // TRANSACTIONS À VENIR (après aujourd'hui, jusqu'à fin période prévue)
    // ═══════════════════════════════════════════════════════
    const transactionsAVenir = transactions.filter(t => {
      const dateT = normaliserDate(t.date);
      const estAVenir = (t.statut === 'a_venir' || t.statut === 'avenir');
      const dansLaPeriode = dateT > dateFinNorm && dateT <= dateFinPrevueNorm;
      
      return estAVenir && dansLaPeriode && t.compte === compteActuel.nom;
    });
    
    const revenusAVenir = transactionsAVenir
      .filter(t => (t.montant || 0) > 0)
      .reduce((acc, t) => acc + (t.montant || 0), 0);
    
    const depensesAVenir = Math.abs(transactionsAVenir
      .filter(t => (t.montant || 0) < 0)
      .reduce((acc, t) => acc + (t.montant || 0), 0));
    
    const epargnesAVenir = Math.abs(transactionsAVenir.filter(t => {
      const compte = comptes.find(c => c.nom === t.compte);
      return (t.montant || 0) > 0 && compte && compte.type === 'epargne';
    }).reduce((acc, t) => acc + (t.montant || 0), 0));
    
    const soldeAVenir = transactionsAVenir.reduce((acc, t) => acc + (t.montant || 0), 0);
    
    // ═══════════════════════════════════════════════════════
    // SOLDE PRÉVISIONNEL = Solde actuel + mouvements à venir
    // ═══════════════════════════════════════════════════════
    const soldePrevisionnel = soldeActuel + soldeAVenir;
    
    return {
      soldeDebut,
      revenusPeriode,
      depensesPeriode,
      epargnesPeriode,
      soldeActuel,
      revenusAVenir,
      depensesAVenir,
      epargnesAVenir,
      soldeAVenir,
      soldePrevisionnel,
      dateDebut,
      dateFinPrevue,
      compteCourant: compteActuel
    };
  }, [transactions, comptes, vueTableauBord, compteSelectionne]);
};