import { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Plus, Edit2, Trash2, Calendar, Euro, Tag, AlertCircle, Building2 } from 'lucide-react';

export const MemosBudgetaires = () => {
  const { memosBudgetaires, setMemosBudgetaires, transactions, setTransactions, comptes } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    date: '',
    montant: '',
    categorie: 'Autres dépenses',
    compte: comptes[0]?.nom || '' // 🆕 AJOUT
  });

  const categories = [
    'Impôts', 'Anniversaire', 'Mariage', 'Voyage', 'Cadeaux',
    'Travaux', 'Électroménager', 'Voiture', 'Santé', 'Autres dépenses'
  ];

  // Générer automatiquement une transaction "à venir" pour chaque mémo
  const generateTransaction = (memo) => {
    return {
      id: `memo_${memo.id}`,
      description: `📝 ${memo.description}`,
      montant: -Math.abs(parseFloat(memo.montant)), // Toujours négatif (dépense)
      date: memo.date,
      categorie: memo.categorie,
      type: 'depense',
      statut: 'a_venir',
      compte: memo.compte, // 🆕 COMPTE DU MÉMO
      isMemo: true,
      memoId: memo.id,
      createdAt: new Date().toISOString()
    };
  };

  const handleSubmit = () => {
    if (!formData.description || !formData.date || !formData.montant || !formData.compte) {
      alert('❌ Veuillez remplir tous les champs');
      return;
    }

    if (editingId) {
      // Modification
      const updatedMemos = memosBudgetaires.map(m => 
        m.id === editingId ? { ...m, ...formData, montant: parseFloat(formData.montant) } : m
      );
      setMemosBudgetaires(updatedMemos);

      // Mettre à jour la transaction associée
      const updatedMemo = updatedMemos.find(m => m.id === editingId);
      const updatedTransactions = transactions.map(t =>
        t.memoId === editingId ? generateTransaction(updatedMemo) : t
      );
      setTransactions(updatedTransactions);
    } else {
      // Ajout
      const newMemo = {
        id: Date.now(),
        ...formData,
        montant: parseFloat(formData.montant),
        createdAt: new Date().toISOString()
      };
      setMemosBudgetaires([...memosBudgetaires, newMemo]);

      // ✅ Créer automatiquement la transaction "à venir"
      const newTransaction = generateTransaction(newMemo);
      setTransactions([...transactions, newTransaction]);
    }

    // Reset
    setFormData({
      description: '',
      date: '',
      montant: '',
      categorie: 'Autres dépenses',
      compte: comptes[0]?.nom || ''
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (memo) => {
    setEditingId(memo.id);
    setFormData({
      description: memo.description,
      date: memo.date,
      montant: memo.montant.toString(),
      categorie: memo.categorie,
      compte: memo.compte
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('❓ Supprimer ce mémo et sa transaction associée ?')) {
      setMemosBudgetaires(memosBudgetaires.filter(m => m.id !== id));
      
      // ✅ Supprimer aussi la transaction générée
      setTransactions(transactions.filter(t => t.memoId !== id));
    }
  };

  const totalBudget = memosBudgetaires.reduce((sum, m) => sum + (m.montant || 0), 0);

  // Trier par date
  const memosSorted = [...memosBudgetaires].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Mémos par mois
  const memosByMonth = memosSorted.reduce((acc, memo) => {
    const month = new Date(memo.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(memo);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              📝 Mes mémos budgétaires
              <span className="bg-purple-500 text-white text-sm font-bold px-2 py-1 rounded-full">
                {memosBudgetaires.length}
              </span>
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Planifiez vos dépenses ponctuelles (impôts, anniversaires, voyages...)
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            {editingId ? 'Annuler' : 'Ajouter un mémo'}
          </button>
        </div>

        {/* Info importante */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">💡 Fonctionnement automatique</p>
            <p>Chaque mémo créé génère automatiquement une <strong>transaction "à venir"</strong> dans vos finances et impacte votre <strong>budget prévisionnel</strong>.</p>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-purple-900 mb-4">
              {editingId ? '✏️ Modifier le mémo' : '➕ Nouveau mémo budgétaire'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag size={14} className="inline mr-1" />
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Anniversaire Maman, Impôts 2025, Vacances été..."
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Date prévue
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Euro size={14} className="inline mr-1" />
                  Budget alloué (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag size={14} className="inline mr-1" />
                  Catégorie
                </label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 size={14} className="inline mr-1" />
                  Compte
                </label>
                <select
                  value={formData.compte}
                  onChange={(e) => setFormData({ ...formData, compte: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  {comptes.map(c => (
                    <option key={c.id} value={c.nom}>{c.nom}</option>
                  ))}
                </select>
              </div>
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
                    description: '',
                    date: '',
                    montant: '',
                    categorie: 'Autres dépenses',
                    compte: comptes[0]?.nom || ''
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Résumé */}
        {memosBudgetaires.length > 0 && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-4 mb-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Budget total planifié</p>
                <p className="text-3xl font-bold">{totalBudget.toFixed(2)} €</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Événements à venir</p>
                <p className="text-lg font-medium">{memosBudgetaires.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Liste des mémos */}
        {memosBudgetaires.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">📭 Aucun mémo budgétaire</p>
            <p className="text-sm mt-2">Ajoutez vos dépenses ponctuelles à venir</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(memosByMonth).map(([month, memos]) => (
              <div key={month}>
                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  {month}
                  <span className="text-sm font-normal text-gray-500">
                    ({memos.reduce((sum, m) => sum + m.montant, 0).toFixed(2)} €)
                  </span>
                </h4>
                <div className="space-y-2">
                  {memos.map((memo) => (
                    <div
                      key={memo.id}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-gray-800">{memo.description}</h5>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              {memo.categorie}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              🏦 {memo.compte}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            📅 {new Date(memo.date).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <p className="text-2xl font-bold text-purple-600">
                            {memo.montant.toFixed(2)} €
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(memo)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(memo.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AIDE */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 Comment ça marche ?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Dépenses ponctuelles :</strong> Planifiez vos grosses dépenses à venir</li>
          <li>• <strong>Transaction automatique :</strong> Chaque mémo créé génère une transaction "à venir"</li>
          <li>• <strong>Impact prévisionnel :</strong> Inclus automatiquement dans votre budget</li>
          <li>• <strong>Compte associé :</strong> La transaction sera débitée du compte choisi</li>
        </ul>
      </div>
    </div>
  );
};