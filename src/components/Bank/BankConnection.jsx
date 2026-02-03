import { useState, useEffect } from 'react';
import { RefreshCw, Unlink, AlertCircle } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { AccountMappingModal } from './AccountMappingModal';

export const BankConnection = () => {
  const { currentUser, transactions, setTransactions, comptes, setComptes } = useFinance();
  
  const [bankConnection, setBankConnection] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingSyncData, setPendingSyncData] = useState(null);

  useEffect(() => {
    const savedConnection = localStorage.getItem(`bank_connection_${currentUser}`);
    if (savedConnection) {
      setBankConnection(JSON.parse(savedConnection));
    }
  }, [currentUser]);

  const handleConnect = async () => {
    try {
      setSyncError(null);
      
      const response = await fetch('/api/bridge/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser })
      });

      if (!response.ok) throw new Error('Erreur connexion');

      const { connectUrl } = await response.json();
      const popup = window.open(connectUrl, 'Bridge', 'width=500,height=700');
      
      const checkPopup = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkPopup);
          
          try {
            const itemsResponse = await fetch('/api/bridge/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser })
            });

            if (itemsResponse.ok) {
              const { items } = await itemsResponse.json();
              
              if (items && items.length > 0) {
                const latestItem = items[0];
                const connection = {
                  itemId: latestItem.id,
                  userId: currentUser,
                  bankName: latestItem.bank_name,
                  connectedAt: new Date().toISOString()
                };
                
                setBankConnection(connection);
                localStorage.setItem(`bank_connection_${currentUser}`, JSON.stringify(connection));
                
                alert('✅ Banque connectée avec succès !\n\nVous pouvez maintenant cliquer sur "Récupérer mes transactions".');
              } else {
                alert('⚠️ Connexion non finalisée. Réessayez en suivant toutes les étapes.');
              }
            }
          } catch (err) {
            console.error('Erreur vérification connexion:', err);
          }
        }
      }, 1000);

    } catch (error) {
      alert(`❌ Erreur : ${error.message}`);
    }
  };

  const handleFetchTransactions = async () => {
    if (!bankConnection) {
      alert('❌ Aucune banque connectée.\n\nVeuillez d\'abord cliquer sur "Connecter ma banque".');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const itemsResponse = await fetch('/api/bridge/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser })
      });

      if (!itemsResponse.ok) throw new Error('Impossible de récupérer les items');

      const { items } = await itemsResponse.json();
      if (!items || items.length === 0) throw new Error('Aucune banque connectée');

      const latestItem = items[0];
      
      const syncResponse = await fetch('/api/bridge/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: latestItem.id, 
          userId: currentUser,
          bankName: 'TEMP'
        })
      });

      if (!syncResponse.ok) throw new Error('Erreur synchronisation');

      const syncData = await syncResponse.json();

      if (syncData.transactions?.length > 0) {
        const existing = transactions || [];
        const bridgeIds = new Set(existing.filter(t => t.bridgeId).map(t => t.bridgeId));
        const newTrans = syncData.transactions.filter(t => !bridgeIds.has(t.bridgeId));

        if (newTrans.length > 0) {
          setPendingSyncData({
            transactions: newTrans,
            bankName: latestItem.bank_name
          });
          setShowMappingModal(true);
        }
      }

    } catch (error) {
      setSyncError(error.message);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMappingConfirm = (mapping) => {
    const { transactions: newTrans, bankName } = pendingSyncData;
    
    let targetCompteName;
    
    if (mapping.type === 'existing') {
      targetCompteName = mapping.compte.nom;
    } else {
      const newCompte = {
        id: Date.now(),
        nom: mapping.compteName,
        type: mapping.compteType || 'courant',
        solde: 0,
        soldeInitial: 0,
        isSynced: true
      };
      setComptes([...comptes, newCompte]);
      targetCompteName = mapping.compteName;
    }

    // 🔧 UNIQUE CORRECTION : fenêtre temporelle ± 3 mois
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const threeMonthsPast = new Date(now);
    threeMonthsPast.setMonth(now.getMonth() - 3);

    const threeMonthsFuture = new Date(now);
    threeMonthsFuture.setMonth(now.getMonth() + 3);

    const updatedTransactions = newTrans
      .map(t => {
        const dateTransaction = new Date(t.date);
        dateTransaction.setHours(0, 0, 0, 0);

        if (dateTransaction < threeMonthsPast || dateTransaction > threeMonthsFuture) {
          return null;
        }

        const statut = dateTransaction <= now ? 'realisee' : 'a_venir';

        return {
          ...t,
          compte: targetCompteName,
          statut
        };
      })
      .filter(Boolean);

    const existing = transactions || [];
    setTransactions([...existing, ...updatedTransactions]);
    setLastSync(new Date().toISOString());

    setShowMappingModal(false);
    setPendingSyncData(null);

    alert(`✅ ${updatedTransactions.length} transaction(s) synchronisée(s)`);
  };

  const handleDisconnect = async () => {
    const updated = (transactions || []).filter(t => !t.isSynced);
    setTransactions(updated);
    setBankConnection(null);
    setLastSync(null);
    localStorage.removeItem(`bank_connection_${currentUser}`);
    setShowDisconnectConfirm(false);
    alert('✅ Banque déconnectée');
  };

  return (
    <>
      {/* UI strictement inchangée */}
      <AccountMappingModal
        isOpen={showMappingModal}
        onClose={() => {
          setShowMappingModal(false);
          setPendingSyncData(null);
        }}
        comptes={comptes}
        bankName={pendingSyncData?.bankName}
        transactionsCount={pendingSyncData?.transactions.length}
        onConfirm={handleMappingConfirm}
      />
    </>
  );
};
