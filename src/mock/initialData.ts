import { 
  Customer, 
  Invoice, 
  Quotation,
  JobCard,
  CashIn, 
  Expense, 
  ServiceItem, 
  LoanRecord, 
  Settings 
} from '../types';

// Helper to get formatted dates relative to today
const todayObj = new Date();
const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

const today = formatDateStr(todayObj);
const yesterday = formatDateStr(new Date(Date.now() - 86400000));
const twoDaysAgo = formatDateStr(new Date(Date.now() - 86400000 * 2));
const threeDaysAgo = formatDateStr(new Date(Date.now() - 86400000 * 3));
const fiveDaysAgo = formatDateStr(new Date(Date.now() - 86400000 * 5));
const tenDaysAgo = formatDateStr(new Date(Date.now() - 86400000 * 10));

export const initialSettings: Settings = {
  businessName: 'Arshi Automobile & Car Hub',
  phone: '01712110902',
  altPhone: '01712345678',
  address: 'Bhadra Mor, Station Road, Rajshahi, Bangladesh',
  email: 'arshi.autohub@gmail.com',
  invoicePrefix: 'INV-',
  defaultFooterText: 'Thank you for choosing Arshi Automobile & Car Hub. Quality service guaranteed.',
  currencySymbol: '৳',
};

