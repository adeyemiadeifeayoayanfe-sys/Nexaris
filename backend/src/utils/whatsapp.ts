export function normalizeWhatsappNumber(number: string) {
  return number.replace(/[^\d]/g, '');
}

export function buildWhatsappUrl(companyNumber: string, message: string) {
  const normalized = normalizeWhatsappNumber(companyNumber);

  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
