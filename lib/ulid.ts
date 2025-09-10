const ENCODING: string = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(time: number, length: number): string {
  let str = "";
  for (let i = length; i > 0; i--) {
    str = ENCODING[time % 32] + str;
    time = Math.floor(time / 32);
  }
  return str;
}

function encodeRandom(length: number): string {
  let str = "";

  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    str += ENCODING[bytes[i] % 32];
  }
  return str;
}

export function ulid(date: number = Date.now()): string {
  return encodeTime(date, 10) + encodeRandom(16);
}
