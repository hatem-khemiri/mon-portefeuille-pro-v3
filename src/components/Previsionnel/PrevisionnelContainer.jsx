import { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { RefreshCw, Save, Calculator, Edit2 } from 'lucide-react';

export const PrevisionnelContainer = ({ setActiveTab }) => {
  const { 
    budgetPrevisionnel, 
    setBudgetPrevisionnel,
    modeCalculPrevisionnel,
    setModeCalculPrevisionnel,
    chargesFixes,
    transactions
  } = useFinance();

  const [budgetLocal, setBudgetLocal] = useState({
    revenus: Array(12).fill(0),
    epargnes: Array(12).fill(0),
    factures: Array(12).fill(0),
    depenses: Array(12).fill(0)
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (budgetPrevisionnel) {
      setBudgetLocal(budgetPrevisionnel);
    }
  }, [budgetPrevisionnel]);

  // Calcul automatique du budget
  const calculerBudgetAutomatique = () => {
    const nouveauBudget = {
      revenus: Array(12).fill(0),
      epargnes: Array(12).fill(0),
      factures: Array(12).fill(0),
      depenses: Array(12).fill(0)
    };

    // Calculer à partir des charges fixes
    chargesFixes.forEach(charge => {
      if (charge.type === 'revenu') {
        nouveauBudget.revenus = nouveauBudget.revenus.map(v => v + Math.abs(charge.montant));
      } else if (charge.categorie === 'Épargne') {
        nouveauBudget.epargnes = nouveauBudget.epargnes.map(v => v + Math.abs(charge.montant));
      } else if (['Loyer', 'Énergie', 'Internet & Téléphone', 'Assurances'].includes(charge.categorie)) {
        nouveauBudget.factures = nouveauBudget.factures.map(v => v + Math.abs(charge.montant));
      } else {
        nouveauBudget.depenses = nouveauBudget.depenses.map(v => v + Math.abs(charge.montant));
      }
    });

    setBudgetLocal(nouveauBudget);
    setBudgetPrevisionnel(nouveauBudget);
    setIsEditing(false);
  };

  const handleSave = () => {
    setBudgetPrevisionnel(budgetLocal);
    setIsEditing(false);
  };

  const handleChangeMoisValue = (categorie, moisIndex, value) => {
    const newValue = parseFloat(value) || 0;
    setBudgetLocal(prev => ({
      ...prev,
      [categorie]: prev[categorie].map((v, i) => i === moisIndex ? newValue : v)
    }));
  };

  const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return (
    <div className="space-y-6">
      {/* EN-TÊTE */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">⚙️ Configuration du Prévisionnel</h2>
            <p className="text-gray-600 mt-1">
              Gérez vos budgets prévisionnels mensuels
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl font-medium hover:bg-blue-200 transition-all"
            >
              📊 Voir les graphiques
            </button>
          </div>
        </div>

        {/* MODE DE CALCUL */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Calculator size={20} />
            Mode de Calcul
          </h3>
          
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="automatique"
                checked={modeCalculPrevisionnel === 'automatique'}
                onChange={() => setModeCalculPrevisionnel('automatique')}
                className="w-5 h-5 accent-purple-500"
              />
              <span className="font-medium text-gray-700">🤖 Automatique</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="manuel"
                checked={modeCalculPrevisionnel === 'manuel'}
                onChange={() => setModeCalculPrevisionnel('manuel')}
                className="w-5 h-5 accent-purple-500"
              />
              <span className="font-medium text-gray-700">✏️ Manuel</span>
            </label>
          </div>

          {modeCalculPrevisionnel === 'automatique' && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Le budget est calculé automatiquement à partir de vos charges fixes configurées.
              </p>
              <button
                onClick={calculerBudgetAutomatique}
                className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                Recalculer Automatiquement
              </button>
            </div>
          )}

          {modeCalculPrevisionnel === 'manuel' && (
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                Modifiez manuellement les montants dans le tableau ci-dessous.
              </p>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={20} />
                {isEditing ? 'Annuler l\'édition' : 'Activer l\'édition'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABLEAU DES BUDGETS */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">📅 Budgets Mensuels</h3>
          
          {isEditing && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-all flex items-center gap-2"
            >
              <Save size={20} />
              Sauvegarder
            </button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-bold text-gray-700">Mois</th>
              <th className="text-right py-3 px-4 font-bold text-green-600">Revenus</th>
              <th className="text-right py-3 px-4 font-bold text-red-600">Factures</th>
              <th className="text-right py-3 px-4 font-bold text-orange-600">Dépenses</th>
              <th className="text-right py-3 px-4 font-bold text-purple-600">Épargnes</th>
              <th className="text-right py-3 px-4 font-bold text-blue-600">Solde Prév.</th>
            </tr>
          </thead>
          <tbody>
            {mois.map((nom, index) => {
              const revenus = budgetLocal.revenus[index] || 0;
              const factures = budgetLocal.factures[index] || 0;
              const depenses = budgetLocal.depenses[index] || 0;
              const epargnes = budgetLocal.epargnes[index] || 0;
              const soldePrev = revenus - factures - depenses - epargnes;

              return (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{nom}</td>
                  
                  <td className="text-right py-3 px-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={budgetLocal.revenus[index]}
                        onChange={(e) => handleChangeMoisValue('revenus', index, e.target.value)}
                        className="w-24 px-2 py-1 border-2 border-green-200 rounded text-right focus:border-green-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-green-600 font-medium">{revenus.toFixed(2)}€</span>
                    )}
                  </td>
                  
                  <td className="text-right py-3 px-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={budgetLocal.factures[index]}
                        onChange={(e) => handleChangeMoisValue('factures', index, e.target.value)}
                        className="w-24 px-2 py-1 border-2 border-red-200 rounded text-right focus:border-red-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-red-600 font-medium">{factures.toFixed(2)}€</span>
                    )}
                  </td>
                  
                  <td className="text-right py-3 px-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={budgetLocal.depenses[index]}
                        onChange={(e) => handleChangeMoisValue('depenses', index, e.target.value)}
                        className="w-24 px-2 py-1 border-2 border-orange-200 rounded text-right focus:border-orange-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-orange-600 font-medium">{depenses.toFixed(2)}€</span>
                    )}
                  </td>
                  
                  <td className="text-right py-3 px-4">
                    {isEditing ? (
                      <input
                        type="number"
                        value={budgetLocal.epargnes[index]}
                        onChange={(e) => handleChangeMoisValue('epargnes', index, e.target.value)}
                        className="w-24 px-2 py-1 border-2 border-purple-200 rounded text-right focus:border-purple-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-purple-600 font-medium">{epargnes.toFixed(2)}€</span>
                    )}
                  </td>
                  
                  <td className="text-right py-3 px-4">
                    <span className={`font-bold ${soldePrev >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {soldePrev.toFixed(2)}€
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50">
              <td className="py-3 px-4 font-bold text-gray-800">TOTAL ANNUEL</td>
              <td className="text-right py-3 px-4 font-bold text-green-600">
                {budgetLocal.revenus.reduce((a, b) => a + b, 0).toFixed(2)}€
              </td>
              <td className="text-right py-3 px-4 font-bold text-red-600">
                {budgetLocal.factures.reduce((a, b) => a + b, 0).toFixed(2)}€
              </td>
              <td className="text-right py-3 px-4 font-bold text-orange-600">
                {budgetLocal.depenses.reduce((a, b) => a + b, 0).toFixed(2)}€
              </td>
              <td className="text-right py-3 px-4 font-bold text-purple-600">
                {budgetLocal.epargnes.reduce((a, b) => a + b, 0).toFixed(2)}€
              </td>
              <td className="text-right py-3 px-4 font-bold text-blue-600">
                {(budgetLocal.revenus.reduce((a, b) => a + b, 0) - 
                  budgetLocal.factures.reduce((a, b) => a + b, 0) - 
                  budgetLocal.depenses.reduce((a, b) => a + b, 0) - 
                  budgetLocal.epargnes.reduce((a, b) => a + b, 0)).toFixed(2)}€
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* AIDE */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 Comment ça marche ?</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Mode Automatique :</strong> Le budget est calculé à partir de vos charges fixes configurées</li>
          <li>• <strong>Mode Manuel :</strong> Vous pouvez modifier manuellement chaque montant mois par mois</li>
          <li>• Les graphiques de comparaison Prévisionnel vs Réel sont disponibles dans l'onglet <strong>Tableau de Bord</strong></li>
        </ul>
      </div>
    </div>
  );
};