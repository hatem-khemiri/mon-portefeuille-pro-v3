import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';
import { useStatistiques } from '../../hooks/useStatistiques';

export const GraphiqueSolde = () => {
  const { comptes, transactions } = useFinance();

  const data = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const anneeActuelle = new Date().getFullYear();
    
    const normaliserDate = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    
    // ✅ RÉCUPÉRER TOUS LES COMPTES pour le solde initial
    const soldeInitial = comptes.reduce((sum, c) => sum + (c.soldeInitial || 0), 0);
    
    return mois.map((nom, moisIndex) => {
      const finMoisNorm = new Date(anneeActuelle, moisIndex + 1, 0, 23, 59, 59);
      
      // SOLDE RÉEL = toutes transactions réalisées jusqu'au mois
      const transactionsRealisees = (transactions || []).filter(t => {
        const dateT = normaliserDate(t.date);
        return dateT <= finMoisNorm && t.statut === 'realisee';
      });
      
      const mouvementsReels = transactionsRealisees.reduce((sum, t) => sum + t.montant, 0);
      const soldeReel = soldeInitial + mouvementsReels;
      
      // SOLDE PRÉVISIONNEL = toutes transactions (réalisées + à venir) jusqu'au mois
      const toutesTransactions = (transactions || []).filter(t => {
        const dateT = normaliserDate(t.date);
        return dateT <= finMoisNorm;
      });
      
      const mouvementsPrevus = toutesTransactions.reduce((sum, t) => sum + t.montant, 0);
      const soldePrevu = soldeInitial + mouvementsPrevus;
      
      return {
        mois: nom,
        'Solde Réel': Math.round(soldeReel),
        'Solde Prévisionnel': Math.round(soldePrevu)
      };
    });
  }, [comptes, transactions]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📊 Évolution du Solde
        </h3>
        <p className="text-sm text-gray-600">Comparaison Prévisionnel vs Réel (Cumulé)</p>
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
            dataKey="Solde Prévisionnel" 
            stroke="#8B5CF6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#8B5CF6', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="Solde Réel" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ fill: '#3B82F6', r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};