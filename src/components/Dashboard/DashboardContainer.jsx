import { useState, useMemo, useEffect } from 'react';
import { CreditCard, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { useStatistiques } from '../../hooks/useStatistiques';
import { StatCard } from './StatCard';
import { DepensesChart } from './DepensesChart';
import { AnalyseDetaillée } from './AnalyseDetaillée';
import { GraphiqueSolde } from './GraphiqueSolde';
import { GraphiqueRevenus } from './GraphiqueRevenus';
import { GraphiqueDepenses } from './GraphiqueDepenses';
import { GraphiqueEpargne } from './GraphiqueEpargne';

export const DashboardContainer = () => {
  const { 
    comptes, 
    transactions, 
    epargnes, 
    dettes, 
    budgetPrevisionnel,
    categoriesDepenses,
    categoriesEpargnes,
    memosBudgetaires
  } = useFinance();
  
  const [vueTableauBord, setVueTableauBord] = useState('mensuel');
  const [compteSelectionne, setCompteSelectionne] = useState(null);
  
  const stats = useStatistiques(transactions, comptes, vueTableauBord, compteSelectionne);
  
  // ✅ DEBUG : ANALYSER LES TRANSACTIONS
  useEffect(() => {
    console.log('🔍 ANALYSE TRANSACTIONS');
    console.log('Total transactions:', transactions.length);
    
    const parCompte = {};
    const sansCompte = [];
    
    transactions.forEach(t => {
      const compte = t.compte || 'UNDEFINED';
      parCompte[compte] = (parCompte[compte] || 0) + 1;
      
      if (!t.compte) {
        sansCompte.push(t);
      }
    });
    
    console.log('Répartition par compte:', parCompte);
    console.log('Comptes disponibles:', comptes.map(c => c.nom));
    console.log('Transactions SANS compte:', sansCompte.length);
    
    if (sansCompte.length > 0) {
      console.log('Exemples transactions sans compte (5 premières):', sansCompte.slice(0, 5).map(t => ({
        id: t.id,
        date: t.date,
        montant: t.montant,
        description: t.description,
        compte: t.compte
      })));
    }
  }, [transactions, comptes]);
  
  const statsPrevisionnelles = useMemo(() => {
    const aujourdHui = new Date();
    const moisActuel = aujourdHui.getMonth();
    const anneeActuelle = aujourdHui.getFullYear();
    
    let dateDebut, dateFinPrevue;
    
    if (vueTableauBord === 'mensuel') {
      dateDebut = new Date(anneeActuelle, moisActuel, 1);
      dateFinPrevue = new Date(anneeActuelle, moisActuel + 1, 0, 23, 59, 59);
    } else {
      dateDebut = new Date(anneeActuelle, 0, 1);
      dateFinPrevue = new Date(anneeActuelle, 11, 31, 23, 59, 59);
    }
    
    const normaliserDate = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    
    const dateDebutNorm = normaliserDate(dateDebut);
    const dateFinPrevueNorm = normaliserDate(dateFinPrevue);
    
    const compteActuel = compteSelectionne 
      ? comptes.find(c => c.nom === compteSelectionne)
      : comptes.find(c => c.nom === 'Compte Courant' || c.type === 'courant') || comptes[0];
    
    if (!compteActuel) {
      return {
        revenusPrevisionnel: 0,
        depensesPrevisionnel: 0,
        epargnesPrevisionnel: 0
      };
    }
    
    const toutesTransactionsPeriode = (transactions || []).filter(t => {
      const dateT = normaliserDate(t.date);
      const dansLaPeriode = dateT >= dateDebutNorm && dateT <= dateFinPrevueNorm;
      const estValide = (t.statut === 'realisee' || t.statut === 'a_venir' || t.statut === 'avenir');
      return dansLaPeriode && estValide && t.compte === compteActuel.nom;
    });
    
    const revenusPrevisionnel = toutesTransactionsPeriode
      .filter(t => (t.montant || 0) > 0)
      .reduce((acc, t) => acc + (t.montant || 0), 0);
    
    const depensesPrevisionnel = Math.abs(toutesTransactionsPeriode
      .filter(t => (t.montant || 0) < 0)
      .reduce((acc, t) => acc + (t.montant || 0), 0));
    
    const epargnesPrevisionnel = Math.abs(toutesTransactionsPeriode.filter(t => {
      const compte = comptes.find(c => c.nom === t.compte);
      return (t.montant || 0) > 0 && compte && compte.type === 'epargne';
    }).reduce((acc, t) => acc + (t.montant || 0), 0));
    
    return {
      revenusPrevisionnel,
      depensesPrevisionnel,
      epargnesPrevisionnel
    };
  }, [transactions, comptes, vueTableauBord, compteSelectionne]);
  
  const totalEpargnes = useMemo(() => {
    return epargnes.reduce((total, e) => {
      return total + e.comptesAssocies.reduce((sum, compteNom) => {
        const compte = comptes.find(c => c.nom === compteNom);
        return sum + (compte ? compte.solde : 0);
      }, 0);
    }, 0);
  }, [epargnes, comptes]);
  
  const totalDettes = useMemo(() => 
    dettes.reduce((acc, d) => acc + d.restant, 0), 
    [dettes]
  );
  
  const memosAVenir = useMemo(() => {
    const aujourdhui = new Date();
    const finPeriode = vueTableauBord === 'mensuel' 
      ? new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0)
      : new Date(aujourdhui.getFullYear(), 11, 31);
    
    return (memosBudgetaires || [])
      .filter(m => {
        const dateMemo = new Date(m.date);
        return dateMemo >= aujourdhui && dateMemo <= finPeriode;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [memosBudgetaires, vueTableauBord]);
  
  const totalMemos = memosAVenir.reduce((sum, m) => sum + m.montant, 0);
  
  const depensesParCategorie = useMemo(() => {
    const grouped = {};
    transactions
      .filter(t => 
        t.montant < 0 && 
        t.type !== 'transfert' &&
        (t.statut === 'realisee' || t.statut === 'a_venir' || t.statut === 'avenir')
      )
      .forEach(t => {
        grouped[t.categorie] = (grouped[t.categorie] || 0) + Math.abs(t.montant);
      });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const depensesRealisees = useMemo(() => {
    const grouped = {};
    transactions
      .filter(t => 
        t.montant < 0 && 
        t.type !== 'transfert' &&
        t.statut === 'realisee'
      )
      .forEach(t => {
        grouped[t.categorie] = (grouped[t.categorie] || 0) + Math.abs(t.montant);
      });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* EN-TÊTE */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Tableau de Bord
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setVueTableauBord('mensuel')}
            className={`px-6 py-3 rounded-xl transition-all font-bold shadow-lg transform hover:scale-105 ${
              vueTableauBord === 'mensuel'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300'
            }`}
          >
            📅 Vue Mensuelle
          </button>
          <button
            onClick={() => setVueTableauBord('annuel')}
            className={`px-6 py-3 rounded-xl transition-all font-bold shadow-lg transform hover:scale-105 ${
              vueTableauBord === 'annuel'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300'
            }`}
          >
            📊 Vue Annuelle
          </button>
        </div>
      </div>

      {/* STATCARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          couleur="from-blue-500 to-blue-600"
          icon={CreditCard}
        >
          <p className="text-blue-100 text-sm font-medium mb-2">Compte visualisé</p>
          <select
            value={compteSelectionne || (stats.compteCourant?.nom || '')}
            onChange={(e) => setCompteSelectionne(e.target.value)}
            className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg border-2 border-white/30 focus:border-white focus:outline-none font-medium text-sm appearance-none cursor-pointer hover:bg-white/30 transition-all mb-3"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            {comptes.map(c => (
              <option key={c.id} value={c.nom} className="text-gray-800 bg-white">
                {c.nom} ({c.type === 'courant' ? 'Courant' : c.type === 'epargne' ? 'Épargne' : 'Espèces'})
              </option>
            ))}
          </select>
          <p className="text-3xl font-bold">{stats.soldeActuel.toFixed(2)} €</p>
          <p className="text-blue-100 text-xs mt-1">Solde actuel</p>
          <div className="border-t border-blue-400 pt-3 mt-3 space-y-1">
            <div className="flex justify-between items-center text-sm">
              <p className="text-blue-100">Solde début {vueTableauBord === 'mensuel' ? 'mois' : 'année'}</p>
              <p className="font-semibold">{stats.soldeDebut.toFixed(2)} €</p>
            </div>
            <div className="flex justify-between items-center text-sm">
              <p className="text-blue-100">Prévu fin {vueTableauBord === 'mensuel' ? 'mois' : 'année'}</p>
              <p className={`font-bold ${stats.soldePrevisionnel >= stats.soldeDebut ? 'text-white' : 'text-red-200'}`}>
                {stats.soldePrevisionnel.toFixed(2)} €
              </p>
            </div>
          </div>
        </StatCard>
        
        <StatCard
          titre={`Revenus ${vueTableauBord === 'mensuel' ? 'du mois' : 'de l\'année'}`}
          valeur={`${stats.revenusPeriode.toFixed(2)} €`}
          couleur="from-green-500 to-emerald-600"
          icon={TrendingUp}
          details={[
            { 
              label: 'Prévisionnel', 
              value: `${statsPrevisionnelles.revenusPrevisionnel.toFixed(2)} €` 
            }
          ]}
        />
        
        <StatCard
          titre={`Dépenses ${vueTableauBord === 'mensuel' ? 'du mois' : 'de l\'année'}`}
          valeur={`${stats.depensesPeriode.toFixed(2)} €`}
          couleur="from-red-500 to-pink-600"
          icon={TrendingDown}
          details={[
            { 
              label: 'Prévisionnel', 
              value: `${statsPrevisionnelles.depensesPrevisionnel.toFixed(2)} €` 
            }
          ]}
        />
        
        <StatCard
          titre={`Épargnes ${vueTableauBord === 'mensuel' ? 'du mois' : 'de l\'année'}`}
          valeur={`${stats.epargnesPeriode.toFixed(2)} €`}
          couleur="from-purple-500 to-purple-600"
          icon={PiggyBank}
          details={[
            { 
              label: 'Prévisionnel', 
              value: `${statsPrevisionnelles.epargnesPrevisionnel.toFixed(2)} €` 
            }
          ]}
        />
        
        <StatCard
          titre="Solde de la période"
          valeur={`${(stats.revenusPeriode - stats.depensesPeriode - stats.epargnesPeriode).toFixed(2)} €`}
          couleur="from-indigo-500 to-indigo-600"
          icon={TrendingUp}
          details={[
            { 
              label: 'Prévisionnel', 
              value: `${(statsPrevisionnelles.revenusPrevisionnel - statsPrevisionnelles.depensesPrevisionnel - statsPrevisionnelles.epargnesPrevisionnel).toFixed(2)} €` 
            }
          ]}
        />
      </div>

      {/* WIDGET MÉMOS BUDGÉTAIRES */}
      {memosAVenir.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                📝 Événements budgétaires à venir
                <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {memosAVenir.length}
                </span>
              </h3>
              <p className="text-sm text-purple-700">
                {vueTableauBord === 'mensuel' ? 'Ce mois-ci' : 'Cette année'} · Total : {totalMemos.toFixed(2)} €
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {memosAVenir.slice(0, 6).map((memo) => (
              <div
                key={memo.id}
                className="bg-white border-2 border-purple-200 rounded-xl p-3 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm">{memo.description}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      📅 {new Date(memo.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {memo.montant.toFixed(0)}€
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    {memo.categorie}
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {memo.compte}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {memosAVenir.length > 6 && (
            <p className="text-xs text-purple-600 text-center mt-3">
              +{memosAVenir.length - 6} autre{memosAVenir.length - 6 > 1 ? 's' : ''} événement{memosAVenir.length - 6 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* BANDEAU INFO */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-600 mb-2">Période analysée</p>
            <p className="text-xl font-bold text-blue-600">
              {vueTableauBord === 'mensuel' 
                ? `${stats.dateDebut?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} - ${stats.dateFinPrevue?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`
                : `01 janvier - 31 décembre ${new Date().getFullYear()}`
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Épargnes totales</p>
            <p className="text-xl font-bold text-green-600">{totalEpargnes.toFixed(2)} €</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Dettes restantes</p>
            <p className="text-xl font-bold text-red-600">{totalDettes.toFixed(2)} €</p>
          </div>
        </div>
      </div>

      {/* GRAPHIQUES PRÉVISIONNEL VS RÉEL */}
      <div className="pt-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">📊 Prévisionnel vs Réel</h2>
        <p className="text-gray-600 mb-4">Comparaison de vos budgets prévisionnels avec la réalité</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraphiqueSolde />
        <GraphiqueRevenus />
        <GraphiqueDepenses />
        <GraphiqueEpargne />
      </div>

      {/* GRAPHIQUES EXISTANTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DepensesChart 
          depensesParCategorie={depensesParCategorie}
          depensesRealisees={depensesRealisees}
        />
        <AnalyseDetaillée stats={stats} budgetPrevisionnel={budgetPrevisionnel} />
      </div>
    </div>
  );
};