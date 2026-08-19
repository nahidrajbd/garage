import {
  Lead,
  LeadStatus,
  LeadSource,
  FollowUp,
  Customer,
} from '../types';
import { initialLeads } from '../mock/leadsData';
import { api } from './api';

const STORAGE_KEY = 'nextgarage_leads_v1';

function getFromStorage(): Lead[] {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? JSON.parse(item) : initialLeads;
  } catch (error) {
    console.error('Error reading leads from localStorage:', error);
    return initialLeads;
  }
}

function saveToStorage(leads: Lead[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (error) {
    console.error('Error saving leads to localStorage:', error);
  }
}

const todayStr = (): string => new Date().toISOString().split('T')[0];

function nextLeadNumber(leads: Lead[]): string {
  const maxSeq = leads.reduce((max, l) => {
    const match = l.leadNumber.match(/(\d+)$/);
    const seq = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, seq);
  }, 0);
  return `LD-${String(maxSeq + 1).padStart(4, '0')}`;
}

export function statusTier(status: LeadStatus): number {
  switch (status) {
    case 'New': return 0;
    case 'Assigned':
    case 'Called': return 1;
    case 'Interested': return 2;
    case 'Visit Agreed':
    case 'Visit Scheduled': return 3;
    case 'Visited': return 4;
    case 'Service Taken': return 5;
    default: return -1; // No Answer / Not Interested / Lost
  }
}

export function isTerminalStatus(status: LeadStatus): boolean {
  return status === 'Service Taken' || status === 'Not Interested' || status === 'Lost';
}

export const leadsService = {
  getLeads: async (): Promise<Lead[]> => {
    return [...getFromStorage()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getLeadById: async (id: string): Promise<Lead | undefined> => {
    return getFromStorage().find(l => l.id === id || l.leadNumber === id);
  },

  createLead: async (data: {
    customerName: string;
    phone: string;
    source: LeadSource;
    inquiry: string;
    leadDate?: string;
    nextFollowUpDate?: string;
    vehicleModel?: string;
    notes?: string;
  }): Promise<Lead> => {
    const leads = getFromStorage();
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      leadNumber: nextLeadNumber(leads),
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      source: data.source,
      inquiry: data.inquiry.trim(),
      status: 'New',
      leadDate: data.leadDate || todayStr(),
      nextFollowUpDate: data.nextFollowUpDate || undefined,
      vehicleModel: data.vehicleModel?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      followUps: [],
      createdAt: new Date().toISOString(),
    };
    leads.unshift(newLead);
    saveToStorage(leads);
    return newLead;
  },

  updateLead: async (id: string, updates: Partial<Lead>): Promise<Lead | null> => {
    const leads = getFromStorage();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
    saveToStorage(leads);
    return leads[idx];
  },

  updateLeadStatus: async (id: string, status: LeadStatus): Promise<Lead | null> => {
    return leadsService.updateLead(id, { status, lastContactDate: todayStr() });
  },

  addFollowUp: async (
    leadId: string,
    data: {
      staffId: string;
      contactDate?: string;
      status: LeadStatus;
      note: string;
      nextFollowUpDate?: string;
      visitDate?: string;
      visitTime?: string;
    }
  ): Promise<Lead | null> => {
    const leads = getFromStorage();
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx === -1) return null;

    const contactDate = data.contactDate || todayStr();
    const followUp: FollowUp = {
      id: `fu-${leadId}-${Date.now()}`,
      leadId,
      staffId: data.staffId,
      contactDate,
      status: data.status,
      note: data.note.trim(),
      nextFollowUpDate: isTerminalStatus(data.status) ? undefined : (data.nextFollowUpDate || undefined),
      createdAt: new Date().toISOString(),
    };

    const lead = leads[idx];
    leads[idx] = {
      ...lead,
      status: data.status,
      lastContactDate: contactDate,
      nextFollowUpDate: followUp.nextFollowUpDate,
      visitDate: data.visitDate || lead.visitDate,
      visitTime: data.visitTime || lead.visitTime,
      followUps: [...lead.followUps, followUp],
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(leads);
    return leads[idx];
  },

  getFollowUpHistory: async (leadId: string): Promise<FollowUp[]> => {
    const lead = getFromStorage().find(l => l.id === leadId);
    if (!lead) return [];
    return [...lead.followUps].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  convertLeadToCustomer: async (leadId: string): Promise<Customer | null> => {
    const leads = getFromStorage();
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx === -1) return null;
    const lead = leads[idx];

    if (lead.customerId) {
      try {
        const existing = await api.getCustomerById(lead.customerId);
        if (existing) return existing;
      } catch {
        // fall through and create a new one
      }
    }

    const customer = await api.createCustomer({
      name: lead.customerName,
      phone: lead.phone,
      vehicles: [],
    });

    leads[idx] = { ...lead, customerId: customer.id, updatedAt: new Date().toISOString() };
    saveToStorage(leads);

    return customer;
  },
};
