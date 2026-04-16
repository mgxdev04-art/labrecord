'use client';

import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { LAB_TEMPLATES } from '@/lib/templates';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { ArrowLeft, User, FileText, Calendar, Hash, Building, Check, X } from 'lucide-react';

interface ReportResult {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
}

interface ReportData {
  id: string;
  user_id: string;
  patient_id: string;
  patient_name: string;
  test_name: string;
  test_date: string;
  results: ReportResult[];
  notes: string | null;
  status: string;
  visit_lab_no: string | null;
  refer_lab_hosp: string | null;
  ref_client: string | null;
  barcode_no: string | null;
  sample_collection_date: string | null;
  sample_received_date: string | null;
}

export default function EditReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  const { showToast } = useToast();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  
  const [reportDetails, setReportDetails] = useState({
    visitLabNo: '',
    referLabHosp: '',
    refClient: '',
    barcodeNo: '',
    sampleCollectionDate: '',
    sampleReceivedDate: ''
  });

  useEffect(() => {
    if (!user || !reportId) return;
    
    const fetchReport = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reportId)
          .single();
        
        if (error || !data) {
          router.push('/reports');
          return;
        }
        
        // Check if user owns this report
        if (data.user_id !== user.id) {
          router.push('/reports');
          return;
        }
        
        setReportData(data);
        
        // Convert results array to object for form
        const resultsObj: Record<string, string> = {};
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((result: ReportResult) => {
            resultsObj[result.name] = result.value || '';
          });
        }
        setResults(resultsObj);
        
        setReportDetails({
          visitLabNo: data.visit_lab_no || '',
          referLabHosp: data.refer_lab_hosp || '',
          refClient: data.ref_client || '',
          barcodeNo: data.barcode_no || '',
          sampleCollectionDate: data.sample_collection_date ? new Date(data.sample_collection_date).toISOString().slice(0, 16) : '',
          sampleReceivedDate: data.sample_received_date ? new Date(data.sample_received_date).toISOString().slice(0, 16) : ''
        });
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setFetching(false);
      }
    };
    
    fetchReport();
  }, [user, reportId, router, supabase]);

  const selectedTemplate = LAB_TEMPLATES.find(t => t.name === reportData?.test_name);

  const handleResultChange = (fieldName: string, value: string) => {
    setResults(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportData || !selectedTemplate) return;
    
    setLoading(true);
    try {
      // Convert results object back to array
      const resultsArray = selectedTemplate.fields.map(field => ({
        name: field.name,
        value: results[field.name] || '',
        unit: field.unit,
        normalRange: field.normalRange
      }));

      const { error } = await supabase
        .from('reports')
        .update({
          results: resultsArray,
          visit_lab_no: reportDetails.visitLabNo || null,
          refer_lab_hosp: reportDetails.referLabHosp || null,
          ref_client: reportDetails.refClient || null,
          barcode_no: reportDetails.barcodeNo || null,
          sample_collection_date: reportDetails.sampleCollectionDate ? new Date(reportDetails.sampleCollectionDate).toISOString() : null,
          sample_received_date: reportDetails.sampleReceivedDate ? new Date(reportDetails.sampleReceivedDate).toISOString() : null
        })
        .eq('id', reportId);

      if (error) throw error;
      
      showToast('Report updated successfully!', 'success');
      router.push(`/reports/${reportId}`);
    } catch (error) {
      console.error('Error updating report:', error);
      showToast('Failed to update report. Please try again.', 'error');
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
            <span className="text-text-muted font-medium">Loading report...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!reportData || !selectedTemplate) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-bg-subtle flex items-center justify-center">
            <FileText className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted font-medium">Report not found or invalid template</p>
          <Link href="/reports" className="text-sage-primary hover:text-sage-dark font-medium">
            Back to Reports
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link 
          href={`/reports/${reportId}`}
          className="w-10 h-10 rounded-xl bg-bg-subtle hover:bg-border-color flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Edit Report</h1>
          <p className="text-text-muted text-sm mt-0.5">Update report details and results</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border-color animate-fade-in">
        {/* Patient Info Banner */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-sage-light/50 to-transparent rounded-xl mb-6">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <User className="w-6 h-6 text-sage-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-main">{reportData.patient_name}</h2>
            <p className="text-sm text-text-muted flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {reportData.test_name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Report Details */}
          <div>
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sage-primary" />
              Report Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Visit/Lab No</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Lab number"
                    className="w-full pl-11 pr-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                    value={reportDetails.visitLabNo}
                    onChange={(e) => setReportDetails({...reportDetails, visitLabNo: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Barcode No</label>
                <input
                  type="text"
                  placeholder="Barcode"
                  className="w-full px-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                  value={reportDetails.barcodeNo}
                  onChange={(e) => setReportDetails({...reportDetails, barcodeNo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Refer Lab/Hosp</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    className="w-full pl-11 pr-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                    value={reportDetails.referLabHosp}
                    onChange={(e) => setReportDetails({...reportDetails, referLabHosp: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Ref. Client</label>
                <input
                  type="text"
                  placeholder="Client reference"
                  className="w-full px-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                  value={reportDetails.refClient}
                  onChange={(e) => setReportDetails({...reportDetails, refClient: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Sample Collection</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="datetime-local"
                    className="w-full pl-11 pr-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                    value={reportDetails.sampleCollectionDate}
                    onChange={(e) => setReportDetails({...reportDetails, sampleCollectionDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Sample Received</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="datetime-local"
                    className="w-full pl-11 pr-4 py-3 border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                    value={reportDetails.sampleReceivedDate}
                    onChange={(e) => setReportDetails({...reportDetails, sampleReceivedDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="pt-4 border-t border-border-color">
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wider mb-4">
              Update Results for {selectedTemplate.name}
            </h3>
            
            <div className="rounded-xl border border-border-color overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-subtle">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Parameter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Normal Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {selectedTemplate.fields.map((field, idx) => (
                    <tr key={idx} className="row-hover">
                      <td className="px-4 py-3 text-sm font-semibold text-text-main">{field.name}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-primary/20 focus:border-sage-primary bg-bg-warm/50 font-medium text-text-main transition-all"
                          value={results[field.name] || ''}
                          onChange={(e) => handleResultChange(field.name, e.target.value)}
                          placeholder="Enter result"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{field.unit}</td>
                      <td className="px-4 py-3 text-sm text-text-muted italic">{field.normalRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border-color">
            <Link 
              href={`/reports/${reportId}`}
              className="flex items-center gap-2 px-5 py-3 border border-border-color rounded-xl text-text-main font-medium text-sm hover:bg-bg-subtle transition-colors btn-press"
            >
              <X className="w-4 h-4" />
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sage-primary to-sage-dark text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-sage-primary/25 transition-all disabled:opacity-50 btn-press"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Update Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
