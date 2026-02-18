import { useEffect, useRef } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const useYearRollover = () => {
  const { currentUser, comptes, setComptes, transactions } = useFinance();
  
  // ✅ Garde trace des comptes déjà traités pour éviter de les retraiter
  const processedAccountsRef = useRef(new Set());

  useEffect(() => {
    if (!currentUser || !comptes || comptes.length === 0 || !transactions) return;

    const checkAndRollover = () => {
      const aujourdHui = new Date();
      const anneeActuelle = aujourdHui.getFullYear();

      // Récupérer la dernière année traitée
      const lastRolloverYear = localStorage.getItem(`last_rollover_${currentUser}`);
      const lastYear = lastRolloverYear ? parseInt(lastRolloverYear) : null;

      console.log('🔄 Vérification report annuel...');
      console.log('Année actuelle:', anneeActuelle);
      console.log('Dernier report global:', lastYear);

      let needsUpdate = false;
      let updatedComptes = [...comptes];

      // ✅ CAS 1 : Changement d'année global (tous les comptes)
      if (lastYear && lastYear < anneeActuelle) {
        console.log(`📅 Changement d'année détecté : ${lastYear} → ${anneeActuelle}`);
        updatedComptes = performGlobalYearRollover(lastYear, updatedComptes);
        needsUpdate = true;
        
        // Marquer l'année comme traitée
        localStorage.setItem(`last_rollover_${currentUser}`, anneeActuelle.toString());
        
        // Marquer tous les comptes comme traités
        updatedComptes.forEach(c => processedAccountsRef.current.add(c.id));
        
      } else if (!lastYear) {
        // ✅ Premier chargement : enregistrer l'année actuelle
        console.log('📝 Premier chargement : enregistrement année', anneeActuelle);
        localStorage.setItem(`last_rollover_${currentUser}`, anneeActuelle.toString());
        comptes.forEach(c => processedAccountsRef.current.add(c.id));
      }

      // ✅ CAS 2 : Nouveaux comptes créés en cours d'année
      const newAccounts = updatedComptes.filter(c => !processedAccountsRef.current.has(c.id));
      
      if (newAccounts.length > 0) {
        console.log(`🆕 ${newAccounts.length} nouveau(x) compte(s) détecté(s) :`, newAccounts.map(c => c.nom));
        
        newAccounts.forEach(compte => {
          const compteTraite = performAccountRollover(compte, anneeActuelle, updatedComptes);
          const index = updatedComptes.findIndex(c => c.id === compte.id);
          if (index !== -1) {
            updatedComptes[index] = compteTraite;
          }
          processedAccountsRef.current.add(compte.id);
        });
        
        needsUpdate = true;
      }

      // ✅ Sauvegarder si nécessaire
      if (needsUpdate) {
        setComptes(updatedComptes);
      }
    };

    const performGlobalYearRollover = (previousYear, comptesArray) => {
      console.log(`🔄 Report global du solde de ${previousYear} vers ${previousYear + 1}...`);

      const normaliserDate = (date) => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      return comptesArray.map(compte => {
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
    };

    const performAccountRollover = (compte, anneeActuelle, comptesArray) => {
      console.log(`🔄 Traitement nouveau compte "${compte.nom}"...`);

      const normaliserDate = (date) => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      // ✅ Calculer le solde pour TOUTES les années précédentes jusqu'à aujourd'hui
      let soldeInitialCalcule = compte.soldeInitial || 0;
      
      // Trouver la plus ancienne transaction de ce compte
      const transactionsCompte = (transactions || []).filter(t => t.compte === compte.nom && t.statut === 'realisee');
      
      if (transactionsCompte.length === 0) {
        console.log(`  Aucune transaction historique pour ${compte.nom}`);
        return compte;
      }

      const premiereAnnee = Math.min(...transactionsCompte.map(t => normaliserDate(t.date).getFullYear()));
      
      console.log(`  Première transaction: ${premiereAnnee}`);
      console.log(`  Année actuelle: ${anneeActuelle}`);

      // Calculer le solde année par année
      for (let annee = premiereAnnee; annee < anneeActuelle; annee++) {
        const transactionsAnnee = transactionsCompte.filter(t => {
          const dateT = normaliserDate(t.date);
          return dateT.getFullYear() === annee;
        });

        const mouvementsAnnee = transactionsAnnee.reduce(
          (sum, t) => sum + (t.montant || 0), 
          0
        );

        soldeInitialCalcule += mouvementsAnnee;
        
        console.log(`  ${annee}: ${transactionsAnnee.length} transactions, mouvements: ${mouvementsAnnee}€`);
      }

      console.log(`  → Solde initial calculé pour ${anneeActuelle}: ${soldeInitialCalcule}€`);

      return {
        ...compte,
        soldeInitial: soldeInitialCalcule,
        solde: soldeInitialCalcule
      };
    };

    checkAndRollover();
  }, [currentUser, comptes, transactions, setComptes]);
};