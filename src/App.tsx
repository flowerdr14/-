/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Plus, Trash2, Search, X, Calculator, Save, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocFromServer,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';

// --- User List ---
const ALLOWED_USERS = [
  { name: '정루이', id: 'jungroo_2', pw: 'haesol123' },
  { name: '유중혁', id: 'U_joongh', pw: 'haesol123' },
  { name: '강동주', id: 'kangjooo', pw: 'haesol123' },
  { name: '릴리', id: 'lilly_lil', pw: 'haesol123' },
  { name: '박민국', id: 'mincook', pw: 'haesol123' },
  { name: '찬호', id: 'chanho8', pw: 'haesol123' },
  { name: '소나무', id: 'sonamoo', pw: 'haesol123' },
  { name: '이익준', id: 'ikjooon', pw: 'haesol123' },
  { name: '최가은', id: 'gagaeun', pw: 'haesol123' },
  { name: '박지아', id: 'jiapark84', pw: 'haesol123' },
  { name: '이정원', id: 'leegarden', pw: 'haesol123' },
  { name: '이정인', id: 'jeongout7', pw: 'haesol123' },
  { name: '순후추', id: 'peppersun', pw: 'haesol123' },
  { name: '도하', id: 'dohahado', pw: 'haesol123' },
  { name: '박태현', id: 'taehyuns64', pw: 'haesol123' },
  { name: '이수현', id: 'siuuhyun', pw: 'haesol123' },
  { name: '양재원', id: 'sheepone', pw: 'haesol123' },
];

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ErrorBoundary = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

interface ChemoOrderRow {
  id: string;
  cycle: string;
  day: string;
  drug: string;
  dose: string;
}

interface Patient {
  id: string;
  name: string;
  birthDate: string;
  chartNumber: string;
  age: string;
  gender: string;
  bsa: string;
  weight: string;
  height: string;
  premedication: string;
  hydration: string;
  sideEffects: string;
  adjustmentCriteria: string;
  chemoOrders: ChemoOrderRow[];
  ownerId: string;
  updatedAt?: any;
}

const DEFAULT_CHEMO_ROWS = 5;

// --- Popup Components ---

