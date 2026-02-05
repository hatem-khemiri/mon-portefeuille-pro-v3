import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../contexts/FinanceContext';

export const GraphiqueSolde = () => {
  const { comptes, transactions, budgetPrevisionnel } = useFinance();

  const data = useMemo(() => {
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const anneeActuelle = new Date().getFullYear();
    
    // ✅ Solde initial TOTAL de tous les comptes
    const soldeInitialTotal = comptes.reduce((sum, c) => sum + (c.soldeInitial || 0), 0);
    
    let soldeReelCumule = soldeInitialTotal;
    let soldePrevisionnelCumule = soldeInitialTotal;
    
    return mois.map((nom, index) => {
      const debutMois = new Date(anneeActuelle, index, 1);
      const finMois = new Date(anneeActuelle, index + 1, 0);
      
      // ✅ SOLDE RÉEL : Cumuler toutes les transactions jusqu'à la fin du mois
      const transactionsJusquaMois = (transactions || []).filter(t => {
        const dateT = new Date(t.date);
        return dateT <= finMois && t.statut === 'realisee';
      });
      
      soldeReelCumule = soldeInitialTotal + transactionsJusquaMois.reduce((sum, t) => sum + t.montant, 0);
      
      // ✅ SOLDE PRÉVISIONNEL : Cumuler revenus - dépenses - factures - épargnes jusqu'au mois
      const revenusCumules = (budgetPrevisionnel?.revenus || []).slice(0, index + 1).reduce((a, b) => a + b, 0);
      const depensesCumulees = (budgetPrevisionnel?.depenses || []).slice(0, index + 1).reduce((a, b) => a + b, 0);
      const facturesCumulees = (budgetPrevisionnel?.factures || []).slice(0, index + 1).reduce((a, b) => a + b, 0);
      const epargnesCumulees = (budgetPrevisionnel?.epargnes || []).slice(0, index + 1).reduce((a, b) => a + b, 0);
      
      soldePrevisionnelCumule = soldeInitialTotal + revenusCumules - depensesCumulees - facturesCumulees - epargnesCumulees;
      
      return {
        mois: nom,
        'Solde Réel': Math.round(soldeReelCumule),
        'Solde Prévisionnel': Math.round(soldePrevisionnelCumule)
      };
    });
  }, [comptes, transactions, budgetPrevisionnel]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📊 Évolution du Solde
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