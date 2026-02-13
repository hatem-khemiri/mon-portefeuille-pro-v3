import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

export const AccountMappingModal = ({ 
  bankAccounts = [],  // ✅ VALEUR PAR DÉFAUT
  existingComptes = [],  // ✅ VALEUR PAR DÉFAUT
  onConfirm,
  onCancel
}) => {
  // ✅ VÉRIFICATION : Ne rien faire si pas de comptes
  if (!bankAccounts || bankAccounts.length === 0) {
    return null;
  }

  // État : pour chaque compte bancaire Bridge, stocker l'action choisie
  const [mapping, setMapping] = useState(() => {
    const initialMapping = {};
    bankAccounts.forEach(account => {
      initialMapping[account.id] = {
        action: existingComptes.length > 0 ? 'existing' : 'new',
        existingId: existingComptes.length > 0 ? existingComptes[0].id : null,
        newName: account.name || 'Mon Compte'
      };
    });
    return initialMapping;
  });

  const handleActionChange = (accountId, action) => {
    setMapping(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        action
      }
    }));
  };

  const handleExistingSelect = (accountId, existingId) => {
    setMapping(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        existingId: parseInt(existingId)
      }
    }));
  };

  const handleNewNameChange = (accountId, newName) => {
    setMapping(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        newName
      }
    }));
  };

  const handleConfirm = () => {
    console.log('🔵 MODAL : handleConfirm appelé');
    console.log('🔵 selectedOption:', mapping);
    
    onConfirm(mapping);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={28} />
              <div>
                <h3 className="text-xl font-bold">Synchronisation réussie !</h3>
                <p className="text-sm text-blue-100 mt-1">
                  {bankAccounts.length} compte{bankAccounts.length > 1 ? 's' : ''} bancaire{bankAccounts.length > 1 ? 's' : ''} détecté{bankAccounts.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Configurez vos comptes bancaires</strong>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Pour chaque compte détecté, choisissez de le fusionner avec un compte existant ou d'en créer un nouveau.
            </p>
          </div>

          {/* Liste des comptes bancaires à mapper */}
          {bankAccounts.map((account, index) => (
            <div 
              key={account.id}
              className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4"
            >
              <div className="mb-4">
                <h4 className="font-bold text-gray-800 mb-1">
                  🏦 Compte {index + 1} : {account.name || 'Compte bancaire'}
                </h4>
                <p className="text-xs text-gray-600">
                  ID Bridge : {account.id}
                </p>
              </div>

              {/* Option 1 : Fusionner avec existant */}
              {existingComptes.length > 0 && (
                <div 
                  onClick={() => handleActionChange(account.id, 'existing')}
                  className={`border-2 rounded-xl p-3 cursor-pointer transition-all mb-3 ${
                    mapping[account.id]?.action === 'existing' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name={`action-${account.id}`}
                      checked={mapping[account.id]?.action === 'existing'}
                      onChange={() => handleActionChange(account.id, 'existing')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label className="font-medium text-gray-800 cursor-pointer text-sm">
                      📁 Fusionner avec un compte existant
                    </label>
                  </div>
                  
                  {mapping[account.id]?.action === 'existing' && (
                    <select
                      value={mapping[account.id]?.existingId || ''}
                      onChange={(e) => handleExistingSelect(account.id, e.target.value)}
                      className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {existingComptes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nom} ({c.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Option 2 : Créer nouveau */}
              <div 
                onClick={() => handleActionChange(account.id, 'new')}
                className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                  mapping[account.id]?.action === 'new' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name={`action-${account.id}`}
                    checked={mapping[account.id]?.action === 'new'}
                    onChange={() => handleActionChange(account.id, 'new')}
                    className="w-4 h-4 text-green-600"
                  />
                  <label className="font-medium text-gray-800 cursor-pointer text-sm">
                    ✨ Créer un nouveau compte
                  </label>
                </div>
                
                {mapping[account.id]?.action === 'new' && (
                  <input
                    type="text"
                    value={mapping[account.id]?.newName || ''}
                    onChange={(e) => handleNewNameChange(account.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Nom du compte (ex: BNP Paribas)"
                    className="w-full px-3 py-2 border-2 border-green-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t-2 border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              ✓ Confirmer ({bankAccounts.length} compte{bankAccounts.length > 1 ? 's' : ''})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};