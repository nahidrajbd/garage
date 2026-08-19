import { Lead, LeadStatus, LeadSource, FollowUp, LeadStaff } from '../types';

// ==========================================
// STAFF (mock — sales/follow-up staff, distinct from workshop Technicians)
// ==========================================
export const LEAD_STAFF: LeadStaff[] = [
  { id: 'lstaff-1', name: 'Mizan', status: 'active' },
  { id: 'lstaff-2', name: 'Emon', status: 'active' },
  { id: 'lstaff-3', name: 'Mizanur', status: 'active' },
  { id: 'lstaff-4', name: 'Other Staff', status: 'active' },
];

export const LEAD_STAFF_NAMES = LEAD_STAFF.map(s => s.name);

export const LEAD_SOURCES: LeadSource[] = ['Facebook', 'Phone', 'WhatsApp', 'Website', 'Walk-in', 'Other'];

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

// ==========================================
// Date helpers
// ==========================================
const dayMs = 86400000;
const dateStr = (offsetDays: number): string => {
  const d = new Date(Date.now() + offsetDays * dayMs);
  return d.toISOString().split('T')[0];
};

// ==========================================
// Seed data
// ==========================================
interface LeadSeed {
  name: string;
  phone: string;
  vehicle: string;
  inquiry: string;
  assignedTo: string;
  status: LeadStatus;
  source?: LeadSource;
  leadDaysAgo: number;
  nextFollowUpOffset?: number; // relative to today; undefined = none scheduled
}

const VEHICLES = ['Toyota Axio', 'Toyota Premio', 'Toyota Allion', 'Toyota Prius', 'Toyota Noah', 'Toyota Harrier', 'Toyota Corolla Cross'];

const INQUIRIES = [
  'Axio car wash কত?',
  'Premio dent paint করতে কত লাগবে?',
  'Toyota Noah full servicing দরকার।',
  'Prius-এর electrical problem আছে।',
  'Full car detailing price জানতে চাই।',
  'Allion-এর AC ঠান্ডা হচ্ছে না, চেক করাতে চাই।',
  'Harrier-এর ceramic coating price কত পড়বে?',
  'Corolla Cross-এর ব্রেক প্যাড চেঞ্জ করাতে হবে।',
  'গাড়ির ইঞ্জিন অয়েল চেঞ্জ করাতে চাই, কবে সময় পাওয়া যাবে?',
  'Axio-এর বাম্পার স্ক্র্যাচ ঠিক করতে কত খরচ হবে?',
  'Interior cleaning এবং শ্যাম্পু wash করতে চাই।',
  'গাড়ি suspension থেকে আওয়াজ আসে, দেখাতে চাই।',
  'Premio-এর টায়ার পরিবর্তন করতে হবে, দাম জানতে চাই।',
  'Noah-এর battery down হয়ে গেছে, আজকে দেখাতে পারবেন?',
  'Full body polish আর wax করাতে চাই সামনের সপ্তাহে।',
];

