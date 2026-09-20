// INVENTA.AI — Acciones de negocio (src/services/actions.js)
// Toda MUTACIÓN pasa por aquí: permisos → cambio de estado → auditoría → re-render.
// Las vistas solo leen; nunca mutan directamente.
import { PEN, SUPPLIERS, SKUS, FINANCING, PURCHASE_ORDERS, replenishment } from "../lib/engine.js";
import { ME, session, audit, save, persistCustomSku } from "../store/state.js";
import { $, $$, toast, openModal, closeModal } from "../components/ui/ui.js";
import { renderHome } from "../components/sections/views-home.js";
import { renderOCs, getOCM, setOCM, renderInv, fillInvFilters } from "../components/sections/views-ops.js";
import { buildAlerts } from "./automation.js";
import { can } from "../components/sections/views-system.js";

/* Permisos */
function needPerm(act) {
  if (can(act)) return true;
  toast("⛔ Tu rol (" + session.role + ") no permite esta acción. Pide a un Dueño.");
  audit("Intento denegado (" + session.role + "): " + act);
  return false;
}
function setRole(r) {
  session.role = r;
  $("#role-sel").value = r; const s2 = $("#role-sel2"); if (s2) s2.value = r;
  audit("Cambio de rol a " + r); save(); renderOCs();
  toast("Rol activo: " + ({ owner: "👑 Dueño", buyer: "🧾 Comprador", viewer: "👁️ Lector" }[r]));
}
function toggleMFA() {
  session.mfa = !session.mfa;
  $("#mfa-sw").classList.toggle("on", session.mfa);
  $("#mfa-st").textContent = session.mfa ? "Activado — se pedirá confirmación doble en OCs > S/ 10,000" : "Desactivado";
  audit("MFA " + (session.mfa ? "activado" : "desactivado")); save();
}

/* Compra rápida desde motor */
function quickOC(skuId) {
  if (!needPerm("create")) return;
  const s = SKUS.find(x => x.id === skuId); const r = replenishment(s, 30);
  if (!r.suggested) { toast("✓ " + s.name + " no necesita compra (cobertura sana)"); return; }
  const key = s.supplier, n = PURCHASE_ORDERS.length;
  const id = "OC-2026-" + (186 + n);
  PURCHASE_ORDERS.unshift({ id, supKey: key, supplier: SUPPLIERS[key].name, items: `${s.name} × ${r.suggested}`, total: Math.round(r.investment), status: "pending", eta: "Por definir", ai: `Sugerido por motor: ROP ${r.rop}u, cobertura ${r.daysCover.toFixed(1)}d.`, created: "2026-09-17", by: ME, hist: [{ t: "2026-09-17", e: "Creada desde Reabastecimiento por " + ME }] });
  audit("Crea " + id + " (" + s.name + " × " + r.suggested + ")"); save(); renderOCs(); renderHome(); buildAlerts();
  toast("✓ " + id + " creada como borrador pendiente"); window.go("orders");
}

