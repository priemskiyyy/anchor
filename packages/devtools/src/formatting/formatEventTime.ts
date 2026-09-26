const padDigits = (value: number, length: number) =>
  String(value).padStart(length, "0");

export const formatEventTime = (timestamp: number) => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${padDigits(date.getHours(), 2)}:${padDigits(date.getMinutes(), 2)}:${padDigits(date.getSeconds(), 2)}.${padDigits(date.getMilliseconds(), 3)}`;
};
