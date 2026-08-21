import { Lead } from '../types';
import { api } from './api';

export const leadsService = {
  getLeads: (): Promise<Lead[]> => api.getLeads(),

  sendFacebookReply: (leadId: string, text: string): Promise<Lead | null> => api.replyToLeadOnFacebook(leadId, text),
};
