/**
 * DIRECTION CONTRACT
 * THESIS: an institutional situation room for bibliometric self-analysis, refusing the
 *   generic-admin-template look by treating charts as the product, not decoration.
 * OWN-WORLD: Navy Deep (#071B4D) sidebar + white 22px-radius cards on a #F5F5F6 canvas;
 *   Institutional Blue (#093AD8) is the only brand hue outside charts; every chart is
 *   hand-authored SVG (rounded gradient bars/bubbles/nodes) per graficas.html, recolored
 *   to the UTB palette (gama.png); Inter throughout, no serif, no display font.
 * STORY: Vicerrectoría staff opens Overview, reads institutional trajectory in one
 *   viewport, drills into Ranking/Coautoría/Publicaciones for investigative traceability.
 * FIRST VIEWPORT: sidebar nav (Overview active) + page title + 4 stat tiles + a 2-column
 *   row (growth bar chart, document-type breakdown) — no hero, no marketing copy.
 * FORM: brand-pinned system (Incomplete-brand extension, not an open new-work roll) —
 *   graficas.html is the binding chart guide, mejor-nodos.png inspires the network page,
 *   gama.png is the binding palette. Recorded in DESIGN.md at project root.
 */
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { Ranking } from "./pages/Ranking";
import { Coauthorship } from "./pages/Coauthorship";
import { Publications } from "./pages/Publications";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/coautoria" element={<Coauthorship />} />
        <Route path="/publicaciones" element={<Publications />} />
      </Routes>
    </Layout>
  );
}

export default App;