export const initialServices: ServiceItem[] = [
  { id: 'srv-1', name: 'Foam Wash', defaultPrice: 500, category: 'Washing' },
  { id: 'srv-2', name: 'Interior Cleaning', defaultPrice: 800, category: 'Detailing' },
  { id: 'srv-3', name: 'Vacuum Cleaning', defaultPrice: 400, category: 'Washing' },
  { id: 'srv-4', name: 'Engine Room Cleaning', defaultPrice: 600, category: 'Detailing' },
  { id: 'srv-5', name: 'Tyre Shining & Polish', defaultPrice: 200, category: 'Detailing' },
  { id: 'srv-6', name: 'Full Car Polish & Wax', defaultPrice: 2500, category: 'Detailing' },
  { id: 'srv-7', name: 'Dent & Paint Touchup', defaultPrice: 4500, category: 'Bodywork' },
  { id: 'srv-8', name: 'Engine Oil & Filter Change', defaultPrice: 3200, category: 'Mechanical' },
  { id: 'srv-9', name: 'Full Periodic Car Servicing', defaultPrice: 5000, category: 'Mechanical' },
  { id: 'srv-10', name: 'Brake Pad Servicing & Replacement', defaultPrice: 1800, category: 'Mechanical' },
  { id: 'srv-11', name: 'AC Master Servicing & Gas Top-up', defaultPrice: 2800, category: 'AC & Cooling' },
  { id: 'srv-12', name: 'Electrical Work & Wiring Check', defaultPrice: 1500, category: 'Electrical' },
  { id: 'srv-13', name: 'Suspension & Bush Repair', defaultPrice: 3500, category: 'Mechanical' },
  { id: 'srv-14', name: 'Other Custom Work', defaultPrice: 1000, category: 'General' },
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Md. Rahim Uddin',
    phone: '01712-345678',
    address: 'Kazihata, Rajshahi',
    totalVisits: 4,
    lastServiceDate: today,
    createdAt: '2026-01-15',
    vehicles: [
      { id: 'veh-1', customerId: 'cust-1', registrationNumber: 'Rajshahi Metro-Ga 11-4521', model: 'Toyota Axio 2017' }
    ]
  },
  {
    id: 'cust-2',
    name: 'Engr. Tariqul Islam',
    phone: '01819-876543',
    address: 'Uposhahar, Rajshahi',
    totalVisits: 2,
    lastServiceDate: today,
    createdAt: '2026-02-10',
    vehicles: [
      { id: 'veh-2', customerId: 'cust-2', registrationNumber: 'Dhaka Metro-Gha 21-8930', model: 'Honda Vezel Hybrid' }
    ]
  },
  {
    id: 'cust-3',
    name: 'Dr. Anisur Rahman',
    phone: '01723-998877',
    address: 'Laxmipur, Rajshahi',
    totalVisits: 3,
    lastServiceDate: yesterday,
    createdAt: '2026-01-20',
    vehicles: [
      { id: 'veh-3', customerId: 'cust-3', registrationNumber: 'Rajshahi Metro-Kha 12-1044', model: 'Toyota Allion 2018' }
    ]
  },
  {
    id: 'cust-4',
    name: 'Farhan Ahmed',
    phone: '01911-554433',
    address: 'Talaimari, Rajshahi',
    totalVisits: 1,
    lastServiceDate: twoDaysAgo,
    createdAt: '2026-02-14',
    vehicles: [
      { id: 'veh-4', customerId: 'cust-4', registrationNumber: 'Rajshahi Metro-Ga 14-6721', model: 'Nissan X-Trail' }
    ]
  },
  {
    id: 'cust-5',
    name: 'Mostafa Kamal',
    phone: '01755-123987',
    address: 'Shaheb Bazar, Rajshahi',
    totalVisits: 5,
    lastServiceDate: threeDaysAgo,
    createdAt: '2026-01-05',
    vehicles: [
      { id: 'veh-5', customerId: 'cust-5', registrationNumber: 'Dhaka Metro-Ga 33-1122', model: 'Toyota Premio 2019' }
    ]
  },
  {
    id: 'cust-6',
    name: 'Kabir Hossain',
    phone: '01678-432109',
    address: 'Shiroil, Rajshahi',
    totalVisits: 2,
    lastServiceDate: fiveDaysAgo,
    createdAt: '2026-02-01',
    vehicles: [
      { id: 'veh-6', customerId: 'cust-6', registrationNumber: 'Rajshahi Metro-Gha 15-9012', model: 'Hyundai Tucson' }
    ]
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    date: today,
    customerId: 'cust-1',
    customerName: 'Md. Rahim Uddin',
    customerPhone: '01712-345678',
    vehicleRegistration: 'Rajshahi Metro-Ga 11-4521',
    vehicleModel: 'Toyota Axio 2017',
    items: [
      { id: 'item-1', serviceName: 'Full Periodic Car Servicing', price: 5000, quantity: 1 },
      { id: 'item-2', serviceName: 'Engine Oil & Filter Change', price: 3200, quantity: 1 },
      { id: 'item-3', serviceName: 'Foam Wash', price: 500, quantity: 1 }
    ],
    subtotal: 8700,
    discount: 200,
    grandTotal: 8500,
    paid: 8500,
    due: 0,
    status: 'Paid',
    paymentMethod: 'Cash',
    notes: 'Engine tuning checked and running smooth.',
    createdAt: `${today}T10:30:00.000Z`
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    date: today,
    customerId: 'cust-2',
    customerName: 'Engr. Tariqul Islam',
    customerPhone: '01819-876543',
    vehicleRegistration: 'Dhaka Metro-Gha 21-8930',
    vehicleModel: 'Honda Vezel Hybrid',
    items: [
      { id: 'item-4', serviceName: 'AC Master Servicing & Gas Top-up', price: 2800, quantity: 1 },
      { id: 'item-5', serviceName: 'Interior Cleaning', price: 800, quantity: 1 },
      { id: 'item-6', serviceName: 'Vacuum Cleaning', price: 400, quantity: 1 }
    ],
    subtotal: 4000,
    discount: 0,
    grandTotal: 4000,
    paid: 2500,
    due: 1500,
    status: 'Partial',
    paymentMethod: 'bKash',
    notes: 'Remaining ৳1,500 due on vehicle collection.',
    createdAt: `${today}T11:45:00.000Z`
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-003',
    date: yesterday,
    customerId: 'cust-3',
    customerName: 'Dr. Anisur Rahman',
    customerPhone: '01723-998877',
    vehicleRegistration: 'Rajshahi Metro-Kha 12-1044',
    vehicleModel: 'Toyota Allion 2018',
    items: [
      { id: 'item-7', serviceName: 'Full Car Polish & Wax', price: 2500, quantity: 1 },
      { id: 'item-8', serviceName: 'Tyre Shining & Polish', price: 200, quantity: 1 }
    ],
    subtotal: 2700,
    discount: 200,
    grandTotal: 2500,
    paid: 2500,
    due: 0,
    status: 'Paid',
    paymentMethod: 'Bank',
    notes: 'Payment received via City Bank transfer.',
    createdAt: `${yesterday}T14:15:00.000Z`
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-004',
    date: twoDaysAgo,
    customerId: 'cust-4',
    customerName: 'Farhan Ahmed',
    customerPhone: '01911-554433',
    vehicleRegistration: 'Rajshahi Metro-Ga 14-6721',
    vehicleModel: 'Nissan X-Trail',
    items: [
      { id: 'item-9', serviceName: 'Dent & Paint Touchup', price: 4500, quantity: 1 },
      { id: 'item-10', serviceName: 'Brake Pad Servicing & Replacement', price: 1800, quantity: 1 }
    ],
    subtotal: 6300,
    discount: 300,
    grandTotal: 6000,
    paid: 0,
    due: 6000,
    status: 'Due',
    paymentMethod: 'Cash',
    notes: 'Awaiting insurance clearance from client.',
    createdAt: `${twoDaysAgo}T16:00:00.000Z`
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2026-005',
    date: threeDaysAgo,
    customerId: 'cust-5',
    customerName: 'Mostafa Kamal',
    customerPhone: '01755-123987',
    vehicleRegistration: 'Dhaka Metro-Ga 33-1122',
    vehicleModel: 'Toyota Premio 2019',
    items: [
      { id: 'item-11', serviceName: 'Suspension & Bush Repair', price: 3500, quantity: 1 },
      { id: 'item-12', serviceName: 'Electrical Work & Wiring Check', price: 1500, quantity: 1 },
      { id: 'item-13', serviceName: 'Foam Wash', price: 500, quantity: 1 }
    ],
    subtotal: 5500,
    discount: 0,
    grandTotal: 5500,
    paid: 5500,
    due: 0,
    status: 'Paid',
    paymentMethod: 'Cash',
    notes: 'Regular client discount applied to labor.',
    createdAt: `${threeDaysAgo}T12:00:00.000Z`
  },
  {
    id: 'inv-6',
    invoiceNumber: 'INV-2026-006',
    date: fiveDaysAgo,
    customerId: 'cust-6',
    customerName: 'Kabir Hossain',
    customerPhone: '01678-432109',
    vehicleRegistration: 'Rajshahi Metro-Gha 15-9012',
    vehicleModel: 'Hyundai Tucson',
    items: [
      { id: 'item-14', serviceName: 'Full Periodic Car Servicing', price: 5000, quantity: 1 }
    ],
    subtotal: 5000,
    discount: 0,
    grandTotal: 5000,
    paid: 3000,
    due: 2000,
    status: 'Partial',
    paymentMethod: 'bKash',
    notes: 'Partially paid via bKash merchant.',
    createdAt: `${fiveDaysAgo}T15:30:00.000Z`
  }
];

