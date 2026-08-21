import { Lead, LeadStatus, LeadSource, Customer } from '../types';
import { api } from './api';

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
  getLeads: (): Promise<Lead[]> => api.getLeads(),

  getLeadById: (id: string): Promise<Lead | undefined> => api.getLeadById(id),

  createLead: (data: {
    customerName: string;
    phone: string;
    source: LeadSource;
    inquiry: string;
    leadDate?: string;
    nextFollowUpDate?: string;
    vehicleModel?: string;
    notes?: string;
  }): Promise<Lead> => api.createLead(data),

  updateLead: (id: string, updates: Partial<Lead>): Promise<Lead | null> => api.updateLead(id, updates),

  addFollowUp: (
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
  ): Promise<Lead | null> => api.addLeadFollowUp(leadId, data),

  convertLeadToCustomer: (leadId: string): Promise<Customer | null> => api.convertLeadToCustomer(leadId),

  sendFacebookReply: (leadId: string, text: string): Promise<Lead | null> => api.replyToLeadOnFacebook(leadId, text),
};
