import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';

const COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
];

export const DepensesChart = ({ depensesParCategorie, depensesRealisees }) => {
  const { transactions } = useFinance();

  // ✅ RECALCUL AVEC TRANSACTIONS À VENIR
  const depensesAvecAVenir = useMemo(() => {
    const grouped = {};
    
    (transactions || [])
      .filter(t => t.montant < 0 && t.type !== 'transfert')
      .forEach(t => {
        const categorie = t.categorie || 'Autres dépenses';
        grouped[categorie] = (grouped[categorie] || 0) + Math.abs(t.montant);
      });
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const depensesReellesUniquement = useMemo(() => {
    const grouped = {};
    
    (transactions || [])
      .filter(t => t.montant < 0 && t.type !== 'transfert' && t.statut === 'realisee')
      .forEach(t => {
        const categorie = t.categorie || 'Autres dépenses';
        grouped[categorie] = (grouped[categorie] || 0) + Math.abs(t.montant);
      });
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const [afficherAVenir, setAfficherAVenir] = React.useState(true);

  const dataAffichee = afficherAVenir ? depensesAvecAVenir : depensesReellesUniquement;

  if (dataAffichee.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Répartition des Dépenses</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">📭 Aucune dépense</p>
          <p className="text-sm mt-2">Les dépenses s'afficheront ici</p>
        </div>
      </div>
    );
  }

  const total = dataAffichee.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">💸 Répartition des Dépenses</h3>
          <p className="text-sm text-gray-600">Total : {total.toFixed(2)}€</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAfficherAVenir(true)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              afficherAVenir
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Avec prévisions
          </button>
          <button
            onClick={() => setAfficherAVenir(false)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !afficherAVenir
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Réalisées uniquement
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={dataAffichee}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {dataAffichee.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {dataAffichee.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-gray-700 truncate">{item.name}</span>
            <span className="ml-auto font-medium text-gray-800">{item.value.toFixed(0)}€</span>
          </div>
        ))}
      </div>
    </div>
  );
};