export const initialCashIn: CashIn[] = [
  {
    id: 'cin-1',
    date: today,
    time: '10:30 AM',
    type: 'Service Payment',
    description: 'Service Payment - Toyota Axio',
    reference: 'INV-2026-001',
    paymentMethod: 'Cash',
    amount: 8500,
    invoiceId: 'inv-1',
    customerName: 'Md. Rahim Uddin',
    vehicleInfo: 'Toyota Axio (Rajshahi Metro-Ga 11-4521)',
    createdAt: `${today}T10:30:00.000Z`
  },
  {
    id: 'cin-2',
    date: today,
    time: '11:45 AM',
    type: 'Service Payment',
    description: 'Partial Service Payment - Honda Vezel',
    reference: 'INV-2026-002',
    paymentMethod: 'bKash',
    amount: 2500,
    invoiceId: 'inv-2',
    customerName: 'Engr. Tariqul Islam',
    vehicleInfo: 'Honda Vezel Hybrid',
    createdAt: `${today}T11:45:00.000Z`
  },
  {
    id: 'cin-3',
    date: today,
    time: '01:00 PM',
    type: 'Loan from MD',
    description: 'Emergency Working Capital injection from MD',
    reference: 'MD-INFLOW-02',
    paymentMethod: 'Bank',
    amount: 14000,
    note: 'Added to garage working funds for equipment purchase',
    createdAt: `${today}T13:00:00.000Z`
  },
  {
    id: 'cin-4',
    date: yesterday,
    time: '02:15 PM',
    type: 'Service Payment',
    description: 'Car Polish & Wax - Toyota Allion',
    reference: 'INV-2026-003',
    paymentMethod: 'Bank',
    amount: 2500,
    invoiceId: 'inv-3',
    customerName: 'Dr. Anisur Rahman',
    vehicleInfo: 'Toyota Allion 2018',
    createdAt: `${yesterday}T14:15:00.000Z`
  },
  {
    id: 'cin-5',
    date: twoDaysAgo,
    time: '11:00 AM',
    type: 'Other Income',
    description: 'Sale of old workshop scrap iron & drums',
    reference: 'SCRAP-08',
    paymentMethod: 'Cash',
    amount: 1500,
    note: 'Collected from local scrap dealer',
    createdAt: `${twoDaysAgo}T11:00:00.000Z`
  },
  {
    id: 'cin-6',
    date: threeDaysAgo,
    time: '12:00 PM',
    type: 'Service Payment',
    description: 'Suspension & Electrical - Toyota Premio',
    reference: 'INV-2026-005',
    paymentMethod: 'Cash',
    amount: 5500,
    invoiceId: 'inv-5',
    customerName: 'Mostafa Kamal',
    vehicleInfo: 'Toyota Premio 2019',
    createdAt: `${threeDaysAgo}T12:00:00.000Z`
  },
  {
    id: 'cin-7',
    date: fiveDaysAgo,
    time: '03:30 PM',
    type: 'Service Payment',
    description: 'Advance Periodic Service - Hyundai Tucson',
    reference: 'INV-2026-006',
    paymentMethod: 'bKash',
    amount: 3000,
    invoiceId: 'inv-6',
    customerName: 'Kabir Hossain',
    vehicleInfo: 'Hyundai Tucson',
    createdAt: `${fiveDaysAgo}T15:30:00.000Z`
  }
];

