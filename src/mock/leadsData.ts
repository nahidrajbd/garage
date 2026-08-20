import { LeadStatus, LeadStaff } from '../types';

// ==========================================
// STAFF (sales/follow-up staff, distinct from workshop Technicians)
// ==========================================
export const LEAD_STAFF: LeadStaff[] = [
  { id: 'lstaff-1', name: 'Mizan', status: 'active' },
  { id: 'lstaff-2', name: 'Emon', status: 'active' },
  { id: 'lstaff-3', name: 'Mizanur', status: 'active' },
  { id: 'lstaff-4', name: 'Other Staff', status: 'active' },
];

export const LEAD_STAFF_NAMES = LEAD_STAFF.map(s => s.name);

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Assigned',
  'Called',
  'No Answer',
  'Interested',
  'Visit Agreed',
  'Visit Scheduled',
  'Visited',
  'Service Taken',
  'Not Interested',
  'Lost',
];
