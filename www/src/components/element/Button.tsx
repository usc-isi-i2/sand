import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { withStyles, WithStyles } from "@material-ui/styles";
import { blue, grey } from "@ant-design/colors";
import { useState } from "react";

const styles = {
  checkboxIcon: {
    padding: "1px 2px",
    border: "1px solid",
    borderRadius: 2,
    fontSize: 12,
    marginBottom: -1,
  },
};

export const CheckboxIcon = withStyles(styles)(
  ({
    icon,
    classes,
    selected,
    onChange,
    colorSelected = blue[5],
    colorUnselected = grey[5],
  }: {
    icon: IconProp;
    selected?: boolean;
    onChange?: (selected: boolean) => void;
    colorSelected?: string;
    colorUnselected?: string;
  } & WithStyles<typeof styles>) => {
    const [stateSelected, setStateSelected] = useState(false);
    const toggle = () => {
      if (selected !== undefined && onChange !== undefined) {
        return onChange(!selected);
      }

      setStateSelected(!stateSelected);
      if (onChange !== undefined) {
        onChange(!stateSelected);
      }
    };

    const correctSelected = selected === undefined ? stateSelected : selected;

    return (
      <FontAwesomeIcon
        icon={icon}
        color={correctSelected ? colorSelected : colorUnselected}
        className={classes.checkboxIcon}
        onClick={toggle}
      />
    );
  }
);
