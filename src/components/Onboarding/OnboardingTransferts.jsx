import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

export const OnboardingTransferts = ({ transferts, comptes, onTransfertsChange, onNext, onPrevious, onSkip }) => {
  const [newTransfert, setNewTransfert] = useState({
    nom: '',
    montant: '',
    frequence: 'mensuelle',
    jourMois: '1',
    compteSource: comptes[0]?.nom || '',
    compteDestination: ''
  });

  const addTransfert = () => {
    if (newTransfert.nom && newTransfert.montant && newTransfert.compteSource && newTransfert.compteDestination) {
      onTransfertsChange([
        ...transferts,
        {
          ...newTransfert,
          type: 'transfert',
          categorie: 'Transfert'
        }
      ]);
      setNewTransfert({
        nom: '',
        montant: '',
        frequence: 'mensuelle',
        jourMois: '1',
        compteSource: comptes[0]?.nom || '',
        compteDestination: ''
      });
    } else {
      alert('Veuillez remplir tous les champs !');
    }
  };

  const removeTransfert = (index) => {
    onTransfertsChange(transferts.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Vos transferts et épargnes automatiques</h3>
        <p className="text-gray-600 mb-4">Configurez vos virements récurrents (ex: épargne mensuelle automatique)</p>
        <p className="text-sm text-gray-500">Cette étape est optionnelle</p>
      </div>

      {/* ── Liste des transferts ajoutés ── */}
      {transferts.length > 0 && (
        <div className="space-y-2 mb-4">
          {transferts.map((transfert, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
              <div>
                <p className="font-medium">{transfert.nom}</p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">{transfert.montant} €</span>
                  {' · '}
                  {transfert.frequence === 'mensuelle' ? 'Mensuel' : transfert.frequence === 'trimestrielle' ? 'Trimestriel' : 'Annuel'}
                  {' · '}
                  Le {transfert.jourMois} du mois
                  {' · '}
                  <span className="text-purple-600 font-medium">🏦 {transfert.compteSource}</span>
                  {' → '}
                  <span className="text-pink-600 font-medium">🏦 {transfert.compteDestination}</span>
                </p>
              </div>
              <button
                onClick={() => removeTransfert(idx)}
                className="text-red-500 hover:text-red-700 ml-4 flex-shrink-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Formulaire ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <input
          type="text"
          placeholder="Nom (ex: Épargne Livret A)"
          value={newTransfert.nom}
          onChange={e => setNewTransfert({ ...newTransfert, nom: e.target.value })}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
        />

        <input
          type="number"
          placeholder="Montant (€)"
          value={newTransfert.montant}
          onChange={e => setNewTransfert({ ...newTransfert, montant: e.target.value })}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
        />

        <select
          value={newTransfert.frequence}
          onChange={e => setNewTransfert({ ...newTransfert, frequence: e.target.value })}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
        >
          <option value="mensuelle">Mensuel</option>
          <option value="trimestrielle">Trimestriel</option>
          <option value="annuelle">Annuel</option>
        </select>

        <input
          type="number"
          placeholder="Jour (1-31)"
          value={newTransfert.jourMois}
          onChange={e => setNewTransfert({ ...newTransfert, jourMois: e.target.value })}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
          min="1"
          max="31"
        />

        {/* Compte source */}
        <select
          value={newTransfert.compteSource}
          onChange={e => setNewTransfert({ ...newTransfert, compteSource: e.target.value })}
          className="px-4 py-3 border-2 border-purple-200 rounded-xl focus:border-purple-500 focus:outline-none bg-purple-50"
        >
          <option value="">🏦 Depuis...</option>
          {comptes.map((c, idx) => (
            <option key={idx} value={c.nom}>🏦 {c.nom}</option>
          ))}
        </select>

        {/* Compte destination */}
        <select
          value={newTransfert.compteDestination}
          onChange={e => setNewTransfert({ ...newTransfert, compteDestination: e.target.value })}
          className="px-4 py-3 border-2 border-pink-200 rounded-xl focus:border-pink-500 focus:outline-none bg-pink-50"
        >
          <option value="">🏦 Vers...</option>
          {comptes.map((c, idx) => (
            <option key={idx} value={c.nom}>🏦 {c.nom}</option>
          ))}
        </select>

      </div>

      {/* Info multi-comptes */}
      {comptes.length > 1 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-700 flex items-start gap-2">
          <span className="text-lg leading-none">💡</span>
          <span>
            Vous avez <strong>{comptes.length} comptes bancaires</strong>. Sélectionnez le compte source et le compte destinataire du virement.
          </span>
        </div>
      )}

      <button
        onClick={addTransfert}
        className="w-full py-3 bg-purple-100 text-purple-600 rounded-xl font-medium hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Ajouter ce transfert automatique
      </button>

      {transferts.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800 mb-3">
            💡 Si vous n'avez aucun transfert automatique à configurer, cliquez sur le bouton ci-dessous
          </p>
          <button
            onClick={onSkip}
            className="w-full py-3 bg-yellow-100 text-yellow-800 rounded-xl font-medium hover:bg-yellow-200 transition-all"
          >
            Je n'ai aucun transfert automatique
          </button>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onPrevious}
          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft size={20} />
          Précédent
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          Suivant
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};