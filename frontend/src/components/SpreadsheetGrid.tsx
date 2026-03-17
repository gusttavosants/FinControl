"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Trash, Download, Type, Hash, DollarSign, Calendar,
  CheckSquare, Percent, List, AlignLeft, AlignCenter, AlignRight,
  GripVertical, ChevronDown, MoreHorizontal, Edit2, X,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */
export type ColType = "text" | "number" | "currency" | "date" | "checkbox" | "percent" | "select";
export interface ColDef {
  id: string; name: string; type: ColType;
  width: number; align?: "left" | "center" | "right";
  options?: string[];
}
export interface SheetRow { _id: string; [colId: string]: string; }
export interface SheetData { id: string; name: string; columns: ColDef[]; rows: SheetRow[]; }

const COL_TYPES: { type: ColType; label: string; icon: any }[] = [
  { type: "text",     label: "Texto",     icon: Type },
  { type: "number",   label: "Número",    icon: Hash },
  { type: "currency", label: "Moeda",     icon: DollarSign },
  { type: "date",     label: "Data",      icon: Calendar },
  { type: "checkbox", label: "Checkbox",  icon: CheckSquare },
  { type: "percent",  label: "Percentual",icon: Percent },
  { type: "select",   label: "Seleção",   icon: List },
];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const brl = (v: string) => { const n = parseFloat(v)||0; return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); };
const pct = (v: string) => { const n = parseFloat(v)||0; return `${n.toFixed(1)}%`; };
const dmy = (v: string) => { if(!v) return ""; try { return new Date(v+"T12:00:00").toLocaleDateString("pt-BR"); } catch { return v; } };

function renderCell(col: ColDef, val: string) {
  if (col.type === "checkbox") return (
    <span style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{width:16,height:16,borderRadius:4,border:"2px solid",display:"inline-flex",alignItems:"center",justifyContent:"center",
        borderColor:val==="true"?"#10b981":"var(--border-default)",
        background:val==="true"?"#10b981":"transparent",color:"#fff",fontSize:11,fontWeight:700}}>
        {val==="true"?"✓":""}
      </span>
    </span>
  );
  if (col.type === "currency") return <span style={{color:"#10b981",fontWeight:600}}>{brl(val)}</span>;
  if (col.type === "percent")  return <span style={{color:"#818cf8"}}>{pct(val)}</span>;
  if (col.type === "date")     return <span style={{color:"var(--text-secondary)"}}>{dmy(val)}</span>;
  if (col.type === "number")   return <span style={{fontVariantNumeric:"tabular-nums"}}>{val}</span>;
  return <span>{val}</span>;
}