export const initialExpenses: Expense[] = [
  {
    id: 'exp-1',
    date: today,
    time: '11:15 AM',
    category: 'Purchase',
    description: 'Car Wash Chemicals & Meguiar’s Polish liquid',
    paymentMethod: 'Cash',
    amount: 2000,
    note: 'Purchased from Rajshahi Auto Parts Mart',
    recipient: 'Auto Parts Mart',
    createdAt: `${today}T11:15:00.000Z`
  },
  {
    id: 'exp-2',
    date: today,
    time: '01:30 PM',
    category: 'Food',
    description: 'Technicians & staff daily lunch (6 persons)',
    paymentMethod: 'Cash',
    amount: 500,
    note: 'Hotel Rajmahal lunch',
    recipient: 'Hotel Rajmahal',
    createdAt: `${today}T13:30:00.000Z`
  },
  {
    id: 'exp-3',
    date: today,
    time: '03:00 PM',
    category: 'Other',
    description: 'Hydraulic Lift grease & air compressor filter replacement',
    paymentMethod: 'Cash',
    amount: 10000,
    note: 'Workshop machinery maintenance',
    recipient: 'Techno Equipment',
    createdAt: `${today}T15:00:00.000Z`
  },
  {
    id: 'exp-4',
    date: yesterday,
    time: '04:00 PM',
    category: 'Purchase',
    description: 'Mobil Super 2000 4L Engine Oil cans (3 pcs)',
    paymentMethod: 'bKash',
    amount: 8400,
    note: 'Stock replenishing',
    recipient: 'Mobil Distributor',
    createdAt: `${yesterday}T16:00:00.000Z`
  },
  {
    id: 'exp-5',
    date: threeDaysAgo,
    time: '05:30 PM',
    category: 'Salary',
    description: 'Weekly advance payment to chief mechanics',
    paymentMethod: 'Bank',
    amount: 12000,
    note: 'Advance salary for mechanics Karim & Sohel',
    recipient: 'Workshop Mechanics',
    createdAt: `${threeDaysAgo}T17:30:00.000Z`
  },
  {
    id: 'exp-6',
    date: tenDaysAgo,
    time: '10:00 AM',
    category: 'Rent',
    description: 'Monthly Garage Workshop space rent',
    paymentMethod: 'Bank',
    amount: 25000,
    note: 'Garage premises rent for current month',
    recipient: 'Building Owner',
    createdAt: `${tenDaysAgo}T10:00:00.000Z`
  },
  {
    id: 'exp-7',
    date: fiveDaysAgo,
    time: '02:00 PM',
    category: 'Loan Repayment',
    description: 'Loan Repayment installment to MD',
    paymentMethod: 'Bank',
    amount: 20000,
    note: 'Repayment of loan capital from cash reserves',
    recipient: 'Managing Director',
    createdAt: `${fiveDaysAgo}T14:00:00.000Z`
  }
];

