export const Number: React.FunctionComponent<
  {
    value: number;
    fractionDigits?: number;
  } & Omit<React.HTMLProps<HTMLSpanElement>, "title">
> = ({ value, fractionDigits, ...restprops }) => {
  return (
    <span title={value.toString()} {...restprops}>
      {value.toFixed(fractionDigits)}
    </span>
  );
};
