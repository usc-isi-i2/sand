
export default function LabelComponent({
  id,
  label,
  description,
  
}: {
  id: string;
  label: string;
  description: string;
}) {
    return (
        <div>
        <p style={{ color: "blue" }}>
          {label} ({id})
        </p>
        <p style={{ fontSize: 12, marginTop: -5 }}>
          {description}
        </p>
      </div>
    );
  }