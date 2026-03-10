export function formatDate(date: Date) {
  return Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
  }).format(date)
}