/* CRUD de OCs */
function ocTouch(o, e) {
  o.hist = o.hist || []; const n = new Date();
  o.hist.push({ t: n.toLocaleDateString("es-PE") + " " + n.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }), e });
}
function ocApprove(i) {
  if (!needPerm("approve")) return;
  const o = PURCHASE_ORDERS[i];
  const { arm } = getOCM();
  if (session.mfa && o.total > 10000 && arm !== o.id) { setOCM({ arm: o.id }); renderOCs(); toast("🔐 MFA: confirma de nuevo para aprobar " + o.id); return; }
  setOCM({ arm: null }); o.status = "approved"; ocTouch(o, "Aprobada por " + ME + " (" + session.role + ")");
  audit("Aprueba " + o.id + " por " + PEN(o.total)); save(); renderOCs(); renderHome();
  toast("✓ " + o.id + " aprobada y enviada a " + o.supplier);
}
function ocReject(i) {
  if (!needPerm("approve")) return;
  const o = PURCHASE_ORDERS[i]; o.status = "rejected"; ocTouch(o, "Rechazada por " + ME);
  audit("Rechaza " + o.id); save(); renderOCs(); renderHome(); toast("✕ " + o.id + " rechazada");
}
function ocReceive(i) {
  if (!needPerm("approve")) return;
  const o = PURCHASE_ORDERS[i]; o.status = "received"; ocTouch(o, "Marcada como recibida por " + ME);
  audit("Recibe " + o.id); save(); renderOCs(); toast("📦 " + o.id + " recibida. Stock actualizado en próximo sync.");
}
function openOCModal(id) {
  if (!needPerm(id ? "edit" : "create")) return;
  setOCM({ edit: id || null });
  $("#ocm-title").textContent = id ? "Editar " + id : "Nueva orden de compra";
  $("#ocm-sup").innerHTML = Object.keys(SUPPLIERS).map(k => `<option value="${k}">${SUPPLIERS[k].name}</option>`).join("");
  const o = id ? PURCHASE_ORDERS.find(x => x.id === id) : null;
  if (o) $("#ocm-sup").value = o.supKey;
  $("#ocm-lines").innerHTML = "";
  if (o && o.lines) o.lines.forEach(l => ocAddLine(l.sku, l.qty));
  else ocAddLine();
  if (o) $("#ocm-eta").value = o.eta;
  ocCalcTotal(); openModal("oc-modal");
}
function ocAddLine(sku, qty) {
  const d = document.createElement("div"); d.className = "oc-line";
  d.innerHTML = `<select aria-label="SKU">${SKUS.map(s => `<option value="${s.id}" ${s.id === sku ? "selected" : ""}>${s.name} (${PEN(s.cost)})</option>`).join("")}</select><input type="number" min="1" value="${qty || 100}" aria-label="Cantidad" oninput="ocCalcTotal()"><span class="mono line-t" style="font-size:13px"></span><button class="btn btn-g btn-s" aria-label="Quitar línea" onclick="this.parentNode.remove();ocCalcTotal()">✕</button>`;
  d.querySelector("select").onchange = ocCalcTotal;
  $("#ocm-lines").appendChild(d); ocCalcTotal();
}
function ocCalcTotal() {
  let t = 0;
  $$("#ocm-lines .oc-line").forEach(l => { const s = SKUS.find(x => x.id === l.querySelector("select").value); const q = +(l.querySelector("input").value || 0); const st = Math.round(q * s.cost); t += st; l.querySelector(".line-t").textContent = PEN(st); });
  $("#ocm-total").value = PEN(t); return t;
}
function ocSave() {
  const lines = [...$$("#ocm-lines .oc-line")].map(l => { const s = SKUS.find(x => x.id === l.querySelector("select").value); return { sku: s.id, name: s.name, qty: +(l.querySelector("input").value || 0), cost: s.cost }; }).filter(l => l.qty > 0);
  if (!lines.length) { toast("⚠️ Agrega al menos una línea con cantidad"); return; }
  const key = $("#ocm-sup").value, total = Math.round(lines.reduce((a, l) => a + l.qty * l.cost, 0));
  const items = lines.map(l => `${l.name} × ${l.qty}`).join(" · ");
  const { edit } = getOCM();
  if (edit) { const o = PURCHASE_ORDERS.find(x => x.id === edit); Object.assign(o, { supKey: key, supplier: SUPPLIERS[key].name, items, lines, total, eta: $("#ocm-eta").value }); ocTouch(o, "Editada por " + ME); audit("Edita " + o.id); }
  else { const id = "OC-2026-" + (186 + PURCHASE_ORDERS.length); PURCHASE_ORDERS.unshift({ id, supKey: key, supplier: SUPPLIERS[key].name, items, lines, total, status: "pending", eta: $("#ocm-eta").value, ai: "Creada manualmente por " + ME + " con costos del maestro de productos.", created: "2026-09-17", by: ME, hist: [{ t: "2026-09-17", e: "Creada manualmente por " + ME }] }); audit("Crea " + id + " por " + PEN(total)); }
  save(); closeModal("oc-modal"); renderOCs(); renderHome(); toast("✓ OC guardada como pendiente");
}

