import { useState } from 'react';
import { usePrevisionnel } from '../../hooks/usePrevisionnel';
import { useChargesFixes } from '../../hooks/useChargesFixes';
import { RefreshCw, Check, X, Plus } from 'lucide-react';

export function TransactionsRecurrentes() {
  const { recurrencesNouvellesUniques } = usePrevisionnel();
  const { addChargeFixe } = useChargesFixes();
  
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  const handleAccept = (recurrence) => {
    setAcceptedIds(prev => [...prev, recurrence.id]);
    alert(`✅ Récurrence "${recurrence.nom}" acceptée`);
  };

  const handleAddAsChargeFixe = (recurrence) => {
    const newCharge = {
      nom: recurrence.nom,
      montant: recurrence.montant,
      categorie: recurrence.categorie,
      frequence: recurrence.frequence.toLowerCase(),
      compte: recurrence.compte
    };

    addChargeFixe(newCharge);
    setAcceptedIds(prev => [...prev, recurrence.id]);
    alert(`✅ "${recurrence.nom}" ajoutée aux charges fixes`);
  };

  const handleDismiss = (recurrence) => {
    setDismissedIds(prev => [...prev, recurrence.id]);
  };

  const getFrequenceColor = (frequence) => {
    const freq = frequence.toLowerCase();
    if (freq.includes('quotidien')) return 'bg-purple-100 text-purple-700';
    if (freq.includes('hebdo')) return 'bg-blue-100 text-blue-700';
    if (freq.includes('bimens')) return 'bg-cyan-100 text-cyan-700';
    if (freq.includes('mensuel')) return 'bg-green-100 text-green-700';
    if (freq.includes('trimestriel')) return 'bg-yellow-100 text-yellow-700';
    if (freq.includes('semestriel')) return 'bg-orange-100 text-orange-700';
    if (freq.includes('annuel')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const visibleRecurrences = recurrencesNouvellesUniques.filter(
    r => !acceptedIds.includes(r.id) && !dismissedIds.includes(r.id)
  );

  const acceptedRecurrences = recurrencesNouvellesUniques.filter(
    r => acceptedIds.includes(r.id)
  );

  if (visibleRecurrences.length === 0 && acceptedRecurrences.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="text-blue-600" />
          Transactions récurrentes détectées
        </h3>
        
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 mb-2">Aucune récurrence détectée pour le moment</p>
          <p className="text-sm text-gray-500">
            Synchronisez votre banque pour détecter automatiquement vos dépenses récurrentes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="text-blue-600" />
          Transactions récurrentes détectées ({visibleRecurrences.length})
        </h3>

        <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            💡 Ces transactions ont été détectées automatiquement à partir de votre historique bancaire. 
            Vous pouvez les accepter, les ignorer ou les ajouter comme charges fixes.
          </p>
        </div>

        <div className="space-y-3">
          {visibleRecurrences.map((recurrence) => (
            <div
              key={recurrence.id}
              className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-1">
                    {recurrence.nom}
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getFrequenceColor(recurrence.frequence)}`}>
                      {recurrence.frequence}
                    </span>
                    <span className="text-sm text-gray-600">
                      {recurrence.nombreOccurrences} occurrences
                    </span>
                    <span className="text-sm text-gray-600">•</span>
                    <span className="text-sm text-gray-600">
                      {recurrence.compte}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-800">
                    {recurrence.montant.toFixed(2)} €
                  </p>
                  <p className="text-xs text-gray-500">
                    {recurrence.categorie}
                  </p>
                </div>
              </div>

              {recurrence.dates && recurrence.dates.length > 0 && (
                <div className="text-xs text-gray-600 mb-3">
                  Dates détectées : {recurrence.dates.slice(0, 3).map(d => 
                    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                  ).join(', ')}
                  {recurrence.dates.length > 3 && ` +${recurrence.dates.length - 3} autres`}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAccept(recurrence)}
                  className="py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center justify-center gap-1 text-sm"
                >
                  <Check size={16} />
                  Accepter
                </button>
                <button
                  onClick={() => handleAddAsChargeFixe(recurrence)}
                  className="py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-1 text-sm"
                >
                  <Plus size={16} />
                  Charge fixe
                </button>
                <button
                  onClick={() => handleDismiss(recurrence)}
                  className="py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all flex items-center justify-center gap-1 text-sm"
                >
                  <X size={16} />
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liste des récurrences acceptées */}
      {acceptedRecurrences.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold mb-4 text-green-700">
            ✅ Récurrences acceptées ({acceptedRecurrences.length})
          </h3>
          <div className="space-y-2">
            {acceptedRecurrences.map((rec) => (
              <div key={rec.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm font-medium text-green-800">{rec.nom}</span>
                  <span className="text-xs text-green-600">{rec.montant.toFixed(2)} € / {rec.frequence}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddAsChargeFixe(rec)}
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-all flex items-center gap-1"
                  >
                    <Plus size={12} /> Ajouter comme charge fixe
                  </button>
                  <button
                    onClick={() => setAcceptedIds(prev => prev.filter(id => id !== rec.id))}
                    className="text-gray-400 hover:text-gray-600 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}