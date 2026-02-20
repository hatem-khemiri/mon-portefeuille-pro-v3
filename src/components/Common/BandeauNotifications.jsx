import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COULEURS = {
  warning: {
    bandeau: 'bg-amber-50 border-amber-300',
    bouton:  'bg-amber-500 hover:bg-amber-600 text-white',
    texte:   'text-amber-900',
    detail:  'text-amber-700',
    icone:   'text-amber-500'
  },
  info: {
    bandeau: 'bg-blue-50 border-blue-300',
    bouton:  'bg-blue-500 hover:bg-blue-600 text-white',
    texte:   'text-blue-900',
    detail:  'text-blue-700',
    icone:   'text-blue-500'
  },
  danger: {
    bandeau: 'bg-red-50 border-red-300',
    bouton:  'bg-red-500 hover:bg-red-600 text-white',
    texte:   'text-red-900',
    detail:  'text-red-700',
    icone:   'text-red-500'
  }
};

const getCleVerification = (id) => {
  const dateAujourdhui = new Date().toISOString().split('T')[0];
  return `notif_verifie_${id}_${dateAujourdhui}`;
};

const NotifCard = ({ notif, onAction }) => {
  const [expanded, setExpanded] = useState(false);
  const c = COULEURS[notif.type] || COULEURS.info;

  return (
    <div className={`border-2 rounded-xl p-4 ${c.bandeau}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl leading-none flex-shrink-0">{notif.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${c.texte}`}>{notif.titre}</p>
            {expanded && notif.detail && (
              <p className={`text-xs mt-1 ${c.detail}`}>{notif.detail}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {notif.detail && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`p-1 rounded-lg ${c.icone} hover:opacity-70 transition-opacity`}
              title={expanded ? 'Réduire' : 'Voir le détail'}
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button
            onClick={() => onAction(notif)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${c.bouton}`}
          >
            {notif.cta} →
          </button>
        </div>
      </div>
    </div>
  );
};

export const BandeauNotifications = ({ notifications, onNavigate }) => {
  const [verifieesAujourdhui, setVerifieesAujourdhui] = useState(() => {
    return notifications
      .map(n => n.id)
      .filter(id => {
        try { return localStorage.getItem(getCleVerification(id)) === 'true'; }
        catch { return false; }
      });
  });

  useEffect(() => {
    const dejaVerifiees = notifications
      .map(n => n.id)
      .filter(id => {
        try { return localStorage.getItem(getCleVerification(id)) === 'true'; }
        catch { return false; }
      });
    setVerifieesAujourdhui(dejaVerifiees);
  }, [notifications]);

  const notifVisibles = notifications.filter(n => !verifieesAujourdhui.includes(n.id));

  if (notifVisibles.length === 0) return null;

  const handleAction = (notif) => {
    try { localStorage.setItem(getCleVerification(notif.id), 'true'); }
    catch (e) { console.warn('localStorage indisponible'); }
    setVerifieesAujourdhui(prev => [...prev, notif.id]);
    // ✅ Passe aussi filtreDate si présent (cas transactions du jour)
    onNavigate(notif.lien, notif.section || null, notif.filtreDate || null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 space-y-3">
      {notifVisibles.length > 1 && (
        <div className="flex items-center gap-2 px-1">
          <span className="bg-gray-800 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {notifVisibles.length}
          </span>
          <p className="text-sm font-semibold text-gray-700">
            vérifications du jour en attente
          </p>
        </div>
      )}

      {notifVisibles.map(notif => (
        <NotifCard
          key={notif.id}
          notif={notif}
          onAction={handleAction}
        />
      ))}
    </div>
  );
};