import { useMemo } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { GraphiqueSolde } from './GraphiqueSolde';
import { GraphiqueRevenus } from './GraphiqueRevenus';
import { GraphiqueDepenses } from './GraphiqueDepenses';
import { GraphiqueEpargne } from './GraphiqueEpargne';

export const DashboardContainer = () => {
  const { comptes, transactions, chargesFixes, epargnes, dettes } = useFinance();

  // Calcul du solde total
  const soldeTotal = useMemo(() => {
    return comptes.reduce((sum, compte) => {
      const transactionsCompte = (transactions || []).filter(t => t.compte === compte.nom);
      const mouvements = transactionsCompte.reduce((s, t) => s + t.montant, 0);
      return sum + (compte.soldeInitial || 0) + mouvements;
    }, 0);
  }, [comptes, transactions]);

  // Calcul des revenus du mois
  const revenusMois = useMemo(() => {
    const moisActuel = new Date().getMonth();
    const anneeActuelle = new Date().getFullYear();
    const debutMois = new Date(anneeActuelle, moisActuel, 1);
    const finMois = new Date(anneeActuelle, moisActuel + 1, 0);
    
    return (transactions || [])
      .filter(t => {
        const dateT = new Date(t.date);
        return dateT >= debutMois && dateT <= finMois && t.montant > 0;
      })
      .reduce((sum, t) => sum + t.montant, 0);
  }, [transactions]);

  // Calcul des dépenses du mois
  const depensesMois = useMemo(() => {
    const moisActuel = new Date().getMonth();
    const anneeActuelle = new Date().getFullYear();
    const debutMois = new Date(anneeActuelle, moisActuel, 1);
    const finMois = new Date(anneeActuelle, moisActuel + 1, 0);
    
    return Math.abs((transactions || [])
      .filter(t => {
        const dateT = new Date(t.date);
        return dateT >= debutMois && dateT <= finMois && t.montant < 0;
      })
      .reduce((sum, t) => sum + t.montant, 0));
  }, [transactions]);

  // Calcul de l'épargne totale
  const epargneTotal = useMemo(() => {
    return comptes
      .filter(c => c.type === 'epargne')
      .reduce((sum, compte) => {
        const transactionsCompte = (transactions || []).filter(t => t.compte === compte.nom);
        const mouvements = transactionsCompte.reduce((s, t) => s + t.montant, 0);
        return sum + (compte.soldeInitial || 0) + mouvements;
      }, 0);
  }, [comptes, transactions]);

  return (
    <div className="space-y-6">
      {/* CARTES KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Solde Total */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Wallet size={32} className="opacity-80" />
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
              soldeTotal >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'
            }`}>
              {soldeTotal >= 0 ? <TrendingUp size={16} className="inline" /> : <TrendingDown size={16} className="inline" />}
            </div>
          </div>
          <p className="text-sm opacity-80 mb-1">Solde Total</p>
          <p className="text-3xl font-bold">{soldeTotal.toFixed(2)} €</p>
        </div>

        {/* Revenus du mois */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={32} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Revenus du Mois</p>
          <p className="text-3xl font-bold">{revenusMois.toFixed(2)} €</p>
        </div>

        {/* Dépenses du mois */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <CreditCard size={32} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Dépenses du Mois</p>
          <p className="text-3xl font-bold">{depensesMois.toFixed(2)} €</p>
        </div>

        {/* Épargne */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <PiggyBank size={32} className="opacity-80" />
          </div>
          <p className="text-sm opacity-80 mb-1">Épargne Totale</p>
          <p className="text-3xl font-bold">{epargneTotal.toFixed(2)} €</p>
        </div>
      </div>

      {/* TITRE SECTION GRAPHIQUES */}
      <div className="pt-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Prévisionnel vs Réel</h2>
        <p className="text-gray-600">Comparaison de vos budgets prévisionnels avec la réalité</p>
      </div>

      {/* GRAPHIQUES - GRID 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraphiqueSolde />
        <GraphiqueRevenus />
        <GraphiqueDepenses />
        <GraphiqueEpargne />
      </div>

      {/* INFORMATIONS COMPLÉMENTAIRES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Comptes */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🏦 Mes Comptes</h3>
          {comptes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun compte configuré</p>
          ) : (
            <div className="space-y-3">
              {comptes.slice(0, 3).map(compte => {
                const transactionsCompte = (transactions || []).filter(t => t.compte === compte.nom);
                const mouvements = transactionsCompte.reduce((s, t) => s + t.montant, 0);
                const solde = (compte.soldeInitial || 0) + mouvements;
                
                return (
                  <div key={compte.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-800">{compte.nom}</p>
                      <p className="text-xs text-gray-500">{compte.type}</p>
                    </div>
                    <p className={`font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {solde.toFixed(2)} €
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charges fixes */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📅 Prochaines Charges</h3>
          {chargesFixes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune charge configurée</p>
          ) : (
            <div className="space-y-3">
              {chargesFixes.slice(0, 3).map(charge => (
                <div key={charge.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">{charge.nom}</p>
                    <p className="text-xs text-gray-500">{charge.frequence}</p>
                  </div>
                  <p className="font-bold text-red-600">
                    {Math.abs(charge.montant).toFixed(2)} €
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Objectifs d'épargne */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 Objectifs d'Épargne</h3>
          {epargnes.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun objectif configuré</p>
          ) : (
            <div className="space-y-3">
              {epargnes.slice(0, 3).map(epargne => {
                const progress = (epargne.montantActuel / epargne.objectif) * 100;
                
                return (
                  <div key={epargne.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800">{epargne.nom}</p>
                      <p className="text-xs text-gray-500">{progress.toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};