export const initialLoanRecords: LoanRecord[] = [
  {
    id: 'lr-1',
    date: tenDaysAgo,
    time: '09:30 AM',
    type: 'Received',
    amount: 500000,
    paymentMethod: 'Bank',
    note: 'Initial setup & equipment capital financing from MD',
    createdAt: `${tenDaysAgo}T09:30:00.000Z`
  },
  {
    id: 'lr-2',
    date: fiveDaysAgo,
    time: '02:00 PM',
    type: 'Repayment',
    amount: 80000,
    paymentMethod: 'Bank',
    note: 'First installment repaid to MD from profits',
    createdAt: `${fiveDaysAgo}T14:00:00.000Z`
  },
  {
    id: 'lr-3',
    date: threeDaysAgo,
    time: '04:00 PM',
    type: 'Repayment',
    amount: 20000,
    paymentMethod: 'Bank',
    note: 'Second installment repaid to MD',
    createdAt: `${threeDaysAgo}T16:00:00.000Z`
  },
  {
    id: 'lr-4',
    date: today,
    time: '01:00 PM',
    type: 'Received',
    amount: 14000,
    paymentMethod: 'Bank',
    note: 'Emergency Working Capital injection from MD',
    createdAt: `${today}T13:00:00.000Z`
  }
];

export const initialExpenseCategories = [
  'Salary',
  'Purchase',
  'Food',
  'Rent',
  'Loan Repayment',
  'Other'
];

