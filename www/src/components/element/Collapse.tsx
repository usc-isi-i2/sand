import { withStyles, WithStyles } from "@material-ui/styles";
import React, { useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { Space } from "antd";

const styles = {
  hide: {
    display: "none",
  },
};
export const CollapsibleComponent = withStyles(styles)(
  (
    props: React.PropsWithChildren<
      { collapsible: React.ReactNode } & WithStyles<typeof styles>
    >
  ) => {
    const [visible, setVisible] = useState(false);
    const toggleVisible = () => {
      setVisible(!visible);
    };
    const btn = visible ? (
      <EyeInvisibleOutlined onClick={toggleVisible} />
    ) : (
      <EyeOutlined onClick={toggleVisible} />
    );

    return (
      <div>
        <Space size={4}>
          {props.children}
          {btn}
        </Space>
        <div className={visible ? "gena-app" : props.classes.hide}>
          {props.collapsible}
        </div>
      </div>
    );
  }
);
