export const ok = (data: unknown) => ({ ok: true, data });

export const error = (message: string) => ({ ok: false, message });
