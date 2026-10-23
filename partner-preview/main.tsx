import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import AdminConsole from "../app/admin/AdminConsole";
import "../app/globals.css";

function Preview() {
  const [admin, setAdmin] = useState(window.location.hash.startsWith("#/admin"));
  useEffect(() => {
    const update = () => { setAdmin(window.location.hash.startsWith("#/admin")); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return <>{admin ? <AdminConsole /> : <Home />}<button
    style={{position:"fixed",bottom:12,right:12,zIndex:1000,background:"#151615",color:"white",border:"1px solid #f26522",padding:"9px 14px",fontSize:12,borderRadius:4,cursor:"pointer"}}
    onClick={() => window.location.reload()}>Lock preview</button></>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
