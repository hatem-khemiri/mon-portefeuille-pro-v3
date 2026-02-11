import { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { usePrevisionnel } from '../../hooks/usePrevisionnel';
import { useChargesFixes } from '../../hooks/useChargesFixes';
import { Plus, Edit2, Trash2, X, Check, Calendar, Euro, Tag, Building2, Save } from 'lucide-react';

export const ChargesRecurrentes = () => {
  const { chargesFixes, comptes } = useFinance();
  const { recurrencesNouvellesUniques } = usePrevisionnel();
  const { addChargeFixe, updateChargeFixe, deleteChargeFixe } = useChargesFixes();

  const [dismissedIds, setDismissedIds] = useState([]);
  const [editingRecurrenceId, setEditingRecurrenceId] = useState(null);
  const [editingChargeId, setEditingChargeId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    montant: '',
    categorie: 'Autres dépenses',
    frequence: 'mensuelle',
    compte: comptes[0]?.nom || '',
    jourMois: 1
  });

  const visibleRecurrences = recurrencesNouvellesUniques.filter(
    r => !dismissedIds.includes(r.id)
  );

  // ✅ HELPER : Déterminer si une catégorie est un revenu
  const isRevenu = (categorie) => {
    const categoriesRevenus = ['Salaire', 'Prime', 'Freelance', 'Investissements', 'Autres revenus'];
    return categoriesRevenus.includes(categorie);
  };

  const handleEditRecurrence = (recurrence) => {
    setEditingRecurrenceId(recurrence.id);
    setFormData({
      nom: recurrence.nom,
      montant: Math.abs(recurrence.montant).toString(),
      categorie: recurrence.categorie,
      frequence: recurrence.frequence.toLowerCase(),
      compte: recurrence.compte,
      jourMois: 1
    });
  };

  const handleSaveRecurrence = (recurrenceId) => {
    const montantBase = parseFloat(formData.montant);
    const montantFinal = isRevenu(formData.categorie) ? Math.abs(montantBase) : -Math.abs(montantBase);
    
    const newCharge = {
      nom: formData.nom,
      montant: montantFinal,
      categorie: formData.categorie,
      frequence: formData.frequence,
      compte: formData.compte,
      jourMois: parseInt(formData.jourMois)
    };

    addChargeFixe(newCharge);
    setDismissedIds(prev => [...prev, recurrenceId]);
    setEditingRecurrenceId(null);
    setFormData({
      nom: '',
      montant: '',
      categorie: 'Autres dépenses',
      frequence: 'mensuelle',
      compte: comptes[0]?.nom || '',
      jourMois: 1
    });
  };

  const handleAddRecurrence = (recurrence) => {
    const montantBase = Math.abs(recurrence.montant);
    const montantFinal = isRevenu(recurrence.categorie) ? montantBase : -montantBase;
    
    const newCharge = {
      nom: recurrence.nom,
      montant: montantFinal,
      categorie: recurrence.categorie,
      frequence: recurrence.frequence.toLowerCase(),
      compte: recurrence.compte,
      jourMois: 1
    };

    addChargeFixe(newCharge);
    setDismissedIds(prev => [...prev, recurrence.id]);
  };

  const handleDismissRecurrence = (recurrenceId) => {
    setDismissedIds(prev => [...prev, recurrenceId]);
    if (editingRecurrenceId === recurrenceId) {
      setEditingRecurrenceId(null);
    }
  };

  const handleAddManual = () => {
    if (!formData.nom || !formData.montant) {
      alert('❌ Veuillez remplir au minimum le nom et le montant');
      return;
    }

    const montantBase = parseFloat(formData.montant);
    const montantFinal = isRevenu(formData.categorie) ? Math.abs(montantBase) : -Math.abs(montantBase);

    addChargeFixe({
      ...formData,
      montant: montantFinal
    });

    setFormData({
      nom: '',
      montant: '',
      categorie: 'Autres dépenses',
      frequence: 'mensuelle',
      compte: comptes[0]?.nom || '',
      jourMois: 1
    });
    setShowAddForm(false);
  };

  const handleEditCharge = (charge) => {
    setEditingChargeId(charge.id);
    setFormData({
      nom: charge.nom,
      montant: Math.abs(charge.montant).toString(),
      categorie: charge.categorie,
      frequence: charge.frequence,
      compte: charge.compte,
      jourMois: charge.jourMois || 1
    });
  };

  const handleSaveCharge = () => {
    const montantBase = parseFloat(formData.montant);
    const montantFinal = isRevenu(formData.categorie) ? Math.abs(montantBase) : -Math.abs(montantBase);
    
    updateChargeFixe(editingChargeId, {
      ...formData,
      montant: montantFinal
    });
    setEditingChargeId(null);
    setFormData({
      nom: '',
      montant: '',
      categorie: 'Autres dépenses',
      frequence: 'mensuelle',
      compte: comptes[0]?.nom || '',
      jourMois: 1
    });
  };

  const handleDelete = (id) => {
    if (confirm('❓ Supprimer cette charge/revenu fixe ?')) {
      deleteChargeFixe(id);
    }
  };

  const getFrequenceColor = (frequence) => {
    const freq = (frequence || 'mensuelle').toLowerCase();
    if (freq.includes('quotidien')) return 'bg-purple-100 text-purple-700';
    if (freq.includes('hebdo')) return 'bg-blue-100 text-blue-700';
    if (freq.includes('bimens')) return 'bg-cyan-100 text-cyan-700';
    if (freq.includes('mensuel')) return 'bg-green-100 text-green-700';
    if (freq.includes('trimestriel')) return 'bg-yellow-100 text-yellow-700';
    if (freq.includes('semestriel')) return 'bg-orange-100 text-orange-700';
    if (freq.includes('annuel')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const categories = [
    'Salaire', 'Prime', 'Freelance', 'Investissements', 'Autres revenus',
    'Loyer', 'Courses', 'Restaurants', 'Transport', 'Loisirs', 
    'Santé', 'Logement', 'Abonnements', 'Retraits', 'Autres dépenses'
  ];

  const frequences = ['quotidienne', 'hebdomadaire', 'bimensuelle', 'mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'];

  return (
    <div className="space-y-6">
      {/* ═══ RÉCURRENCES DÉTECTÉES ═══ */}
      {visibleRecurrences.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                🔍 Récurrences détectées automatiquement
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {visibleRecurrences.length}
                </span>
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Ces transactions récurrentes ont été identifiées dans votre historique bancaire
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {visibleRecurrences.map((recurrence) => {
              const estRevenu = isRevenu(recurrence.categorie);
              const montantAbs = Math.abs(recurrence.montant);
              
              return (
                <div
                  key={recurrence.id}
                  className="bg-white border-2 border-amber-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  {editingRecurrenceId === recurrence.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                          <input
                            type="text"
                            value={formData.nom}
                            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Montant (€)</label>
                          <input
                            type="number"
                            value={formData.montant}
                            onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                          <select
                            value={formData.categorie}
                            onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fréquence</label>
                          <select
                            value={formData.frequence}
                            onChange={(e) => setFormData({ ...formData, frequence: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none"
                          >
                            {frequences.map(freq => (
                              <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveRecurrence(recurrence.id)}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium flex items-center justify-center gap-1"
                        >
                          <Save size={16} />
                          Enregistrer et Ajouter
                        </button>
                        <button
                          onClick={() => setEditingRecurrenceId(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                          <span className={`text-2xl font-bold ${estRevenu ? 'text-green-600' : 'text-red-600'}`}>
                            {estRevenu ? '+' : '−'}
                          </span>
                          {recurrence.nom}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getFrequenceColor(recurrence.frequence)}`}>
                            📅 {recurrence.frequence}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                            🏷️ {recurrence.categorie}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                            🏦 {recurrence.compte}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">
                            🔁 {recurrence.nombreOccurrences} mois détectés
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className={`text-xs font-medium mb-1 ${estRevenu ? 'text-green-700' : 'text-red-700'}`}>
                            {estRevenu ? 'Revenu' : 'Dépense'}
                          </p>
                          <p className={`text-xl font-bold ${estRevenu ? 'text-green-600' : 'text-red-600'}`}>
                            {estRevenu ? '+' : '−'}{montantAbs.toFixed(2)} €
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditRecurrence(recurrence)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                            title="Modifier avant d'ajouter"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleAddRecurrence(recurrence)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center gap-1 text-sm font-medium"
                          >
                            <Check size={16} />
                            Ajouter
                          </button>
                          <button
                            onClick={() => handleDismissRecurrence(recurrence.id)}
                            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ CHARGES & REVENUS FIXES CONFIRMÉS ═══ */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              ✅ Mes transactions récurrentes confirmées
              <span className="bg-blue-500 text-white text-sm font-bold px-2 py-1 rounded-full">
                {chargesFixes.length}
              </span>
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Revenus et dépenses qui reviennent régulièrement
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Ajouter manuellement
          </button>
        </div>

        {/* Formulaire d'ajout manuel */}
        {showAddForm && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
            <h4 className="font-bold text-blue-900 mb-4">➕ Nouvelle transaction récurrente</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Tag size={14} className="inline mr-1" />
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Loyer, Salaire..."
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Euro size={14} className="inline mr-1" />
                  Montant (€)
                </label>
                <input
                  type="number"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  placeholder="Montant (ex: 2000)"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
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
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Fréquence
                </label>
                <select
                  value={formData.frequence}
                  onChange={(e) => setFormData({ ...formData, frequence: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {frequences.map(freq => (
                    <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
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
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {comptes.map(compte => (
                    <option key={compte.id} value={compte.nom}>{compte.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Jour du mois
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.jourMois}
                  onChange={(e) => setFormData({ ...formData, jourMois: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mt-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Astuce :</strong> Le signe +/− sera déterminé automatiquement selon la catégorie choisie. 
                Les catégories comme "Salaire", "Prime", etc. sont des revenus (+), les autres sont des dépenses (−).
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddManual}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium"
              >
                ✓ Ajouter
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Liste des charges fixes */}
        {chargesFixes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">📭 Aucune transaction récurrente configurée</p>
            <p className="text-sm mt-2">Ajoutez-en manuellement ou synchronisez votre banque pour détecter les récurrences</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chargesFixes.map((charge) => {
              const estRevenu = charge.montant >= 0;
              const montantAbs = Math.abs(charge.montant);
              
              return (
                <div
                  key={charge.id}
                  className="bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  {editingChargeId === charge.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={formData.nom}
                          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                          className="px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={formData.montant}
                          onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                          className="px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        />
                        <select
                          value={formData.frequence}
                          onChange={(e) => setFormData({ ...formData, frequence: e.target.value })}
                          className="px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        >
                          {frequences.map(freq => (
                            <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveCharge}
                          className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium"
                        >
                          ✓ Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingChargeId(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                          <span className={`text-2xl font-bold ${estRevenu ? 'text-green-600' : 'text-red-600'}`}>
                            {estRevenu ? '+' : '−'}
                          </span>
                          {charge.nom}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getFrequenceColor(charge.frequence)}`}>
                            📅 {charge.frequence}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                            🏷️ {charge.categorie}
                          </span>
                          {charge.compte && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                              🏦 {charge.compte}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className={`text-xs font-medium mb-1 ${estRevenu ? 'text-green-700' : 'text-red-700'}`}>
                            {estRevenu ? 'Revenu' : 'Dépense'}
                          </p>
                          <p className={`text-2xl font-bold ${estRevenu ? 'text-green-600' : 'text-red-600'}`}>
                            {estRevenu ? '+' : '−'}{montantAbs.toFixed(2)} €
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCharge(charge)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(charge.id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ AIDE ═══ */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 Comment ça marche ?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Récurrences détectées :</strong> Analysées automatiquement depuis vos transactions bancaires synchronisées</li>
          <li>• <strong>Signe + (vert) :</strong> Revenus (Salaire, Prime, Freelance, Investissements, Autres revenus)</li>
          <li>• <strong>Signe − (rouge) :</strong> Dépenses (toutes les autres catégories)</li>
          <li>• <strong>Ajout automatique :</strong> Le montant est converti selon la catégorie choisie</li>
          <li>• <strong>Calcul automatique :</strong> Utilisées dans le mode "Automatique" du Prévisionnel</li>
        </ul>
      </div>
    </div>
  );
};