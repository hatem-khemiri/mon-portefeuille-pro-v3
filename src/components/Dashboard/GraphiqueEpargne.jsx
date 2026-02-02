import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';

export const GraphiqueEpargne = () => {
  const { transactions, budgetPrevisionnel, comptes } = useFinance();

  const data = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const anneeActuelle = new Date().getFullYear();
    
    let epargneReelleCumulee = 0;
    let epargnePrevisionnelleCumulee = 0;
    
    return mois.map((nom, index) => {
      // Calcul de l'épargne réelle (solde comptes épargne)
      const debutMois = new Date(anneeActuelle, index, 1);
      const finMois = new Date(anneeActuelle, index + 1, 0);
      
      const transactionsMois = (transactions || []).filter(t => {
        const dateT = new Date(t.date);
        const compte = comptes.find(c => c.nom === t.compte);
        return dateT >= debutMois && dateT <= finMois && compte?.type === 'epargne';
      });
      
      const epargneReelleMois = transactionsMois.reduce((sum, t) => sum + t.montant, 0);
      epargneReelleCumulee += epargneReelleMois;
      
      // Épargne prévisionnelle cumulée
      const epargnePrevisionnelleMois = budgetPrevisionnel?.epargnes?.[index] || 0;
      epargnePrevisionnelleCumulee += epargnePrevisionnelleMois;
      
      return {
        mois: nom,
        'Épargne Réelle': Math.round(epargneReelleCumulee),
        'Épargne Prévisionnelle': Math.round(epargnePrevisionnelleCumulee)
      };
    });
  }, [transactions, budgetPrevisionnel, comptes]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          🏦 Épargne Cumulée
        </h3>
        <p className="text-sm text-gray-600">Comparaison Prévisionnel vs Réel</p>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
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
          <Line 
            type="monotone" 
            dataKey="Épargne Prévisionnelle" 
            stroke="#F59E0B" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#F59E0B', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="Épargne Réelle" 
            stroke="#059669" 
            strokeWidth={3}
            dot={{ fill: '#059669', r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};