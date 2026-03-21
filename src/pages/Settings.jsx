import React, { useState, useEffect } from 'react';
import { Settings2, Loader2, Save } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        elec_rate: '',
        gas_rate: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/settings`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    elec_rate: data.elec_rate,
                    gas_rate: data.gas_rate
                });
            }
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert('Settings saved successfully!');
            } else {
                alert('Failed to save settings.');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Loader2 className="size-8 animate-spin text-brand-500" />
            <span className="font-semibold">Loading settings...</span>
        </div>
    );

    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-in">
            <div className="flex flex-col items-center text-center mb-10">
                <div className="p-3 bg-brand-100/50 rounded-2xl text-brand-600 mb-4 inline-flex shadow-sm border border-brand-100">
                    <Settings2 className="size-8" strokeWidth={2} />
                </div>
                <h1 className="text-3xl font-display font-black tracking-tight text-slate-800 mb-2">Platform Settings</h1>
                <p className="text-slate-500 text-lg">Manage global application settings and default utility rates.</p>
            </div>

            <section className="glass-panel p-8 md:p-10">
                <h3 className="text-xl font-display font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4">
                    Utility Rates Configuration
                </h3>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="input-label">Electricity Rate (per unit)</label>
                            <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all duration-200">
                                <span className="flex items-center px-4 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm select-none">
                                    ₹
                                </span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    className="flex-1 bg-slate-50 text-slate-800 text-sm px-4 py-3 outline-none"
                                    placeholder="0.00"
                                    value={formData.elec_rate}
                                    onChange={(e) => setFormData({ ...formData, elec_rate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="input-label">Gas Rate (per unit)</label>
                            <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all duration-200">
                                <span className="flex items-center px-4 bg-slate-100 border-r border-slate-200 text-slate-500 font-semibold text-sm select-none">
                                    ₹
                                </span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    className="flex-1 bg-slate-50 text-slate-800 text-sm px-4 py-3 outline-none"
                                    placeholder="0.00"
                                    value={formData.gas_rate}
                                    onChange={(e) => setFormData({ ...formData, gas_rate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary w-full md:w-auto min-w-[200px]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="size-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="size-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
