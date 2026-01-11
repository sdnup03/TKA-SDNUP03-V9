
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button, Input, Card, Select, AlertDialog } from '../ui/brutalist';
import { Exam } from '../../types';
import { Save, X, Shuffle, ListOrdered, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface ExamFormProps {
  initialData?: Exam | null;
  onSave: (exam: Exam) => Promise<void>;
  onCancel: () => void;
}

export const ExamForm: React.FC<ExamFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Exam>>({
    title: '',
    subject: '',
    classGrade: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:30',
    durationMinutes: 90,
    token: '',
    status: 'DRAFT',
    questions: [],
    areResultsPublished: false,
    randomizeQuestions: false,
    randomizeOptions: false,
  });

  const [availableClassIds, setAvailableClassIds] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ title: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Load available classIds from database
  useEffect(() => {
    const loadClassIds = async () => {
      try {
        const classIds = await api.fetchClassIds();
        setAvailableClassIds(classIds);
      } catch (error) {
        console.error('Failed to load classIds:', error);
        // Fallback to empty array
        setAvailableClassIds([]);
      }
    };
    loadClassIds();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      // Parse existing classGrade (comma-separated) to array
      if (initialData.classGrade) {
        setSelectedClasses(initialData.classGrade.split(',').map(c => c.trim()).filter(c => c !== ''));
      }
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleClassSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;

    // Toggle selection
    if (selectedClasses.includes(selectedValue)) {
      // Remove if already selected
      const updated = selectedClasses.filter(c => c !== selectedValue);
      setSelectedClasses(updated);
      setFormData(prev => ({ ...prev, classGrade: updated.join(', ') }));
    } else {
      // Add if not selected
      const updated = [...selectedClasses, selectedValue].sort();
      setSelectedClasses(updated);
      setFormData(prev => ({ ...prev, classGrade: updated.join(', ') }));
    }
    
    // Reset select to empty
    e.target.value = '';
  };

  const removeClass = (classId: string) => {
    const updated = selectedClasses.filter(c => c !== classId);
    setSelectedClasses(updated);
    setFormData(prev => ({ ...prev, classGrade: updated.join(', ') }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return; // Prevent double submit
    
    if (!formData.title || !formData.token) {
      setAlertMessage({ 
        title: 'Data Belum Lengkap', 
        message: 'Judul dan Token wajib diisi!' 
      });
      setShowAlert(true);
      return;
    }
    
    // Validate and clean token
    const cleanToken = formData.token.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanToken.length === 0) {
      setAlertMessage({ 
        title: 'Token Tidak Valid', 
        message: 'Token harus berisi huruf dan/atau angka (contoh: IPA8B, MTK2024)' 
      });
      setShowAlert(true);
      return;
    }
    
    if (selectedClasses.length === 0) {
      setAlertMessage({ 
        title: 'Kelas Belum Dipilih', 
        message: 'Pilih minimal satu kelas target!' 
      });
      setShowAlert(true);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Ensure all required fields are present
      const newExam: Exam = {
        id: formData.id || `ex-${Date.now()}`,
        title: formData.title || '',
        subject: formData.subject || '',
        classGrade: selectedClasses.join(', '),
        date: formData.date || new Date().toISOString().split('T')[0],
        startTime: formData.startTime || '08:00',
        endTime: formData.endTime || '09:30',
        durationMinutes: Number(formData.durationMinutes) || 90,
        token: cleanToken, // ✅ Use cleaned uppercase token
        status: (formData.status as any) || 'DRAFT',
        questions: formData.questions || [],
        areResultsPublished: formData.areResultsPublished || false,
        randomizeQuestions: formData.randomizeQuestions || false,
        randomizeOptions: formData.randomizeOptions || false,
      };

      await onSave(newExam); // ✅ AWAIT onSave
      showToast(initialData ? 'Ujian berhasil diperbarui!' : 'Ujian berhasil dibuat!', 'success');
      // Success - form will close automatically
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      showToast(`Gagal menyimpan: ${error?.message || 'Terjadi kesalahan'}`, 'error');
      setAlertMessage({ 
        title: 'Gagal Menyimpan', 
        message: error?.message || 'Terjadi kesalahan saat menyimpan ujian. Silakan coba lagi.' 
      });
      setShowAlert(true);
    } finally {
      setIsSaving(false); // ✅ ALWAYS reset loading state
    }
  };

  return (
    <Card className="border-t-8 border-t-black">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black">{initialData ? 'Edit Data Ujian' : 'Buat Ujian Baru'}</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}><X /></Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block font-bold mb-1 text-sm">Mata Pelajaran</label>
            <Input name="subject" value={formData.subject || ''} onChange={handleChange} placeholder="Contoh: IPA, Matematika, Bahasa Indonesia" />
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Judul Ujian</label>
            <Input name="title" value={formData.title} onChange={handleChange} placeholder="Contoh: Ulangan Harian Bab 1" autoFocus />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block font-bold mb-1 text-sm">Kelas Target</label>
            <Select onChange={handleClassSelect} defaultValue="">
              <option value="">Pilih Kelas...</option>
              {availableClassIds.map(classId => (
                <option key={classId} value={classId} disabled={selectedClasses.includes(classId)}>
                  {classId} {selectedClasses.includes(classId) ? '(Sudah dipilih)' : ''}
                </option>
              ))}
            </Select>
            
            {/* Display selected classes as badges */}
            {selectedClasses.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedClasses.map(classId => (
                  <span 
                    key={classId}
                    className="inline-flex items-center gap-1 bg-[#4F46E5] text-white px-2 py-1 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                  >
                    {classId}
                    <button
                      type="button"
                      onClick={() => removeClass(classId)}
                      className="hover:bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                      title="Hapus"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {availableClassIds.length === 0 && (
              <p className="text-[10px] font-bold text-yellow-600 mt-1">
                ⚠️ Belum ada kelas di database. Tambahkan siswa terlebih dahulu.
              </p>
            )}
            
            <p className="text-[10px] font-bold opacity-60 mt-1">*Pilih kelas dari daftar yang tersedia di database.</p>
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Token (Kode Masuk)</label>
            <Input name="token" value={formData.token} onChange={handleChange} placeholder="Ex: IPA8B" className="font-mono uppercase" />
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block font-bold mb-1 text-sm">Tanggal</label>
            <Input type="date" name="date" value={formData.date} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Mulai</label>
            <Input type="time" name="startTime" value={formData.startTime} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Selesai</label>
            <Input type="time" name="endTime" value={formData.endTime} onChange={handleChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
           <div>
              <label className="block font-bold mb-1 text-sm">Durasi (Menit)</label>
              <Input type="number" name="durationMinutes" value={formData.durationMinutes} onChange={handleChange} />
           </div>
           
           {/* RANDOMIZATION SETTINGS */}
           <div className="flex flex-col gap-2 p-3 bg-gray-100 border-2 border-black/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${formData.randomizeQuestions ? 'bg-black text-white' : 'bg-white'}`}>
                    {formData.randomizeQuestions && <Shuffle className="w-3 h-3" />}
                </div>
                <input 
                    type="checkbox" 
                    name="randomizeQuestions" 
                    checked={formData.randomizeQuestions || false} 
                    onChange={handleChange}
                    className="hidden" 
                />
                <span className="font-bold text-sm">Acak Urutan Soal</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${formData.randomizeOptions ? 'bg-black text-white' : 'bg-white'}`}>
                    {formData.randomizeOptions && <ListOrdered className="w-3 h-3" />}
                </div>
                <input 
                    type="checkbox" 
                    name="randomizeOptions" 
                    checked={formData.randomizeOptions || false} 
                    onChange={handleChange}
                    className="hidden" 
                />
                <span className="font-bold text-sm">Acak Opsi Jawaban (PG)</span>
              </label>
           </div>
        </div>

        <div className="pt-4 flex justify-end gap-2 border-t-2 border-black/10 mt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Batal
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            className="flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Data
              </>
            )}
          </Button>
        </div>
      </form>

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        variant="warning"
      />
    </Card>
  );
};