const LEAD_SEEDS: LeadSeed[] = [
  { name: 'Rahim Mia', phone: '01712-556601', vehicle: VEHICLES[0], inquiry: INQUIRIES[0], assignedTo: 'Mizan', status: 'Visit Agreed', leadDaysAgo: 2, nextFollowUpOffset: 1 },
  { name: 'Karim Sheikh', phone: '01812-556602', vehicle: VEHICLES[1], inquiry: INQUIRIES[1], assignedTo: 'Emon', status: 'No Answer', leadDaysAgo: 2, nextFollowUpOffset: -1 },
  { name: 'Hasan Ali', phone: '01912-556603', vehicle: VEHICLES[4], inquiry: INQUIRIES[2], assignedTo: 'Mizan', status: 'Interested', leadDaysAgo: 2, nextFollowUpOffset: 1 },
  { name: 'Jahangir Alam', phone: '01612-556604', vehicle: VEHICLES[3], inquiry: INQUIRIES[3], assignedTo: 'Mizanur', status: 'Assigned', leadDaysAgo: 1 },
  { name: 'Nasrin Akter', phone: '01712-556605', vehicle: VEHICLES[6], inquiry: INQUIRIES[4], assignedTo: 'Emon', status: 'Called', leadDaysAgo: 3, nextFollowUpOffset: 2 },
  { name: 'Habibur Rahman', phone: '01812-556606', vehicle: VEHICLES[2], inquiry: INQUIRIES[5], assignedTo: 'Mizan', status: 'Visited', leadDaysAgo: 6, nextFollowUpOffset: undefined },
  { name: 'Rakib Hossain', phone: '01912-556607', vehicle: VEHICLES[5], inquiry: INQUIRIES[6], assignedTo: 'Mizanur', status: 'Service Taken', leadDaysAgo: 10, nextFollowUpOffset: undefined },
  { name: 'Shirin Sultana', phone: '01612-556608', vehicle: VEHICLES[6], inquiry: INQUIRIES[7], assignedTo: 'Emon', status: 'New', leadDaysAgo: 0 },
  { name: 'Amena Begum', phone: '01712-556609', vehicle: VEHICLES[0], inquiry: INQUIRIES[8], assignedTo: 'Mizan', status: 'Not Interested', leadDaysAgo: 5, nextFollowUpOffset: undefined },
  { name: 'Zahidul Islam', phone: '01812-556610', vehicle: VEHICLES[0], inquiry: INQUIRIES[9], assignedTo: 'Mizanur', status: 'Interested', leadDaysAgo: 3, nextFollowUpOffset: 0 },
  { name: 'Milon Hossain', phone: '01912-556611', vehicle: VEHICLES[3], inquiry: INQUIRIES[10], assignedTo: 'Emon', status: 'Visit Scheduled', leadDaysAgo: 4, nextFollowUpOffset: 3 },
  { name: 'Tuhin Reza', phone: '01612-556612', vehicle: VEHICLES[1], inquiry: INQUIRIES[11], assignedTo: 'Mizan', status: 'No Answer', leadDaysAgo: 1, nextFollowUpOffset: 0 },
  { name: 'Rumana Yeasmin', phone: '01712-556613', vehicle: VEHICLES[1], inquiry: INQUIRIES[12], assignedTo: 'Mizanur', status: 'Lost', leadDaysAgo: 12, nextFollowUpOffset: undefined },
  { name: 'Sabbir Ahmed', phone: '01812-556614', vehicle: VEHICLES[4], inquiry: INQUIRIES[13], assignedTo: 'Emon', status: 'Called', leadDaysAgo: 0, nextFollowUpOffset: 0 },
  { name: 'Litu Barua', phone: '01912-556615', vehicle: VEHICLES[6], inquiry: INQUIRIES[14], assignedTo: 'Mizan', status: 'Visit Agreed', leadDaysAgo: 3, nextFollowUpOffset: -1 },
  { name: 'Fahim Faisal', phone: '01612-556616', vehicle: VEHICLES[2], inquiry: INQUIRIES[3], assignedTo: 'Mizanur', status: 'New', leadDaysAgo: 0 },
  { name: 'Nasima Khatun', phone: '01712-556617', vehicle: VEHICLES[0], inquiry: INQUIRIES[0], assignedTo: 'Emon', status: 'Assigned', leadDaysAgo: 1, nextFollowUpOffset: 1 },
  { name: 'Belal Hossain', phone: '01812-556618', vehicle: VEHICLES[5], inquiry: INQUIRIES[6], assignedTo: 'Mizan', status: 'Interested', leadDaysAgo: 4, nextFollowUpOffset: 0 },
  { name: 'Shipon Kumar', phone: '01912-556619', vehicle: VEHICLES[3], inquiry: INQUIRIES[9], assignedTo: 'Mizanur', status: 'Visited', leadDaysAgo: 8, nextFollowUpOffset: undefined },
  { name: 'Anik Chowdhury', phone: '01612-556620', vehicle: VEHICLES[1], inquiry: INQUIRIES[1], assignedTo: 'Emon', status: 'Service Taken', leadDaysAgo: 14, nextFollowUpOffset: undefined },
  { name: 'Rupa Akter', phone: '01712-556621', vehicle: VEHICLES[4], inquiry: INQUIRIES[2], assignedTo: 'Mizan', status: 'No Answer', leadDaysAgo: 2, nextFollowUpOffset: -2 },
  { name: 'Mostafizur Rahman', phone: '01812-556622', vehicle: VEHICLES[0], inquiry: INQUIRIES[9], assignedTo: 'Mizanur', status: 'Interested', leadDaysAgo: 1, nextFollowUpOffset: 2 },
  { name: 'Delwar Hossain', phone: '01912-556623', vehicle: VEHICLES[6], inquiry: INQUIRIES[6], assignedTo: 'Emon', status: 'Visit Agreed', leadDaysAgo: 5, nextFollowUpOffset: 0 },
  { name: 'Parvez Mahmud', phone: '01612-556624', vehicle: VEHICLES[2], inquiry: INQUIRIES[5], assignedTo: 'Mizan', status: 'New', leadDaysAgo: 0 },
  { name: 'Jasim Uddin', phone: '01712-556625', vehicle: VEHICLES[3], inquiry: INQUIRIES[3], assignedTo: 'Mizanur', status: 'Not Interested', leadDaysAgo: 7, nextFollowUpOffset: undefined },
  { name: 'Moniruzzaman', phone: '01812-556626', vehicle: VEHICLES[1], inquiry: INQUIRIES[12], assignedTo: 'Emon', status: 'Called', leadDaysAgo: 2, nextFollowUpOffset: 1 },
  { name: 'Selina Parvin', phone: '01912-556627', vehicle: VEHICLES[0], inquiry: INQUIRIES[10], assignedTo: 'Mizan', status: 'Interested', leadDaysAgo: 3, nextFollowUpOffset: 0 },
  { name: 'Arif Hossain', phone: '01612-556628', vehicle: VEHICLES[5], inquiry: INQUIRIES[6], assignedTo: 'Mizanur', status: 'Visit Scheduled', leadDaysAgo: 6, nextFollowUpOffset: 4 },
  { name: 'Nazrul Islam', phone: '01712-556629', vehicle: VEHICLES[4], inquiry: INQUIRIES[2], assignedTo: 'Emon', status: 'Service Taken', leadDaysAgo: 16, nextFollowUpOffset: undefined },
  { name: 'Firoz Kabir', phone: '01812-556630', vehicle: VEHICLES[2], inquiry: INQUIRIES[5], assignedTo: 'Mizan', status: 'Assigned', leadDaysAgo: 0 },
  { name: 'Ismail Hossain', phone: '01912-556631', vehicle: VEHICLES[0], inquiry: INQUIRIES[8], assignedTo: 'Mizanur', status: 'Lost', leadDaysAgo: 15, nextFollowUpOffset: undefined },
  { name: 'Kamrul Hasan', phone: '01612-556632', vehicle: VEHICLES[6], inquiry: INQUIRIES[7], assignedTo: 'Emon', status: 'Visited', leadDaysAgo: 9, nextFollowUpOffset: undefined },
  { name: 'Shahana Begum', phone: '01712-556633', vehicle: VEHICLES[1], inquiry: INQUIRIES[1], assignedTo: 'Mizan', status: 'No Answer', leadDaysAgo: 1, nextFollowUpOffset: 0 },
];

