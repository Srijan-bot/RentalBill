import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

export default function PastBillPrint({ bill, onComplete }) {
    const [pdfImages, setPdfImages] = useState([]);
    const [isParsingPdf, setIsParsingPdf] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const prepareAndPrint = async () => {
            // 1. Parse PDF if exists
            if (bill.gas_bill_pdf) {
                setIsParsingPdf(true);
                try {
                    // Fetch the PDF from the server uploads directory
                    const pdfUrl = `http://localhost:5000/${bill.gas_bill_pdf}`;
                    const response = await fetch(pdfUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        
                        const images = [];
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 1.5 });
                            
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            
                            await page.render({ canvasContext: context, viewport }).promise;
                            images.push(canvas.toDataURL('image/png'));
                        }
                        if (isMounted) setPdfImages(images);
                    }
                } catch (err) {
                    console.error("Error parsing historic PDF:", err);
                } finally {
                    if (isMounted) setIsParsingPdf(false);
                }
            }

            // Small delay to ensure React has rendered the images into the hidden DOM
            setTimeout(() => {
                if (!isMounted) return;
                
                const receipt = document.getElementById('past-printable-receipt');
                if (receipt) {
                    const printContent = receipt.cloneNode(true);
                    
                    const container = document.createElement('div');
                    container.id = 'print-container';
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

                    const root = document.getElementById('root');
                    if (root) root.style.display = 'none';

                    const cleanupPrint = () => {
                        window.removeEventListener('afterprint', cleanupPrint);
                        const existingContainer = document.getElementById('print-container');
                        if (existingContainer) document.body.removeChild(existingContainer);
                        if (root) root.style.display = '';
                        onComplete(); // Notify parent to remove this component
                    };

                    window.addEventListener('afterprint', cleanupPrint);
                    
                    setTimeout(() => {
                        window.print();
                    }, 50);
                } else {
                    onComplete();
                }
            }, 500); // 500ms allows React to map over pdfImages and inject DOM nodes
        };

        prepareAndPrint();

        return () => {
            isMounted = false;
        };
    }, [bill, onComplete]);

    // Derived formatting
    const rent = parseFloat(bill.rent_amount) || 0;
    const elecCost = parseFloat(bill.elec_cost) || 0;
    const gasCost = parseFloat(bill.gas_cost) || 0;
    const dueAmount = parseFloat(bill.due_amount) || 0;
    const totalAmount = parseFloat(bill.total_amount) || 0;

    const invoiceNum = `inv_${bill.id.toString().padStart(6, '0')}`;
    const dateIssued = new Date(bill.created_at).toLocaleDateString('en-US');

    return (
        <div className="hidden">
            <div id="past-printable-receipt" className="bg-white text-slate-800 p-10 min-h-[800px] w-full max-w-[800px] mx-auto relative print:w-full print:max-w-none print:shadow-none print:m-0 print:p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-4">
                        <div className="text-primary">
                            <span className="material-symbols-outlined text-5xl">description</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">INVOICE</h1>
                            <p className="text-slate-500 font-medium">Bill Management</p>
                        </div>
                    </div>
                    <div className="text-right text-sm">
                        <p className="mb-1"><span className="font-bold text-slate-600">Invoice #: </span>{invoiceNum}</p>
                        <p className="mb-1"><span className="font-bold text-slate-600">Date Issued: </span>{dateIssued}</p>
                        <p><span className="font-bold text-slate-600">Billing Period: </span>{bill.billing_month}</p>
                        {bill.due_date && <p className="mt-1 text-red-500 font-bold">Due By: {new Date(bill.due_date).toLocaleDateString('en-US')}</p>}
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-12">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">BILL TO</p>
                    <h2 className="text-2xl font-bold text-slate-900">{bill.tenant_name}</h2>
                </div>

                {/* Table */}
                <div className="mb-12">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-3 text-sm font-bold text-slate-500 w-1/3">Item Description</th>
                                <th className="pb-3 text-sm font-bold text-slate-500 w-1/3">Details</th>
                                <th className="pb-3 text-sm font-bold text-slate-500 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Rent */}
                            <tr>
                                <td className="py-4 text-slate-700 font-medium">Fixed Rent</td>
                                <td className="py-4 text-slate-500 text-sm">-</td>
                                <td className="py-4 text-right font-medium">Rs. {rent.toFixed(2)}</td>
                            </tr>

                            {/* Arrears */}
                            {dueAmount > 0 && (
                                <tr>
                                    <td className="py-4 text-slate-700 font-medium">Previous Unpaid Balance</td>
                                    <td className="py-4 text-slate-500 text-sm">(Pending Dues)</td>
                                    <td className="py-4 text-right font-medium">Rs. {dueAmount.toFixed(2)}</td>
                                </tr>
                            )}

                            {/* Electricity */}
                            {elecCost > 0 && (
                                <tr>
                                    <td className="py-4 text-slate-700 font-medium">Electricity Charges</td>
                                    <td className="py-4 text-slate-500 text-sm">Usage Cost</td>
                                    <td className="py-4 text-right font-medium">Rs. {elecCost.toFixed(2)}</td>
                                </tr>
                            )}

                            {/* Gas */}
                            {gasCost > 0 && (
                                <tr>
                                    <td className="py-4 text-slate-700 font-medium">Gas Charges</td>
                                    <td className="py-4 text-slate-500 text-sm">Usage Cost</td>
                                    <td className="py-4 text-right font-medium">Rs. {gasCost.toFixed(2)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Total */}
                <div className="flex justify-end items-center gap-8 mb-8 border-t border-slate-200 pt-6">
                    <span className="text-lg font-bold text-slate-600">Total Amount</span>
                    <span className="text-2xl font-bold text-slate-900">Rs. {totalAmount.toFixed(2)}</span>
                </div>

                {/* Meter Evidence — kept on first page, right after total */}
                <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Meter Readings &amp; Attachments</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {bill.elec_meter_img ? (
                            <div className="flex flex-col gap-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                                    <span>Electricity Meter Photo</span>
                                </div>
                                <img
                                    src={`http://localhost:5000/${bill.elec_meter_img}`}
                                    alt="Electricity Meter"
                                    style={{ maxHeight: '180px', objectFit: 'contain' }}
                                    className="rounded border border-slate-200 mt-2"
                                />
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic">No Elec Meter Photo</div>
                        )}

                        {bill.gas_meter_img ? (
                            <div className="flex flex-col gap-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                                    <span>Gas Meter Photo</span>
                                </div>
                                <img
                                    src={`http://localhost:5000/${bill.gas_meter_img}`}
                                    alt="Gas Meter"
                                    style={{ maxHeight: '180px', objectFit: 'contain' }}
                                    className="rounded border border-slate-200 mt-2"
                                />
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic">No Gas Meter Photo</div>
                        )}
                    </div>
                </div>

                {/* Gas PDF pages — each on its own new print page */}
                {bill.gas_bill_pdf && pdfImages.length > 0 && (
                    <div>
                        {pdfImages.map((imgSrc, index) => (
                            <div
                                key={index}
                                className="w-full bg-white overflow-hidden"
                                style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
                            >
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                                    <span className="material-symbols-outlined text-blue-500">picture_as_pdf</span>
                                    <span className="font-bold text-slate-700">Gas Bill — Page {index + 1}</span>
                                </div>
                                <img
                                    src={imgSrc}
                                    alt={`Gas Bill Page ${index + 1}`}
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
