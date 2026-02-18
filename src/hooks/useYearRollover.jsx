import { useEffect } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const useYearRollover = () => {
  const { currentUser, comptes, setComptes, transactions } = useFinance();

  useEffect(() => {
    if (!currentUser || !comptes || comptes.length === 0) return;

    const checkAndRollover = () => {
      const aujourdHui = new Date();
      const anneeActuelle = aujourdHui.getFullYear();

      // Récupérer la dernière année traitée
      const lastRolloverYear = localStorage.getItem(`last_rollover_${currentUser}`);
      const lastYear = lastRolloverYear ? parseInt(lastRolloverYear) : null;

      console.log('🔄 Vérification report annuel...');
      console.log('Année actuelle:', anneeActuelle);
      console.log('Dernier report:', lastYear);

      // Si on est dans une nouvelle année et qu'on n'a pas encore fait le report
      if (lastYear && lastYear < anneeActuelle) {
        console.log(`📅 Changement d'année détecté : ${lastYear} → ${anneeActuelle}`);
        performYearRollover(lastYear);
      } else if (!lastYear) {
        // Premier chargement : enregistrer l'année actuelle sans report
        console.log('📝 Premier chargement : enregistrement année', anneeActuelle);
        localStorage.setItem(`last_rollover_${currentUser}`, anneeActuelle.toString());
      }
    };

    const performYearRollover = (previousYear) => {
      console.log(`🔄 Report du solde de ${previousYear} vers ${previousYear + 1}...`);

      const normaliserDate = (date) => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const updatedComptes = comptes.map(compte => {
        // Calculer le solde final de l'année précédente
        const transactionsCompte = (transactions || []).filter(t => {
          const dateT = normaliserDate(t.date);
          return dateT.getFullYear() === previousYear && 
                 t.compte === compte.nom &&
                 t.statut === 'realisee';
        });

        const mouvementsAnneePrecedente = transactionsCompte.reduce(
          (sum, t) => sum + (t.montant || 0), 
          0
        );

        const soldeFinalAnneePrecedente = (compte.soldeInitial || 0) + mouvementsAnneePrecedente;

        console.log(`💰 ${compte.nom}:`);
        console.log(`  Solde initial ${previousYear}:`, compte.soldeInitial);
        console.log(`  Mouvements ${previousYear}:`, mouvementsAnneePrecedente);
        console.log(`  Solde final ${previousYear}:`, soldeFinalAnneePrecedente);
        console.log(`  → Nouveau solde initial ${previousYear + 1}:`, soldeFinalAnneePrecedente);

        return {
          ...compte,
          soldeInitial: soldeFinalAnneePrecedente,
          solde: soldeFinalAnneePrecedente
        };
      });

      // Sauvegarder les comptes mis à jour
      setComptes(updatedComptes);

      // Marquer l'année comme traitée
      const nouvelleAnnee = previousYear + 1;
      localStorage.setItem(`last_rollover_${currentUser}`, nouvelleAnnee.toString());

      console.log(`✅ Report terminé ! Soldes initiaux mis à jour pour ${nouvelleAnnee}`);
      // ✅ PAS de notification alert() - Report silencieux
    };

    checkAndRollover();
  }, [currentUser, comptes, transactions, setComptes]);
};