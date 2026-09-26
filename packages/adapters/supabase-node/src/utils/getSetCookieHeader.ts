import type { SupabaseCookieOptions } from "src/types/SupabaseCookieOptions";
import {
  PRIORITY_ATTRIBUTES,
  SAME_SITE_ATTRIBUTES,
} from "src/utils/constants/cookies";

const getSameSiteAttribute = (sameSite: SupabaseCookieOptions["sameSite"]) => {
  if (sameSite === undefined || sameSite === false) {
    return [];
  }

  return [
    `SameSite=${SAME_SITE_ATTRIBUTES[sameSite === true ? "strict" : sameSite]}`,
  ];
};

// As the cookie package serializes a Set-Cookie header for @supabase/ssr, attribute by attribute and in its order.
export const getSetCookieHeader = (
  name: string,
  value: string,
  {
    encode = encodeURIComponent,
    maxAge,
    domain,
    path,
    expires,
    httpOnly,
    secure,
    partitioned,
    priority,
    sameSite,
  }: SupabaseCookieOptions,
) =>
  [
    `${name}=${value === "" ? "" : encode(value)}`,
    ...(maxAge === undefined ? [] : [`Max-Age=${maxAge}`]),
    ...(domain ? [`Domain=${domain}`] : []),
    ...(path ? [`Path=${path}`] : []),
    ...(expires === undefined ? [] : [`Expires=${expires.toUTCString()}`]),
    ...(httpOnly ? ["HttpOnly"] : []),
    ...(secure ? ["Secure"] : []),
    ...(partitioned ? ["Partitioned"] : []),
    ...(priority === undefined
      ? []
      : [`Priority=${PRIORITY_ATTRIBUTES[priority]}`]),
    ...getSameSiteAttribute(sameSite),
  ].join("; ");