const ChemoOrderPopup = ({ patient, onUpdate }: { patient: Patient, onUpdate: (p: Patient) => void }) => {
  const handleAddRow = () => {
    const newRow: ChemoOrderRow = {
      id: crypto.randomUUID(),
      cycle: '',
      day: '',
      drug: '',
      dose: '',
    };
    onUpdate({ ...patient, chemoOrders: [...patient.chemoOrders, newRow] });
  };

  const handleUpdateRow = (rowId: string, field: keyof ChemoOrderRow, value: string) => {
    const updatedRows = patient.chemoOrders.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    );
    onUpdate({ ...patient, chemoOrders: updatedRows });
  };

  const handleUpdatePatientField = (field: keyof Patient, value: string) => {
    onUpdate({ ...patient, [field]: value });
  };

  const openCalculator = () => {
    window.open(window.location.pathname + '?view=calculator', 'calculator_popup', 'width=400,height=500');
  };

  return (
    <div className="p-6 bg-white min-h-screen flex flex-col font-sans">
      <div className="mb-4 flex justify-between items-center border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold">AntiCancer Order - {patient.name}</h1>
        <div className="text-sm text-gray-500 font-bold">차트번호: {patient.chartNumber}</div>
      </div>

      <div className="mb-6 flex gap-8 bg-gray-100 p-4 border-2 border-black">
        <div className="flex items-center gap-2">
          <span className="font-bold">키:</span>
          <input
            type="text"
            spellCheck="false"
            className="w-20 border-b border-black bg-transparent text-center outline-none focus:bg-white"
            value={patient.height}
            onChange={(e) => handleUpdatePatientField('height', e.target.value)}
          />
          <span className="font-bold text-sm">cm</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">몸무게:</span>
          <input
            type="text"
            spellCheck="false"
            className="w-20 border-b border-black bg-transparent text-center outline-none focus:bg-white"
            value={patient.weight}
            onChange={(e) => handleUpdatePatientField('weight', e.target.value)}
          />
          <span className="font-bold text-sm">kg</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold">BSA:</span>
          <input
            type="text"
            spellCheck="false"
            className="w-20 border-b border-black bg-transparent text-center outline-none focus:bg-white"
            value={patient.bsa}
            onChange={(e) => handleUpdatePatientField('bsa', e.target.value)}
          />
          <span className="font-bold text-sm">m²</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-300">
              <th className="border-2 border-black p-3 text-lg font-bold">Cycle</th>
              <th className="border-2 border-black p-3 text-lg font-bold">Day</th>
              <th className="border-2 border-black p-3 text-lg font-bold">Drug</th>
              <th className="border-2 border-black p-3 text-lg font-bold">Dose</th>
            </tr>
          </thead>
          <tbody>
            {patient.chemoOrders.map((row) => (
              <tr key={row.id}>
                <td className="border-2 border-black p-0">
                  <input
                    type="text"
                    spellCheck="false"
                    className="w-full p-3 text-center outline-none focus:bg-gray-50"
                    value={row.cycle}
                    onChange={(e) => handleUpdateRow(row.id, 'cycle', e.target.value)}
                  />
                </td>
                <td className="border-2 border-black p-0">
                  <input
                    type="text"
                    spellCheck="false"
                    className="w-full p-3 text-center outline-none focus:bg-gray-50"
                    value={row.day}
                    onChange={(e) => handleUpdateRow(row.id, 'day', e.target.value)}
                  />
                </td>
                <td className="border-2 border-black p-0">
                  <input
                    type="text"
                    spellCheck="false"
                    className="w-full p-3 text-center outline-none focus:bg-gray-50"
                    value={row.drug}
                    onChange={(e) => handleUpdateRow(row.id, 'drug', e.target.value)}
                  />
                </td>
                <td className="border-2 border-black p-0">
                  <input
                    type="text"
                    spellCheck="false"
                    className="w-full p-3 text-center outline-none focus:bg-gray-50"
                    value={row.dose}
                    onChange={(e) => handleUpdateRow(row.id, 'dose', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={openCalculator}
          className="px-8 py-2 bg-[#00A86B] text-white font-bold border-2 border-black hover:bg-[#008F5B] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
        >
          계산기
        </button>
        <button
          onClick={handleAddRow}
          className="px-8 py-2 bg-[#00A86B] text-white font-bold border-2 border-black hover:bg-[#008F5B] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
        >
          추가
        </button>
        <button
          onClick={() => window.close()}
          className="px-8 py-2 bg-black text-white font-bold border-2 border-black hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
        >
          저장 및 종료
        </button>
      </div>
    </div>
  );
};

const CalculatorPopup = () => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bsa, setBsa] = useState<number | null>(null);

  const calculateBSA = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      // Mosteller formula: BSA = sqrt( (height * weight) / 3600 )
      const result = Math.sqrt((h * w) / 3600);
      setBsa(result);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen flex flex-col font-sans border-4 border-black">
      <h1 className="text-xl font-bold mb-6 border-b-2 border-black pb-2">BSA 계산기</h1>
      
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="font-bold text-sm">키 (cm)</label>
          <input
            type="number"
            spellCheck="false"
            className="border-2 border-black p-2 outline-none"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-bold text-sm">몸무게 (kg)</label>
          <input
            type="number"
            spellCheck="false"
            className="border-2 border-black p-2 outline-none"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        
        <button
          onClick={calculateBSA}
          className="w-full py-3 bg-black text-white font-bold hover:bg-gray-800 transition-colors"
        >
          계산하기
        </button>

        {bsa !== null && (
          <div className="mt-6 p-4 bg-gray-100 border-2 border-black text-center">
            <div className="text-sm text-gray-600 font-bold mb-1">계산된 BSA</div>
            <div className="text-3xl font-bold">{bsa.toFixed(2)} <span className="text-lg">m²</span></div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={() => window.close()}
          className="w-full py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};

// --- Patient Detail Section ---
interface PatientDetailProps {
  patient: Patient;
  onUpdate: (p: Patient) => void;
  onClose: () => void;
  onOpenChemo: () => void;
}

const PatientDetail = ({ patient, onUpdate, onClose, onOpenChemo }: PatientDetailProps) => {
  const [localPatient, setLocalPatient] = useState(patient);

  useEffect(() => {
    setLocalPatient(patient);
  }, [patient.id]);

  const handleChange = (field: keyof Patient, value: any) => {
    const updated = { ...localPatient, [field]: value };
    setLocalPatient(updated);
    onUpdate(updated);
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Patient Basic Info */}
      <div className="border-2 border-black">
        <div className="bg-gray-400 text-black px-4 py-1 font-bold border-b-2 border-black flex justify-between items-center">
          <span>환자기본정보</span>
          <button 
            onClick={onClose}
            className="text-xs bg-black text-white px-2 py-0.5 hover:bg-gray-800 transition-colors"
          >
            종료 (홈으로)
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8">
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">성명:</span>
            <input
              type="text"
              spellCheck="false"
              className="flex-1 border-b border-gray-300 focus:border-black outline-none"
              value={localPatient.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">생년월일:</span>
            <input
              type="text"
              spellCheck="false"
              className="flex-1 border-b border-gray-300 focus:border-black outline-none"
              value={localPatient.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">차트번호:</span>
            <input
              type="text"
              spellCheck="false"
              className="flex-1 border-b border-gray-300 focus:border-black outline-none"
              value={localPatient.chartNumber}
              onChange={(e) => handleChange('chartNumber', e.target.value)}
            />
          </div>
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">나이:</span>
              <input
                type="text"
                spellCheck="false"
                className="w-16 border-b border-gray-300 focus:border-black outline-none"
                value={localPatient.age}
                onChange={(e) => handleChange('age', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold whitespace-nowrap">성별:</span>
              <select
                className="border-b border-gray-300 focus:border-black outline-none bg-transparent"
                value={localPatient.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Info */}
      <div className="border-2 border-black">
        <div className="bg-gray-400 text-black px-4 py-1 font-bold border-b-2 border-black">
          신체정보
        </div>
        <div className="p-4 flex gap-12">
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">BSA:</span>
            <input
              type="text"
              spellCheck="false"
              className="w-24 border-b border-gray-300 focus:border-black outline-none"
              value={localPatient.bsa}
              onChange={(e) => handleChange('bsa', e.target.value)}
            />
            <span className="text-sm text-gray-500">m²</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">키:</span>
            <input
              type="text"
              spellCheck="false"
              className="w-24 border-b border-gray-300 focus:border-black outline-none"
              value={localPatient.height}
              onChange={(e) => handleChange('height', e.target.value)}
            />
            <span className="text-sm text-gray-500">cm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">체중:</span>
            <input
              type="text"
              spellCheck="false"
              className="w-24 border-b border-gray-300 focus:border-black outline-none"
              value={localPatient.weight}
              onChange={(e) => handleChange('weight', e.target.value)}
            />
            <span className="text-sm text-gray-500">kg</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left: 기타기록 */}
        <div className="col-span-4 flex flex-col border-2 border-black min-h-0">
          <div className="bg-gray-400 text-black px-4 py-1 font-bold border-b-2 border-black">
            기타기록
          </div>
          <textarea
            className="flex-1 p-2 focus:border-black outline-none resize-none"
            spellCheck="false"
            placeholder="기타 기록 사항을 입력하세요..."
            value={localPatient.premedication + (localPatient.sideEffects ? '\n' + localPatient.sideEffects : '')}
            onChange={(e) => {
              const lines = e.target.value.split('\n');
              const updated = { 
                ...localPatient, 
                premedication: lines[0] || '', 
                sideEffects: lines.slice(1).join('\n') 
              };
              setLocalPatient(updated);
              onUpdate(updated);
            }}
          />
        </div>

        {/* Middle: Hydration & Adjustment */}
        <div className="col-span-6 flex flex-col gap-4 min-h-0">
          <div className="flex-1 flex flex-col border-2 border-black min-h-0">
            <div className="bg-gray-400 text-black px-4 py-1 font-bold border-b-2 border-black">
              Hydration (수액)
            </div>
            <textarea
              className="flex-1 p-2 focus:border-black outline-none resize-none"
              spellCheck="false"
              value={localPatient.hydration}
              onChange={(e) => handleChange('hydration', e.target.value)}
            />
          </div>
          <div className="flex-1 flex flex-col border-2 border-black min-h-0">
            <div className="bg-gray-400 text-black px-4 py-1 font-bold border-b-2 border-black">
              조정기준
            </div>
            <textarea
              className="flex-1 p-2 focus:border-black outline-none resize-none"
              spellCheck="false"
              value={localPatient.adjustmentCriteria}
              onChange={(e) => handleChange('adjustmentCriteria', e.target.value)}
            />
          </div>
        </div>

        {/* Right: Chemo Button */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="flex-1"></div>
          <button
            onClick={onOpenChemo}
            className="h-32 bg-gray-400 border-2 border-black font-bold flex flex-col items-center justify-center gap-2 hover:bg-gray-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
          >
            <span className="text-lg">항암오더</span>
            <span className="text-lg">(활성창)</span>
          </button>
          <div className="py-3 bg-black text-white font-bold flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Save className="w-5 h-5" /> 저장됨
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('patients_cache');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(() => {
    return localStorage.getItem('selected_patient_id');
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(true);
  const updateTimeoutRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Persistence
  useEffect(() => {
    localStorage.setItem('patients_cache', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem('selected_patient_id', selectedPatientId);
    }
  }, [selectedPatientId]);

  // Handle Popup Routing
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const view = queryParams.get('view');

  // Firestore Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (view) return;

    // We fetch all patients (public mode) to ensure they don't disappear on refresh
    const q = query(collection(db, 'patients'));
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Patient);
      setPatients(data);
      
      // Auto-select first patient if none selected
      if (data.length > 0 && !localStorage.getItem('selected_patient_id')) {
        setSelectedPatientId(data[0].id);
      }
    }, (error) => {
      console.warn("Firestore Sync Warning:", error.message);
    });

    return () => unsubscribe();
  }, [view]);

  // Popup specific patient sync
  useEffect(() => {
    if (!view) return;
    const patientId = queryParams.get('patientId');
    if (!patientId) return;

    const unsubscribe = onSnapshot(doc(db, 'patients', patientId), (docSnap) => {
      if (docSnap.exists()) {
        const p = docSnap.data() as Patient;
        setPatients([p]);
      } else {
        console.warn("Patient not found in Firestore:", patientId);
      }
    }, (error) => {
      console.error("Popup Sync Error:", error.message);
    });

    return () => unsubscribe();
  }, [view, queryParams]);

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const filteredPatients = useMemo(() => 
    patients.filter(p => 
      p.name.includes(searchTerm) || p.chartNumber.includes(searchTerm)
    ),
    [patients, searchTerm]
  );

  const handleAddPatient = async () => {
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name: '새 환자',
      birthDate: '',
      chartNumber: '',
      age: '',
      gender: '',
      bsa: '',
      weight: '',
      height: '',
      premedication: '',
      hydration: '',
      sideEffects: '',
      adjustmentCriteria: '',
      ownerId: 'public_user',
      chemoOrders: Array.from({ length: DEFAULT_CHEMO_ROWS }, () => ({
        id: crypto.randomUUID(),
        cycle: '',
        day: '',
        drug: '',
        dose: '',
      })),
    };
    
    try {
      await setDoc(doc(db, 'patients', newPatient.id), newPatient);
      setSelectedPatientId(newPatient.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `patients/${newPatient.id}`);
    }
  };

  const handleUpdatePatient = (updatedPatient: Patient) => {
    // 1. Optimistic Update (Immediate UI feedback)
    setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));

    // 2. Debounced Firestore Sync
    if (updateTimeoutRef.current[updatedPatient.id]) {
      clearTimeout(updateTimeoutRef.current[updatedPatient.id]);
    }

    updateTimeoutRef.current[updatedPatient.id] = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'patients', updatedPatient.id), {
          ...updatedPatient,
          updatedAt: Timestamp.now()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `patients/${updatedPatient.id}`);
      }
      delete updateTimeoutRef.current[updatedPatient.id];
    }, 1000); // 1 second debounce
  };

  const handleDeletePatient = async (id: string) => {
    if (confirm('정말로 이 환자 정보를 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'patients', id));
        if (selectedPatientId === id) {
          setSelectedPatientId(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `patients/${id}`);
      }
    }
  };

  const openChemoPopup = () => {
    if (!selectedPatientId) return;
    window.open(window.location.pathname + `?view=chemo&patientId=${selectedPatientId}`, 'chemo_popup', 'width=1000,height=800');
  };

  if (!isAuthReady) {
    return null;
  }

  // Render Popup Views
  if (view === 'chemo') {
    const patientId = queryParams.get('patientId');
    const patient = patients.find(p => p.id === patientId);
    
    if (!patient) {
      return (
        <div className="p-6 bg-white min-h-screen flex items-center justify-center font-sans">
          <div className="text-gray-400 font-bold">데이터를 불러오는 중...</div>
        </div>
      );
    }
    return (
      <ErrorBoundary>
        <ChemoOrderPopup patient={patient} onUpdate={handleUpdatePatient} />
      </ErrorBoundary>
    );
  }

  if (view === 'calculator') {
    return (
      <ErrorBoundary>
        <CalculatorPopup />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white text-black font-sans overflow-hidden border-4 border-black">
        {/* Sidebar: Patient List */}
        <div className="w-64 border-r-4 border-black flex flex-col">
          <div className="p-4 border-b-4 border-black bg-black text-white flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedPatientId(null)}>
              <h1 className="text-xl font-black tracking-tighter uppercase">AntiCancer Order</h1>
              <img src="https://vitejs.dev/logo.svg" className="w-5 h-5 invert" alt="Vite" />
            </div>
          </div>
          <div className="p-4 border-b-4 border-black bg-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">환자리스트</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="검색..."
                spellCheck="false"
                className="w-full border-2 border-black p-2 pl-8 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
            </div>
          </div>
        <div className="flex-1 overflow-y-auto">
          {filteredPatients.map(patient => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatientId(patient.id)}
              className={`p-4 border-b-2 border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedPatientId === patient.id ? 'bg-gray-200 font-bold' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <span>{patient.name} ({patient.chartNumber || 'No ID'})</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeletePatient(patient.id); }}
                  className="text-gray-400 hover:text-black"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddPatient}
          className="p-4 bg-black text-white font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" /> 환자 추가
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedPatient ? (
          <PatientDetail 
            patient={selectedPatient} 
            onUpdate={handleUpdatePatient} 
            onClose={() => setSelectedPatientId(null)}
            onOpenChemo={openChemoPopup}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            환자를 선택하거나 추가해주세요.
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
