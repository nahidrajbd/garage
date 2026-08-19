import {
  Lead,
  LeadStatus,
  LeadSource,
  FollowUp,
  Customer,
  LeadStats,
  LeadFunnelStats,
  LeadStaffPerformance,
} from '../types';
import { initialLeads, LEAD_STAFF_NAMES } from '../mock/leadsData';
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

function computeFunnel(leads: Lead[]): LeadFunnelStats {
  const total = leads.length;
  let contacted = 0;
  let interested = 0;
  let visitAgreed = 0;
  let visited = 0;
  let serviceTaken = 0;
  let noAnswer = 0;
  let notInterested = 0;
  let lost = 0;

  for (const lead of leads) {
    const tier = statusTier(lead.status);
    if (tier >= 1) contacted++;
    if (tier >= 2) interested++;
    if (tier >= 3) visitAgreed++;
    if (tier >= 4) visited++;
    if (tier >= 5) serviceTaken++;

    if (lead.status === 'No Answer') { contacted++; noAnswer++; }
    if (lead.status === 'Not Interested') { contacted++; notInterested++; }
    if (lead.status === 'Lost') { contacted++; lost++; }
  }

  return { total, contacted, interested, visitAgreed, visited, serviceTaken, noAnswer, notInterested, lost };
}

function computeStaffPerformance(leads: Lead[]): LeadStaffPerformance[] {
  const staffNames = Array.from(new Set([...LEAD_STAFF_NAMES, ...leads.map(l => l.assignedTo)]));
  return staffNames
    .map(staff => {
      const staffLeads = leads.filter(l => l.assignedTo === staff);
      const tiers = staffLeads.map(l => statusTier(l.status));
      return {
        staff,
        total: staffLeads.length,
        contacted: staffLeads.filter(l => statusTier(l.status) >= 1 || l.status === 'No Answer' || l.status === 'Not Interested' || l.status === 'Lost').length,
        visitAgreed: tiers.filter(t => t >= 3).length,
        visited: tiers.filter(t => t >= 4).length,
        serviceTaken: tiers.filter(t => t >= 5).length,
      };
    })
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
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
    assignedTo: string;
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
      assignedTo: data.assignedTo,
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

  assignLead: async (id: string, staffName: string): Promise<Lead | null> => {
    return leadsService.updateLead(id, { assignedTo: staffName });
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

  linkLeadRecord: async (
    leadId: string,
    links: { jobCardId?: string; jobCardNumber?: string; quotationId?: string; quotationNumber?: string; invoiceId?: string; invoiceNumber?: string }
  ): Promise<Lead | null> => {
    return leadsService.updateLead(leadId, links);
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

  getLeadStats: async (range?: { startDate?: string; endDate?: string }): Promise<LeadStats> => {
    let leads = getFromStorage();

    if (range?.startDate) {
      leads = leads.filter(l => l.leadDate >= range.startDate!);
    }
    if (range?.endDate) {
      leads = leads.filter(l => l.leadDate <= range.endDate!);
    }

    const today = todayStr();
    const funnel = computeFunnel(leads);
    const staffPerformance = computeStaffPerformance(leads);

    const newCount = leads.filter(l => l.status === 'New').length;
    const followUpRequiredCount = leads.filter(
      l => !isTerminalStatus(l.status) && (!l.nextFollowUpDate || l.nextFollowUpDate <= today)
    ).length;
    const followUpTodayCount = leads.filter(l => l.nextFollowUpDate === today).length;
    const overdueCount = leads.filter(
      l => l.nextFollowUpDate && l.nextFollowUpDate < today && !isTerminalStatus(l.status)
    ).length;

    return {
      totalLeads: leads.length,
      newCount,
      followUpRequiredCount,
      visitAgreedCount: funnel.visitAgreed,
      visitedCount: funnel.visited,
      serviceTakenCount: funnel.serviceTaken,
      followUpTodayCount,
      overdueCount,
      funnel,
      staffPerformance,
      contactRate: pct(funnel.contacted, funnel.total),
      visitAgreementRate: pct(funnel.visitAgreed, funnel.contacted),
      visitRate: pct(funnel.visited, funnel.visitAgreed),
      serviceConversionRate: pct(funnel.serviceTaken, funnel.visited),
    };
  },
};
