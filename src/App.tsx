/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { SplashScreen, upsertSavedAccountLocal } from './components/SplashScreen';
import { HomeTab } from './components/HomeTab';
import { MedicationsTab } from './components/MedicationsTab';
import { InteractionsTab } from './components/InteractionsTab';
import { PrescriptionsTab, SavedPrescription } from './components/PrescriptionsTab';
import { InterventionsTab } from './components/InterventionsTab';
import { ProfileTab } from './components/ProfileTab';
import { SwipeBackContainer, triggerActiveBackInterceptor } from './components/SwipeBackContainer';
import {
  saveActiveSessionLocal,
  loadAllSavedAccounts
} from './utils/accountStorage';
import {
  readPrescriptionsSyncFromLocal,
  loadAllSavedPrescriptions,
  persistNewPrescription,
  removeSavedPrescription
} from './utils/prescriptionStorage';
import {
  INITIAL_MEDICATIONS,
  INITIAL_INTERVENTIONS,
  Medication,
  InterventionLog,
  RawAnvisaRecord,
  enrichAnvisaRecord
} from './data/medications';

export interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  password?: string;
  profession: string;
  workplace: string;
  registrationNumber: string;
  avatarUrl: string;
}

const TAB_LABELS: Record<string, string> = {
  inicio: 'Início',
  medicamentos: 'Medicamentos',
  interacoes: 'Interações',
  receitas: 'Receitas',
  intervencoes: 'Intervenções',
  perfil: 'Perfil',
};

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTabState] = useState<string>('inicio');
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState<Medication[]>(INITIAL_MEDICATIONS);
  const [isCatalogLoaded, setIsCatalogLoaded] = useState<boolean>(false);
  const [interventions, setInterventions] = useState<InterventionLog[]>(() => {
    try {
      const saved = localStorage.getItem('farmaclick_interventions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_INTERVENTIONS;
  });

  const [savedPrescriptions, setSavedPrescriptions] = useState<SavedPrescription[]>(() =>
    readPrescriptionsSyncFromLocal()
  );

  const [prescriptionToLoadInInteractions, setPrescriptionToLoadInInteractions] =
    useState<SavedPrescription | null>(null);

  const navigateToTab = useCallback(
    (nextTab: string) => {
      setActiveTabState((currentTab) => {
        if (nextTab === currentTab) return currentTab;
        setTabHistory((prev) => [...prev.slice(-19), currentTab]);
        try {
          window.history.pushState({ farmaclickTab: nextTab }, '');
        } catch {
          // Ignore in restricted iframe contexts
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return nextTab;
      });
    },
    []
  );

  const handleSwipeBack = useCallback(() => {
    setTabHistory((prev) => {
      if (prev.length > 0) {
        const previousTab = prev[prev.length - 1];
        setActiveTabState(previousTab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return prev.slice(0, -1);
      }
      setActiveTabState((currentTab) => {
        if (currentTab !== 'inicio') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return 'inicio';
        }
        return currentTab;
      });
      return prev;
    });
  }, []);

  // Sync browser/hardware back gesture (popstate) with modal interceptors & tab history
  useEffect(() => {
    const handlePopState = () => {
      if (triggerActiveBackInterceptor()) {
        return;
      }
      handleSwipeBack();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleSwipeBack]);

  useEffect(() => {
    const savedUser = localStorage.getItem('farmaclick_user');
    if (savedUser) {
      try {
        const parsed: UserProfile = JSON.parse(savedUser);
        setUserProfile(parsed);
        // Ensure existing logged-in user is stored across LocalStorage, IndexedDB, and Backend
        if (parsed && parsed.name) {
          upsertSavedAccountLocal(parsed);
          fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          }).catch(() => {});
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadAllSavedAccounts().catch(() => {});
  }, []);

  // Load saved prescriptions from IndexedDB + Backend + LocalStorage on mount and whenever user logs in
  useEffect(() => {
    let mounted = true;
    loadAllSavedPrescriptions().then((loaded) => {
      if (mounted) {
        setSavedPrescriptions(loaded);
      }
    });
    return () => {
      mounted = false;
    };
  }, [userProfile?.id, userProfile?.name]);

  // Load the complete active ANVISA database (8,619 unique products / 85,497 active presentations from dados.anvisa.gov.br)
  useEffect(() => {
    let mounted = true;
    async function loadOfficialAnvisaCatalog() {
      try {
        const res = await fetch('/anvisa-catalog.json');
        if (!res.ok) return;
        const rawList: RawAnvisaRecord[] = await res.json();
        if (!mounted || !Array.isArray(rawList)) return;

        const existingNames = new Set(INITIAL_MEDICATIONS.map(m => m.name.toUpperCase().trim()));
        const enriched: Medication[] = [];
        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          const upper = (item.n || '').toUpperCase().trim();
          if (upper && !existingNames.has(upper)) {
            enriched.push(enrichAnvisaRecord(item, i));
          }
        }
        setMedications([...INITIAL_MEDICATIONS, ...enriched]);
        setIsCatalogLoaded(true);
      } catch (err) {
        console.error('Erro ao carregar catálogo ANVISA completo:', err);
      }
    }
    loadOfficialAnvisaCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('farmaclick_interventions', JSON.stringify(interventions));
    } catch (e) {
      console.error(e);
    }
  }, [interventions]);

  const handleUpdateProfile = (profile: UserProfile) => {
    const merged: UserProfile = {
      ...userProfile,
      ...profile,
    };
    setUserProfile(merged);
    saveActiveSessionLocal(merged);
    upsertSavedAccountLocal(merged);
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    }).catch(() => {});
  };

  const handleLogout = () => {
    if (userProfile && userProfile.name) {
      upsertSavedAccountLocal(userProfile);
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfile),
      }).catch(() => {});
    }
    localStorage.removeItem('farmaclick_user');
    setUserProfile(null);
    setTabHistory([]);
    setActiveTabState('inicio');
  };

  const handleAddIntervention = (log: InterventionLog) => {
    setInterventions(prev => [log, ...prev]);
  };

  const handleDeleteIntervention = (id: string) => {
    setInterventions(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateInterventionStatus = (id: string, newStatus: 'Aceita' | 'Pendente' | 'Rejeitada') => {
    setInterventions(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
  };

  const handleSavePrescription = (prescription: SavedPrescription) => {
    setSavedPrescriptions((prev) => {
      const next = [prescription, ...prev.filter((p) => p.id !== prescription.id)];
      persistNewPrescription(prescription, prev).catch((err) =>
        console.error('Erro ao persistir receita:', err)
      );
      return next;
    });
  };

  const handleDeletePrescription = (id: string) => {
    setSavedPrescriptions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      removeSavedPrescription(id, prev).catch((err) =>
        console.error('Erro ao excluir receita:', err)
      );
      return next;
    });
  };

  const handleOpenPrescriptionInInteractions = (prescription: SavedPrescription) => {
    setPrescriptionToLoadInInteractions(prescription);
    navigateToTab('interacoes');
  };

  const handleAddMedication = (newMed: Medication) => {
    setMedications(prev => [newMed, ...prev]);
  };

  if (!userProfile) {
    return <SplashScreen onComplete={handleUpdateProfile} />;
  }

  const pendingCount = interventions.filter(i => i.status === 'Pendente').length;
  const previousTabId =
    tabHistory.length > 0
      ? tabHistory[tabHistory.length - 1]
      : activeTab !== 'inicio'
        ? 'inicio'
        : null;
  const canGoBackScreen = Boolean(previousTabId);
  const previousScreenLabel = previousTabId ? TAB_LABELS[previousTabId] || 'Tela Anterior' : undefined;

  return (
    <SwipeBackContainer
      canGoBack={canGoBackScreen}
      previousLabel={previousScreenLabel}
      onSwipeBack={handleSwipeBack}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white pb-24">
        <Header
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={navigateToTab}
        />

        <main className="mx-auto max-w-7xl px-4 py-6">
          {activeTab === 'inicio' && (
            <HomeTab
              setActiveTab={navigateToTab}
              medications={medications}
              interventions={interventions}
              savedPrescriptionsCount={savedPrescriptions.length}
              userProfile={userProfile}
            />
          )}
          {activeTab === 'medicamentos' && (
            <MedicationsTab
              medications={medications}
              onAddMedication={handleAddMedication}
              isCatalogLoaded={isCatalogLoaded}
            />
          )}
          {activeTab === 'interacoes' && (
            <InteractionsTab
              medications={medications}
              onSaveIntervention={handleAddIntervention}
              onSavePrescription={handleSavePrescription}
              onViewPrescriptions={() => navigateToTab('receitas')}
              userProfile={userProfile}
              initialPrescription={prescriptionToLoadInInteractions}
              onClearInitialPrescription={() => setPrescriptionToLoadInInteractions(null)}
            />
          )}
          {activeTab === 'receitas' && (
            <PrescriptionsTab
              prescriptions={savedPrescriptions}
              onDeletePrescription={handleDeletePrescription}
              onOpenInInteractions={handleOpenPrescriptionInInteractions}
              onGoToNewPrescription={() => navigateToTab('interacoes')}
            />
          )}
          {activeTab === 'intervencoes' && (
            <InterventionsTab
              interventions={interventions}
              onAddIntervention={handleAddIntervention}
              onDeleteIntervention={handleDeleteIntervention}
              onUpdateStatus={handleUpdateInterventionStatus}
              userProfile={userProfile}
            />
          )}
          {activeTab === 'perfil' && (
            <ProfileTab
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onLogout={handleLogout}
            />
          )}
        </main>

        <BottomNav
          activeTab={activeTab}
          setActiveTab={navigateToTab}
          pendingInterventionsCount={pendingCount}
          savedPrescriptionsCount={savedPrescriptions.length}
        />
      </div>
    </SwipeBackContainer>
  );
}
