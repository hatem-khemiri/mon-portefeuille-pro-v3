import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';

export const GraphiqueRevenus = () => {
  const { transactions, budgetPrevisionnel } = useFinance();

  const data = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const anneeActuelle = new Date().getFullYear();
    
    return mois.map((nom, index) => {
      // ✅ Calcul des revenus réels DU MOIS UNIQUEMENT
      const debutMois = new Date(anneeActuelle, index, 1);
      const finMois = new Date(anneeActuelle, index + 1, 0);
      
      const transactionsMois = (transactions || []).filter(t => {
        const dateT = new Date(t.date);
        return dateT >= debutMois && 
               dateT <= finMois && 
               t.montant > 0 && 
               t.statut === 'realisee'; // ✅ Uniquement les réalisées
      });
      
      const revenusReels = transactionsMois.reduce((sum, t) => sum + t.montant, 0);
      
      // Revenus prévisionnels DU MOIS
      const revenusPrev = budgetPrevisionnel?.revenus?.[index] || 0;
      
      return {
        mois: nom,
        'Revenus Réels': Math.round(revenusReels),
        'Revenus Prévisionnels': Math.round(revenusPrev)
      };
    });
  }, [transactions, budgetPrevisionnel]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          💰 Revenus Mensuels
        </h3>
        <p className="text-sm text-gray-600">Comparaison Prévisionnel vs Réel</p>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="mois" 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value}€`}
          />
          <Tooltip 
            formatter={(value) => `${value}€`}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar 
            dataKey="Revenus Prévisionnels" 
            fill="#A78BFA" 
            radius={[8, 8, 0, 0]}
            opacity={0.7}
          />
          <Bar 
            dataKey="Revenus Réels" 
            fill="#10B981" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};