import { Bell, CheckCircle, Calendar, XCircle } from 'lucide-react';

export const ConfirmationTransactionsModal = ({ transactions, onConfirm, onReporter, onAnnuler }) => {
  if (transactions.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 rounded-full p-3">
            <Bell className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              Transaction{transactions.length > 1 ? 's' : ''} prévue{transactions.length > 1 ? 's' : ''} aujourd'hui
            </h3>
            <p className="text-sm text-gray-600">{transactions.length} à confirmer</p>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((t) => (
            <div key={t.id} className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-800">{t.description}</h4>
                  <p className="text-sm text-gray-600">{new Date(t.date).toLocaleDateString('fr-FR')}</p>
                </div>
                <p className={`text-2xl font-bold ${t.montant < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {t.montant.toFixed(2)} €
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onConfirm(t.id)} className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-1 text-sm font-medium">
                  <CheckCircle size={16} /> Réalisée
                </button>
                <button onClick={() => onReporter(t.id)} className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1 text-sm font-medium">
                  <Calendar size={16} /> Reporter
                </button>
                <button onClick={() => onAnnuler(t.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center">
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};