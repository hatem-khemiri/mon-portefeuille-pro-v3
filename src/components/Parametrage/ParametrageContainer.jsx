import { useState } from 'react';
import { CategoriesTab } from './CategoriesTab';
import { ChargesRecurrentes } from './ChargesRecurrentes';
import { MemosBudgetaires } from './MemosBudgetaires';
import { ComptesEtBanque } from './ComptesEtBanque';
import { ProfilTab } from './ProfilTab';

export const ParametrageContainer = ({ onExport, onLogout }) => {
  const [activeSection, setActiveSection] = useState('profil');

  const sections = [
    { id: 'profil', label: '👤 Mon Profil' },
    { id: 'comptes', label: '🏦 Mes Comptes & Banque' },
    { id: 'recurrentes', label: '🔄 Mes Transactions Récurrentes' },
    { id: 'memos', label: '📝 Mémos Budgétaires' },
    { id: 'categories', label: '🏷️ Mes Catégories' }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'profil':
        return <ProfilTab onExport={onExport} onLogout={onLogout} />;
      case 'comptes':
        return <ComptesEtBanque />;
      case 'recurrentes':
        return <ChargesRecurrentes />;
      case 'memos':
        return <MemosBudgetaires />;
      case 'categories':
        return <CategoriesTab />;
      default:
        return <ProfilTab onExport={onExport} onLogout={onLogout} />;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Paramétrage
      </h2>
      
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl">
        <div className="flex border-b overflow-x-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeSection === section.id
                  ? 'border-b-4 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};