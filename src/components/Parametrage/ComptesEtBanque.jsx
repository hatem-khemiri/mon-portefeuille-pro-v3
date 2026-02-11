import { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { BankConnection } from '../Bank/BankConnection';
import { Plus, Edit2, Trash2, Eye, EyeOff, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

export const ComptesEtBanque = () => {
  const { comptes, setComptes, transactions, setTransactions, currentUser } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'courant',
    solde: '',
    devise: 'EUR',
    masque: false
  });

  const typesCompte = [
    { value: 'courant', label: '💳 Compte Courant', icon: CreditCard },
    { value: 'epargne', label: '💰 Compte Épargne', icon: TrendingUp },
    { value: 'livret', label: '📊 Livret', icon: TrendingUp },
    { value: 'investissement', label: '📈 Investissement', icon: TrendingUp }
  ];

  const handleSubmit = () => {
    if (!formData.nom) {
      alert('❌ Veuillez entrer un nom de compte');
      return;
    }

    if (editingId) {
      setComptes(comptes.map(c => 
        c.id === editingId 
          ? { ...c, ...formData, solde: parseFloat(formData.solde) || 0 }
          : c
      ));
    } else {
      const newCompte = {
        id: Date.now(),
        ...formData,
        solde: parseFloat(formData.solde) || 0,
        soldeInitial: parseFloat(formData.solde) || 0
      };
      setComptes([...comptes, newCompte]);
    }

    setFormData({
      nom: '',
      type: 'courant',
      solde: '',
      devise: 'EUR',
      masque: false
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (compte) => {
    setEditingId(compte.id);
    setFormData({
      nom: compte.nom,
      type: compte.type,
      solde: compte.solde.toString(),
      devise: compte.devise || 'EUR',
      masque: compte.masque || false
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('❓ Supprimer ce compte ? Les transactions associées ne seront pas supprimées.')) {
      setComptes(comptes.filter(c => c.id !== id));
    }
  };

  const bankConnection = localStorage.getItem(`bank_connection_${currentUser}`);
  const isBankConnected = !!bankConnection;
  const connectedBankName = isBankConnected ? JSON.parse(bankConnection).bankName : null;

  const handleDisconnectBank = () => {
    if (confirm('⚠️ Déconnecter votre banque ? Cela supprimera toutes les transactions synchronisées et la connexion.')) {
      const updatedTransactions = transactions.filter(t => !t.isSynced && !t.bridgeId);
      setTransactions(updatedTransactions);
      
      const keysToRemove = [
        `bank_connection_${currentUser}`,
        `bank_token_${currentUser}`,
        `bank_accounts_${currentUser}`,
        `bank_sync_date_${currentUser}`,
        `last_sync_${currentUser}`
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      Object.keys(localStorage).forEach(key => {
        if (key.includes(currentUser) && (key.startsWith('bank_') || key.startsWith('bridge_'))) {
          localStorage.removeItem(key);
        }
      });
      
      alert('✅ Banque déconnectée et transactions synchronisées supprimées');
      window.location.reload();
    }
  };

  const totalSolde = comptes.reduce((sum, c) => sum + (c.solde || 0), 0);

  return (
    <div className="space-y-6">
      {/* ═══ SYNCHRONISATION BANCAIRE ═══ */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          🏦 Synchronisation bancaire
        </h3>
        
        {isBankConnected ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 mb-1">✅ Banque connectée</p>
                  <p className="text-lg font-bold text-green-900">{connectedBankName}</p>
                </div>
                <button
                  onClick={handleDisconnectBank}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all text-sm"
                >
                  Déconnecter
                </button>
              </div>
            </div>
            
            <BankConnection />
          </div>
        ) : (
          <BankConnection />
        )}
      </div>

      {/* ═══ MES COMPTES ═══ */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              💳 Mes comptes bancaires
              <span className="bg-blue-500 text-white text-sm font-bold px-2 py-1 rounded-full">
                {comptes.length}
              </span>
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Gérez vos comptes courants, épargne et investissements
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            {editingId ? 'Annuler' : 'Ajouter un compte'}
          </button>
        </div>

        {/* Formulaire d'ajout/édition */}
        {showForm && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-blue-900 mb-4">
              {editingId ? '✏️ Modifier le compte' : '➕ Nouveau compte'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du compte
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Compte Courant Principal"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de compte
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {typesCompte.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solde initial (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.solde}
                  onChange={(e) => setFormData({ ...formData, solde: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Devise
                </label>
                <select
                  value={formData.devise}
                  onChange={(e) => setFormData({ ...formData, devise: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF (Fr)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="masque"
                checked={formData.masque}
                onChange={(e) => setFormData({ ...formData, masque: e.target.checked })}
                className="w-4 h-4 accent-blue-500"
              />
              <label htmlFor="masque" className="text-sm text-gray-700">
                Masquer ce compte dans les statistiques
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium"
              >
                ✓ {editingId ? 'Sauvegarder' : 'Ajouter'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({
                    nom: '',
                    type: 'courant',
                    solde: '',
                    devise: 'EUR',
                    masque: false
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des comptes */}
        {comptes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">📭 Aucun compte configuré</p>
            <p className="text-sm mt-2">Ajoutez votre premier compte pour commencer</p>
          </div>
        ) : (
          <>
            {/* Résumé total */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 mb-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Solde total</p>
                  <p className="text-3xl font-bold">{totalSolde.toFixed(2)} €</p>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-90">{comptes.length} compte{comptes.length > 1 ? 's' : ''}</p>
                  <p className="text-lg font-medium">{comptes.filter(c => !c.masque).length} visible{comptes.filter(c => !c.masque).length > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Cartes des comptes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comptes.map((compte) => (
                <div
                  key={compte.id}
                  className={`rounded-xl p-4 border-2 transition-all ${
                    compte.masque 
                      ? 'bg-gray-100 border-gray-300 opacity-60' 
                      : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-800">{compte.nom}</h4>
                        {compte.masque && <EyeOff size={14} className="text-gray-500" />}
                        {compte.isSynced && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Synchronisé</span>}
                      </div>
                      <p className="text-xs text-gray-600">
                        {typesCompte.find(t => t.value === compte.type)?.label || compte.type}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(compte)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(compte.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Solde actuel</p>
                      <p className={`text-2xl font-bold ${compte.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {compte.solde?.toFixed(2)} {compte.devise || '€'}
                      </p>
                    </div>
                    {compte.solde !== compte.soldeInitial && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Évolution</p>
                        <p className={`text-sm font-medium flex items-center gap-1 ${
                          (compte.solde - compte.soldeInitial) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(compte.solde - compte.soldeInitial) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(compte.solde - compte.soldeInitial).toFixed(2)} €
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══ AIDE ═══ */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 Comment ça marche ?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Synchronisation bancaire :</strong> Connectez votre banque pour importer automatiquement vos transactions</li>
          <li>• <strong>Déconnexion :</strong> Supprime la connexion ET toutes les transactions synchronisées</li>
          <li>• <strong>Comptes manuels :</strong> Ajoutez des comptes non synchronisés (espèces, comptes non supportés)</li>
          <li>• <strong>Masquer un compte :</strong> Exclut le compte des statistiques globales sans le supprimer</li>
        </ul>
      </div>
    </div>
  );
};