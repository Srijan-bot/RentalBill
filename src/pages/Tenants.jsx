import React, { useState } from 'react';
import { useTenants } from '../context/TenantContext';
import { PlusCircle, X, Edit2, Zap, Flame, Users } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Tenants() {
    const { tenants, addTenant, updateTenant } = useTenants();

    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        fixedRent: '',
        advance: '',
        startElec: '',
        startGas: '',
        currElec: '',
        currGas: '',
        isGasApplicable: true
    });

    const resetForm = () => {
        setFormData({ name: '', fixedRent: '', advance: '', startElec: '', startGas: '', currElec: '', currGas: '', isGasApplicable: true });
        setIsAdding(false);
        setIsEditing(false);
        setEditId(null);
    };

    const handleEditClick = (tenant) => {
        setFormData({
            name: tenant.name,
            fixedRent: tenant.rent,
            advance: tenant.advance,
            startElec: tenant.elec,
            startGas: tenant.gas,
            currElec: tenant.currElec ?? '',
            currGas: tenant.currGas ?? '',
            isGasApplicable: tenant.isGasApplicable
        });
        setEditId(tenant.id);
        setIsEditing(true);
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const tenantPayload = {
            name: formData.name,
            property: 'Not Assigned',
            rent: formData.fixedRent,
            advance: formData.advance,
            elec: formData.startElec,
            gas: formData.isGasApplicable ? formData.startGas : 0,
            currElec: formData.currElec,
            currGas: formData.isGasApplicable ? formData.currGas : 0,
            isGasApplicable: formData.isGasApplicable
        };

        if (isEditing && editId) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/tenants/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tenantPayload)
                });
                if (res.ok) {
                    window.location.reload(); 
                } else {
                    alert("Failed to update tenant");
                }
            } catch (err) {
                console.error(err);
                alert("Error updating tenant");
            }
        } else {
            addTenant(tenantPayload);
        }
        resetForm();
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="space-y-8 animate-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-100 rounded-xl text-brand-600">
                        <Users className="size-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-black tracking-tight text-slate-800">Tenants</h1>
                        <p className="text-slate-500 text-sm md:text-base mt-1">Manage your tenants and active lease details.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (isAdding) resetForm();
                        else setIsAdding(true);
                    }}
                    className={isAdding ? "btn-secondary text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200" : "btn-primary"}
                >
                    {isAdding ? <X className="size-5" /> : <PlusCircle className="size-5" />}
                    <span>{isAdding ? 'Cancel' : 'Add Tenant'}</span>
                </button>
            </div>

            {isAdding && (
                <section className="glass-panel p-6 md:p-8 animate-in slide-in-from-top-4 duration-300 ring-4 ring-brand-500/10">
                    <h3 className="text-xl font-display font-bold text-slate-800 mb-6">{isEditing ? 'Edit Tenant Details' : 'Register New Tenant'}</h3>
                    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8 md:gap-12">
                        <div className="space-y-5">
                            <div>
                                <label className="input-label">Tenant Full Name</label>
                                <input
                                    required
                                    type="text"
                                    className="input-field placeholder:text-slate-400"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Fixed Rent (₹)</label>
                                    <input
                                        required
                                        type="number"
                                        className="input-field"
                                        placeholder="0.00"
                                        value={formData.fixedRent}
                                        onChange={(e) => setFormData({ ...formData, fixedRent: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="input-label">Advance (₹)</label>
                                    <input
                                        required
                                        type="number"
                                        className="input-field"
                                        placeholder="0.00"
                                        value={formData.advance}
                                        onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5 flex flex-col justify-between">
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label flex items-center gap-2">
                                            <Zap className="size-4 text-amber-500" /> Initial Elec. Reading
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            className="input-field"
                                            placeholder="Enter reading"
                                            value={formData.startElec}
                                            onChange={(e) => setFormData({ ...formData, startElec: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label flex items-center gap-2">
                                            <Zap className="size-4 text-blue-500" /> Current Elec. Reading
                                        </label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="Enter reading"
                                            value={formData.currElec}
                                            onChange={(e) => setFormData({ ...formData, currElec: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="isGasApplicable"
                                            className="size-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 transition-colors cursor-pointer"
                                            checked={formData.isGasApplicable}
                                            onChange={(e) => setFormData({ ...formData, isGasApplicable: e.target.checked })}
                                        />
                                        <label htmlFor="isGasApplicable" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                            <Flame className="size-4 text-orange-500" /> Gas Meter Applicable?
                                        </label>
                                    </div>

                                    {formData.isGasApplicable && (
                                        <div className="animate-in fade-in slide-in-from-top-2 grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="input-label mt-2">Initial Gas Reading</label>
                                                <input
                                                    required
                                                    type="number"
                                                    className="input-field bg-white"
                                                    placeholder="Enter reading"
                                                    value={formData.startGas}
                                                    onChange={(e) => setFormData({ ...formData, startGas: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label mt-2">Current Gas Reading</label>
                                                <input
                                                    type="number"
                                                    className="input-field bg-white"
                                                    placeholder="Enter reading"
                                                    value={formData.currGas}
                                                    onChange={(e) => setFormData({ ...formData, currGas: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="btn-primary w-full md:w-auto">
                                    {isEditing ? 'Save Changes' : 'Confirm Registration'}
                                </button>
                            </div>
                        </div>
                    </form>
                </section>
            )}

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                        <thead className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-xl">Tenant Details</th>
                                <th className="px-6 py-4">Rent</th>
                                <th className="px-6 py-4">Advance</th>
                                <th className="px-6 py-4">Initial Readings</th>
                                <th className="px-6 py-4">Current Readings</th>
                                <th className="px-6 py-4 text-center rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white/50">
                            {tenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center text-sm font-bold text-brand-700 border border-brand-100">
                                                {getInitials(tenant.name)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{tenant.name}</div>
                                                <div className="text-xs text-slate-500">{tenant.property || 'No Property'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-800">₹{tenant.rent}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-800">₹{tenant.advance}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md w-fit">
                                                <Zap className="size-3.5 text-amber-500" /> Elec: {tenant.elec}
                                            </span>
                                            {tenant.isGasApplicable ? (
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-md w-fit">
                                                    <Flame className="size-3.5 text-orange-500" /> Gas: {tenant.gas}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md w-fit">
                                                    No Gas
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md w-fit">
                                                <Zap className="size-3.5 text-blue-500" /> Elec: {tenant.currElec ?? '—'}
                                            </span>
                                            {tenant.isGasApplicable ? (
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-md w-fit">
                                                    <Flame className="size-3.5 text-purple-500" /> Gas: {tenant.currGas ?? '—'}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md w-fit">
                                                    No Gas
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleEditClick(tenant)}
                                            className="size-9 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all focus:ring-2 focus:ring-brand-500/20"
                                            title="Edit Tenant"
                                        >
                                            <Edit2 className="size-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {tenants.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic font-medium">
                                        No tenants registered yet. Click "Add Tenant" to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
