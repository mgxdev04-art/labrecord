'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LAB_TEMPLATES } from '@/lib/templates';
import { useToast } from '@/components/Toast';
import { User, Building, Stamp, IndianRupee, Save, Upload, Image } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    clinicName: '',
    doctorStampBase64: ''
  });
  const [testCharges, setTestCharges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setFormData({
            name: data.name || '',
            clinicName: data.clinic_name || '',
            doctorStampBase64: data.doctor_stamp_base64 || ''
          });
          setTestCharges(data.test_charges || {});
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setFetching(false);
      }
    };
    
    fetchProfile();
  }, [user, supabase]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, doctorStampBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChargeChange = (templateId: string, value: string) => {
    const numValue = parseFloat(value);
    setTestCharges(prev => ({
      ...prev,
      [templateId]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Upsert user settings (insert if doesn't exist, update if exists)
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          name: formData.name,
          clinic_name: formData.clinicName,
          doctor_stamp_base64: formData.doctorStampBase64,
          test_charges: testCharges
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      showToast('Settings updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-sage-light border-t-sage-primary rounded-full animate-spin" />
            <span className="text-text-muted font-medium">Loading settings...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-text-main">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Manage your profile and test charges</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border-color animate-fade-in">
          <h2 className="text-lg font-semibold text-text-main mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage-light flex items-center justify-center">
              <User className="w-4 h-4 text-sage-primary" />
            </div>
            Profile Information
          </h2>
          
          <form id="settings-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Doctor Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="e.g. Dr. John Doe"
                  className="w-full pl-11 pr-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Clinic / Hospital Name</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Enter clinic name"
                  className="w-full pl-11 pr-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                  value={formData.clinicName}
                  onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
                <Stamp className="w-4 h-4" />
                Doctor Stamp / Signature
              </label>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-48 h-24 border-2 border-dashed border-border-color rounded-xl flex items-center justify-center overflow-hidden bg-bg-warm/50 transition-colors hover:border-sage-primary/50">
                  {formData.doctorStampBase64 ? (
                    <img src={formData.doctorStampBase64} alt="Stamp" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-text-muted">
                      <Image className="w-6 h-6" />
                      <span className="text-xs font-medium">No stamp</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-bg-subtle hover:bg-border-color rounded-xl cursor-pointer transition-colors btn-press">
                    <Upload className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-medium text-text-main">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-text-muted">PNG or JPG. Max 1MB recommended.</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Test Charges Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border-color animate-slide-in">
          <h2 className="text-lg font-semibold text-text-main mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-amber-600" />
            </div>
            Test Charges
          </h2>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
            {LAB_TEMPLATES.map(template => (
              <div 
                key={template.id} 
                className="flex items-center justify-between p-4 bg-bg-warm/50 rounded-xl border border-border-color hover:border-sage-primary/30 transition-colors"
              >
                <span className="font-medium text-text-main">{template.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted font-medium">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="w-24 px-3 py-2 border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-white font-semibold text-text-main text-right transition-all"
                    value={testCharges[template.id] || ''}
                    onChange={(e) => handleChargeChange(template.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          form="settings-form"
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-sage-primary to-sage-dark text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-sage-primary/25 transition-all disabled:opacity-50 btn-press"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save All Settings
            </>
          )}
        </button>
      </div>
    </AppLayout>
  );
}
