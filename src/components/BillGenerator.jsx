import React, { useState, useEffect } from 'react';
import BillPreviewModal from './BillPreviewModal';
import { useTenants } from '../context/TenantContext';
import { ChevronDown, Info, Zap, Flame, Camera, UploadCloud, ArrowRight } from 'lucide-react';

export default function BillGenerator() {
    const { tenants } = useTenants();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        tenantId: "",
        tenantName: "",
        rentAmount: "",
        utilityAmount: "",

        // Metering
        prevElec: 0,
        currElec: "",
        elecRate: 10,

        isGasApplicable: true,
        prevGas: 0,
        currGas: "",
        gasRate: 5,

        billingMonth: "",
        dueDate: "",
        dueAmount: "", // New Field for Arrears

        // Files
        elecMeterImg: null,
        gasMeterImg: null,
        gasBillPdf: null
    });
    const [showPreview, setShowPreview] = useState(false);

    // Fetch Settings on Mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/settings');
                if (res.ok) {
                    const settings = await res.json();
                    setFormData(prev => ({
                        ...prev,
                        elecRate: settings.elec_rate || 10,
                        gasRate: settings.gas_rate || 5
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch settings, using defaults.");
            }
        };
        fetchSettings();
    }, []);

    // Auto-fill tenant data when selected
    const handleTenantSelect = (e) => {
        const selectedId = e.target.value;
        const tenant = tenants.find(t => t.id.toString() === selectedId);
        if (tenant) {
            // Calculate Billing Period
            let autoBillingPeriod = "";
            if (tenant.lastBillDate) {
                const lastDate = new Date(tenant.lastBillDate);
                const today = new Date();
                // Format: dd/mm/yyyy
                const formatDate = (d) => d.toLocaleDateString('en-GB');
                autoBillingPeriod = `${formatDate(lastDate)} to ${formatDate(today)}`;
            } else {
                // Default to current month if no history
                const date = new Date();
                autoBillingPeriod = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            }

            setFormData(prev => ({
                ...prev,
                tenantId: tenant.id,
                tenantName: tenant.name,
                rentAmount: tenant.rent,
                prevElec: parseFloat(tenant.elec) || 0,

                isGasApplicable: tenant.isGasApplicable !== false, // Default to true if undefined
                prevGas: parseFloat(tenant.gas) || 0,

                // Auto-set billing period
                billingMonth: autoBillingPeriod,

                // Reset readings
                currElec: "",
                currGas: "",
                elecMeterImg: null,
                gasMeterImg: null,
                gasBillPdf: null,
                dueAmount: ""
            }));
        }
    };

    const handleFileChange = (e, field) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, [field]: e.target.files[0] });
        }
    };

    const handleNext = () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            setShowPreview(true);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    useEffect(() => {
        const elecUsage = Math.max(0, (parseFloat(formData.currElec) || 0) - formData.prevElec);
        let gasUsage = 0;
        if (formData.isGasApplicable) {
            gasUsage = Math.max(0, (parseFloat(formData.currGas) || 0) - formData.prevGas);
        }
        const totalUtil = (elecUsage * formData.elecRate) + (gasUsage * formData.gasRate);

        setFormData(prev => ({ ...prev, utilityAmount: totalUtil.toFixed(2) }));
    }, [formData.currElec, formData.currGas, formData.elecRate, formData.gasRate, formData.prevElec, formData.prevGas, formData.isGasApplicable]);

    return (
        <section className="glass-panel overflow-hidden animate-in" id="create-bill">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
                <h3 className="text-xl font-display font-bold text-slate-800">Create New Receipt</h3>
                <span className="text-sm font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">Step {step} of 2</span>
            </div>

            {/* Stepper */}
            <div className="bg-slate-50/50 px-6 py-8 border-b border-slate-100">
                <div className="flex items-center justify-center w-full max-w-2xl mx-auto">
                    <div className={`flex flex-col items-center gap-3 relative z-10 transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-60'}`}>
                        <div className={`size-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${step >= 1 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-50' : 'bg-slate-200 text-slate-500'}`}>1</div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-brand-700' : 'text-slate-500'}`}>Tenant</span>
                    </div>
                    <div className="flex-1 h-1.5 mx-4 mb-6 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full rounded-full bg-brand-500 transition-all duration-500 ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <div className={`flex flex-col items-center gap-3 relative z-10 transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`size-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${step >= 2 ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-50' : 'bg-slate-200 text-slate-500'}`}>2</div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-brand-700' : 'text-slate-500'}`}>Bill Details</span>
                    </div>
                </div>
            </div>

            {/* Form Area */}
            <div className="p-6 md:p-10 bg-white/30">
                {step === 1 && (
                    <div className="space-y-8 max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
                        <div className="relative">
                            <label className="input-label">Select Tenant</label>
                            <select
                                className="input-field appearance-none cursor-pointer pr-10"
                                id="tenantSelect"
                                value={formData.tenantId}
                                onChange={handleTenantSelect}
                            >
                                <option value="" disabled>Choose a tenant...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id} className="text-slate-800">{t.name}</option>
                                ))}
                            </select>
                            <div className="absolute top-[38px] right-4 pointer-events-none text-slate-400">
                                <ChevronDown className="size-5" />
                            </div>
                        </div>

                        {formData.tenantName && (
                            <div className="bg-brand-50/50 border border-brand-100 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                                <div className="size-12 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center mb-4 mx-auto text-brand-600 shadow-sm">
                                    <Info className="size-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1">Current Stored Readings</h4>
                                <div className="mt-4 text-sm text-slate-600 flex flex-col gap-2">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="flex items-center gap-2"><Zap className="size-4 text-amber-500" /> Electricity</span>
                                        <strong className="text-slate-800">{formData.prevElec}</strong>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="flex items-center gap-2"><Flame className="size-4 text-orange-500" /> Gas</span>
                                        {formData.isGasApplicable ? (
                                            <strong className="text-slate-800">{formData.prevGas}</strong>
                                        ) : (
                                            <span className="text-slate-400 italic font-medium">Not Applicable</span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 text-xs font-semibold text-brand-600 bg-brand-100/50 py-2 rounded-lg">
                                    Current Rates: Elec ₹{formData.elecRate} • Gas ₹{formData.gasRate}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="grid md:grid-cols-2 gap-10 lg:gap-14 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-6">
                            {/* Rent */}
                            <div>
                                <label className="input-label">Fixed Rent</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                    <input
                                        className="input-field pl-8 font-bold text-slate-800 bg-slate-100/50 border-slate-200 cursor-not-allowed"
                                        readOnly
                                        value={formData.rentAmount}
                                    />
                                </div>
                            </div>

                            {/* Electricity */}
                            <div className="glass-card p-5 space-y-4">
                                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <Zap className="size-4 text-amber-500" /> Electricity Reading
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <input
                                            className="input-field text-center font-bold text-lg"
                                            type="number"
                                            placeholder="Current"
                                            value={formData.currElec}
                                            onChange={(e) => setFormData({ ...formData, currElec: e.target.value })}
                                        />
                                        <p className="text-xs font-bold text-slate-500 mt-2 text-center">Prev: {formData.prevElec}</p>
                                    </div>
                                    <div>
                                        <label className="h-full border-2 border-dashed border-slate-200 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 transition-colors flex flex-col items-center justify-center gap-2 py-4 cursor-pointer text-slate-500 group">
                                            <Camera className="size-5 group-hover:text-brand-500 transition-colors" />
                                            <span className="text-xs font-semibold truncate max-w-[120px] px-2 text-center group-hover:text-brand-600">
                                                {formData.elecMeterImg ? formData.elecMeterImg.name : 'Upload Photo'}
                                            </span>
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'elecMeterImg')} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Gas (Conditional) */}
                            {formData.isGasApplicable ? (
                                <div className="glass-card p-5 space-y-4">
                                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <Flame className="size-4 text-orange-500" /> Gas Reading
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input
                                                className="input-field text-center font-bold text-lg"
                                                type="number"
                                                placeholder="Current"
                                                value={formData.currGas}
                                                onChange={(e) => setFormData({ ...formData, currGas: e.target.value })}
                                            />
                                            <p className="text-xs font-bold text-slate-500 mt-2 text-center">Prev: {formData.prevGas}</p>
                                        </div>
                                        <div>
                                            <label className="h-full border-2 border-dashed border-slate-200 rounded-xl hover:border-brand-400 hover:bg-brand-50/50 transition-colors flex flex-col items-center justify-center gap-2 py-4 cursor-pointer text-slate-500 group">
                                                <Camera className="size-5 group-hover:text-brand-500 transition-colors" />
                                                <span className="text-xs font-semibold truncate max-w-[120px] px-2 text-center group-hover:text-brand-600">
                                                    {formData.gasMeterImg ? formData.gasMeterImg.name : 'Upload Photo'}
                                                </span>
                                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'gasMeterImg')} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                    <label className="btn-secondary w-full border-dashed group">
                                        <UploadCloud className="size-4 text-slate-400 group-hover:text-brand-500" />
                                        <span className="truncate max-w-[200px]">{formData.gasBillPdf ? formData.gasBillPdf.name : 'Upload Gas Bill (PDF)'}</span>
                                        <input type="file" accept="application/pdf" onChange={(e) => handleFileChange(e, 'gasBillPdf')} className="hidden" />
                                    </label>
                                </div>
                            ) : (
                                <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-center justify-center text-slate-500 font-medium text-sm">
                                    Gas tracking not applicable
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="input-label">Billing Period</label>
                                <input
                                    className="input-field"
                                    type="text"
                                    value={formData.billingMonth}
                                    onChange={(e) => setFormData({ ...formData, billingMonth: e.target.value })}
                                    placeholder="e.g. October 2023 to November 2023"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-rose-500 mb-1.5 flex items-center justify-between">
                                    Arrears / Previous Dues
                                    <span className="text-xs text-rose-400 font-medium normal-case">Optional</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 font-bold">₹</span>
                                    <input
                                        className="input-field pl-8 border-rose-200 focus:ring-rose-500/10 focus:border-rose-500 text-rose-700 font-bold placeholder:text-rose-200 placeholder:font-normal"
                                        type="number"
                                        value={formData.dueAmount}
                                        onChange={(e) => setFormData({ ...formData, dueAmount: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="glass-card p-6 bg-gradient-to-br from-slate-50 to-white shadow-sm border-slate-200 mt-8">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Generation Summary</h4>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold text-slate-600">Calculated Utilities</span>
                                    <span className="text-lg font-bold text-slate-800">₹{formData.utilityAmount}</span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold text-slate-600">Fixed Rent</span>
                                    <span className="text-lg font-bold text-slate-800">₹{formData.rentAmount || '0'}</span>
                                </div>
                                {parseFloat(formData.dueAmount) > 0 && (
                                    <div className="flex justify-between items-center mb-3 text-rose-600">
                                        <span className="text-sm font-semibold">Previous Dues</span>
                                        <span className="text-lg font-bold">₹{parseFloat(formData.dueAmount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t-2 border-dashed border-slate-200 my-4"></div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-500">Estimated Total</span>
                                    <span className="text-3xl font-display font-black text-brand-600">
                                        ₹{(parseFloat(formData.rentAmount || 0) + parseFloat(formData.utilityAmount || 0) + parseFloat(formData.dueAmount || 0)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 md:px-10 border-t border-slate-100 flex justify-between bg-white/80">
                {step > 1 ? (
                    <button onClick={handleBack} className="btn-secondary">
                        Back to Tenant
                    </button>
                ) : <div></div>}

                <button onClick={handleNext} disabled={step === 1 && !formData.tenantId} className="btn-primary min-w-[140px] shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    {step === 2 ? 'Preview Receipt' : 'Next Step'} 
                    {step === 1 && <ArrowRight className="size-4" />}
                </button>
            </div>

            {showPreview && (
                <BillPreviewModal
                    formData={formData}
                    onClose={() => setShowPreview(false)}
                    isOpen={showPreview}
                />
            )}
        </section>
    );
}