/* Exportaciones reales */
function ocPDF(i) {
  const o = PURCHASE_ORDERS[i];
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>${o.id}</title><style>body{font-family:Arial;padding:40px;color:#111}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #999;padding:8px;text-align:left}.r{text-align:right}.muted{color:#555}</style></head><body>
    <h1>INVENTA.AI — Orden de Compra ${o.id}</h1><p class="muted">Lima · ${o.created || ""}</p>
    <p><b>Proveedor:</b> ${o.supplier}<br><b>Entrega esperada:</b> ${o.eta}<br><b>Estado:</b> ${o.status}</p>
    <table><tr><th>Detalle</th><th class="r">Total</th></tr><tr><td>${o.items}</td><td class="r"><b>${PEN(o.total)}</b></td></tr></table>
    <p class="muted">✦ ${o.ai}</p><p class="muted">Generado por INVENTA.AI · ${(o.hist || []).map(h => h.t + ": " + h.e).join(" → ")}</p>
    <script>onload=()=>print()<\/script></body></html>`);
  w.document.close(); audit("Exporta PDF de " + o.id); save();
}
function ocEmail(i) {
  const o = PURCHASE_ORDERS[i]; const sup = SUPPLIERS[o.supKey] || {};
  location.href = `mailto:${sup.email || ""}?subject=${encodeURIComponent("Orden de compra " + o.id)}&body=${encodeURIComponent("Estimados " + o.supplier + ":\n\nConfirmamos la orden " + o.id + " por " + PEN(o.total) + ":\n" + o.items + "\n\nEntrega esperada: " + o.eta + "\n\nSaludos,\n" + ME)}`;
  audit("Envía email de " + o.id); save();
}
function ocWA(i) {
  const o = PURCHASE_ORDERS[i];
  open("https://api.whatsapp.com/send?text=" + encodeURIComponent("🧾 *" + o.id + "* — " + o.supplier + " · " + PEN(o.total) + "\n" + o.items + "\nEntrega: " + o.eta), "_blank");
  audit("Comparte por WhatsApp " + o.id); save();
}
function exportInvCSV(rows) {
  const csv = [["SKU", "Producto", "Categoria", "Actual", "Minimo", "Estado", "Proveedor", "Ultimo_Reabastecimiento"], ...rows];
  const blob = new Blob([csv.map(r => r.join(";")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "inventario_productos.csv"; a.click();
  audit("Exporta inventario a CSV (" + rows.length + " filas)"); save(); toast("⬇ CSV descargado");
}

/* Proveedores + productos */
function supSaveEmail(k) {
  SUPPLIERS[k].email = document.getElementById("em-" + k).value;
  audit("Actualiza contacto de " + SUPPLIERS[k].name); save(); toast("✓ Contacto actualizado");
}
function openSkuModal() {
  if (!needPerm("create")) return;
  $("#sku-cat").innerHTML = [...new Set(SKUS.map(s => s.cat))].map(c => `<option>${c}</option>`).join("");
  $("#sku-sup").innerHTML = Object.keys(SUPPLIERS).map(k => `<option value="${k}">${SUPPLIERS[k].name}</option>`).join("");
  openModal("sku-modal");
}
function skuSave() {
  const name = $("#sku-name").value.trim();
  const cost = +$("#sku-cost").value || 0, price = +$("#sku-price").value || 0;
  const stock = +$("#sku-stock").value || 0, min = +$("#sku-min").value || 0, daily = +$("#sku-daily").value || 1;
  if (!name || cost <= 0 || price <= 0) { toast("⚠️ Completa nombre, costo y precio válidos"); return; }
  const n = SKUS.length + 1;
  const sku = { id: "SKU-" + String(100 + n).padStart(3, "0"), name, cat: $("#sku-cat").value, supplier: $("#sku-sup").value, price, cost, stock, min, max: Math.max(min * 3, stock), lead: SUPPLIERS[$("#sku-sup").value].leadTime, daily, cv: 0.3, margin: Math.round((1 - cost / price) * 100), abc: "B", xyz: "Y", dead: false };
  SKUS.push(sku); persistCustomSku(sku);
  audit("Crea producto " + sku.id + " (" + name + ")"); save(); closeModal("sku-modal"); fillInvFilters(); renderInv(); buildAlerts();
  toast("✓ " + name + " creado y ya alimenta el forecast");
}

/* Financiamiento */
function finRequest(fid, need) {
  const f = FINANCING.find(x => x.id === fid);
  audit("Solicita " + PEN(Math.min(f.amount, need)) + " a " + f.entity); save();
  toast("✓ Solicitud a " + f.entity + " pre-aprobada con tu historial de ventas");
}

export { needPerm, setRole, toggleMFA, quickOC, ocApprove, ocReject, ocReceive, openOCModal, ocAddLine, ocCalcTotal, ocSave, ocPDF, ocEmail, ocWA, exportInvCSV, supSaveEmail, openSkuModal, skuSave, finRequest };