export const initialQuotations: Quotation[] = [
  {
    id: 'qt-1',
    quotationNumber: 'QT-0001',
    date: today,
    validUntil: formatDateStr(new Date(Date.now() + 86400000 * 7)),
    customerId: 'cust-1',
    customerName: 'Md. Rahim Uddin',
    customerPhone: '01712-345678',
    vehicleRegistration: 'Rajshahi Metro-Ga 11-4521',
    vehicleModel: 'Toyota Axio',
    items: [
      { id: 'qitem-1', serviceName: 'Dent & Paint', description: 'Front bumper and left fender touchup & paint', quantity: 1, unitPrice: 4500, total: 4500 },
      { id: 'qitem-2', serviceName: 'Foam Wash', description: 'Complete deep foam wash and polish', quantity: 1, unitPrice: 500, total: 500 },
      { id: 'qitem-3', serviceName: 'Tyre Shining', description: 'Silicon tyre shining', quantity: 1, unitPrice: 500, total: 500 }
    ],
    subtotal: 5500,
    discount: 0,
    grandTotal: 5500,
    status: 'Sent',
    notes: 'This quotation is an estimated cost. Final cost may change after vehicle inspection or if additional work is required.',
    terms: '1. Quotation valid for 7 days from issue date.\n2. Genuine spare parts provided with warranty.\n3. 50% advance required on job confirmation.',
    createdAt: `${today}T09:30:00.000Z`
  },
  {
    id: 'qt-2',
    quotationNumber: 'QT-0002',
    date: today,
    validUntil: formatDateStr(new Date(Date.now() + 86400000 * 7)),
    customerId: 'cust-5',
    customerName: 'Md. Karim',
    customerPhone: '01755-123987',
    vehicleRegistration: 'Dhaka Metro-Ga 33-1122',
    vehicleModel: 'Toyota Premio',
    items: [
      { id: 'qitem-4', serviceName: 'Full Periodic Servicing', description: 'Complete 40-point major mechanical servicing', quantity: 1, unitPrice: 5000, total: 5000 },
      { id: 'qitem-5', serviceName: 'Suspension Overhaul', description: 'Front & rear shock absorbers and bush replacement', quantity: 1, unitPrice: 8500, total: 8500 },
      { id: 'qitem-6', serviceName: 'Dent & Paint', description: 'Both side doors scratch repair and baking paint', quantity: 1, unitPrice: 5000, total: 5000 }
    ],
    subtotal: 18500,
    discount: 500,
    grandTotal: 18000,
    status: 'Accepted',
    notes: 'Customer agreed to proceed on weekend.',
    terms: '1. Quotation valid for 7 days.\n2. Estimated delivery time: 2 working days.',
    createdAt: `${today}T10:15:00.000Z`
  },
  {
    id: 'qt-3',
    quotationNumber: 'QT-0003',
    date: yesterday,
    validUntil: formatDateStr(new Date(Date.now() + 86400000 * 6)),
    customerName: 'Md. Hasan',
    customerPhone: '01811-223344',
    vehicleRegistration: 'Rajshahi Metro-Cha 11-9876',
    vehicleModel: 'Toyota Noah',
    items: [
      { id: 'qitem-7', serviceName: 'AC Master Servicing', description: 'Compressor oil, gas recharge and blower cleaning', quantity: 1, unitPrice: 4000, total: 4000 },
      { id: 'qitem-8', serviceName: 'Interior Detailing', description: 'Roof, seat fabric and carpet shampoo extraction', quantity: 1, unitPrice: 3500, total: 3500 }
    ],
    subtotal: 7500,
    discount: 0,
    grandTotal: 7500,
    status: 'Converted',
    convertedInvoiceId: 'inv-1',
    convertedInvoiceNumber: 'INV-2026-001',
    notes: 'Converted to Invoice INV-2026-001.',
    terms: '1. Quotation valid for 7 days.',
    createdAt: `${yesterday}T14:00:00.000Z`
  },
  {
    id: 'qt-4',
    quotationNumber: 'QT-0004',
    date: twoDaysAgo,
    validUntil: formatDateStr(new Date(Date.now() + 86400000 * 5)),
    customerId: 'cust-4',
    customerName: 'Farhan Ahmed',
    customerPhone: '01911-554433',
    vehicleRegistration: 'Rajshahi Metro-Ga 14-6721',
    vehicleModel: 'Toyota Harrier',
    items: [
      { id: 'qitem-9', serviceName: 'Ceramic Coating Package', description: '9H 3-layer ceramic coating with 2 years protection', quantity: 1, unitPrice: 20000, total: 20000 },
      { id: 'qitem-10', serviceName: 'Engine Room Detailing', description: 'Degreasing and steam wash with dressing', quantity: 1, unitPrice: 1500, total: 1500 },
      { id: 'qitem-11', serviceName: 'Glass Watermark Removal', description: 'All windows chemical treatment', quantity: 1, unitPrice: 2500, total: 2500 }
    ],
    subtotal: 24000,
    discount: 0,
    grandTotal: 24000,
    status: 'Draft',
    notes: 'Draft estimate prepared for customer consideration.',
    terms: '1. Quotation valid for 7 days.',
    createdAt: `${twoDaysAgo}T11:20:00.000Z`
  },
  {
    id: 'qt-5',
    quotationNumber: 'QT-0005',
    date: fiveDaysAgo,
    validUntil: formatDateStr(new Date(Date.now() + 86400000 * 2)),
    customerId: 'cust-3',
    customerName: 'Dr. Anisur Rahman',
    customerPhone: '01723-998877',
    vehicleRegistration: 'Rajshahi Metro-Kha 12-1044',
    vehicleModel: 'Toyota Prius',
    items: [
      { id: 'qitem-12', serviceName: 'Hybrid Battery Servicing & Cell Balance', description: 'Individual cell voltage test and cooling fan cleanup', quantity: 1, unitPrice: 12000, total: 12000 }
    ],
    subtotal: 12000,
    discount: 0,
    grandTotal: 12000,
    status: 'Rejected',
    notes: 'Customer postponed battery maintenance for next quarter.',
    terms: '1. Quotation valid for 7 days.',
    createdAt: `${fiveDaysAgo}T16:45:00.000Z`
  }
];

