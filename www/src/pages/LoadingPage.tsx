import { withStyles, WithStyles } from "@material-ui/styles";
import { Spin } from "antd";

const styles = {
  root: {
    paddingTop: 12,
    paddingBottom: 4,
    textAlign: "center" as "center",
  },
  bordered: {
    border: "1px solid #ddd",
    borderRadius: 4,
  },
};

const LoadingComponent = ({
  classes,
  size = "default",
  bordered = false,
}: { size?: "large" | "default" | "small"; bordered?: boolean } & WithStyles<
  typeof styles
>) => {
  let className = classes.root;
  if (bordered) {
    className += ` ${classes.bordered}`;
  }

  return (
    <div className={className}>
      <Spin tip="Loading..." size={size} />
    </div>
  );
};

export default withStyles(styles)(LoadingComponent);
