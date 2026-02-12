import { useState } from 'react';
import { User, Calendar, Trash2, RefreshCw, FileText, Lock } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';
import { deleteUserAccount } from '../../utils/storage';

export const ProfilTab = ({ onExport, onLogout }) => {
  const { 
    currentUser, 
    dateCreationCompte,
    setComptes, 
    setTransactions, 
    setChargesFixes, 
    setEpargnes, 
    setDettes, 
    setMemos 
  } = useFinance();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleReset = () => {
    setComptes([]);
    setTransactions([]);
    setChargesFixes([]);
    setEpargnes([]);
    setDettes([]);
    setMemos([]);
    
    const keysToRemove = [
      `bank_connection_${currentUser}`,
      `bank_token_${currentUser}`,
      `bank_accounts_${currentUser}`,
      `bank_sync_date_${currentUser}`,
      `last_sync_${currentUser}`,
      `user_data_${currentUser}`
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes(currentUser) && (key.startsWith('bank_') || key.startsWith('bridge_'))) {
        localStorage.removeItem(key);
      }
    });
    
    setShowResetConfirm(false);
    window.location.reload();
  };

  const handleDeleteAccount = () => {
    const keysToRemove = [
      `bank_connection_${currentUser}`,
      `bank_token_${currentUser}`,
      `bank_accounts_${currentUser}`,
      `bank_sync_date_${currentUser}`,
      `last_sync_${currentUser}`,
      `user_data_${currentUser}`,
      `security_${currentUser}`,
      `user_${currentUser}`
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    Object.keys(localStorage).forEach(key => {
      if (key.includes(currentUser) && (key.startsWith('bank_') || key.startsWith('bridge_'))) {
        localStorage.removeItem(key);
      }
    });
    
    deleteUserAccount(currentUser);
    setShowDeleteAccountConfirm(false);
    onLogout();
  };

  const handlePasswordChange = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert('❌ Veuillez remplir tous les champs');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('❌ Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.newPassword.length < 4) {
      alert('❌ Le nouveau mot de passe doit contenir au moins 4 caractères');
      return;
    }

    // Vérifier le mot de passe actuel
    const securityData = localStorage.getItem(`security_${currentUser}`);
    if (!securityData) {
      alert('❌ Erreur : données de sécurité introuvables');
      return;
    }

    const { password: currentStoredPassword } = JSON.parse(securityData);
    
    if (passwordForm.currentPassword !== currentStoredPassword) {
      alert('❌ Mot de passe actuel incorrect');
      return;
    }

    // Mettre à jour le mot de passe
    localStorage.setItem(`security_${currentUser}`, JSON.stringify({
      password: passwordForm.newPassword
    }));

    alert('✅ Mot de passe modifié avec succès !');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordChange(false);
  };

  return (
    <div className="space-y-6">
      {/* INFORMATIONS COMPTE */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <User size={24} />
          Informations du compte
        </h3>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Nom d'utilisateur</p>
            <p className="text-lg font-bold text-gray-800">{currentUser}</p>
          </div>
          
          {dateCreationCompte && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                <Calendar size={16} />
                Date de création
              </p>
              <p className="text-lg font-bold text-gray-800">
                {new Date(dateCreationCompte).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Actions</h3>
        
        <div className="space-y-3">
          {/* Modifier mot de passe */}
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Lock size={20} />
            Modifier le mot de passe
          </button>

          {showPasswordChange && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <h4 className="font-bold text-purple-900 mb-4">🔒 Changer le mot de passe</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePasswordChange}
                    className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all font-medium"
                  >
                    ✓ Confirmer
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export rapport */}
          <button
            onClick={onExport}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <FileText size={20} />
            Exporter le rapport complet
          </button>

          {/* Réinitialiser */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <RefreshCw size={20} />
            Réinitialiser les données
          </button>

          {/* Supprimer */}
          <button
            onClick={() => setShowDeleteAccountConfirm(true)}
            className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Trash2 size={20} />
            Supprimer le compte
          </button>
        </div>
      </div>

      {/* MODAL CONFIRMATION RESET */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">⚠️ Réinitialiser les données ?</h3>
            <p className="text-gray-600 mb-6">
              Cette action supprimera toutes vos transactions, comptes, charges fixes, connexions bancaires et paramètres.
              Vous devrez reconfigurer votre application.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleReset();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all"
              >
                Confirmer
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION DELETE */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-red-600 mb-4">🗑️ Supprimer le compte ?</h3>
            <p className="text-gray-600 mb-6">
              Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement supprimées.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleDeleteAccount();
                  setShowDeleteAccountConfirm(false);
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
              >
                Supprimer définitivement
              </button>
              <button
                onClick={() => setShowDeleteAccountConfirm(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};