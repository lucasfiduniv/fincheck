export function toUTCDateISOString(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ),
  ).toISOString()
}