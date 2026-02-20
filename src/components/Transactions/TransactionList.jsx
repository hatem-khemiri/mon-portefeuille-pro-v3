import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Filter, X, ShieldCheck } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { TransactionItem } from './TransactionItem';

export const TransactionList = ({ onDeleteTransaction, filtreDate = null }) => {
  const { transactions, categoriesDepenses, categoriesRevenus, categoriesEpargnes, comptes } = useFinance();

  const [searchTerm, setSearchTerm]             = useState('');
  const [filterCategorie, setFilterCategorie]   = useState('all');
  const [filterCompte, setFilterCompte]         = useState('all');
  const [filterStatut, setFilterStatut]         = useState('all');
  const [filterMontantMin, setFilterMontantMin] = useState('');
  const [filterMontantMax, setFilterMontantMax] = useState('');
  const [filterDateDebut, setFilterDateDebut]   = useState('');
  const [filterDateFin, setFilterDateFin]       = useState('');
  const [showFiltresAvances, setShowFiltresAvances] = useState(false);

  // ✅ IDs des transactions du jour déjà vérifiées manuellement
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  // ✅ Ref vers la première ligne en surbrillance pour le scroll auto
  const firstHighlightedRef = useRef(null);
  // ✅ Ref vers le bandeau "Tout valider"
  const validationBandeauRef = useRef(null);

  // Date du jour au format YYYY-MM-DD
  const dateAujourdhui = new Date().toISOString().split('T')[0];

  // ✅ Si filtreDate reçu depuis le bandeau de notif → pré-remplir les dates
  useEffect(() => {
    if (filtreDate) {
      setFilterDateDebut(filtreDate);
      setFilterDateFin(filtreDate);
      setShowFiltresAvances(true);
    }
  }, [filtreDate]);

  // ✅ Scroll automatique vers la première transaction du jour en surbrillance
  useEffect(() => {
    if (filtreDate && firstHighlightedRef.current) {
      setTimeout(() => {
        firstHighlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [filtreDate, transactions]);

  const resetFiltres = () => {
    setSearchTerm('');
    setFilterCategorie('all');
    setFilterCompte('all');
    setFilterStatut('all');
    setFilterMontantMin('');
    setFilterMontantMax('');
    setFilterDateDebut('');
    setFilterDateFin('');
  };

  const hasFiltresActifs =
    searchTerm !== '' ||
    filterCategorie !== 'all' ||
    filterCompte !== 'all' ||
    filterStatut !== 'all' ||
    filterMontantMin !== '' ||
    filterMontantMax !== '' ||
    filterDateDebut !== '' ||
    filterDateFin !== '';

  const transactionsFiltrees = transactions.filter(t => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const dateStr  = t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '';
      const montantStr = t.montant !== undefined ? String(Math.abs(t.montant)) : '';
      const matchSearch =
        (t.description || '').toLowerCase().includes(term) ||
        (t.categorie   || '').toLowerCase().includes(term) ||
        (t.compte      || '').toLowerCase().includes(term) ||
        (t.statut      || '').toLowerCase().includes(term) ||
        dateStr.includes(term) ||
        montantStr.includes(term);
      if (!matchSearch) return false;
    }
    if (filterCategorie !== 'all' && t.categorie !== filterCategorie) return false;
    if (filterCompte    !== 'all' && t.compte    !== filterCompte)    return false;
    if (filterStatut !== 'all') {
      const statut = t.statut || (t.confirme ? 'confirmée' : 'en attente');
      if (filterStatut === 'confirmee' && statut !== 'confirmée') return false;
      if (filterStatut === 'attente'   && statut === 'confirmée') return false;
    }
    if (filterMontantMin !== '' && Math.abs(t.montant) < parseFloat(filterMontantMin)) return false;
    if (filterMontantMax !== '' && Math.abs(t.montant) > parseFloat(filterMontantMax)) return false;
    if (filterDateDebut  !== '' && new Date(t.date) < new Date(filterDateDebut))        return false;
    if (filterDateFin    !== '' && new Date(t.date) > new Date(filterDateFin + 'T23:59:59')) return false;
    return true;
  });

  const transactionsTriees = [...transactionsFiltrees].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // ✅ Transactions du jour syncées = à mettre en surbrillance
  const idsTransactionsDuJour = new Set(
    transactions
      .filter(t => t.isSynced && new Date(t.date).toISOString().split('T')[0] === dateAujourdhui)
      .map(t => t.id)
  );

  const nbDuJourRestants = [...idsTransactionsDuJour].filter(id => !verifiedIds.has(id)).length;

  const handleVerified = useCallback((id) => {
    setVerifiedIds(prev => new Set([...prev, id]));
  }, []);

  // ✅ Tout valider d'un coup
  const handleToutValider = () => {
    setVerifiedIds(new Set([...verifiedIds, ...idsTransactionsDuJour]));
  };

  const comptesDisponibles = comptes && comptes.length > 0
    ? comptes
    : [...new Set(transactions.map(t => t.compte).filter(Boolean))].map(nom => ({ nom }));

  let firstHighlightedSet = false;

  return (
    <>
      {/* ═══ BANDEAU "TOUT VALIDER" si transactions du jour visibles ═══ */}
      {filtreDate && nbDuJourRestants > 0 && (
        <div
          ref={validationBandeauRef}
          className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏦</span>
            <div>
              <p className="font-semibold text-amber-900">
                {nbDuJourRestants} transaction{nbDuJourRestants > 1 ? 's' : ''} du jour à vérifier
              </p>
              <p className="text-xs text-amber-700">
                Vérifiez que chaque catégorie est correcte, puis cliquez sur 🛡️ pour valider
              </p>
            </div>
          </div>
          <button
            onClick={handleToutValider}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all whitespace-nowrap"
          >
            <ShieldCheck size={18} />
            Tout valider
          </button>
        </div>
      )}

      {/* ═══ RECHERCHE & FILTRES ═══ */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recherche et filtres</h3>
          <div className="flex gap-2">
            {hasFiltresActifs && (
              <button
                onClick={resetFiltres}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
              >
                <X size={14} />
                Réinitialiser
              </button>
            )}
            <button
              onClick={() => setShowFiltresAvances(!showFiltresAvances)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                showFiltresAvances
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={16} />
              Filtres avancés
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher sur toutes les colonnes (date, description, catégorie, compte, montant, statut...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={filterCategorie}
            onChange={e => setFilterCategorie(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          >
            <option value="all">Toutes catégories</option>
            {[...categoriesDepenses, ...categoriesRevenus, ...categoriesEpargnes].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {showFiltresAvances && (
          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">🏦 Compte</label>
              <select
                value={filterCompte}
                onChange={e => setFilterCompte(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">Tous les comptes</option>
                {comptesDisponibles.map(c => (
                  <option key={c.nom} value={c.nom}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">✅ Statut</label>
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="confirmee">✅ Confirmée</option>
                <option value="attente">⏳ En attente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">💶 Montant (€)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMontantMin}
                  onChange={e => setFilterMontantMin(e.target.value)}
                  className="w-1/2 px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMontantMax}
                  onChange={e => setFilterMontantMax(e.target.value)}
                  className="w-1/2 px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">📅 Date de début</label>
              <input
                type="date"
                value={filterDateDebut}
                onChange={e => setFilterDateDebut(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">📅 Date de fin</label>
              <input
                type="date"
                value={filterDateFin}
                onChange={e => setFilterDateFin(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        )}

        {hasFiltresActifs && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700 flex items-center justify-between">
            <span>
              🔍 <strong>{transactionsFiltrees.length}</strong> résultat{transactionsFiltrees.length !== 1 ? 's' : ''} sur <strong>{transactions.length}</strong> transactions
            </span>
            <button onClick={resetFiltres} className="text-blue-500 hover:text-blue-700 underline text-xs">
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* ═══ TABLEAU ═══ */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold">Date</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Description</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Catégorie</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Compte</th>
                <th className="px-6 py-4 text-right text-sm font-bold">Montant</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Statut</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactionsTriees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="opacity-30" />
                      <p className="font-medium">Aucune transaction trouvée</p>
                      <p className="text-sm">Essayez de modifier vos critères de recherche</p>
                      {hasFiltresActifs && (
                        <button
                          onClick={resetFiltres}
                          className="mt-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-xl text-sm hover:bg-blue-200 transition-all"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transactionsTriees.map((transaction) => {
                  const isHighlighted = idsTransactionsDuJour.has(transaction.id);
                  // ✅ Ref sur la première ligne en surbrillance pour le scroll auto
                  let refProp = {};
                  if (isHighlighted && !firstHighlightedSet) {
                    firstHighlightedSet = true;
                    refProp = {
                      ref: (el) => { firstHighlightedRef.current = el; }
                    };
                  }
                  return (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      onDelete={onDeleteTransaction}
                      highlighted={isHighlighted}
                      onVerified={handleVerified}
                      {...refProp}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};