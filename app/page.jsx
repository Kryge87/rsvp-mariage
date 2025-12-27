'use client';

import React, { useState, useEffect } from 'react';

// ⚠️ CONFIGURATION ADMIN
const ADMIN_CONFIG = {
  secretCodeHash: 'cae61b1516500f2a600817d8e035822d9cd749056b4d5bd3c482577abc9354a5',
  passwordHash: '89cd7f72efe0838dcbc97273d263b8c3ffb8946a097ca8464ad126ace881567b',
  maxAttempts: 3,
  lockoutMinutes: 5,
  sessionMinutes: 30
};

// Fonction de hash SHA-256
async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function RSVPMariage() {
  const [view, setView] = useState('form');
  const [adminStep, setAdminStep] = useState(1);
  const [adminCode, setAdminCode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    type: 'adulte', // adulte par défaut
    ceremonie: null,
    soiree: null,
    nbAccompagnants: 0,
    accompagnants: [],
    allergies: '',
    preference: ''
  });

  useEffect(() => {
    loadResponses();
    // Vérifier le lockout au chargement
    const savedLockout = localStorage.getItem('admin-lockout');
    if (savedLockout) {
      const lockoutTime = new Date(savedLockout);
      if (lockoutTime > new Date()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('admin-lockout');
      }
    }
    // Vérifier la session
    const savedSession = localStorage.getItem('admin-session');
    if (savedSession) {
      const sessionTime = new Date(savedSession);
      if (sessionTime > new Date()) {
        setIsAdminAuth(true);
        setSessionExpiry(sessionTime);
      } else {
        localStorage.removeItem('admin-session');
      }
    }
  }, []);

  // Vérifier l'expiration de session
  useEffect(() => {
    if (sessionExpiry && isAdminAuth) {
      const checkSession = setInterval(() => {
        if (new Date() > sessionExpiry) {
          handleLogout();
        }
      }, 1000);
      return () => clearInterval(checkSession);
    }
  }, [sessionExpiry, isAdminAuth]);

  // Réinitialiser l'activité (prolonger la session)
  const resetSessionTimer = () => {
    if (isAdminAuth) {
      const newExpiry = new Date(Date.now() + ADMIN_CONFIG.sessionMinutes * 60 * 1000);
      setSessionExpiry(newExpiry);
      localStorage.setItem('admin-session', newExpiry.toISOString());
    }
  };

  const handleLogout = () => {
    setIsAdminAuth(false);
    setAdminStep(1);
    setAdminCode('');
    setAdminPassword('');
    setSessionExpiry(null);
    localStorage.removeItem('admin-session');
  };

  const isLockedOut = () => {
    if (!lockoutUntil) return false;
    if (new Date() > lockoutUntil) {
      setLockoutUntil(null);
      setLoginAttempts(0);
      localStorage.removeItem('admin-lockout');
      return false;
    }
    return true;
  };

  const getRemainingLockout = () => {
    if (!lockoutUntil) return 0;
    return Math.ceil((lockoutUntil - new Date()) / 1000);
  };

  const handleCodeSubmit = async () => {
    if (isLockedOut()) return;
    
    const inputHash = await hashText(adminCode.toUpperCase());
    if (inputHash === ADMIN_CONFIG.secretCodeHash) {
      setAdminStep(2);
      setAdminCode('');
    } else {
      handleFailedAttempt();
    }
  };

  const handlePasswordSubmit = async () => {
    if (isLockedOut()) return;
    
    const inputHash = await hashText(adminPassword);
    if (inputHash === ADMIN_CONFIG.passwordHash) {
      setIsAdminAuth(true);
      setLoginAttempts(0);
      setAdminPassword('');
      const expiry = new Date(Date.now() + ADMIN_CONFIG.sessionMinutes * 60 * 1000);
      setSessionExpiry(expiry);
      localStorage.setItem('admin-session', expiry.toISOString());
    } else {
      handleFailedAttempt();
    }
  };

  const handleFailedAttempt = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= ADMIN_CONFIG.maxAttempts) {
      const lockout = new Date(Date.now() + ADMIN_CONFIG.lockoutMinutes * 60 * 1000);
      setLockoutUntil(lockout);
      localStorage.setItem('admin-lockout', lockout.toISOString());
      setAdminStep(1);
      setAdminCode('');
      setAdminPassword('');
    }
  };

  const loadResponses = () => {
    try {
      const saved = localStorage.getItem('rsvp-mariage-responses');
      if (saved) {
        setResponses(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Pas encore de réponses');
    }
  };

  const saveResponse = (newResponse) => {
    try {
      const updatedResponses = [...responses, { ...newResponse, id: Date.now(), date: new Date().toISOString() }];
      localStorage.setItem('rsvp-mariage-responses', JSON.stringify(updatedResponses));
      setResponses(updatedResponses);
      return true;
    } catch (e) {
      console.error('Erreur:', e);
      return false;
    }
  };

  const deleteResponse = (id) => {
    const updatedResponses = responses.filter(r => r.id !== id);
    localStorage.setItem('rsvp-mariage-responses', JSON.stringify(updatedResponses));
    setResponses(updatedResponses);
  };

  const startEdit = (response) => {
    setEditingResponse({ ...response, accompagnants: response.accompagnants || [] });
  };

  const cancelEdit = () => {
    setEditingResponse(null);
  };

  const saveEdit = () => {
    const updatedResponses = responses.map(r => 
      r.id === editingResponse.id ? editingResponse : r
    );
    localStorage.setItem('rsvp-mariage-responses', JSON.stringify(updatedResponses));
    setResponses(updatedResponses);
    setEditingResponse(null);
  };

  const updateEditField = (field, value) => {
    setEditingResponse({ ...editingResponse, [field]: value });
  };

  const updateEditAccompagnant = (index, field, value) => {
    const newAccompagnants = [...editingResponse.accompagnants];
    newAccompagnants[index] = { ...newAccompagnants[index], [field]: value };
    setEditingResponse({ ...editingResponse, accompagnants: newAccompagnants });
  };

  const addEditAccompagnant = () => {
    setEditingResponse({
      ...editingResponse,
      accompagnants: [...editingResponse.accompagnants, { prenom: '', nom: '', type: 'adulte', preference: '', allergies: '' }]
    });
  };

  const removeEditAccompagnant = (index) => {
    const newAccompagnants = editingResponse.accompagnants.filter((_, i) => i !== index);
    setEditingResponse({ ...editingResponse, accompagnants: newAccompagnants });
  };

  const clearAll = () => {
    if (confirm('Supprimer toutes les réponses ?')) {
      localStorage.removeItem('rsvp-mariage-responses');
      setResponses([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      saveResponse(formData);
      setSubmitted(true);
      setLoading(false);
    }, 500);
  };

  const handleAccompagnantChange = (index, field, value) => {
    const newAccompagnants = [...formData.accompagnants];
    newAccompagnants[index] = { ...newAccompagnants[index], [field]: value };
    setFormData({ ...formData, accompagnants: newAccompagnants });
  };

  const handleNbAccompagnantsChange = (nb) => {
    const newNb = Math.max(0, Math.min(10, nb));
    const newAccompagnants = Array(newNb).fill(null).map((_, i) => 
      formData.accompagnants[i] || { prenom: '', nom: '', type: 'adulte', preference: '', allergies: '' }
    );
    setFormData({ ...formData, nbAccompagnants: newNb, accompagnants: newAccompagnants });
  };

  const exportCSV = () => {
    const headers = ['Date', 'Prénom', 'Nom', 'Email', 'Type', 'Cérémonie', 'Soirée', 'Menu', 'Allergies', 'Rôle', 'Invité principal'];
    const rows = [];
    
    responses.forEach(r => {
      // Ligne pour l'invité principal
      rows.push([
        new Date(r.date).toLocaleDateString('fr-FR'),
        r.prenom,
        r.nom,
        r.email || '',
        r.type === 'enfant' ? 'Enfant' : 'Adulte',
        r.ceremonie ? 'Oui' : 'Non',
        r.soiree ? 'Oui' : 'Non',
        r.preference || '',
        r.allergies || '',
        'Invité principal',
        `${r.prenom} ${r.nom}`
      ]);
      
      // Ligne pour chaque accompagnant
      r.accompagnants?.forEach(a => {
        rows.push([
          new Date(r.date).toLocaleDateString('fr-FR'),
          a.prenom,
          a.nom || '',
          '', // pas d'email pour les accompagnants
          a.type === 'enfant' ? 'Enfant' : 'Adulte',
          r.ceremonie ? 'Oui' : 'Non', // même présence que l'invité principal
          r.soiree ? 'Oui' : 'Non',
          a.preference || '',
          a.allergies || '',
          'Accompagnant',
          `${r.prenom} ${r.nom}` // référence à l'invité principal
        ]);
      });
    });
    
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rsvp-mariage.csv';
    a.click();
  };

  // Calcul des stats
  const stats = {
    total: responses.length,
    adultes: responses.filter(r => r.type === 'adulte').length + 
             responses.reduce((acc, r) => acc + (r.accompagnants?.filter(a => a.type === 'adulte').length || 0), 0),
    enfants: responses.filter(r => r.type === 'enfant').length + 
             responses.reduce((acc, r) => acc + (r.accompagnants?.filter(a => a.type === 'enfant').length || 0), 0),
    ceremonie: responses.filter(r => r.ceremonie).length,
    soiree: responses.filter(r => r.soiree).length,
    totalPersonnes: responses.reduce((acc, r) => acc + 1 + (r.accompagnants?.length || 0), 0),
    vegetarien: responses.filter(r => r.preference === 'vegetarien').length + 
                responses.reduce((acc, r) => acc + (r.accompagnants?.filter(a => a.preference === 'vegetarien').length || 0), 0),
    sansPorc: responses.filter(r => r.preference === 'sans-porc').length +
              responses.reduce((acc, r) => acc + (r.accompagnants?.filter(a => a.preference === 'sans-porc').length || 0), 0),
    classique: responses.filter(r => r.preference === 'classique').length +
               responses.reduce((acc, r) => acc + (r.accompagnants?.filter(a => a.preference === 'classique').length || 0), 0)
  };

  // ========== VUE ADMIN ==========
  if (view === 'admin') {
    if (!isAdminAuth) {
      const locked = isLockedOut();
      const remainingSeconds = getRemainingLockout();
      
      return (
        <div className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-serif text-gray-800 mb-2 text-center">🔐 Administration</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Accès sécurisé en 2 étapes</p>
            
            {locked ? (
              <div className="text-center">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
                  <div className="text-4xl mb-3">⛔</div>
                  <p className="text-red-600 font-medium mb-2">Accès temporairement bloqué</p>
                  <p className="text-red-500 text-sm">Trop de tentatives échouées</p>
                  <p className="text-2xl font-mono text-red-600 mt-3">
                    {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                  </p>
                </div>
                <button onClick={() => setView('form')} className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  ← Retour au formulaire
                </button>
              </div>
            ) : (
              <>
                {/* Indicateur d'étape */}
                <div className="flex justify-center gap-2 mb-6">
                  <div className={`w-3 h-3 rounded-full ${adminStep >= 1 ? 'bg-rose-500' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${adminStep >= 2 ? 'bg-rose-500' : 'bg-gray-300'}`}></div>
                </div>
                
                {adminStep === 1 ? (
                  <>
                    <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
                      Étape 1 : Code secret
                    </label>
                    <input
                      type="text"
                      placeholder="Entrez le code secret"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleCodeSubmit()}
                      className="w-full p-3 border border-gray-200 rounded-lg mb-4 text-center text-lg uppercase tracking-widest"
                      maxLength={20}
                      autoComplete="off"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
                      Étape 2 : Mot de passe
                    </label>
                    <input
                      type="password"
                      placeholder="Entrez le mot de passe"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                      className="w-full p-3 border border-gray-200 rounded-lg mb-4 text-center text-lg"
                      autoComplete="off"
                    />
                  </>
                )}
                
                {loginAttempts > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
                    <p className="text-amber-700 text-sm">
                      ⚠️ Tentative {loginAttempts}/{ADMIN_CONFIG.maxAttempts}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                      if (adminStep === 2) {
                        setAdminStep(1);
                        setAdminPassword('');
                      } else {
                        setView('form');
                      }
                    }} 
                    className="flex-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    ← {adminStep === 2 ? 'Retour' : 'Formulaire'}
                  </button>
                  <button
                    onClick={adminStep === 1 ? handleCodeSubmit : handlePasswordSubmit}
                    className="flex-1 p-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                  >
                    {adminStep === 1 ? 'Suivant →' : '🔓 Connexion'}
                  </button>
                </div>
                
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Session sécurisée • Expiration auto {ADMIN_CONFIG.sessionMinutes} min
                </p>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 p-4" onClick={resetSessionTimer}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-serif text-gray-800">📋 Tableau de bord RSVP</h1>
                <p className="text-xs text-gray-400 mt-1">
                  🔒 Session sécurisée • Expire dans {sessionExpiry ? Math.max(0, Math.ceil((sessionExpiry - new Date()) / 60000)) : 0} min
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportCSV} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm">
                  📥 Export Excel
                </button>
                <button onClick={clearAll} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm">
                  🗑️ Tout effacer
                </button>
                <button onClick={() => { setView('form'); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  👁️ Voir formulaire
                </button>
                <button onClick={handleLogout} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm">
                  🚪 Déconnexion
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <div className="text-2xl">📝</div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-xs text-gray-600">Réponses</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-2xl">👥</div>
                <div className="text-2xl font-bold text-gray-800">{stats.totalPersonnes}</div>
                <div className="text-xs text-gray-600">Personnes</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className="text-2xl">🧑</div>
                <div className="text-2xl font-bold text-gray-800">{stats.adultes}</div>
                <div className="text-xs text-gray-600">Adultes</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-2xl">👶</div>
                <div className="text-2xl font-bold text-gray-800">{stats.enfants}</div>
                <div className="text-xs text-gray-600">Enfants</div>
              </div>
              <div className="bg-pink-50 rounded-xl p-3 text-center">
                <div className="text-2xl">💒</div>
                <div className="text-2xl font-bold text-gray-800">{stats.ceremonie}</div>
                <div className="text-xs text-gray-600">Cérémonie</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-2xl">🎉</div>
                <div className="text-2xl font-bold text-gray-800">{stats.soiree}</div>
                <div className="text-xs text-gray-600">Soirée</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-2xl">🥬</div>
                <div className="text-2xl font-bold text-gray-800">{stats.vegetarien}</div>
                <div className="text-xs text-gray-600">Végétarien</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <div className="text-2xl">🚫</div>
                <div className="text-2xl font-bold text-gray-800">{stats.sansPorc}</div>
                <div className="text-xs text-gray-600">Sans porc</div>
              </div>
            </div>
          </div>

          {/* Liste */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Nom</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Cérémonie</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Soirée</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Menu</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Allergies</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Accompagnants</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {responses.length === 0 ? (
                    <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">Aucune réponse pour le moment</td></tr>
                  ) : (
                    responses.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{r.prenom} {r.nom}</div>
                          {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${r.type === 'enfant' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {r.type === 'enfant' ? '👶 Enfant' : '🧑 Adulte'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${r.ceremonie ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.ceremonie ? '✓ Oui' : '✗ Non'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${r.soiree ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {r.soiree ? '✓ Oui' : '✗ Non'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.preference && (
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              r.preference === 'vegetarien' ? 'bg-emerald-100 text-emerald-700' :
                              r.preference === 'sans-porc' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {r.preference === 'vegetarien' ? '🥬 Végé' : r.preference === 'sans-porc' ? '🚫🐷' : '🍽️ Classique'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{r.allergies || '-'}</td>
                        <td className="px-4 py-3">
                          {r.accompagnants?.length > 0 ? (
                            <div className="space-y-1">
                              {r.accompagnants.map((a, i) => (
                                <div key={i} className="text-xs bg-gray-100 rounded px-2 py-1">
                                  {a.prenom} {a.nom || ''} {a.type === 'enfant' ? '👶' : '🧑'} • {a.preference === 'vegetarien' ? '🥬' : a.preference === 'sans-porc' ? '🚫🐷' : '🍽️'}
                                </div>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => startEdit(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Modifier">✏️</button>
                            <button onClick={() => deleteResponse(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal d'édition */}
          {editingResponse && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-serif text-gray-800">✏️ Modifier la réponse</h2>
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Infos personnelles */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Prénom *</label>
                      <input type="text" value={editingResponse.prenom}
                        onChange={(e) => updateEditField('prenom', e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Nom *</label>
                      <input type="text" value={editingResponse.nom}
                        onChange={(e) => updateEditField('nom', e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-lg" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={editingResponse.email || ''}
                      onChange={(e) => updateEditField('email', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${!editingResponse.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Type</label>
                    <div className="flex gap-3">
                      <button type="button"
                        onClick={() => updateEditField('type', 'adulte')}
                        className={`flex-1 p-3 rounded-xl border-2 transition ${editingResponse.type === 'adulte' ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                        🧑 Adulte
                      </button>
                      <button type="button"
                        onClick={() => updateEditField('type', 'enfant')}
                        className={`flex-1 p-3 rounded-xl border-2 transition ${editingResponse.type === 'enfant' ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
                        👶 Enfant
                      </button>
                    </div>
                  </div>

                  {/* Présence */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Cérémonie</label>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => updateEditField('ceremonie', true)}
                          className={`flex-1 p-2 rounded-lg border-2 ${editingResponse.ceremonie === true ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                          ✓ Oui
                        </button>
                        <button type="button"
                          onClick={() => updateEditField('ceremonie', false)}
                          className={`flex-1 p-2 rounded-lg border-2 ${editingResponse.ceremonie === false ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                          ✗ Non
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Soirée</label>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => updateEditField('soiree', true)}
                          className={`flex-1 p-2 rounded-lg border-2 ${editingResponse.soiree === true ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                          ✓ Oui
                        </button>
                        <button type="button"
                          onClick={() => updateEditField('soiree', false)}
                          className={`flex-1 p-2 rounded-lg border-2 ${editingResponse.soiree === false ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                          ✗ Non
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Menu */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Préférence culinaire</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button type="button"
                        onClick={() => updateEditField('preference', 'classique')}
                        className={`p-3 rounded-xl border-2 transition text-center ${editingResponse.preference === 'classique' ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                        🍽️ Classique
                      </button>
                      <button type="button"
                        onClick={() => updateEditField('preference', 'vegetarien')}
                        className={`p-3 rounded-xl border-2 transition text-center ${editingResponse.preference === 'vegetarien' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}>
                        🥬 Végétarien
                      </button>
                      <button type="button"
                        onClick={() => updateEditField('preference', 'sans-porc')}
                        className={`p-3 rounded-xl border-2 transition text-center ${editingResponse.preference === 'sans-porc' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}>
                        🚫🐷 Sans porc
                      </button>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Allergies</label>
                    <input type="text" value={editingResponse.allergies || ''}
                      onChange={(e) => updateEditField('allergies', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg" />
                  </div>

                  {/* Accompagnants */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-gray-600">Accompagnants ({editingResponse.accompagnants?.length || 0})</label>
                      <button type="button" onClick={addEditAccompagnant}
                        className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-sm hover:bg-rose-200">
                        + Ajouter
                      </button>
                    </div>
                    {editingResponse.accompagnants?.map((acc, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium text-gray-700">Accompagnant {index + 1}</span>
                          <button type="button" onClick={() => removeEditAccompagnant(index)}
                            className="text-red-500 hover:text-red-700 text-sm">Supprimer</button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <input type="text" placeholder="Prénom *" value={acc.prenom}
                            onChange={(e) => updateEditAccompagnant(index, 'prenom', e.target.value)}
                            className="p-2 border border-gray-200 rounded-lg" />
                          <input type="text" placeholder="Nom *" value={acc.nom || ''}
                            onChange={(e) => updateEditAccompagnant(index, 'nom', e.target.value)}
                            className="p-2 border border-gray-200 rounded-lg" />
                          <select value={acc.type}
                            onChange={(e) => updateEditAccompagnant(index, 'type', e.target.value)}
                            className="p-2 border border-gray-200 rounded-lg bg-white">
                            <option value="adulte">🧑 Adulte</option>
                            <option value="enfant">👶 Enfant</option>
                          </select>
                          <select value={acc.preference}
                            onChange={(e) => updateEditAccompagnant(index, 'preference', e.target.value)}
                            className="p-2 border border-gray-200 rounded-lg bg-white">
                            <option value="">Menu...</option>
                            <option value="classique">🍽️ Classique</option>
                            <option value="vegetarien">🥬 Végétarien</option>
                            <option value="sans-porc">🚫🐷 Sans porc</option>
                          </select>
                        </div>
                        <input type="text" placeholder="Allergies (optionnel)" value={acc.allergies || ''}
                          onChange={(e) => updateEditAccompagnant(index, 'allergies', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg mt-3" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Boutons */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                  <button onClick={cancelEdit}
                    className="flex-1 p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Annuler
                  </button>
                  <button onClick={saveEdit}
                    disabled={!editingResponse.prenom || !editingResponse.nom || !editingResponse.email}
                    className="flex-1 p-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50">
                    💾 Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== VUE CONFIRMATION ==========
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">💕</div>
          <h2 className="text-2xl font-serif text-gray-800 mb-4">Merci {formData.prenom} !</h2>
          <p className="text-gray-600 mb-6">
            Votre réponse a bien été enregistrée.
            {(formData.ceremonie || formData.soiree) && " Nous avons hâte de vous retrouver !"}
          </p>
          <div className="bg-rose-50 rounded-xl p-4 mb-6">
            <p className="text-rose-700">À très bientôt pour célébrer ce jour si spécial avec nous !</p>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                prenom: '', nom: '', email: '', type: 'adulte', ceremonie: null, soiree: null,
                nbAccompagnants: 0, accompagnants: [], allergies: '', preference: ''
              });
            }}
            className="text-rose-600 hover:text-rose-700 text-sm underline"
          >
            Soumettre une autre réponse
          </button>
        </div>
      </div>
    );
  }

  // ========== VUE FORMULAIRE ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-6">
          <div className="text-5xl mb-4">💒</div>
          <h1 className="text-3xl md:text-4xl font-serif text-gray-800 mb-2">Confirmez votre présence</h1>
          <p className="text-gray-500">Nous serions ravis de vous compter parmi nous</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-8">
          
          {/* Identité */}
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <span>👤</span> Vos informations
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prénom *</label>
                <input
                  type="text" required value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                  placeholder="Votre prénom"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom *</label>
                <input
                  type="text" required value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none ${!formData.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                placeholder="votre@email.com"
              />
            </div>
          </div>

          {/* Présence */}
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <span>📅</span> Votre présence
            </h2>
            
            {/* Cérémonie */}
            <div className="mb-6 p-4 bg-pink-50 rounded-xl border border-pink-100">
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">💒</span> La Cérémonie <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-500 mb-3">Mariage civil et/ou religieux</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setFormData({ ...formData, ceremonie: true })}
                  className={`flex-1 p-4 rounded-xl border-2 transition ${formData.ceremonie === true ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">✓</div>
                  <div className="font-medium">Oui, je serai là</div>
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, ceremonie: false })}
                  className={`flex-1 p-4 rounded-xl border-2 transition ${formData.ceremonie === false ? 'border-gray-400 bg-gray-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">✗</div>
                  <div className="font-medium">Non</div>
                </button>
              </div>
            </div>

            {/* Soirée */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <label className="block text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">🎉</span> La Soirée <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-500 mb-3">Cocktail, dîner et fête</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setFormData({ ...formData, soiree: true })}
                  className={`flex-1 p-4 rounded-xl border-2 transition ${formData.soiree === true ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">🥳</div>
                  <div className="font-medium">Oui, je fais la fête !</div>
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, soiree: false })}
                  className={`flex-1 p-4 rounded-xl border-2 transition ${formData.soiree === false ? 'border-gray-400 bg-gray-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">😴</div>
                  <div className="font-medium">Non</div>
                </button>
              </div>
            </div>
          </div>

          {/* Menu (si soirée) */}
          {formData.soiree && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <span>🍽️</span> Préférences culinaires
              </h2>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button type="button"
                  onClick={() => setFormData({ ...formData, preference: 'classique' })}
                  className={`p-4 rounded-xl border-2 transition text-center ${
                    formData.preference === 'classique' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-2xl mb-1">🍽️</div>
                  <div className="text-sm font-medium">Classique</div>
                </button>
                <button type="button"
                  onClick={() => setFormData({ ...formData, preference: 'vegetarien' })}
                  className={`p-4 rounded-xl border-2 transition text-center ${
                    formData.preference === 'vegetarien' ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-2xl mb-1">🥬</div>
                  <div className="text-sm font-medium">Végétarien</div>
                </button>
                <button type="button"
                  onClick={() => setFormData({ ...formData, preference: 'sans-porc' })}
                  className={`p-4 rounded-xl border-2 transition text-center ${
                    formData.preference === 'sans-porc' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <div className="text-2xl mb-1">🚫🐷</div>
                  <div className="text-sm font-medium">Sans porc</div>
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">⚠️ Allergies alimentaires</label>
                <textarea
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none"
                  placeholder="Gluten, lactose, fruits à coque..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Accompagnants */}
          {(formData.ceremonie || formData.soiree) && (
            <div>
              <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                <span>👥</span> Accompagnants
              </h2>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">Nombre :</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleNbAccompagnantsChange(formData.nbAccompagnants - 1)}
                    className="w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xl font-bold">-</button>
                  <span className="w-8 text-center font-bold text-lg">{formData.nbAccompagnants}</span>
                  <button type="button" onClick={() => handleNbAccompagnantsChange(formData.nbAccompagnants + 1)}
                    className="w-10 h-10 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center text-xl font-bold">+</button>
                </div>
              </div>

              {formData.accompagnants.map((acc, index) => (
                <div key={index} className="bg-gray-50 rounded-xl p-4 mb-3">
                  <div className="font-medium text-gray-700 mb-3">Accompagnant {index + 1} <span className="text-red-500">*</span></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input type="text" placeholder="Prénom *" value={acc.prenom}
                      onChange={(e) => handleAccompagnantChange(index, 'prenom', e.target.value)}
                      className={`p-2 border rounded-lg ${!acc.prenom ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    <input type="text" placeholder="Nom *" value={acc.nom || ''}
                      onChange={(e) => handleAccompagnantChange(index, 'nom', e.target.value)}
                      className={`p-2 border rounded-lg ${!acc.nom ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    <select value={acc.type} onChange={(e) => handleAccompagnantChange(index, 'type', e.target.value)}
                      className="p-2 border border-gray-200 rounded-lg bg-white">
                      <option value="adulte">🧑 Adulte</option>
                      <option value="enfant">👶 Enfant</option>
                    </select>
                    <select value={acc.preference} onChange={(e) => handleAccompagnantChange(index, 'preference', e.target.value)}
                      className="p-2 border border-gray-200 rounded-lg bg-white">
                      <option value="">Menu...</option>
                      <option value="classique">🍽️ Classique</option>
                      <option value="vegetarien">🥬 Végétarien</option>
                      <option value="sans-porc">🚫🐷 Sans porc</option>
                    </select>
                  </div>
                  <input type="text" placeholder="Allergies (optionnel)" value={acc.allergies}
                    onChange={(e) => handleAccompagnantChange(index, 'allergies', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg mt-3" />
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <button type="submit"
            disabled={loading || !formData.prenom || !formData.nom || !formData.email || formData.ceremonie === null || formData.soiree === null || (formData.soiree && !formData.preference) || formData.accompagnants.some(a => !a.prenom || !a.nom)}
            className="w-full p-4 bg-gradient-to-r from-rose-500 to-rose-400 text-white rounded-xl font-medium hover:from-rose-600 hover:to-rose-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
            {loading ? (
              <><span className="animate-spin">⏳</span> Envoi...</>
            ) : (
              <>💕 Confirmer ma réponse</>
            )}
          </button>
        </form>

        {/* Lien admin */}
        <div className="text-center mt-6">
          <button onClick={() => setView('admin')} className="text-xs text-gray-400 hover:text-gray-600">
            Administration
          </button>
        </div>
      </div>
    </div>
  );
}
