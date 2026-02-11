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
      console.log('🔍 Récupération items...');
      
      const itemsResponse = await fetch('/api/bridge/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser })
      });

      if (!itemsResponse.ok) throw new Error('Impossible de récupérer les items');

      const { items } = await itemsResponse.json();
      console.log(`✅ ${items.length} items trouvés`);

      if (!items || items.length === 0) {
        setBankConnection(null);
        localStorage.removeItem(`bank_connection_${currentUser}`);
        alert('❌ Aucune banque connectée. Cliquez d\'abord sur "Connecter ma banque".');
        setIsSyncing(false);
        return;
      }

      const latestItem = items[0];
      const bankName = latestItem.bank_name || 'Ma Banque';
      
      if (bankConnection.itemId && bankConnection.itemId !== latestItem.id) {
        alert('⚠️ La connexion bancaire a changé. Veuillez vous reconnecter.');
        setBankConnection(null);
        localStorage.removeItem(`bank_connection_${currentUser}`);
        setIsSyncing(false);
        return;
      }
      
      console.log(`🔄 Sync item: ${latestItem.id}...`);

      // 🆕 MODIFICATION : Récupérer 3 mois d'historique
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const sinceDate = threeMonthsAgo.toISOString().split('T')[0];

      const syncResponse = await fetch('/api/bridge/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: latestItem.id, 
          userId: currentUser,
          bankName: bankName,
          since: sinceDate  // 🆕 AJOUT du paramètre "since"
        })
      });

      if (!syncResponse.ok) throw new Error('Erreur synchronisation');

      const syncData = await syncResponse.json();

      if (syncData.transactions && syncData.transactions.length > 0) {
        const connection = {
          itemId: latestItem.id,
          userId: currentUser,
          bankName: latestItem.bank_name,
          connectedAt: new Date().toISOString()
        };
        setBankConnection(connection);
        localStorage.setItem(`bank_connection_${currentUser}`, JSON.stringify(connection));

        const existing = transactions || [];
        const bridgeIds = new Set(existing.filter(t => t.bridgeId).map(t => t.bridgeId));
        
        const newTrans = syncData.transactions.filter(t => !bridgeIds.has(t.bridgeId));

        if (newTrans.length > 0) {
          setPendingSyncData({
            transactions: newTrans,
            bankName: bankName
          });
          setShowMappingModal(true);
        } else {
          alert(`ℹ️ ${syncData.transactions.length} transactions trouvées, toutes déjà synchronisées`);
        }
      } else {
        alert('ℹ️ Aucune transaction trouvée');
      }

    } catch (error) {
      console.error('❌ Erreur:', error);
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
      console.log(`✅ Compte "${mapping.compteName}" (${mapping.compteType}) créé`);
    }
    
    // ✅ CORRECTION : Assigner le statut en fonction de la date
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    
    const updatedTransactions = newTrans.map(t => {
      const dateTransaction = new Date(t.date);
      dateTransaction.setHours(0, 0, 0, 0);
      
      const statut = dateTransaction <= aujourdHui ? 'realisee' : 'a_venir';
      
      return {
        ...t,
        compte: targetCompteName,
        statut: statut
      };
    });
    
    const existing = transactions || [];
    const finalTransactions = [...existing, ...updatedTransactions];
    setTransactions(finalTransactions);
    setLastSync(new Date().toISOString());
    
    setShowMappingModal(false);
    setPendingSyncData(null);
    
    const realisees = updatedTransactions.filter(t => t.statut === 'realisee').length;
    const aVenir = updatedTransactions.filter(t => t.statut === 'a_venir').length;
    
    alert(`✅ ${newTrans.length} transaction(s) synchronisée(s) vers "${targetCompteName}" !\n\n${realisees} réalisée(s) | ${aVenir} à venir`);
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
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4">🏦 Synchronisation bancaire</h3>
        
        {syncError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-800">{syncError}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleConnect}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            🏦 {bankConnection ? 'Reconnecter' : 'Connecter ma banque'}
          </button>

          <button
            onClick={handleFetchTransactions}
            disabled={isSyncing || !bankConnection}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Récupération...' : '📥 Récupérer mes transactions (3 mois)'}
          </button>

          {!bankConnection && (
            <p className="text-sm text-gray-600 text-center italic">
              ⚠️ Connectez d'abord votre banque pour synchroniser vos transactions
            </p>
          )}

          {bankConnection && (
            <>
              {!showDisconnectConfirm ? (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <Unlink size={20} />
                  Déconnecter ma banque
                </button>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-800 mb-3">
                    ⚠️ Confirmer la déconnexion ?
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    Cela supprimera toutes les transactions synchronisées.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="py-2 bg-red-600 text-white rounded-lg font-medium"
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 🆕 AJOUT : Info sur l'historique */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="font-medium mb-1">💡 Astuce</p>
          <p>
            La synchronisation récupère vos transactions des <strong>3 derniers mois</strong> ainsi que les transactions futures. 
            Cela permet de détecter automatiquement vos dépenses récurrentes.
          </p>
        </div>
      </div>

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