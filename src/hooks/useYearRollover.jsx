import { useEffect, useRef } from 'react';
import { useFinance } from '../contexts/FinanceContext';

export const useYearRollover = () => {
  const { currentUser, comptes, setComptes, transactions, isRolloverInProgressRef } = useFinance();
  
  const processedAccountsRef = useRef(new Set());
  const lastTransactionsCountRef = useRef(0);

  useEffect(() => {
    if (!currentUser || !comptes || comptes.length === 0 || !transactions) return;

    const checkAndRollover = () => {
      const aujourdHui = new Date();
      const anneeActuelle = aujourdHui.getFullYear();

      const lastRolloverYear = localStorage.getItem(`last_rollover_${currentUser}`);
      const lastYear = lastRolloverYear ? parseInt(lastRolloverYear) : null;

      console.log('🔄 Vérification report annuel...');
      console.log('Année actuelle:', anneeActuelle);
      console.log('Dernier report global:', lastYear);
      console.log('Transactions totales:', transactions.length);

      let needsUpdate = false;
      let updatedComptes = [...comptes];

      // ✅ BLOQUER la sauvegarde pendant le traitement
      isRolloverInProgressRef.current = true;

      // CAS 1 : Changement d'année global
      if (lastYear && lastYear < anneeActuelle) {
        console.log(`📅 Changement d'année détecté : ${lastYear} → ${anneeActuelle}`);
        updatedComptes = performGlobalYearRollover(lastYear, updatedComptes);
        needsUpdate = true;
        
        localStorage.setItem(`last_rollover_${currentUser}`, anneeActuelle.toString());
        updatedComptes.forEach(c => processedAccountsRef.current.add(c.id));
        
      } else if (!lastYear) {
        console.log('📝 Premier chargement : enregistrement année', anneeActuelle);
        localStorage.setItem(`last_rollover_${currentUser}`, anneeActuelle.toString());
        comptes.forEach(c => processedAccountsRef.current.add(c.id));
      }

      // CAS 2 : Nouveaux comptes
      const newAccounts = updatedComptes.filter(c => !processedAccountsRef.current.has(c.id));
      
      if (newAccounts.length > 0) {
        console.log(`🆕 ${newAccounts.length} nouveau(x) compte(s) détecté(s) :`, newAccounts.map(c => c.nom));
        
        newAccounts.forEach(compte => {
          const compteTraite = performAccountRollover(compte, anneeActuelle);
          const index = updatedComptes.findIndex(c => c.id === compte.id);
          if (index !== -1) {
            updatedComptes[index] = compteTraite;
          }
          processedAccountsRef.current.add(compte.id);
        });
        
        needsUpdate = true;
      }

      // ✅ CAS 3 : Transactions ajoutées à des comptes existants avec historique
      const transactionsCountChanged = transactions.length !== lastTransactionsCountRef.current;
      
      if (transactionsCountChanged) {
        console.log(`📊 Changement nombre transactions détecté (${lastTransactionsCountRef.current} → ${transactions.length})`);
        
        // Vérifier si des comptes ont des transactions dans des années antérieures
        updatedComptes.forEach((compte, index) => {
          const needsRecalc = checkIfAccountNeedsRecalculation(compte, anneeActuelle);
          
          if (needsRecalc) {
            console.log(`🔄 Recalcul nécessaire pour "${compte.nom}"`);
            const compteTraite = performAccountRollover(compte, anneeActuelle);
            updatedComptes[index] = compteTraite;
            needsUpdate = true;
          }
        });
        
        lastTransactionsCountRef.current = transactions.length;
      }

      // ✅ Sauvegarder et DÉBLOQUER
      if (needsUpdate) {
        setComptes(updatedComptes);
        
        setTimeout(() => {
          isRolloverInProgressRef.current = false;
          console.log('✅ Rollover terminé, sauvegarde débloquée');
        }, 100);
      } else {
        isRolloverInProgressRef.current = false;
      }
    };

    const checkIfAccountNeedsRecalculation = (compte, anneeActuelle) => {
      const normaliserDate = (date) => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const transactionsCompte = (transactions || []).filter(t => 
        t.compte === compte.nom && t.statut === 'realisee'
      );

      if (transactionsCompte.length === 0) return false;

      // Vérifier s'il y a des transactions dans des années antérieures
      const hasHistoricalTransactions = transactionsCompte.some(t => {
        const anneeT = normaliserDate(t.date).getFullYear();
        return anneeT < anneeActuelle;
      });

      if (!hasHistoricalTransactions) return false;

      // Calculer ce que devrait être le solde initial
      const premiereAnnee = Math.min(...transactionsCompte.map(t => normaliserDate(t.date).getFullYear()));
      
      let soldeCalcule = compte.soldeInitial || 0;
      for (let annee = premiereAnnee; annee < anneeActuelle; annee++) {
        const transactionsAnnee = transactionsCompte.filter(t => {
          const dateT = normaliserDate(t.date);
          return dateT.getFullYear() === annee;
        });
        
        soldeCalcule += transactionsAnnee.reduce((sum, t) => sum + (t.montant || 0), 0);
      }

      // Si le solde calculé est différent du solde actuel, recalcul nécessaire
      const difference = Math.abs(soldeCalcule - (compte.soldeInitial || 0));
      return difference > 0.01; // Tolérance pour erreurs d'arrondi
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

    const performAccountRollover = (compte, anneeActuelle) => {
      console.log(`🔄 Traitement compte "${compte.nom}"...`);

      const normaliserDate = (date) => {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      let soldeInitialCalcule = compte.soldeInitial || 0;
      
      const transactionsCompte = (transactions || []).filter(t => t.compte === compte.nom && t.statut === 'realisee');
      
      if (transactionsCompte.length === 0) {
        console.log(`  Aucune transaction pour ${compte.nom}`);
        return compte;
      }

      const premiereAnnee = Math.min(...transactionsCompte.map(t => normaliserDate(t.date).getFullYear()));
      
      console.log(`  Première transaction: ${premiereAnnee}`);
      console.log(`  Année actuelle: ${anneeActuelle}`);

      // Réinitialiser au solde initial d'origine (au moment de la création du compte)
      const soldeOriginal = compte.soldeInitial || 0;
      soldeInitialCalcule = soldeOriginal;

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
        
        console.log(`  ${annee}: ${transactionsAnnee.length} transactions, mouvements: ${mouvementsAnnee}€, solde: ${soldeInitialCalcule}€`);
      }

      console.log(`  → Solde initial pour ${anneeActuelle}: ${soldeInitialCalcule}€`);

      return {
        ...compte,
        soldeInitial: soldeInitialCalcule,
        solde: soldeInitialCalcule
      };
    };

    checkAndRollover();
  }, [currentUser, comptes, transactions, setComptes, isRolloverInProgressRef]);
};