import G6 from "@antv/g6";
import {
  Circle,
  createNodeFromReact,
  Group,
  Image,
  Rect,
  Text,
} from "@antv/g6-react-node";

export const Tag = ({ text, color }: any) => (
  <Rect
    style={{
      fill: color,
      padding: [5, 10],
      width: "auto",
      radius: [4],
      margin: [0, 8],
    }}
  >
    <Text style={{ fill: "#fff", fontSize: 10 }}>{text}</Text>
  </Rect>
);

export const Card = ({ cfg }: any) => {
  const { collapsed = false } = cfg;

  return (
    <Group draggable>
      <Rect
        style={{
          width: 50,
          height: "auto",
          fill: "#fff",
          stroke: "#ddd",
          shadowColor: "#eee",
          shadowBlur: 30,
          radius: [8],
          justifyContent: "center",
          padding: [18, 0],
        }}
        draggable
      >
        <Text
          style={{
            fill: "#000",
            margin: [0, 24],
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          This is a card
        </Text>
        <Text
          style={{
            fill: "#ccc",
            fontSize: 12,
            margin: [12, 24],
            maxWidth: 100,
          }}
        >
          I'm loooooooooooooooooooooooooooooooooog
        </Text>
        {collapsed && (
          <Group>
            <Image
              style={{
                img: "https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg",
                width: 200,
                height: 200,
                margin: [24, "auto"],
              }}
            />
            <Rect
              style={{ width: "auto", flexDirection: "row", padding: [4, 12] }}
            >
              <Tag color="#66ccff" text="We" />
              <Tag color="#66ccff" text="are" />
              <Tag color="#66ccff" text="many" />
              <Tag color="#66ccff" text="tags" />
            </Rect>
          </Group>
        )}
        <Circle
          style={
            {
              position: "absolute",
              x: 380,
              y: 20,
              r: 5,
              fill: collapsed ? "blue" : "green",
            } as any
          }
        >
          <Text
            style={{
              fill: "#fff",
              fontSize: 10,
              margin: [-6, -3, 0],
              cursor: "pointer",
            }}
            onClick={(evt, node: any, shape, graph) => {
              graph.updateItem(node, {
                collapsed: !collapsed,
              });
            }}
          >
            {collapsed ? "-" : "+"}
          </Text>
        </Circle>
      </Rect>
    </Group>
  );
};

export const register = () => {
  G6.registerNode("test", createNodeFromReact(Card));
};
