import { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './contexts/FinanceContext';
import { getCurrentUser, setCurrentUser as saveCurrentUser } from './utils/storage';
import { useChargesFixes } from './hooks/useChargesFixes';
import { useConfirmationTransactions } from './hooks/useConfirmationTransactions';
import { usePrevisionnelCalculations } from './hooks/usePrevisionnelCalculations';
import { useYearRollover } from './hooks/useYearRollover';
import { useNotificationsJour } from './hooks/useNotificationsJour';
import { BandeauNotifications } from './components/Common/BandeauNotifications';
import { Notification } from './components/Common/Notification';
import { ConfirmationTransactionsModal } from './components/Common/ConfirmationTransactionsModal';
import { AccountMappingModal } from './components/Bank/AccountMappingModal';
import { Header } from './components/Layout/Header';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { OnboardingContainer } from './components/Onboarding/OnboardingContainer';
import { DashboardContainer } from './components/Dashboard/DashboardContainer';
import { TransactionsContainer } from './components/Transactions/TransactionsContainer';
import { PrevisionnelContainer } from './components/Previsionnel/PrevisionnelContainer';
import { EpargnesContainer } from './components/Epargnes/EpargnesContainer';
import { DettesContainer } from './components/Dettes/DettesContainer';
import { ParametrageContainer } from './components/Parametrage/ParametrageContainer';
import { TrendingUp, FileText, Calendar, PiggyBank, CreditCard, Settings } from 'lucide-react';

const tabs = [
  { id: 'dashboard',     label: 'Tableau de Bord',               icon: TrendingUp },
  { id: 'transactions',  label: 'Transactions',                   icon: FileText   },
  { id: 'previsionnel',  label: 'Configuration du Prévisionnel',  icon: Calendar   },
  { id: 'epargnes',      label: 'Épargnes',                       icon: PiggyBank  },
  { id: 'dettes',        label: 'Crédits & Dettes',               icon: CreditCard },
  { id: 'parametrage',   label: 'Paramétrage',                    icon: Settings   }
];

function AppContent() {
  const {
    currentUser, setCurrentUser, isLoading, setIsLoading, loadData,
    comptes, setComptes, transactions, setTransactions,
    chargesFixes, setChargesFixes, epargnes, setEpargnes, dettes,
    setDateCreationCompte, categoriesDepenses, categoriesRevenus, categoriesEpargnes
  } = useFinance();

  const { genererTransactionsChargesFixes } = useChargesFixes();
  const { transactionsAConfirmer, marquerRealisee, reporter, annuler } = useConfirmationTransactions();

  usePrevisionnelCalculations();
  useYearRollover();

  const { notifications } = useNotificationsJour();

  const [showAuth, setShowAuth]                   = useState(false);
  const [authMode, setAuthMode]                   = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [onboardingStep, setOnboardingStep]       = useState(0);
  const [activeTab, setActiveTab]                 = useState('dashboard');
  const [parametrageSection, setParametrageSection] = useState('profil');
  // ✅ AJOUT : filtre date transmis à TransactionsContainer depuis le bandeau
  const [transactionsFiltreDate, setTransactionsFiltreDate] = useState(null);
  const [notification, setNotification]           = useState(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [showAccountMapping, setShowAccountMapping] = useState(false);
  const [bankAccounts, setBankAccounts]           = useState([]);

  // ✅ MODIFIÉ : accepte maintenant filtreDate en 3ème argument
  const handleSetActiveTab = (tab, section = null, filtreDate = null) => {
    setActiveTab(tab);
    if (section)    setParametrageSection(section);
    if (filtreDate) setTransactionsFiltreDate(filtreDate);
    // Reset le filtre date si on navigue ailleurs que transactions
    if (tab !== 'transactions') setTransactionsFiltreDate(null);
  };

  const handleMappingConfirm = (mapping) => {
    console.log('🟢 handleMappingConfirm APPELÉ !');
    console.log('mapping:', mapping);
    console.log('comptes AVANT:', comptes);

    const updatedComptes = [...comptes];
    const bankTransactions = localStorage.getItem(`bank_transactions_${currentUser}`);

    if (!bankTransactions) {
      console.error('❌ Aucune transaction bancaire trouvée');
      return;
    }

    const parsedTransactions = JSON.parse(bankTransactions);
    console.log('📦 Transactions bancaires récupérées:', parsedTransactions.length);

    const accountMapping = {};

    Object.entries(mapping).forEach(([accountId, accountInfo]) => {
      if (accountInfo.action === 'new') {
        const newCompte = {
          id: Date.now() + Math.random(),
          nom: accountInfo.newName,
          type: 'courant',
          solde: 0,
          soldeInitial: 0,
          devise: 'EUR',
          isSynced: true,
          bridgeAccountId: accountId
        };
        updatedComptes.push(newCompte);
        accountMapping[accountId] = accountInfo.newName;
      } else if (accountInfo.action === 'existing') {
        const existingCompte = updatedComptes.find(c => c.id === accountInfo.existingId);
        if (existingCompte) {
          existingCompte.isSynced = true;
          existingCompte.bridgeAccountId = accountId;
          accountMapping[accountId] = existingCompte.nom;
        }
      }
    });

    console.log('🗺️ Mapping créé:', accountMapping);
    console.log('updatedComptes APRÈS:', updatedComptes);

    const transactionsAvecComptes = parsedTransactions.map(t => {
      const nomCompte = accountMapping[t.account_id];
      if (!nomCompte) console.warn('⚠️ Transaction sans mapping:', t.account_id, t);
      return { ...t, compte: nomCompte || 'Compte inconnu' };
    });

    console.log('✅ Transactions réassignées (5 premières):', transactionsAvecComptes.slice(0, 5).map(t => ({
      id: t.bridgeId, compte: t.compte, montant: t.montant
    })));

    setComptes(updatedComptes);

    const existingTransactions = transactions || [];
    const newTransactions = transactionsAvecComptes.filter(newT =>
      !existingTransactions.some(existT => existT.bridgeId === newT.bridgeId)
    );
    const allTransactions = [...existingTransactions, ...newTransactions];
    setTransactions(allTransactions);

    console.log('💾 Sauvegarde de', allTransactions.length, 'transactions');
    console.log('Dont', newTransactions.length, 'nouvelles');

    localStorage.removeItem(`bank_transactions_${currentUser}`);
    localStorage.removeItem(`bank_accounts_${currentUser}`);
    setShowAccountMapping(false);
    setNotification({ type: 'success', message: `✅ ${newTransactions.length} transaction(s) synchronisée(s) !` });
    setActiveTab('transactions');
  };

  useEffect(() => {
    const handleBridgeCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');
      if (!userId) return;

      console.log('📞 Callback Bridge détecté pour:', userId);
      setIsProcessingCallback(true);

      try {
        const itemsResponse = await fetch('/api/bridge/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (!itemsResponse.ok) throw new Error('Erreur récupération items');

        const { items } = await itemsResponse.json();
        console.log('✅ Items récupérés:', items);

        if (items && items.length > 0) {
          const latestItem = items[0];
          localStorage.setItem(`bank_connection_${userId}`, JSON.stringify({
            itemId: latestItem.id, userId, bankName: latestItem.bank_name,
            connectedAt: new Date().toISOString()
          }));

          console.log('🔄 Synchronisation transactions...');
          const syncResponse = await fetch('/api/bridge/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: latestItem.id, userId })
          });
          if (!syncResponse.ok) throw new Error('Erreur synchronisation');

          const syncData = await syncResponse.json();
          console.log('✅ Données sync reçues:', syncData);

          if (syncData.transactions && syncData.transactions.length > 0) {
            localStorage.setItem(`bank_transactions_${userId}`, JSON.stringify(syncData.transactions));
            localStorage.setItem(`bank_accounts_${userId}`, JSON.stringify(syncData.accounts || []));
            setBankAccounts(syncData.accounts || []);
            setShowAccountMapping(true);
          } else {
            setNotification({ type: 'info', message: 'ℹ️ Aucune transaction trouvée' });
          }
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('❌ Erreur callback:', error);
        setNotification({ type: 'error', message: `❌ Erreur : ${error.message}` });
      } finally {
        setIsProcessingCallback(false);
      }
    };
    if (currentUser) handleBridgeCallback();
  }, [currentUser]);

  useEffect(() => {
    const loadUser = async () => {
      const username = getCurrentUser();
      if (username) {
        setCurrentUser(username);
        await loadData(username);
        const data = localStorage.getItem(`user_data_${username}`);
        if (data) {
          const parsed = JSON.parse(data);
          if (!parsed.onboardingCompleted) setOnboardingStep(1);
        } else {
          setOnboardingStep(1);
        }
      } else {
        setShowAuth(true);
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const handleLogin = async (username) => {
    saveCurrentUser(username);
    setCurrentUser(username);
    setShowAuth(false);
    await loadData(username);
    const data = localStorage.getItem(`user_data_${username}`);
    if (data) {
      const parsed = JSON.parse(data);
      if (!parsed.onboardingCompleted) setOnboardingStep(1);
    } else {
      setOnboardingStep(1);
    }
  };

  const handleSignup = (username) => {
    saveCurrentUser(username);
    setCurrentUser(username);
    setShowAuth(false);
    setOnboardingStep(1);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowAuth(true);
    setOnboardingStep(0);
    setActiveTab('dashboard');
  };

  const handleOnboardingComplete = (onboardingData) => {
    const dateCreation = new Date().toISOString();
    setDateCreationCompte(dateCreation);

    const nouveauxComptes = onboardingData.comptes.map((c, i) => {
      const soldeInitialFixe = c.soldeInitial !== undefined ? c.soldeInitial : parseFloat(c.solde);
      return {
        id: c.id || Date.now() + i, nom: c.nom, type: c.type,
        solde: soldeInitialFixe, soldeInitial: soldeInitialFixe, isSynced: c.isSynced || false
      };
    });
    setComptes(nouveauxComptes);

    if (onboardingData.transactions?.length > 0) {
      console.log('💾 Sauvegarde de', onboardingData.transactions.length, 'transactions');
      setTransactions(onboardingData.transactions);
    }

    const nouvellesCharges = [...onboardingData.revenus, ...onboardingData.charges, ...onboardingData.transferts].map((c, i) => {
      if (c.type === 'transfert') {
        return {
          id: Date.now() + i + 1000, nom: c.nom,
          montant: Math.abs(parseFloat(c.montant)), categorie: 'Transfert',
          frequence: c.frequence, jourMois: parseInt(c.jourMois),
          compte: c.compteSource, compteDestination: c.compteDestination, type: 'transfert'
        };
      }
      let montant = Math.abs(parseFloat(c.montant));
      if (categoriesDepenses.includes(c.categorie) || categoriesEpargnes.includes(c.categorie)) montant = -montant;
      return { id: Date.now() + i + 1000, ...c, montant, jourMois: parseInt(c.jourMois) };
    });
    setChargesFixes(nouvellesCharges);

    const nouvellesEpargnes = onboardingData.epargnes.map((e, i) => ({
      id: Date.now() + i + 2000, ...e, objectif: parseFloat(e.objectif)
    }));
    setEpargnes(nouvellesEpargnes);

    setTimeout(() => { genererTransactionsChargesFixes(nouvellesCharges, dateCreation); }, 500);
    setOnboardingStep(0);
  };

  const handleExport = async () => {
    setNotification({ type: 'info', message: '📄 Génération du rapport...' });
    try {
      const { generateReport } = await import('./utils/reportGenerator');
      const reportHTML = generateReport({
        currentUser, comptes, transactions, chargesFixes, epargnes, dettes,
        categoriesDepenses, categoriesRevenus, categoriesEpargnes
      });
      const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        setNotification({ type: 'success', message: '✅ Rapport ouvert !' });
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else {
        setNotification({ type: 'warning', message: '⚠️ Pop-up bloquée !' });
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erreur export:', error);
      setNotification({ type: 'error', message: '❌ Erreur génération rapport' });
    }
  };

  if (isLoading || isProcessingCallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{isProcessingCallback ? 'Synchronisation...' : 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md">
          {showForgotPassword ? (
            <ForgotPassword
              onBack={() => setShowForgotPassword(false)}
              onSuccess={() => {
                setShowForgotPassword(false);
                setNotification({ type: 'success', message: '✅ Mot de passe réinitialisé !' });
              }}
            />
          ) : authMode === 'login' ? (
            <LoginForm
              onLogin={handleLogin}
              onSwitchToSignup={() => setAuthMode('signup')}
              onForgotPassword={() => setShowForgotPassword(true)}
            />
          ) : (
            <SignupForm onSignup={handleSignup} onSwitchToLogin={() => setAuthMode('login')} />
          )}
        </div>
      </div>
    );
  }

  if (onboardingStep > 0) {
    return <OnboardingContainer onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Notification notification={notification} onClose={() => setNotification(null)} />

      {transactionsAConfirmer.length > 0 && (
        <ConfirmationTransactionsModal
          transactions={transactionsAConfirmer}
          onConfirm={marquerRealisee}
          onReporter={reporter}
          onAnnuler={annuler}
        />
      )}

      {showAccountMapping && (
        <AccountMappingModal
          bankAccounts={bankAccounts}
          existingComptes={comptes}
          onConfirm={handleMappingConfirm}
          onCancel={() => {
            setShowAccountMapping(false);
            localStorage.removeItem(`bank_transactions_${currentUser}`);
            localStorage.removeItem(`bank_accounts_${currentUser}`);
          }}
        />
      )}

      <Header onLogout={handleLogout} />

      <nav className="bg-white/60 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSetActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 border-b-3 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} className="mr-2" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ✅ Bandeau notifications juste sous la nav */}
      <BandeauNotifications
        notifications={notifications}
        onNavigate={handleSetActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard'    && <DashboardContainer />}
        {/* ✅ MODIFIÉ : filtreDate transmis à TransactionsContainer */}
        {activeTab === 'transactions' && <TransactionsContainer filtreDate={transactionsFiltreDate} />}
        {activeTab === 'previsionnel' && <PrevisionnelContainer setActiveTab={handleSetActiveTab} />}
        {activeTab === 'epargnes'     && <EpargnesContainer />}
        {activeTab === 'dettes'       && <DettesContainer />}
        {activeTab === 'parametrage'  && (
          <ParametrageContainer
            defaultSection={parametrageSection}
            onExport={handleExport}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}

export default App;