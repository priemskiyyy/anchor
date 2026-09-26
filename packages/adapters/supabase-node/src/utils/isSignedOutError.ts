import {
  SESSION_MISSING_ERROR_NAME,
  SIGNED_OUT_ERROR_CODES,
} from "src/utils/constants/supabase";

export const isSignedOutError = ({
  name,
  code,
}: {
  name: string;
  code?: string | undefined;
}) =>
  name === SESSION_MISSING_ERROR_NAME ||
  (code !== undefined && SIGNED_OUT_ERROR_CODES.includes(code));