export const initialStaff = [
  'Technician 1 (Karim - Engine)',
  'Technician 2 (Sohel - Dent/Paint)',
  'Technician 3 (Jalal - Electrical)',
  'Service Team',
  'Dent & Paint Team'
];

export const initialJobCards: JobCard[] = [
  {
    id: 'jc-1',
    jobCardNumber: 'JC-0001',
    date: today,
    expectedDeliveryDate: today,
    customerId: 'cust-1',
    customerName: 'Md. Rahim Uddin',
    customerPhone: '01712-345678',
    vehicleRegistration: 'Rajshahi Metro-Ga 11-4521',
    vehicleModel: 'Toyota Axio 2017',
    mileage: '68,450 km',
    status: 'In Progress',
    customerComplaint: 'Engine hesitation during pickup and slight vibration in AC mode. Also need full washing.',
    requiredWork: [
      { id: 'jw-1', serviceName: 'Electrical Work', description: 'Check spark plugs, ignition coils and throttle body sensor' },
      { id: 'jw-2', serviceName: 'Engine Service', description: 'Engine tuning and oil filter inspection' },
      { id: 'jw-3', serviceName: 'Car Wash', description: 'Complete exterior foam wash' }
    ],
    vehicleCondition: 'Customer informed about minor scratch on left rear door. Front bumper right clip loose.',
    assignedTo: 'Technician 1 (Karim - Engine)',
    beforePhotos: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&auto=format&fit=crop&q=80'
    ],
    afterPhotos: [],
    quotationId: 'qt-1',
    quotationNumber: 'QT-0001',
    notes: 'Customer wants vehicle ready before 5:00 PM.',
    createdAt: `${today}T08:30:00.000Z`
  },
  {
    id: 'jc-2',
    jobCardNumber: 'JC-0002',
    date: today,
    expectedDeliveryDate: formatDateStr(new Date(Date.now() + 86400000 * 2)),
    customerId: 'cust-5',
    customerName: 'Md. Karim',
    customerPhone: '01755-123987',
    vehicleRegistration: 'Dhaka Metro-Ga 33-1122',
    vehicleModel: 'Toyota Premio',
    mileage: '94,200 km',
    status: 'Waiting',
    customerComplaint: 'Left front fender dent repair and whole passenger side deep scratch repainting.',
    requiredWork: [
      { id: 'jw-4', serviceName: 'Dent & Paint', description: 'Panel beating on front left fender and primer coat' },
      { id: 'jw-5', serviceName: 'Dent & Paint', description: '2K baking oven color match and clear coat' }
    ],
    vehicleCondition: 'Existing minor paint chips on hood. Customer notified and signed.',
    assignedTo: 'Dent & Paint Team',
    beforePhotos: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400&auto=format&fit=crop&q=80'
    ],
    afterPhotos: [],
    quotationId: 'qt-2',
    quotationNumber: 'QT-0002',
    notes: 'Awaiting customer color code confirmation before spraying.',
    createdAt: `${today}T10:00:00.000Z`
  },
  {
    id: 'jc-3',
    jobCardNumber: 'JC-0003',
    date: today,
    expectedDeliveryDate: today,
    customerId: 'cust-2',
    customerName: 'Engr. Tariqul Islam',
    customerPhone: '01819-876543',
    vehicleRegistration: 'Dhaka Metro-Gha 21-8930',
    vehicleModel: 'Honda Vezel Hybrid',
    mileage: '52,100 km',
    status: 'Completed',
    customerComplaint: 'AC not blowing cold air during noon heat. Interior vacuum cleaning.',
    requiredWork: [
      { id: 'jw-6', serviceName: 'AC Service', description: 'Gas pressure leak test, refrigerant R134a top up' },
      { id: 'jw-7', serviceName: 'Interior Cleaning', description: 'Cabin blower filter cleaning and vacuum' }
    ],
    vehicleCondition: 'Vehicle in pristine condition, no pre-existing scratches found.',
    assignedTo: 'Technician 3 (Jalal - Electrical)',
    beforePhotos: [],
    afterPhotos: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&auto=format&fit=crop&q=80'
    ],
    invoiceId: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    notes: 'Cooling test passed: 6.8°C at vents. Ready for customer pickup.',
    createdAt: `${today}T09:00:00.000Z`
  },
  {
    id: 'jc-4',
    jobCardNumber: 'JC-0004',
    date: yesterday,
    expectedDeliveryDate: yesterday,
    customerName: 'Md. Hasan',
    customerPhone: '01811-223344',
    vehicleRegistration: 'Rajshahi Metro-Cha 11-9876',
    vehicleModel: 'Toyota Noah',
    mileage: '118,500 km',
    status: 'Delivered',
    customerComplaint: 'Car wash, interior seat shampoo extraction and wheel alignment check.',
    requiredWork: [
      { id: 'jw-8', serviceName: 'Car Wash', description: 'Deep foam exterior wash and undercarriage cleaning' },
      { id: 'jw-9', serviceName: 'Interior Cleaning', description: 'Fabric seat stain removal' }
    ],
    vehicleCondition: 'Normal wear and tear. Rear wiper blade torn.',
    assignedTo: 'Service Team',
    beforePhotos: [],
    afterPhotos: [],
    invoiceId: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    notes: 'Delivered to client yesterday evening with full satisfaction.',
    createdAt: `${yesterday}T11:00:00.000Z`
  },
  {
    id: 'jc-5',
    jobCardNumber: 'JC-0005',
    date: twoDaysAgo,
    expectedDeliveryDate: today,
    customerId: 'cust-4',
    customerName: 'Farhan Ahmed',
    customerPhone: '01911-554433',
    vehicleRegistration: 'Rajshahi Metro-Ga 14-6721',
    vehicleModel: 'Toyota Harrier',
    mileage: '43,800 km',
    status: 'In Progress',
    customerComplaint: 'Full 9H Ceramic coating, glass watermark removal and engine room steam wash.',
    requiredWork: [
      { id: 'jw-10', serviceName: 'Car Polish', description: 'Two-step compounding and swirl removal' },
      { id: 'jw-11', serviceName: 'General Inspection', description: 'Surface preparation and 3-coat ceramic application' }
    ],
    vehicleCondition: 'Fine swirls all over clearcoat. No deep dents.',
    assignedTo: 'Service Team',
    beforePhotos: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80'
    ],
    afterPhotos: [],
    quotationId: 'qt-4',
    quotationNumber: 'QT-0004',
    notes: '2nd coating cure in progress. Temperature maintained at 24C.',
    createdAt: `${twoDaysAgo}T14:30:00.000Z`
  },
  {
    id: 'jc-6',
    jobCardNumber: 'JC-0006',
    date: threeDaysAgo,
    expectedDeliveryDate: twoDaysAgo,
    customerId: 'cust-3',
    customerName: 'Dr. Anisur Rahman',
    customerPhone: '01723-998877',
    vehicleRegistration: 'Rajshahi Metro-Kha 12-1044',
    vehicleModel: 'Toyota Prius',
    mileage: '135,000 km',
    status: 'Cancelled',
    customerComplaint: 'Hybrid inverter coolant flush and main traction battery diagnostic scan.',
    requiredWork: [
      { id: 'jw-12', serviceName: 'General Inspection', description: 'OBD2 hybrid scanner live data log' }
    ],
    vehicleCondition: 'Dashboard master warning light ON.',
    assignedTo: 'Technician 3 (Jalal - Electrical)',
    beforePhotos: [],
    afterPhotos: [],
    notes: 'Customer decided to visit authorized dealership for warranty claim.',
    createdAt: `${threeDaysAgo}T15:00:00.000Z`
  }
];