/* ─── Column Header Menu ─────────────────────────────────────────────── */
function ColMenu({ col, onRename, onTypeChange, onDelete, onAlignChange, onAddOption }:
  { col: ColDef; onRename:(n:string)=>void; onTypeChange:(t:ColType)=>void;
    onDelete:()=>void; onAlignChange:(a:"left"|"center"|"right")=>void; onAddOption:()=>void }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(col.name);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{position:"relative",display:"inline-flex"}}>
      <button onClick={()=>setOpen(!open)} style={{
        width:20,height:20,borderRadius:4,border:"none",background:"transparent",cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)",opacity:.6,
        marginLeft:4,flexShrink:0,
      }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".6"}>
        <ChevronDown size={12}/>
      </button>
      {open && (
        <div style={{
          position:"absolute",top:"100%",left:0,zIndex:999,minWidth:200,
          background:"var(--bg-card)",border:"1px solid var(--border-subtle)",borderRadius:10,
          boxShadow:"0 8px 32px rgba(0,0,0,.18)",padding:"6px 0",
        }}>
          {/* Rename */}
          {renaming ? (
            <div style={{padding:"6px 12px",display:"flex",gap:6}}>
              <input autoFocus value={name} onChange={e=>setName(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"){onRename(name);setRenaming(false);setOpen(false);}
                  if(e.key==="Escape")setRenaming(false); }}
                style={{flex:1,padding:"4px 8px",fontSize:12,background:"var(--bg-elevated)",
                  border:"1px solid var(--border-subtle)",borderRadius:6,color:"var(--text-primary)",outline:"none"}}/>
              <button onClick={()=>{onRename(name);setRenaming(false);setOpen(false);}}
                style={{padding:"4px 8px",background:"var(--brand)",color:"var(--brand-text)",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>OK</button>
            </div>
          ) : (
            <button onClick={()=>setRenaming(true)} style={menuItem()}>
              <Edit2 size={13}/> Renomear
            </button>
          )}
          <div style={{height:1,background:"var(--border-subtle)",margin:"4px 0"}}/>
          {/* Type */}
          <div style={{padding:"4px 12px 2px",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:.5}}>Tipo de coluna</div>
          {COL_TYPES.map(ct=>(
            <button key={ct.type} onClick={()=>{onTypeChange(ct.type);setOpen(false);}} style={{
              ...menuItem(), color: col.type===ct.type ? "#10b981":"var(--text-primary)",
              background: col.type===ct.type ? "rgba(16,185,129,.08)":"transparent",
            }}>
              <ct.icon size={13}/> {ct.label} {col.type===ct.type && "✓"}
            </button>
          ))}
          {col.type==="select" && (
            <button onClick={()=>{onAddOption();setOpen(false);}} style={menuItem()}>
              <Plus size={13}/> Adicionar opção
            </button>
          )}
          <div style={{height:1,background:"var(--border-subtle)",margin:"4px 0"}}/>
          {/* Align */}
          <div style={{padding:"4px 12px 2px",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:.5}}>Alinhamento</div>
          <div style={{display:"flex",gap:4,padding:"4px 12px"}}>
            {(["left","center","right"] as const).map(a=>{ const Icon = a==="left"?AlignLeft:a==="center"?AlignCenter:AlignRight; return (
              <button key={a} onClick={()=>{onAlignChange(a);setOpen(false);}} style={{
                padding:"4px 8px",borderRadius:6,border:"1px solid var(--border-subtle)",cursor:"pointer",
                background:col.align===a?"var(--brand)":"var(--bg-elevated)",
                color:col.align===a?"var(--brand-text)":"var(--text-muted)",
              }}><Icon size={13}/></button>
            );})}
          </div>
          <div style={{height:1,background:"var(--border-subtle)",margin:"4px 0"}}/>
          <button onClick={()=>{onDelete();setOpen(false);}} style={{...menuItem(),color:"#ef4444"}}>
            <Trash size={13}/> Excluir coluna
          </button>
        </div>
      )}
    </div>
  );
}

function menuItem(): React.CSSProperties {
  return {
    width:"100%",display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
    background:"transparent",border:"none",cursor:"pointer",fontSize:13,
    color:"var(--text-primary)",textAlign:"left" as const,transition:"background .1s",
  };
}

/* ─── Cell Editor ────────────────────────────────────────────────────── */
function CellEditor({ col, value, onChange }: { col: ColDef; value: string; onChange:(v:string)=>void }) {
  const base: React.CSSProperties = {
    width:"100%",minHeight:40,padding:"4px 10px",background:"transparent",
    border:"none",outline:"none",fontSize:13,color:"var(--text-primary)",
    textAlign: col.align || (col.type==="number"||col.type==="currency"||col.type==="percent" ? "right" : "left"),
  };

  if (col.type==="checkbox") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:40,cursor:"pointer"}}
      onClick={()=>onChange(value==="true"?"false":"true")}>
      <span style={{width:18,height:18,borderRadius:4,border:"2px solid",display:"inline-flex",alignItems:"center",justifyContent:"center",
        borderColor:value==="true"?"#10b981":"var(--border-default)",background:value==="true"?"#10b981":"transparent",color:"#fff",fontSize:12,fontWeight:700}}>
        {value==="true"?"✓":""}
      </span>
    </div>
  );
  if (col.type==="date") return <input type="date" value={value} onChange={e=>onChange(e.target.value)} style={{...base,cursor:"pointer"}}/>;
  if (col.type==="select") return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{...base,appearance:"none",cursor:"pointer"}}>
      <option value="">Selecione…</option>
      {(col.options||[]).map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (col.type==="number"||col.type==="currency"||col.type==="percent") return (
    <input type="number" step={col.type==="currency"?".01":col.type==="percent"?".1":"1"} value={value}
      onChange={e=>onChange(e.target.value)} style={{...base,textAlign:"right"}}/>
  );
  return <input type="text" value={value} onChange={e=>onChange(e.target.value)} style={base}/>;
}

