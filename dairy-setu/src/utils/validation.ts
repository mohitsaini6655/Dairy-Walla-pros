export const isSpamPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) return true;
  if (!/^[6789]/.test(cleanPhone)) return true;
  if (/^(\d)\1{9}$/.test(cleanPhone)) return true;
  const asc = '01234567890123456789';
  const desc = '98765432109876543210';
  if (asc.includes(cleanPhone) || desc.includes(cleanPhone)) return true;
  return false;
};
