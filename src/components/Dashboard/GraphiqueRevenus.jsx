import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';

export const GraphiqueRevenus = () => {
  const { transactions, budgetPrevisionnel } = useFinance();

  const data = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const anneeActuelle = new Date().getFullYear();
    
    // ✅ HELPER : Normaliser date
    const normaliserDate = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    
    return mois.map((nom, moisIndex) => {
      // ✅ BORNES DU MOIS normalisées
      const debutMoisNorm = new Date(anneeActuelle, moisIndex, 1);
      const finMoisNorm = new Date(anneeActuelle, moisIndex + 1, 0, 23, 59, 59);
      
      // ✅ REVENUS RÉELS du mois (transactions réalisées uniquement)
      const transactionsMois = (transactions || []).filter(t => {
        const dateT = normaliserDate(t.date);
        return dateT >= debutMoisNorm && 
               dateT <= finMoisNorm && 
               t.montant > 0 && 
               t.statut === 'realisee';
      });
      
      const revenusReels = transactionsMois.reduce((sum, t) => sum + t.montant, 0);
      
      // ✅ REVENUS PRÉVISIONNELS du mois (depuis le budget calculé)
      const revenusPrev = budgetPrevisionnel?.revenus?.[moisIndex] || 0;
      
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