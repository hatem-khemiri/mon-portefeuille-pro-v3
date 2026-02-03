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

// ✅ Catégorisation intelligente (inchangée)
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
    // Alimentation
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
    
    // Transport
    if (description.includes('essence') || description.includes('total') ||
        description.includes('shell') || description.includes('carburant') ||
        description.includes('station') || description.includes('gas')) {
      return 'Transport';
    }
    
    // Loisirs
    if (description.includes('cinema') || description.includes('spotify') ||
        description.includes('netflix') || description.includes('youtube') ||
        description.includes('jeux') || description.includes('game')) {
      return 'Loisirs';
    }
    
    // Santé
    if (description.includes('pharmacie') || description.includes('medecin') ||
        description.includes('docteur') || description.includes('hopital')) {
      return 'Santé';
    }
    
    // Logement
    if (description.includes('loyer') || description.includes('edf') ||
        description.includes('eau') || description.includes('gaz') ||
        description.includes('electricite')) {
      return 'Logement';
    }
    
    // Abonnements
    if (description.includes('prlv') || description.includes('prelevement') ||
        description.includes('abonnement') || description.includes('bouygues') ||
        description.includes('orange') || description.includes('sfr') ||
        description.includes('free') || description.includes('macif') ||
        description.includes('matmut') || description.includes('assurance')) {
      return 'Abonnements';
    }
    
    // Retraits
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
    const { itemId, userId, bankName, since } = req.body; // 🆕 Ajout de "since"

    if (!itemId || !userId) {
      return res.status(400).json({ error: 'itemId et userId requis' });
    }

    // 🆕 Calculer la date "since" (défaut : 3 mois)
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

    console.log("📊 Récupération transactions...");

    // 🆕 Ajouter le paramètre "since" et "until" pour récupérer historique + futures
    const untilDate = new Date();
    untilDate.setMonth(untilDate.getMonth() + 3); // +3 mois dans le futur
    
    const transactionsResponse = await axios.get(
      `${BRIDGE_API_URL}/v3/aggregation/transactions`,
      { 
        headers: getHeaders(accessToken),
        params: { 
          limit: 500,
          since: sinceDate,
          until: untilDate.toISOString().split('T')[0]
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

    // ✅ CORRECTION CRITIQUE : Garder les VRAIES dates + calculer le bon statut
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    const allTransactions = transactions.map(t => {
      // ✅ Garder la date RÉELLE de Bridge (pas de décalage)
      const transactionDate = new Date(t.date);
      transactionDate.setHours(0, 0, 0, 0);
      
      // ✅ Déterminer le statut en fonction de la date réelle
      const statut = transactionDate <= aujourdHui ? 'realisee' : 'a_venir';

      return {
        id: `bridge_${t.id}`,
        date: t.date, // ✅ Date RÉELLE (pas modifiée)
        description: t.clean_description || t.provider_description || 'Transaction',
        montant: Math.abs(parseFloat(t.amount)), // ✅ Valeur absolue
        categorie: categorizeTransaction(t),
        compte: bankName || 'Ma Banque',
        statut: statut, // ✅ Basé sur la date réelle
        type: parseFloat(t.amount) < 0 ? 'depense' : 'revenu', // ✅ Type correct
        bridgeId: t.id,
        bridgeAccountId: t.account_id,
        isSynced: true
      };
    });

    // 🆕 Statistiques
    const nbRealisees = allTransactions.filter(t => t.statut === 'realisee').length;
    const nbFutures = allTransactions.filter(t => t.statut === 'a_venir').length;

    console.log(`✅ ${allTransactions.length} transactions récupérées`);
    console.log(`📊 ${nbRealisees} réalisées | ${nbFutures} à venir`);
    console.log(`📅 Période : ${allTransactions[allTransactions.length - 1].date} → ${allTransactions[0].date}`);

    return res.status(200).json({
      success: true,
      transactions: allTransactions,
      transactionsCount: allTransactions.length,
      syncDate: new Date().toISOString(),
      summary: {
        total: allTransactions.length,
        realisees: nbRealisees,
        aVenir: nbFutures
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