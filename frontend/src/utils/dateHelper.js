export const formatDateSafe = (dateVal) => {
  if (!dateVal) return "";
  
  // If it's already a YYYY-MM-DD string, handle it manually to be 100% safe
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    const parts = dateVal.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return "";
  }
};

export const formatDateForInput = (dateVal) => {
  if (!dateVal) return "";

  // If it's already a YYYY-MM-DD string, just return the first 10 chars
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    return dateVal.split('T')[0];
  }

  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return "";
  }
};
