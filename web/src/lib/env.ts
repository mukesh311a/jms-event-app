export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '',
  eventName: (import.meta.env.VITE_EVENT_NAME as string | undefined) || 'JMS Family Get Together',
  eventMonth: (import.meta.env.VITE_EVENT_MONTH as string | undefined) || 'MAY-2026',
  eventVenue:
    (import.meta.env.VITE_EVENT_VENUE as string | undefined) ||
    'Bharat Mandapam Hall, New Delhi',
  inviterName: (import.meta.env.VITE_INVITER_NAME as string | undefined) || 'Shri Ravi Malik',
}

