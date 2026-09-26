import { useClipboard } from "src/hooks/useClipboard";

type CopyButtonProps = {
  text: string;
};

export const CopyButton = (props: CopyButtonProps) => {
  const { hasCopied, copyText } = useClipboard();

  return (
    <button type="button" class="copy" onClick={() => copyText(props.text)}>
      {hasCopied() ? "Copied" : "Copy"}
    </button>
  );
};
