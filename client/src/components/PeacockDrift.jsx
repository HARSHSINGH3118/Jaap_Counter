export default function PeacockDrift({ count = 14, src = "/art/feather.png" }) {
  // Render N floating feathers with randomized params
  const items = Array.from({ length: count }).map((_, i) => {
    const x = Math.random() * 100;           // vw
    const size = 0.7 + Math.random() * 0.8;  // scale
    const rot = (Math.random() * 40 - 20);   // deg
    const delay = Math.random() * 8;         // s
    const dur = 14 + Math.random() * 12;     // s
    const sway = 10 + Math.random() * 30;    // px
    return (
      <div
        key={i}
        className="feather"
        style={{
          "--x": `${x}vw`,
          "--scale": size,
          "--rot": `${rot}deg`,
          "--delay": `${delay}s`,
          "--dur": `${dur}s`,
          "--sway": `${sway}px`,
          backgroundImage: `url(${src})`
        }}
      />
    );
  });

  return <div className="bg peacock">{items}</div>;
}
