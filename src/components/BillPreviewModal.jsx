import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { Eye, FileText, CheckCircle2, FileDown, Loader2, Printer, X, AlertCircle, Camera } from 'lucide-react';
import { API_BASE_URL } from '../config';

// Initialize PDF.js worker securely using CDN to avoid Vite bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function BillPreviewModal({ formData, onClose, isOpen }) {
    const [isSaving, setIsSaving] = useState(false);

    // Stable Object URLs for attachments
    const elecUrl = React.useMemo(() => {
        return formData.elecMeterImg ? URL.createObjectURL(formData.elecMeterImg) : null;
    }, [formData.elecMeterImg]);

    const gasUrl = React.useMemo(() => {
        return formData.gasMeterImg ? URL.createObjectURL(formData.gasMeterImg) : null;
    }, [formData.gasMeterImg]);

    const pdfUrl = React.useMemo(() => {
        return formData.gasBillPdf ? URL.createObjectURL(formData.gasBillPdf) : null;
    }, [formData.gasBillPdf]);

    const [pdfImages, setPdfImages] = useState([]);
    const [isParsingPdf, setIsParsingPdf] = useState(false);

    // Extract PDF pages to Images for unified Native Printing
    useEffect(() => {
        let isMounted = true;
        
        const parsePdf = async () => {
            if (!formData.gasBillPdf) {
                setPdfImages([]);
                return;
            }

            setIsParsingPdf(true);
            try {
                // Read PDF file as ArrayBuffer
                const arrayBuffer = await formData.gasBillPdf.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                const images = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); // Higher scale for better print quality

                    // Prepare hidden canvas using DOM
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    // Render PDF page into canvas context
                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport,
                    };
                    await page.render(renderContext).promise;

                    // Extract image URI
                    images.push(canvas.toDataURL('image/png'));
                }

                if (isMounted) {
                    setPdfImages(images);
                }
            } catch (err) {
                console.error("Error parsing PDF for printing:", err);
            } finally {
                if (isMounted) setIsParsingPdf(false);
            }
        };

        parsePdf();

        return () => {
            isMounted = false;
        };
    }, [formData.gasBillPdf]);

    if (!isOpen) return null;

    // Calculations
    const rent = parseFloat(formData.rentAmount) || 0;

    // Electricity
    const prevElec = parseFloat(formData.prevElec) || 0;
    const currElec = parseFloat(formData.currElec) || 0;
    const elecUsage = Math.max(0, currElec - prevElec);
    const elecRate = parseFloat(formData.elecRate) || 0;
    const elecCost = elecUsage * elecRate;

    // Gas
    const prevGas = parseFloat(formData.prevGas) || 0;
    const currGas = parseFloat(formData.currGas) || 0;
    const gasUsage = Math.max(0, currGas - prevGas);
    const gasRate = parseFloat(formData.gasRate) || 0;
    const gasCost = gasUsage * gasRate;

    // Dues
    const dueAmount = parseFloat(formData.dueAmount) || 0;

    // Total
    const totalAmount = rent + elecCost + gasCost + dueAmount;

    // Generate Invoice Number (Mock)
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const dateIssued = new Date().toLocaleDateString('en-GB');

    const handleConfirm = async () => {
        setIsSaving(true);
        try {
            const data = new FormData();
            data.append('tenant_id', formData.tenantId);
            data.append('billing_month', formData.billingMonth);
            data.append('due_date', formData.dueDate || '');
            data.append('rent_amount', rent);
            data.append('elec_reading', currElec);
            data.append('gas_reading', currGas);
            data.append('elec_cost', elecCost);
            data.append('gas_cost', gasCost);
            data.append('due_amount', dueAmount);
            data.append('total_amount', totalAmount);

            if (formData.elecMeterImg) data.append('elecMeterImg', formData.elecMeterImg);
            if (formData.gasMeterImg) data.append('gasMeterImg', formData.gasMeterImg);
            if (formData.gasBillPdf) data.append('gasBillPdf', formData.gasBillPdf);

            const res = await fetch(`${API_BASE_URL}/api/bills`, {
                method: 'POST',
                body: data
            });

            if (res.ok) {
                // Use JS to isolate print content
                const receipt = document.getElementById('printable-receipt');
                if (receipt) {
                    const printContent = receipt.cloneNode(true);

                    // Create a dedicated print container
                    const container = document.createElement('div');
                    container.id = 'print-container';
                    // Force white background and let it flow for pagination
                    container.style.position = 'absolute';
                    container.style.top = '0';
                    container.style.left = '0';
                    container.style.width = '100%'; 
                    container.style.minHeight = '100vh'; 
                    container.style.padding = '20px'; 
                    container.style.backgroundColor = 'white';
                    container.style.zIndex = '999999';
                    container.appendChild(printContent);

                    document.body.appendChild(container);

                    // Hide the main app to prevent interference
                    const root = document.getElementById('root');
                    if (root) root.style.display = 'none';

                    // Trigger Print safely
                    const cleanupPrint = () => {
                        window.removeEventListener('afterprint', cleanupPrint);
                        
                        // Cleanup after print snapshot finishes
                        const existingContainer = document.getElementById('print-container');
                        if (existingContainer) {
                            document.body.removeChild(existingContainer);
                        }
                        if (root) root.style.display = ''; // Restore
                        
                        // Close modal after print attempt
                        onClose();
                    };

                    window.addEventListener('afterprint', cleanupPrint);
                    
                    // Small delay to ensure DOM is ready before invoking print
                    setTimeout(() => {
                        window.print();
                    }, 100);
                    
                } else {
                    // Fallback
                    window.print();
                }

            } else {
                const errText = await res.text();
                console.error("Save failed:", errText);
                alert('Failed to save bill. Error: ' + errText);
            }
        } catch (err) {
            console.error('Error saving bill:', err);
            alert('An error occurred while saving the bill: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] ring-1 ring-slate-900/5">

                {/* Left Side: Receipt Preview (Printable Area) */}
                <div className="w-full md:w-7/12 bg-slate-50 p-6 md:p-8 overflow-y-auto no-print-bg relative hide-scrollbar">
                    <div className="sticky top-0 z-10 flex items-center gap-2 text-slate-500 mb-6 no-print bg-slate-50/90 backdrop-blur-sm py-2 px-1">
                        <Eye className="size-5 text-brand-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-brand-700">Live Print Preview</span>
                    </div>

                    {/* The Invoice Document */}
                    <div id="printable-receipt" className="bg-white text-slate-800 p-10 md:p-12 shadow-sm border border-slate-200 min-h-[800px] w-full max-w-[800px] mx-auto relative print:w-full print:max-w-none print:border-none print:shadow-none print:m-0 print:p-8 rounded-xl print:rounded-none">

                        {/* Document Header */}
                        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100 print:bg-transparent print:border-none print:p-0">
                                    <FileText className="size-10 print:size-12" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 leading-none">INVOICE</h1>
                                    <p className="text-slate-500 font-medium mt-1">Monthly Rental Bill</p>
                                </div>
                            </div>
                            <div className="text-right text-sm space-y-1">
                                <p><span className="font-bold text-slate-400 uppercase text-xs mr-2">Invoice #</span><span className="font-semibold text-slate-800">{invoiceNum}</span></p>
                                <p><span className="font-bold text-slate-400 uppercase text-xs mr-2">Date Issued</span><span className="font-semibold text-slate-800">{dateIssued}</span></p>
                                <p><span className="font-bold text-slate-400 uppercase text-xs mr-2">Billing Period</span><span className="font-semibold text-slate-800">{formData.billingMonth}</span></p>
                                {formData.dueDate && <p className="mt-2 text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded inline-block">Due By: {formData.dueDate}</p>}
                            </div>
                        </div>

                        {/* Bill To */}
                        <div className="mb-10 p-6 bg-slate-50/50 rounded-xl border border-slate-100 print:bg-transparent print:border-none print:p-0">
                            <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="w-4 h-0.5 bg-brand-600 inline-block"></span> Billed To
                            </p>
                            <h2 className="text-2xl font-display font-bold text-slate-900">{formData.tenantName}</h2>
                        </div>

                        {/* Table */}
                        <div className="mb-12">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-200">
                                        <th className="pb-4 pt-2 px-2 text-sm font-bold text-slate-500 w-1/3">Item Description</th>
                                        <th className="pb-4 pt-2 px-2 text-sm font-bold text-slate-500 w-1/3">Calculation Details</th>
                                        <th className="pb-4 pt-2 px-2 text-sm font-bold text-slate-500 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Rent */}
                                    <tr className="group hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                        <td className="py-5 px-2 text-slate-800 font-semibold">Fixed House Rent</td>
                                        <td className="py-5 px-2 text-slate-500 text-sm">Monthly standard rate</td>
                                        <td className="py-5 px-2 text-right font-medium text-slate-800">₹{rent.toFixed(2)}</td>
                                    </tr>

                                    {/* Arrears */}
                                    {dueAmount > 0 && (
                                        <tr className="group hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                            <td className="py-5 px-2 text-slate-800 font-semibold text-rose-600">Previous Unpaid Balance</td>
                                            <td className="py-5 px-2 text-slate-500 text-sm italic">Carried forward dues</td>
                                            <td className="py-5 px-2 text-right font-medium text-rose-600">₹{dueAmount.toFixed(2)}</td>
                                        </tr>
                                    )}

                                    {/* Electricity */}
                                    {elecCost > 0 && (
                                        <tr className="group hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                            <td className="py-5 px-2 text-slate-800 font-semibold">Electricity Charges</td>
                                            <td className="py-5 px-2 text-slate-500 text-sm">
                                                <div className="flex flex-col gap-0.5">
                                                    <span>({currElec} - {prevElec}) = {elecUsage.toFixed(2)} units</span>
                                                    <span className="text-xs opacity-80">@ ₹{elecRate}/unit</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 text-right font-medium text-slate-800">₹{elecCost.toFixed(2)}</td>
                                        </tr>
                                    )}

                                    {/* Gas */}
                                    {formData.isGasApplicable && gasCost > 0 && (
                                        <tr className="group hover:bg-slate-50 transition-colors print:hover:bg-transparent">
                                            <td className="py-5 px-2 text-slate-800 font-semibold">Gas Charges</td>
                                            <td className="py-5 px-2 text-slate-500 text-sm">
                                                <div className="flex flex-col gap-0.5">
                                                    <span>({currGas} - {prevGas}) = {gasUsage.toFixed(2)} units</span>
                                                    <span className="text-xs opacity-80">@ ₹{gasRate}/unit</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 text-right font-medium text-slate-800">
                                                ₹{gasCost.toFixed(2)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Total */}
                        <div className="flex justify-end items-center gap-8 mb-16 border-t border-slate-200 pt-8 mt-8">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Amount Due</span>
                            <span className="text-3xl font-display font-black text-brand-600 print:text-slate-900">₹{totalAmount.toFixed(2)}</span>
                        </div>

                        {/* Footer / Attachments */}
                        <div className="mt-16 break-before-page print:mt-12">
                            <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase border-b-2 border-slate-100 pb-3 mb-6 flex items-center gap-2">
                                <Camera className="size-4" /> Meter Evidence
                            </h3>
                            <div className="grid grid-cols-2 gap-8">
                                {formData.elecMeterImg ? (
                                    <div className="flex flex-col gap-3 text-sm text-slate-600 bg-slate-50 border border-slate-100 p-4 rounded-xl print:bg-transparent print:border-none print:p-0">
                                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                                            <CheckCircle2 className="size-4 text-emerald-500" />
                                            <span>Electricity Meter Photo</span>
                                        </div>
                                        <img 
                                            src={elecUrl} 
                                            alt="Electricity Meter" 
                                            className="h-48 w-full object-cover rounded-lg border border-slate-200 shadow-sm print:shadow-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100 border-dashed flex items-center justify-center">No Elec Meter Photo Attached</div>
                                )}

                                {formData.gasMeterImg ? (
                                    <div className="flex flex-col gap-3 text-sm text-slate-600 bg-slate-50 border border-slate-100 p-4 rounded-xl print:bg-transparent print:border-none print:p-0">
                                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                                            <CheckCircle2 className="size-4 text-emerald-500" />
                                            <span>Gas Meter Photo</span>
                                        </div>
                                        <img 
                                            src={gasUrl} 
                                            alt="Gas Meter" 
                                            className="h-48 w-full object-cover rounded-lg border border-slate-200 shadow-sm print:shadow-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100 border-dashed flex items-center justify-center">No Gas Meter Photo Attached</div>
                                )}
                            </div>

                            {/* Gas PDF Rendered Pages */}
                            {formData.gasBillPdf && (
                                <div className="mt-12 pt-8 border-t border-slate-200">
                                    <div className="flex items-center gap-2 mb-8 border-b-2 border-slate-100 pb-3">
                                        <FileDown className="size-5 text-brand-500" />
                                        <span className="font-bold text-slate-700 uppercase tracking-widest text-sm">Original Gas Bill Document</span>
                                    </div>
                                    
                                    {isParsingPdf ? (
                                        <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl text-slate-500">
                                            <Loader2 className="animate-spin size-8 mb-4 text-brand-500" />
                                            <span className="font-semibold">Processing PDF for Print Engine...</span>
                                            <span className="text-xs text-slate-400 mt-2">This may take a moment</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-8 w-full">
                                            {pdfImages.map((imgSrc, index) => (
                                                <div key={index} className="w-full bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden break-before-page print:break-before-page print:border-none print:shadow-none print:rounded-none">
                                                    <img 
                                                        src={imgSrc} 
                                                        alt={`Gas Bill Page ${index + 1}`} 
                                                        className="w-full h-auto object-contain"
                                                    />
                                                </div>
                                            ))}
                                            {pdfImages.length === 0 && (
                                                <div className="text-rose-500 text-sm font-semibold p-4 bg-rose-50 rounded-lg flex items-center gap-2 border border-rose-100">
                                                    <AlertCircle className="size-4" /> Failed to extract PDF pages for printing.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-16 text-center text-xs text-slate-400 print:block">
                                <p>This is a computer-generated invoice and does not require a physical signature.</p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Side: Confirmation Actions */}
                <div className="w-full md:w-5/12 p-8 md:p-12 bg-white flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 no-print relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-6 right-6 size-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Close preview"
                    >
                        <X className="size-5" />
                    </button>
                    
                    <div className="text-center mb-10 mt-8">
                        <div className="size-20 bg-brand-50 border border-brand-100 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm rotate-3">
                            <Printer className="size-8" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-3xl font-display font-black text-slate-800 mb-2">Ready to Print?</h2>
                        <p className="text-slate-500 text-lg leading-relaxed">Review the invoice on the left. If everything looks correct, click below to generate and print.</p>
                    </div>

                    <div className="space-y-4 max-w-sm mx-auto w-full">
                        <button
                            onClick={handleConfirm}
                            disabled={isSaving}
                            className="w-full btn-primary py-4 text-[1.1rem] shadow-brand-500/20 shadow-xl flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="size-5 animate-spin" />
                                    Finalizing...
                                </>
                            ) : (
                                <>
                                    <Printer className="size-5" />
                                    Confirm & Print
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="w-full btn-secondary border-none shadow-none bg-slate-50 hover:bg-slate-100 py-4 text-slate-500 hover:text-slate-800 font-semibold"
                        >
                            Back to Edit
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