// Small subset from other channels, to reflect "mostly Facebook" as required
const NON_FACEBOOK_SOURCES: Record<number, LeadSource> = {
  3: 'Phone',
  16: 'Walk-in',
  27: 'WhatsApp',
  30: 'Website',
};

function statusTier(status: LeadStatus): number {
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

// Builds a plausible follow-up history narrative that ends at the seed's current status
function buildFollowUps(leadId: string, seed: LeadSeed): FollowUp[] {
  const tier = statusTier(seed.status);
  const staff = seed.assignedTo;
  const followUps: FollowUp[] = [];
  let seq = 0;

  const push = (daysAgo: number, status: LeadStatus, note: string, nextFollowUpDate?: string) => {
    seq += 1;
    followUps.push({
      id: `fu-${leadId}-${seq}`,
      leadId,
      staffId: staff,
      contactDate: dateStr(-daysAgo),
      status,
      note,
      nextFollowUpDate,
      createdAt: `${dateStr(-daysAgo)}T${String(9 + seq).padStart(2, '0')}:00:00.000Z`,
    });
  };

  if (seed.status === 'New') return followUps;

  if (seed.status === 'No Answer') {
    push(Math.max(0, seed.leadDaysAgo - 1), 'Called', `Called ${seed.name.split(' ')[0]}, phone rang but no answer.`);
    return followUps;
  }

  if (seed.status === 'Not Interested') {
    push(Math.max(1, seed.leadDaysAgo - 1), 'Called', 'Called and explained our service. Customer answered.');
    push(Math.max(0, seed.leadDaysAgo - 2), 'Not Interested', 'Customer said price is too high, decided to go elsewhere.');
    return followUps;
  }

  if (seed.status === 'Lost') {
    push(Math.max(3, seed.leadDaysAgo - 1), 'Called', 'Called, customer showed initial interest.');
    push(Math.max(2, seed.leadDaysAgo - 3), 'Interested', 'Customer wanted to think it over before visiting.');
    push(Math.max(0, seed.leadDaysAgo - 6), 'Lost', 'No response after multiple follow-up attempts. Marking as lost.');
    return followUps;
  }

  // Positive path: Assigned -> Called -> Interested -> Visit Agreed/Scheduled -> Visited -> Service Taken
  if (tier >= 1) {
    push(Math.max(0, seed.leadDaysAgo - 1), 'Called', `Called ${seed.name.split(' ')[0]}, discussed the inquiry.`);
  }
  if (tier >= 2) {
    push(Math.max(0, seed.leadDaysAgo - 2), 'Interested', 'Customer showed interest and asked about pricing and timing.');
  }
  if (tier >= 3) {
    push(Math.max(0, seed.leadDaysAgo - 3), seed.status === 'Visit Scheduled' ? 'Visit Scheduled' : 'Visit Agreed', 'Customer agreed to bring the vehicle in.');
  }
  if (tier >= 4) {
    push(Math.max(0, seed.leadDaysAgo - 4), 'Visited', 'Customer visited the workshop as agreed.');
  }
  if (tier >= 5) {
    push(Math.max(0, seed.leadDaysAgo - 5), 'Service Taken', 'Service completed and vehicle delivered.');
  }

  return followUps;
}

export const initialLeads: Lead[] = LEAD_SEEDS.map((seed, idx) => {
  const id = `lead-${idx + 1}`;
  const leadNumber = `LD-${String(idx + 1).padStart(4, '0')}`;
  const followUps = buildFollowUps(id, seed);
  const lastFollowUp = followUps[followUps.length - 1];
  const source: LeadSource = seed.source || NON_FACEBOOK_SOURCES[idx + 1] || 'Facebook';

  const isTerminal = seed.status === 'Service Taken' || seed.status === 'Not Interested' || seed.status === 'Lost';
  const nextFollowUpDate = !isTerminal && seed.nextFollowUpOffset !== undefined
    ? dateStr(seed.nextFollowUpOffset)
    : undefined;

  return {
    id,
    leadNumber,
    customerName: seed.name,
    phone: seed.phone,
    source,
    inquiry: seed.inquiry,
    status: seed.status,
    leadDate: dateStr(-seed.leadDaysAgo),
    lastContactDate: lastFollowUp ? lastFollowUp.contactDate : undefined,
    nextFollowUpDate,
    visitDate: (seed.status === 'Visited' || seed.status === 'Service Taken') ? dateStr(-Math.max(0, seed.leadDaysAgo - 4)) : undefined,
    vehicleModel: seed.vehicle,
    notes: undefined,
    followUps,
    createdAt: `${dateStr(-seed.leadDaysAgo)}T09:00:00.000Z`,
    updatedAt: lastFollowUp ? lastFollowUp.createdAt : `${dateStr(-seed.leadDaysAgo)}T09:00:00.000Z`,
  };
});
