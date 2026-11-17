export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function formBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === 'on' || value === 'true' || value === '1';
}

export function formList(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === 'string');
}
