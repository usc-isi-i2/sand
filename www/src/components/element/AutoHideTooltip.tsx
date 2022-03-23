import { Tooltip } from "antd";
import { useState } from "react";

export const AutoHideTooltip: React.FC<{ title: string; ms: number }> = ({
  children,
  title,
  ms,
}) => {
  const [visible, setVisible] = useState(false);
  const autoHide = (visible: boolean) => {
    if (visible) {
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
      }, ms);
    }
  };

  return (
    <Tooltip
      title={title}
      visible={visible}
      onVisibleChange={autoHide}
      trigger="click"
    >
      {children}
    </Tooltip>
  );
};
