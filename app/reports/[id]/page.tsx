'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { LAB_TEMPLATES } from '@/lib/templates';
import { Download, ArrowLeft, Printer, FileText, Edit3, Activity } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportResult {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
}

interface Report {
  id: string;
  user_id: string;
  patient_id: string;
  patient_name: string;
  test_name: string;
  test_date: string;
  results: ReportResult[];
  notes: string | null;
  status: string;
  clinic_name: string | null;
  visit_lab_no: string | null;
  refer_lab_hosp: string | null;
  ref_client: string | null;
  barcode_no: string | null;
  sample_collection_date: string | null;
  sample_received_date: string | null;
  doctor_stamp_base64: string | null;
  created_at: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  referred_by_dr: string | null;
}

export default function ReportViewPage() {
  const params = useParams();
  const reportId = params.id as string;
  const { user } = useAuth();
  const supabase = createClient();
  
  const [report, setReport] = useState<Report | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        // Fetch report
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reportId)
          .single();
        
        if (reportError || !reportData) {
          setError('Report not found');
          setLoading(false);
          return;
        }
        
        setReport(reportData);
        
        // Fetch patient data
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', reportData.patient_id)
          .single();
        
        if (patientData) {
          setPatient(patientData);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId, supabase]);

  const handleDownloadPDF = () => {
    if (!report || !patient) return;
    
    const pdfDoc = new jsPDF();
    const template = LAB_TEMPLATES.find(t => t.name === report.test_name);

    pdfDoc.setFontSize(20);
    pdfDoc.text(report.clinic_name || 'Lab Report', 105, 20, { align: 'center' });
    
    pdfDoc.setFontSize(10);
    
    pdfDoc.text(`Patient NAME: ${patient.name}`, 14, 40);
    pdfDoc.text(`Age/Gender: ${patient.age} Y / ${patient.gender.charAt(0)}`, 14, 46);
    pdfDoc.text(`Refer Lab/Hosp: ${report.refer_lab_hosp || 'SELF'}`, 14, 52);
    pdfDoc.text(`Referred BY Dr.: ${patient.referred_by_dr || 'SELF'}`, 14, 58);
    pdfDoc.text(`Ref.Client: ${report.ref_client || '-'}`, 14, 64);
    pdfDoc.text(`Barcode NO: ${report.barcode_no || '-'}`, 14, 70);
    
    pdfDoc.text(`Visit/LabNo: ${report.visit_lab_no || '-'}`, 110, 40);
    pdfDoc.text(`Registration Date: ${report.created_at ? format(new Date(report.created_at), 'dd/MMM/yyyy hh:mm a') : '-'}`, 110, 46);
    pdfDoc.text(`Sample Collection: ${report.sample_collection_date ? format(new Date(report.sample_collection_date), 'dd/MMM/yyyy hh:mm a') : '-'}`, 110, 52);
    pdfDoc.text(`Sample Received: ${report.sample_received_date ? format(new Date(report.sample_received_date), 'dd/MMM/yyyy hh:mm a') : '-'}`, 110, 58);
    pdfDoc.text(`Report Generated: ${report.test_date ? format(new Date(report.test_date), 'dd/MMM/yyyy hh:mm a') : '-'}`, 110, 64);
    pdfDoc.text(`Client Address: ${patient.address || '-'}`, 110, 70);
    
    pdfDoc.line(14, 75, 196, 75);
    
    pdfDoc.setFontSize(14);
    pdfDoc.text(report.test_name, 105, 85, { align: 'center' });

    const tableData = report.results.map(result => [
      result.name,
      result.value || '-',
      result.unit,
      result.normalRange
    ]);

    autoTable(pdfDoc, {
      startY: 95,
      head: [['Test Name', 'Result', 'Unit', 'Normal Range']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] },
    });

    const finalY = (pdfDoc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 150;
    
    if (report.doctor_stamp_base64) {
      try {
        pdfDoc.addImage(report.doctor_stamp_base64, 'PNG', 140, finalY + 20, 40, 20);
      } catch (e) {
        console.error("Error adding stamp image to PDF", e);
      }
    }
    
    pdfDoc.setFontSize(10);
    pdfDoc.text('Authorized Signature', 150, finalY + 45);
    
    pdfDoc.save(`${patient.name}_${report.test_name}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-warm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-sage-light border-t-sage-primary animate-spin" />
          <span className="text-text-muted font-medium">Loading report...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-warm gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <FileText className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 font-medium">{error}</p>
        <Link href="/reports" className="text-sage-primary hover:text-sage-dark font-medium">
          Back to Reports
        </Link>
      </div>
    );
  }

  if (!report || !patient) return null;

  const template = LAB_TEMPLATES.find(t => t.name === report.test_name);
  const reportUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-bg-warm py-8 px-4 sm:px-6 lg:px-8 font-sans text-text-main">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-border-color animate-fade-in">
          <div>
            {user ? (
              <Link href="/reports" className="flex items-center gap-2 text-text-muted hover:text-sage-primary font-medium text-sm transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Reports
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-sage-primary to-sage-dark rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-text-main">LabManager</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {user && (
              <Link 
                href={`/reports/${reportId}/edit`}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border-color text-text-main rounded-xl hover:bg-bg-subtle font-medium text-sm transition-colors btn-press"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </Link>
            )}
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-bg-subtle text-text-main rounded-xl hover:bg-border-color font-medium text-sm transition-colors btn-press"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sage-primary to-sage-dark text-white rounded-xl hover:shadow-lg hover:shadow-sage-primary/25 font-medium text-sm transition-all btn-press"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Report Paper */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-border-color print:shadow-none print:border-none flex flex-col gap-8 animate-scale-in">
          {/* Header */}
          <div className="text-center border-b border-border-color pb-6">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-sage-primary to-sage-dark rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-text-main tracking-tight">
              {report.clinic_name || 'Laboratory Report'}
            </h1>
          </div>

          {/* Patient Details & QR */}
          <div className="flex justify-between items-start gap-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm flex-1">
              <div className="space-y-1.5">
                <div className="flex"><span className="font-medium text-text-muted w-32">Patient NAME</span><span className="font-semibold text-text-main">: {patient.name}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-32">Age/Gender</span><span className="text-text-main">: {patient.age} Y / {patient.gender.charAt(0)}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-32">Refer Lab/Hosp</span><span className="text-text-main">: {report.refer_lab_hosp || 'SELF'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-32">Referred BY Dr.</span><span className="text-text-main">: {patient.referred_by_dr || 'SELF'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-32">Ref.Client</span><span className="text-text-main">: {report.ref_client || '-'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-32">Barcode NO</span><span className="font-semibold text-text-main">: {report.barcode_no || '-'}</span></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex"><span className="font-medium text-text-muted w-36">Visit/LabNo</span><span className="font-semibold text-text-main">: {report.visit_lab_no || '-'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-36">Registration Date</span><span className="text-text-main">: {report.created_at ? format(new Date(report.created_at), 'dd/MMM/yyyy hh:mm a') : '-'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-36">Sample Collection</span><span className="text-text-main">: {report.sample_collection_date ? format(new Date(report.sample_collection_date), 'dd/MMM/yyyy hh:mm a') : '-'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-36">Sample Received</span><span className="text-text-main">: {report.sample_received_date ? format(new Date(report.sample_received_date), 'dd/MMM/yyyy hh:mm a') : '-'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-36">Report Generated</span><span className="text-text-main">: {report.test_date ? format(new Date(report.test_date), 'dd/MMM/yyyy hh:mm a') : '-'}</span></div>
                <div className="flex"><span className="font-medium text-text-muted w-36">Client Address</span><span className="text-text-main">: {patient.address || '-'}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-bg-subtle rounded-xl shrink-0">
              <div className="w-16 h-16 bg-text-main p-1.5 rounded-lg">
                <QRCodeSVG value={reportUrl} size={52} bgColor="#1E293B" fgColor="#FFFFFF" />
              </div>
              <div className="text-xs text-text-muted w-24">
                <strong className="text-text-main block mb-1">Scan to View</strong>
                Instant secure access to results
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div>
            <h2 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sage-primary" />
              {report.test_name}
            </h2>
            
            <div className="rounded-xl border border-border-color overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-sage-primary to-sage-dark text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Parameter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Normal Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {report.results.map((result, idx) => (
                    <tr key={idx} className="row-hover">
                      <td className="px-4 py-3 text-sm font-medium text-text-main">{result.name}</td>
                      <td className="px-4 py-3 text-sm font-bold text-sage-primary">{result.value || '-'}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{result.unit}</td>
                      <td className="px-4 py-3 text-sm text-text-muted italic">{result.normalRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer / Stamp */}
          <div className="flex justify-end mt-4 pt-6 border-t border-border-color">
            <div className="flex flex-col items-center gap-2">
              {report.doctor_stamp_base64 ? (
                <img src={report.doctor_stamp_base64} alt="Doctor Stamp" className="h-20 w-20 object-contain rounded-xl border-2 border-dashed border-sage-primary/50 p-2 bg-sage-light/30" />
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-sage-primary/50 rounded-xl flex items-center justify-center text-[10px] text-center text-sage-primary font-medium uppercase bg-sage-light/30">
                  No<br/>Stamp
                </div>
              )}
              <div className="text-[10px] uppercase text-text-muted font-medium tracking-wider">
                Electronic Signature
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-text-muted py-4">
          Generated by LabManager - Secure Lab Report Management
        </div>
      </div>
    </div>
  );
}