/* ─── Main SpreadsheetGrid ───────────────────────────────────────────── */
export default function SpreadsheetGrid({ sheet, onChange: onSheetChange, sheetName }:
  { sheet: SheetData; onChange:(s:SheetData)=>void; sheetName: string }) {

  const [editingCell, setEditingCell] = useState<{row:string;col:string}|null>(null);
  const [addColOpen, setAddColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<ColType>("text");
  const [addOptFor, setAddOptFor] = useState<string|null>(null);
  const [newOpt, setNewOpt] = useState("");
  const resizeRef = useRef<{colId:string;startX:number;startW:number}|null>(null);

  /* ── mutations ── */
  const upd = (s: Partial<SheetData>) => onSheetChange({...sheet,...s});

  const updateCol = (colId: string, patch: Partial<ColDef>) =>
    upd({columns: sheet.columns.map(c=>c.id===colId?{...c,...patch}:c)});

  const removeCol = (colId: string) =>
    upd({columns:sheet.columns.filter(c=>c.id!==colId),
         rows:sheet.rows.map(r=>{const n={...r};delete n[colId];return n;})});

  const setCell = (rowId: string, colId: string, val: string) =>
    upd({rows:sheet.rows.map(r=>r._id===rowId?{...r,[colId]:val}:r)});

  const addRow = () => upd({rows:[...sheet.rows,{_id:uid()}]});

  const removeRow = (rowId: string) => upd({rows:sheet.rows.filter(r=>r._id!==rowId)});

  const addColumn = () => {
    if(!newColName.trim()) return;
    const col: ColDef = {id:uid(),name:newColName.trim(),type:newColType,width:160,align:"left"};
    upd({columns:[...sheet.columns,col]});
    setNewColName(""); setNewColType("text"); setAddColOpen(false);
  };

  /* ── column resize ── */
  const startResize = (e: React.MouseEvent, colId: string, w: number) => {
    e.preventDefault();
    resizeRef.current = {colId,startX:e.clientX,startW:w};
    const onMove = (ev: MouseEvent) => {
      if(!resizeRef.current) return;
      const diff = ev.clientX - resizeRef.current.startX;
      const newW = Math.max(80, resizeRef.current.startW + diff);
      updateCol(resizeRef.current.colId, {width:newW});
    };
    const onUp = () => { resizeRef.current=null; window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  /* ── export ── */
  const exportExcel = () => {
    const headers = sheet.columns.map(c=>c.name);
    const data = sheet.rows.map(r=>sheet.columns.map(c=>{
      const v = r[c.id]||"";
      if(c.type==="checkbox") return v==="true"?"Sim":"Não";
      if(c.type==="currency") return parseFloat(v)||0;
      if(c.type==="number")   return parseFloat(v)||0;
      if(c.type==="percent")  return (parseFloat(v)||0)/100;
      return v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([headers,...data]);
    // Format currency and percent columns
    sheet.columns.forEach((c,i)=>{
      if(c.type==="currency"||c.type==="number"||c.type==="percent"){
        const fmt = c.type==="currency"?"R$#,##0.00":c.type==="percent"?"0.0%":"#,##0.##";
        for(let r=1;r<=sheet.rows.length;r++){
          const cell=ws[XLSX.utils.encode_cell({r,c:i})];
          if(cell){
            cell.t="n";
            const colType = c.type as string;
            if(colType !== "text") Object.assign(cell,{z:fmt});
          }
        }
      }
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sheetName.slice(0,31));
    XLSX.writeFile(wb,`${sheetName}.xlsx`);
  };

  const exportCSV = () => {
    const rows = [sheet.columns.map(c=>c.name),...sheet.rows.map(r=>sheet.columns.map(c=>r[c.id]||""))];
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(";")).join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
    a.download=`${sheetName}.csv`; a.click();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",flexShrink:0,
        borderBottom:"1px solid var(--border-subtle)",background:"var(--bg-surface)"}}>
        <span style={{fontSize:13,fontWeight:600,color:"var(--text-muted)",flex:1}}>
          {sheet.rows.length} linhas · {sheet.columns.length} colunas
        </span>
        <button onClick={()=>setAddColOpen(true)} style={tbBtn("secondary")}>
          <Plus size={14}/> Coluna
        </button>
        <button onClick={addRow} style={tbBtn("secondary")}>
          <Plus size={14}/> Linha
        </button>
        <div style={{width:1,height:20,background:"var(--border-subtle)"}}/>
        <button onClick={exportCSV} style={tbBtn("ghost")}>
          <Download size={14}/> CSV
        </button>
        <button onClick={exportExcel} style={tbBtn("primary")}>
          <Download size={14}/> Excel
        </button>
      </div>

      {/* table */}
      <div style={{flex:1,overflowX:"auto",overflowY:"auto"}}>
        {sheet.columns.length===0 ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:12,color:"var(--text-muted)"}}>
            <p style={{fontSize:14}}>Nenhuma coluna ainda.</p>
            <button onClick={()=>setAddColOpen(true)} style={tbBtn("primary")}><Plus size={14}/> Adicionar primeira coluna</button>
          </div>
        ) : (
        <table style={{borderCollapse:"collapse",minWidth:"max-content",width:"100%"}}>
          <thead>
            <tr style={{background:"var(--bg-elevated)"}}>
              {/* row number col */}
              <th style={{width:42,padding:"10px 8px",borderBottom:"1px solid var(--border-subtle)",borderRight:"1px solid var(--border-subtle)",position:"sticky",top:0,zIndex:10,background:"var(--bg-elevated)"}}/>
              {sheet.columns.map(col=>(
                <th key={col.id} style={{padding:0,position:"sticky",top:0,zIndex:10,
                  background:"var(--bg-elevated)",borderBottom:"1px solid var(--border-subtle)",
                  borderRight:"1px solid var(--border-subtle)",width:col.width,minWidth:col.width,maxWidth:col.width}}>
                  <div style={{display:"flex",alignItems:"center",padding:"8px 10px",position:"relative",userSelect:"none"}}>
                    {/* type icon */}
                    {(() => { const ct=COL_TYPES.find(t=>t.type===col.type); return ct?<ct.icon size={12} style={{color:"var(--text-muted)",flexShrink:0,marginRight:4}}/>:null; })()}
                    <span style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",letterSpacing:.5,
                      textTransform:"uppercase",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {col.name}
                    </span>
                    <ColMenu col={col}
                      onRename={n=>updateCol(col.id,{name:n})}
                      onTypeChange={t=>updateCol(col.id,{type:t})}
                      onDelete={()=>removeCol(col.id)}
                      onAlignChange={a=>updateCol(col.id,{align:a})}
                      onAddOption={()=>{setAddOptFor(col.id);}}
                    />
                    {/* resize handle */}
                    <div onMouseDown={e=>startResize(e,col.id,col.width)} style={{
                      position:"absolute",right:0,top:0,bottom:0,width:5,cursor:"col-resize",
                      background:"transparent",zIndex:1,
                    }} onMouseEnter={e=>e.currentTarget.style.background="rgba(99,102,241,.4)"}
                       onMouseLeave={e=>e.currentTarget.style.background="transparent"}/>
                  </div>
                </th>
              ))}
              {/* add col */}
              <th style={{width:48,padding:0,position:"sticky",top:0,zIndex:10,
                background:"var(--bg-elevated)",borderBottom:"1px solid var(--border-subtle)"}}>
                <button onClick={()=>setAddColOpen(true)} style={{
                  width:"100%",height:"100%",minHeight:40,border:"none",background:"transparent",
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                  color:"var(--text-muted)",transition:"all .15s",
                }} onMouseEnter={e=>{e.currentTarget.style.background="var(--brand-muted)";e.currentTarget.style.color="var(--text-primary)";}}
                   onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text-muted)";}}>
                  <Plus size={16}/>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length===0 && (
              <tr><td colSpan={sheet.columns.length+2} style={{textAlign:"center",padding:"48px 0",color:"var(--text-muted)",fontSize:13}}>
                Nenhuma linha. <button onClick={addRow} style={{color:"#10b981",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Adicionar agora</button>
              </td></tr>
            )}
            {sheet.rows.map((row,ri)=>(
              <tr key={row._id} className="spreadsheet-row" style={{transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--bg-elevated)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                {/* row # */}
                <td style={{textAlign:"center",fontSize:11,color:"var(--text-muted)",fontWeight:600,
                  background:"var(--bg-elevated)",borderRight:"1px solid var(--border-subtle)",
                  borderBottom:"1px solid var(--border-subtle)",padding:"0 4px",
                  position:"relative",width:42}}>
                  <span className="row-num">{ri+1}</span>
                  <button className="row-del" onClick={()=>removeRow(row._id)} style={{
                    position:"absolute",inset:0,width:"100%",height:"100%",border:"none",background:"transparent",
                    cursor:"pointer",display:"none",alignItems:"center",justifyContent:"center",color:"#ef4444",
                  }}><Trash size={11}/></button>
                </td>
                {sheet.columns.map(col=>{
                  const isEditing = editingCell?.row===row._id && editingCell?.col===col.id;
                  const val = row[col.id]||"";
                  return (
                    <td key={col.id} onClick={()=>setEditingCell({row:row._id,col:col.id})}
                      style={{borderBottom:"1px solid var(--border-subtle)",borderRight:"1px solid var(--border-subtle)",
                        padding:0,cursor:"cell",width:col.width,minWidth:col.width,maxWidth:col.width,overflow:"hidden",
                        boxShadow:isEditing?"inset 0 0 0 2px #6366f1":"none",
                        textAlign:col.align||"left",}}>
                      {isEditing ? (
                        <CellEditor col={col} value={val}
                          onChange={v=>setCell(row._id,col.id,v)}/>
                      ) : (
                        <div style={{padding:"6px 10px",minHeight:40,fontSize:13,color:"var(--text-primary)",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                          textAlign:col.align||"left"}}>
                          {renderCell(col,val)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td style={{borderBottom:"1px solid var(--border-subtle)",background:"transparent"}}/>
              </tr>
            ))}
            {/* add row */}
            <tr>
              <td colSpan={sheet.columns.length+2} style={{padding:0,borderTop:"1px solid var(--border-subtle)"}}>
                <button onClick={addRow} style={{
                  width:"100%",padding:"10px 20px",background:"transparent",border:"none",
                  cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6,
                  fontSize:13,color:"#818cf8",fontWeight:500,transition:"background .15s",
                }} onMouseEnter={e=>e.currentTarget.style.background="var(--bg-elevated)"}
                   onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Plus size={14}/> Nova linha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        )}
      </div>

      {/* row hover styles */}
      <style>{`.spreadsheet-row:hover .row-num{display:none}.spreadsheet-row:hover .row-del{display:flex!important}`}</style>

      {/* ── Add Column Dialog ── */}
      {addColOpen && (
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(4px)"}} onClick={()=>setAddColOpen(false)}/>
          <div style={{position:"relative",background:"var(--bg-card)",border:"1px solid var(--border-subtle)",
            borderRadius:14,padding:24,width:360,boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h3 style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",margin:0}}>Nova coluna</h3>
              <button onClick={()=>setAddColOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Nome</label>
              <input autoFocus value={newColName} onChange={e=>setNewColName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addColumn()}
                placeholder="Ex: Observações"
                style={{width:"100%",padding:"8px 12px",fontSize:13,background:"var(--bg-elevated)",
                  border:"1px solid var(--border-subtle)",borderRadius:8,color:"var(--text-primary)",
                  outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Tipo de dado</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {COL_TYPES.map(ct=>(
                  <button key={ct.type} onClick={()=>setNewColType(ct.type)} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
                    borderRadius:8,border:`1.5px solid ${newColType===ct.type?"#6366f1":"var(--border-subtle)"}`,
                    background:newColType===ct.type?"rgba(99,102,241,.1)":"var(--bg-elevated)",
                    cursor:"pointer",fontSize:13,fontWeight:500,
                    color:newColType===ct.type?"#818cf8":"var(--text-secondary)",transition:"all .15s",
                  }}>
                    <ct.icon size={14} style={{color:newColType===ct.type?"#818cf8":"var(--text-muted)"}}/> {ct.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setAddColOpen(false)} style={{...tbBtn("secondary"),flex:1,justifyContent:"center"}}>Cancelar</button>
              <button onClick={addColumn} disabled={!newColName.trim()} style={{...tbBtn("primary"),flex:1,justifyContent:"center",opacity:newColName.trim()?1:.5}}>Criar coluna</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Option Dialog ── */}
      {addOptFor && (
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(4px)"}} onClick={()=>setAddOptFor(null)}/>
          <div style={{position:"relative",background:"var(--bg-card)",border:"1px solid var(--border-subtle)",
            borderRadius:14,padding:24,width:320,boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <h3 style={{fontSize:15,fontWeight:700,color:"var(--text-primary)",marginBottom:16}}>Opções da coluna</h3>
            {(sheet.columns.find(c=>c.id===addOptFor)?.options||[]).map((o,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{flex:1,fontSize:13,color:"var(--text-primary)",padding:"4px 8px",
                  background:"var(--bg-elevated)",borderRadius:6,border:"1px solid var(--border-subtle)"}}>{o}</span>
                <button onClick={()=>updateCol(addOptFor,{options:sheet.columns.find(c=>c.id===addOptFor)?.options?.filter((_,j)=>j!==i)})}
                  style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444"}}><Trash size={12}/></button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <input value={newOpt} onChange={e=>setNewOpt(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&newOpt.trim()){updateCol(addOptFor,{options:[...(sheet.columns.find(c=>c.id===addOptFor)?.options||[]),newOpt.trim()]});setNewOpt("");}}}
                placeholder="Nova opção…" style={{flex:1,padding:"6px 10px",fontSize:13,
                  background:"var(--bg-elevated)",border:"1px solid var(--border-subtle)",
                  borderRadius:7,color:"var(--text-primary)",outline:"none"}}/>
              <button onClick={()=>{if(!newOpt.trim())return;updateCol(addOptFor,{options:[...(sheet.columns.find(c=>c.id===addOptFor)?.options||[]),newOpt.trim()]});setNewOpt("");}}
                style={tbBtn("primary")}><Plus size={14}/></button>
            </div>
            <button onClick={()=>setAddOptFor(null)} style={{...tbBtn("secondary"),width:"100%",justifyContent:"center",marginTop:12}}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function tbBtn(v: "primary"|"secondary"|"ghost"): React.CSSProperties {
  const b: React.CSSProperties = {display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,transition:"all .15s",whiteSpace:"nowrap"};
  if(v==="primary") return {...b,background:"var(--brand)",color:"var(--brand-text)"};
  if(v==="secondary") return {...b,background:"var(--bg-card)",color:"var(--text-primary)",border:"1px solid var(--border-subtle)"};
  return {...b,background:"transparent",color:"var(--text-muted)",border:"1px solid var(--border-subtle)"};
}
