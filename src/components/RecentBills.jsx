import React, { useState, useEffect } from 'react';
import PastBillPrint from './PastBillPrint';
import { ArrowRight, Download, Mail, Loader2, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function RecentBills() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloadingBill, setDownloadingBill] = useState(null);

    useEffect(() => {
        const fetchRecentBills = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/bills/recent`);
                if (!res.ok) throw new Error('Failed to fetch recent bills');
                const data = await res.json();
                setBills(data);
            } catch (err) {
                console.error('Error fetching recent bills:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentBills();
    }, []);

    const handleDownload = async (billId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/bills/${billId}`);
            if (!res.ok) throw new Error('Failed to fetch bill details');
            const data = await res.json();
            setDownloadingBill(data);
        } catch (err) {
            console.error(err);
            alert('Failed to download bill: ' + err.message);
        }
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <FileText className="size-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Recent Bills</h2>
                </div>
                <button className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors group">
                    View All <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-xl" scope="col">Date</th>
                                <th className="px-6 py-4" scope="col">Tenant</th>
                                <th className="px-6 py-4 text-right" scope="col">Amount</th>
                                <th className="px-6 py-4 text-center" scope="col">Status</th>
                                <th className="px-6 py-4 text-center rounded-tr-xl" scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Loader2 className="size-6 animate-spin text-brand-500" />
                                            <span>Loading recent bills...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-rose-500 font-medium">
                                        {error}
                                    </td>
                                </tr>
                            ) : bills.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                                        No recent bills found.
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-semibold text-slate-700">{formatDate(bill.date)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-full bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-700 border border-brand-100">
                                                    {getInitials(bill.tenant)}
                                                </div>
                                                <span className="font-medium text-slate-800">{bill.tenant}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">{formatCurrency(bill.amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={bill.status === 'Sent' ? 'badge-success' : 'badge-warning'}>
                                                <span className={`size-1.5 rounded-full ${bill.status === 'Sent' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                                {bill.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDownload(bill.id)}
                                                    disabled={downloadingBill && downloadingBill.id === bill.id}
                                                    className="size-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm disabled:opacity-50 transition-all" 
                                                    title="Download PDF"
                                                >
                                                    {downloadingBill && downloadingBill.id === bill.id ? (
                                                        <Loader2 className="size-4 animate-spin" />
                                                    ) : (
                                                        <Download className="size-4" />
                                                    )}
                                                </button>
                                                <button className="size-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all" title="Email Receipt">
                                                    <Mail className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {downloadingBill && (
                <PastBillPrint 
                    bill={downloadingBill} 
                    onComplete={() => setDownloadingBill(null)} 
                />
            )}
        </section>
    );
}
