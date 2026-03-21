import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const TenantContext = createContext();

export function useTenants() {
    return useContext(TenantContext);
}

export function TenantProvider({ children }) {
    const [tenants, setTenants] = useState([]);

    // Fetch tenants from backend on load
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/tenants`)
            .then(res => res.json())
            .then(data => setTenants(data))
            .catch(err => console.error('Failed to fetch tenants:', err));
    }, []);

    const addTenant = async (tenant) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tenants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tenant),
            });
            if (res.ok) {
                const newTenant = await res.json();
                setTenants([...tenants, newTenant]);
            } else {
                console.error('Failed to add tenant');
            }
        } catch (err) {
            console.error('Error adding tenant:', err);
        }
    };

    const updateTenant = async (id, updatedData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tenants/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });
            if (res.ok) {
                const updatedTenant = await res.json();
                setTenants(prev => prev.map(t => t.id === id ? updatedTenant : t));
                return true;
            } else {
                const text = await res.text();
                console.error('Failed to update tenant:', text);
                return false;
            }
        } catch (err) {
            console.error('Error updating tenant:', err);
            return false;
        }
    };

    return (
        <TenantContext.Provider value={{ tenants, addTenant, updateTenant }}>
            {children}
        </TenantContext.Provider>
    );
}
