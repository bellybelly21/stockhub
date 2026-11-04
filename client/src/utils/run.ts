export function validateRun(run: string): boolean {
  const cleanRun = run.replace(/[^0-9kK]/g, '');
  if (cleanRun.length < 8) return false;
  
  const body = cleanRun.slice(0, -1);
  const dv = cleanRun.slice(-1).toUpperCase();
  
  let sum = 0;
  let multiplier = 2;
  
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDv = 11 - (sum % 11);
  const calculatedDv = expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : expectedDv.toString();
  
  return dv === calculatedDv;
}

export function formatRun(run: string): string {
  const clean = run.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!clean) return '';
  

  if (clean.length === 1) return clean;
  
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}