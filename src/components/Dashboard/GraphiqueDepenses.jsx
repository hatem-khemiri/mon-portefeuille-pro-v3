import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';

export const GraphiqueDepenses = () => {
  const { transactions, budgetPrevisionnel } = useFinance();

  const data = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const anneeActuelle = new Date().getFullYear();
    
    return mois.map((nom, moisIndex) => {
      const debutMois = new Date(anneeActuelle, moisIndex, 1);
      const finMois = new Date(anneeActuelle, moisIndex + 1, 0);
      
      // ✅ DÉPENSES RÉELLES du mois (transactions réalisées uniquement)
      const transactionsMois = (transactions || []).filter(t => {
        const dateT = new Date(t.date);
        return dateT >= debutMois && 
               dateT <= finMois && 
               t.montant < 0 && 
               t.statut === 'realisee';
      });
      
      const depensesReelles = Math.abs(transactionsMois.reduce((sum, t) => sum + t.montant, 0));
      
      // ✅ DÉPENSES PRÉVISIONNELLES du mois (depuis le budget calculé)
      const depensesPrev = budgetPrevisionnel?.depenses?.[moisIndex] || 0;
      
      return {
        mois: nom,
        'Dépenses Réelles': Math.round(depensesReelles),
        'Dépenses Prévisionnelles': Math.round(depensesPrev)
      };
    });
  }, [transactions, budgetPrevisionnel]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          💸 Dépenses Mensuelles
        </h3>
        <p className="text-sm text-gray-600">Comparaison Prévisionnel vs Réel (par mois)</p>
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
            dataKey="Dépenses Prévisionnelles" 
            fill="#FCA5A5" 
            radius={[8, 8, 0, 0]}
            opacity={0.7}
          />
          <Bar 
            dataKey="Dépenses Réelles" 
            fill="#EF4444" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};