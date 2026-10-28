// Wrap a user's words in curly quotes without doubling quotes they typed.
export const quoted = (s = '') => `“${s.trim().replace(/^["“'‘]+|["”'’]+$/g, '')}”`
