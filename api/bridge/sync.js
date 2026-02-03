import axios from 'axios';

const BRIDGE_VERSION = '2025-01-15';
const BRIDGE_API_URL = 'https://api.bridgeapi.io';

function getHeaders(accessToken = null) {
  const headers = {
    'Bridge-Version': BRIDGE_VERSION,
    'Client-Id': process.env.BRIDGE_CLIENT_ID,
    'Client-Secret': process.env.BRIDGE_CLIENT_SECRET,
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}

// ✅ Catégorisation intelligente
function categorizeTransaction(transaction) {
  const amount = parseFloat(transaction.amount);
  const description = (transaction.clean_description || transaction.provider_description || '').toLowerCase();
  
  // REVENUS (montant positif)
  if (amount > 0) {
    if (description.includes('vir') || description.includes('virement') || description.includes('salaire')) {
      return 'Salaire';
    }
    if (description.includes('remboursement') || description.includes('remb')) {
      return 'Remboursement';
    }
    return 'Autres revenus';
  }
  
  // DÉPENSES (montant négatif)
  if (amount < 0) {
    if (description.includes('carrefour') || description.includes('auchan') || 
        description.includes('leclerc') || description.includes('lidl') ||
        description.includes('marjane') || description.includes('supermarché') ||
        description.includes('hypermarché') || description.includes('monoprix')) {
      return 'Courses';
    }
    
    if (description.includes('mcdo') || description.includes('mcdonald') ||
        description.includes('kfc') || description.includes('burger') ||
        description.includes('restaurant') || description.includes('cafe')) {
      return 'Restaurants';
    }
    
    if (description.includes('essence') || description.includes('total') ||
        description.includes('shell') || description.includes('carburant') ||
        description.includes('station') || description.includes('gas')) {
      return 'Transport';
    }
    
    if (description.includes('cinema') || description.includes('spotify') ||
        description.includes('netflix') || description.includes('youtube') ||
        description.includes('jeux') || description.includes('game')) {
      return 'Loisirs';
    }
    
    if (description.includes('pharmacie') || description.includes('medecin') ||
        description.includes('docteur') || description.includes('hopital')) {
      return 'Santé';
    }
    
    if (description.includes('loyer') || description.includes('edf') ||
        description.includes('eau') || description.includes('gaz') ||
        description.includes('electricite')) {
      return 'Logement';
    }
    
    if (description.includes('prlv') || description.includes('prelevement') ||
        description.includes('abonnement') || description.includes('bouygues') ||
        description.includes('orange') || description.includes('sfr') ||
        description.includes('free') || description.includes('macif') ||
        description.includes('matmut') || description.includes('assurance')) {
      return 'Abonnements';
    }
    
    if (description.includes('retrait') || description.includes('dab') ||
        description.includes('atm') || description.includes('especes')) {
      return 'Retraits';
    }
    
    return 'Autres dépenses';
  }
  
  return 'Autres dépenses';
}

export default async function handler(req, res) {
  try {
    const { itemId, userId, bankName, since } = req.body;

    if (!itemId || !userId) {
      return res.status(400).json({ error: 'itemId et userId requis' });
    }

    // Calculer la date "since" (défaut : 3 mois en arrière)
    const sinceDate = since || (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().split('T')[0];
    })();

    console.log(`📅 Récupération transactions depuis ${sinceDate}...`);

    let accessToken;
    try {
      const tokenResponse = await axios.post(
        `${BRIDGE_API_URL}/v3/aggregation/authorization/token`,
        { external_user_id: userId },
        { headers: getHeaders() }
      );
      accessToken = tokenResponse.data.access_token;
    } catch (e) {
      if (e.response?.status === 404) {
        await axios.post(
          `${BRIDGE_API_URL}/v3/aggregation/users`,
          { external_user_id: userId },
          { headers: getHeaders() }
        );
        const retry = await axios.post(
          `${BRIDGE_API_URL}/v3/aggregation/authorization/token`,
          { external_user_id: userId },
          { headers: getHeaders() }
        );
        accessToken = retry.data.access_token;
      } else {
        throw e;
      }
    }

    console.log("📊 Récupération transactions depuis Bridge...");

    const transactionsResponse = await axios.get(
      `${BRIDGE_API_URL}/v3/aggregation/transactions`,
      { 
        headers: getHeaders(accessToken),
        params: { 
          limit: 500,
          since: sinceDate
        }
      }
    );

    const transactions = transactionsResponse.data.resources || [];
    
    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        transactions: [],
        transactionsCount: 0,
        syncDate: new Date().toISOString()
      });
    }

    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    // ÉTAPE 1 : Créer les transactions RÉELLES (historique)
    const realTransactions = transactions.map(t => {
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      
      const statut = transactionDate <= aujourdHui ? 'realisee' : 'a_venir';
      const amount = parseFloat(t.amount);

      return {
        id: `bridge_${t.id}`,
        date: t.date,
        description: t.clean_description || t.provider_description || 'Transaction',
        montant: amount, // ✅ GARDE LE SIGNE (négatif pour dépenses)
        categorie: categorizeTransaction(t),
        compte: bankName || 'Ma Banque',
        statut: statut,
        type: amount < 0 ? 'depense' : 'revenu',
        bridgeId: t.id,
        bridgeAccountId: t.account_id,
        isSynced: true,
        isProjection: false
      };
    });

    // ÉTAPE 2 : Créer les PROJECTIONS futures
    const passedTransactions = realTransactions.filter(t => t.statut === 'realisee');
    
    const dates = passedTransactions.map(t => new Date(t.date));
    const oldestDate = new Date(Math.min(...dates));
    const newestPastDate = new Date(Math.max(...dates.filter(d => d <= aujourdHui)));
    
    const historyDurationDays = Math.ceil((newestPastDate - oldestDate) / (1000 * 60 * 60 * 24));
    
    console.log(`📊 Historique : ${historyDurationDays} jours (${oldestDate.toISOString().split('T')[0]} → ${newestPastDate.toISOString().split('T')[0]})`);

    const projectedTransactions = passedTransactions.map(t => {
      const originalDate = new Date(t.date);
      const futureDate = new Date(originalDate);
      futureDate.setDate(futureDate.getDate() + historyDurationDays);

      return {
        ...t,
        id: `projection_${t.bridgeId}`,
        date: futureDate.toISOString().split('T')[0],
        statut: 'a_venir',
        isProjection: true,
        projectedFrom: t.date
      };
    });

    // ÉTAPE 3 : Fusionner réelles + projections
    const allTransactions = [...realTransactions, ...projectedTransactions];

    // Statistiques finales
    const nbRealisees = allTransactions.filter(t => t.statut === 'realisee').length;
    const nbFutures = allTransactions.filter(t => t.statut === 'a_venir').length;
    const nbProjections = projectedTransactions.length;

    console.log(`✅ ${allTransactions.length} transactions au total`);
    console.log(`   📍 ${nbRealisees} réalisées (historique réel)`);
    console.log(`   🔮 ${nbFutures} à venir (dont ${nbProjections} projections)`);
    console.log(`   📊 Ratio : ${Math.round(nbRealisees/allTransactions.length*100)}% réalisées / ${Math.round(nbFutures/allTransactions.length*100)}% futures`);

    return res.status(200).json({
      success: true,
      transactions: allTransactions,
      transactionsCount: allTransactions.length,
      syncDate: new Date().toISOString(),
      summary: {
        total: allTransactions.length,
        realisees: nbRealisees,
        aVenir: nbFutures,
        projections: nbProjections,
        ratio: {
          realisees: Math.round(nbRealisees/allTransactions.length*100),
          futures: Math.round(nbFutures/allTransactions.length*100)
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Erreur synchronisation',
      details: error.response?.data || error.message
    });
  }
}