export function formatBDT(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '৳0';
  return `৳${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string, timeString?: string): string {
  const formattedDate = formatDate(dateString);
  if (!timeString) return formattedDate;
  return `${formattedDate}, ${timeString}`;
}

export function generateInvoiceNumber(existingInvoicesCount: number): string {
  const currentYear = new Date().getFullYear();
  const nextNum = String(existingInvoicesCount + 1).padStart(3, '0');
  return `INV-${currentYear}-${nextNum}`;
}

export function generateQuotationNumber(existingQuotationsCount: number): string {
  const nextNum = String(existingQuotationsCount + 1).padStart(4, '0');
  return `QT-${nextNum}`;
}

export function generateJobCardNumber(existingJobCardsCount: number): string {
  const nextNum = String(existingJobCardsCount + 1).padStart(4, '0');
  return `JC-${nextNum}`;
}


