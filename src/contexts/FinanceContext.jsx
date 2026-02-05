import { createContext, useState, useEffect, useContext } from 'react';
import { loadUserData, saveUserData } from '../utils/storage';
import { CATEGORIES_DEPENSES, CATEGORIES_REVENUS, CATEGORIES_EPARGNES } from '../utils/constants';

const FinanceContext = createContext();

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance doit être utilisé dans un FinanceProvider');
  }
  return context;
};

export const FinanceProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // États financiers
  const [comptes, setComptes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [chargesFixes, setChargesFixes] = useState([]);
  const [epargnes, setEpargnes] = useState([]);
  const [dettes, setDettes] = useState([]);
  const [memos, setMemos] = useState([]);
  const [memosBudgetaires, setMemosBudgetaires] = useState([]); // 🆕 AJOUTÉ
  
  // Catégories
  const [categoriesDepenses, setCategoriesDepenses] = useState([...CATEGORIES_DEPENSES]);
  const [categoriesRevenus, setCategoriesRevenus] = useState([...CATEGORIES_REVENUS]);
  const [categoriesEpargnes, setCategoriesEpargnes] = useState([...CATEGORIES_EPARGNES]);
  
  // Budget prévisionnel
  const [budgetPrevisionnel, setBudgetPrevisionnel] = useState({
    revenus: Array(12).fill(0),
    epargnes: Array(12).fill(0),
    factures: Array(12).fill(0),
    depenses: Array(12).fill(0)
  });
  
  const [dateCreationCompte, setDateCreationCompte] = useState(null);
  const [modeCalculPrevisionnel, setModeCalculPrevisionnel] = useState('automatique');

  // Charger les données utilisateur
  const loadData = async (username) => {
    const data = loadUserData(username);
    if (data) {
      setComptes(data.comptes || []);
      setTransactions(data.transactions || []);
      setChargesFixes(data.chargesFixes || []);
      setEpargnes(data.epargnes || []);
      setDettes(data.dettes || []);
      setMemos(data.memos || []);
      setMemosBudgetaires(data.memosBudgetaires || []); // 🆕
      setCategoriesDepenses(data.categoriesDepenses || [...CATEGORIES_DEPENSES]);
      setCategoriesRevenus(data.categoriesRevenus || [...CATEGORIES_REVENUS]);
      setCategoriesEpargnes(data.categoriesEpargnes || [...CATEGORIES_EPARGNES]);
      setDateCreationCompte(data.dateCreationCompte || new Date().toISOString());
    }
  };

  // Sauvegarder les données
  useEffect(() => {
    if (currentUser && !isLoading) {
      const data = {
        onboardingCompleted: true,
        dateCreationCompte,
        comptes,
        chargesFixes,
        transactions,
        epargnes,
        dettes,
        memos,
        memosBudgetaires, // 🆕
        categoriesDepenses,
        categoriesRevenus,
        categoriesEpargnes
      };
      saveUserData(currentUser, data);
    }
  }, [
    currentUser, comptes, chargesFixes, transactions, epargnes, dettes, 
    memos, memosBudgetaires, categoriesDepenses, categoriesRevenus, 
    categoriesEpargnes, dateCreationCompte, isLoading
  ]);

  const value = {
    currentUser, setCurrentUser, isLoading, setIsLoading,
    comptes, setComptes, transactions, setTransactions,
    chargesFixes, setChargesFixes, epargnes, setEpargnes,
    dettes, setDettes, memos, setMemos,
    memosBudgetaires, setMemosBudgetaires, // 🆕
    categoriesDepenses, setCategoriesDepenses,
    categoriesRevenus, setCategoriesRevenus,
    categoriesEpargnes, setCategoriesEpargnes,
    budgetPrevisionnel, setBudgetPrevisionnel,
    dateCreationCompte, setDateCreationCompte,
    modeCalculPrevisionnel, setModeCalculPrevisionnel,
    loadData
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};