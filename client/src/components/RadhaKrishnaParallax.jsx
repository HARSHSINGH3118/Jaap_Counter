import { useEffect, useRef } from "react";

export default function RadhaKrishnaParallax({
  fg = "/art/radha-krishna.png",     // transparent PNG silhouette/illustration
  bg = "/art/vrindavan.png"          // soft mandala/vrindavan backdrop
}) {
  const ref = useRef(null);

  // Gentle mouse parallax (desktop only)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onMove(e) {
      const r = el.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--tx", `${cx * 10}px`);
      el.style.setProperty("--ty", `${cy * 8}px`);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="bg rk" ref={ref}>
      <div className="rk-bg" style={{ backgroundImage: `url(${bg})` }} />
      <div className="rk-fg" style={{ backgroundImage: `url(${fg})` }} />
      <div className="rk-notes">
        {Array.from({length:10}).map((_,i)=><span key={i} style={{"--d":`${i*1.2}s`}}>♫</span>)}
      </div>
    </div>
  );
}
