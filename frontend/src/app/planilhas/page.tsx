"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Plus, Check, Trash, AlertCircle, X, Copy, Search, Download,
  ArrowUp, ArrowDown, ArrowUpDown, TrendingUp, TrendingDown,
  Wallet, CheckCircle2, RefreshCw, LayoutTemplate, Columns, FileSpreadsheet,
} from "lucide-react";
import { receitasAPI, despesasAPI, categoriasAPI } from "@/lib/api";
import { getCurrentMonth, getCurrentYear, maskCurrency, parseCurrencyToNumber } from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";
import SpreadsheetGrid, { SheetData, ColDef, ColType } from "@/components/SpreadsheetGrid";

/* ─── Types ───────────────────────────────────────────────────────── */
interface RowData {
  _id: string; originalId: number | null; tipo: "receita"|"despesa";
  descricao: string; categoria: string; valor: number; data: string;
  pago: boolean | null; isNew: boolean; isSaving?: boolean; error?: string;
  parcela_atual?: number|null; parcela_total?: number|null;
}
type SortField = "data"|"descricao"|"categoria"|"valor"|"tipo";
type SortDir = "asc"|"desc";
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/* ─── Helpers ─────────────────────────────────────────────────────── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const ymd = (s: string) => { if(!s) return ""; if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; try { return new Date(s).toISOString().split("T")[0]; } catch { return s; } };
const brl = (v: number) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const dmy = (s: string) => { if(!s) return "—"; try { return new Date(s+"T12:00:00").toLocaleDateString("pt-BR"); } catch { return s; } };
const addM = (s: string) => {
  try {
    const [y, m, d] = s.split("-").map(Number);
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    // Clamp day to the last valid day of the target month
    const lastDay = new Date(nextY, nextM, 0).getDate();
    const clampedD = Math.min(d, lastDay);
    return `${nextY}-${String(nextM).padStart(2, "0")}-${String(clampedD).padStart(2, "0")}`;
  } catch { return s; }
};

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function PlanilhasPage() {
  const [tab, setTab] = useState("principal");
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [rows, setRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [catsR, setCatsR] = useState<string[]>([]);
  const [catsD, setCatsD] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [filterTipo, setFilterTipo] = useState<"all"|"receita"|"despesa">("all");
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [saving, setSaving] = useState(false);
  const [mNewPage, setMNewPage] = useState(false); const [newPageName, setNewPageName] = useState("");
  const [mDel, setMDel] = useState(false); const [delRow, setDelRow] = useState<RowData|null>(null);
  const [mCopy, setMCopy] = useState(false);
  const [copyTarget, setCopyTarget] = useState<{m:number;y:number;label:string}|null>(null);
  const [copyParcels, setCopyParcels] = useState(true);

  /* ── persist sheets ── */
  useEffect(() => { const s=localStorage.getItem("fc_sheets_v2"); if(s) try{setSheets(JSON.parse(s));}catch{} }, []);
  const persist = (sh: SheetData[]) => { setSheets(sh); localStorage.setItem("fc_sheets_v2",JSON.stringify(sh)); };
  const updateSheet = (s: SheetData) => persist(sheets.map(x=>x.id===s.id?s:x));

  /* ── load ── */
  const load = useCallback(async () => {
    if(tab!=="principal") return;
    setLoading(true);
    try {
      const [r,d,cr,cd] = await Promise.all([receitasAPI.listar(mes,ano),despesasAPI.listar(mes,ano),categoriasAPI.receita(),categoriasAPI.despesa()]);
      setCatsR(cr); setCatsD(cd);
      setRows([...r.map((x:any)=>({_id:`r-${x.id}`,originalId:x.id,tipo:"receita" as const,descricao:x.descricao,categoria:x.categoria,valor:x.valor,data:ymd(x.data),pago:null,isNew:false,parcela_atual:null,parcela_total:null})),
               ...d.map((x:any)=>({_id:`d-${x.id}`,originalId:x.id,tipo:"despesa" as const,descricao:x.descricao,categoria:x.categoria,valor:x.valor,data:ymd(x.data_vencimento),pago:x.pago||false,isNew:false,parcela_atual:x.parcela_atual||null,parcela_total:x.parcela_total||null}))].sort((a,b)=>a.data.localeCompare(b.data)));
    } catch{}
    setLoading(false);
  }, [mes,ano,tab]);
  useEffect(()=>{load();},[load]);

  /* ── sort/filter ── */
  const toggleSort = (f:SortField)=>{ if(sortField===f) setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortField(f);setSortDir("asc");} };
  const visible = useMemo(()=>{
    let r=[...rows];
    if(q){const lq=q.toLowerCase();r=r.filter(x=>x.descricao.toLowerCase().includes(lq)||x.categoria.toLowerCase().includes(lq));}
    if(filterTipo!=="all") r=r.filter(x=>x.tipo===filterTipo);
    r.sort((a,b)=>{let va:any=a[sortField],vb:any=b[sortField];if(sortField==="valor"){va=+va;vb=+vb;}else{va=String(va||"");vb=String(vb||"");}return sortDir==="asc"?(va>vb?1:-1):(va<vb?1:-1);});
    return r;
  },[rows,q,filterTipo,sortField,sortDir]);
  const tots = useMemo(()=>{const rec=visible.filter(r=>r.tipo==="receita").reduce((s,r)=>s+(+r.valor||0),0);const dep=visible.filter(r=>r.tipo==="despesa").reduce((s,r)=>s+(+r.valor||0),0);const pag=visible.filter(r=>r.tipo==="despesa"&&r.pago).reduce((s,r)=>s+(+r.valor||0),0);return{rec,dep,saldo:rec-dep,pag};},[visible]);

  /* ── row ops ── */
  const upd=(id:string,p:Partial<RowData>)=>setRows(prev=>prev.map(r=>r._id===id?{...r,...p,error:undefined}:r));
  const onChange=(id:string,f:keyof RowData,v:any)=>setRows(prev=>prev.map(r=>{if(r._id!==id)return r;let nr={...r,[f]:v};if(f==="tipo"){nr.categoria=v==="receita"?catsR[0]||"":catsD[0]||"";nr.pago=v==="receita"?null:false;}return nr;}));
  const saveRow=async(row:RowData)=>{if(!row.descricao||!row.data||!row.categoria)return;upd(row._id,{isSaving:true});try{const p={descricao:row.descricao,categoria:row.categoria,valor:+(row.valor)||0,data:row.data,parcela_atual:row.parcela_atual||1,parcela_total:row.parcela_total||1};if(row.isNew){if(row.tipo==="receita"){const res=await receitasAPI.criar(p);upd(row._id,{originalId:res.id,_id:`r-${res.id}`,isNew:false,isSaving:false});}else{const res=await despesasAPI.criar({...p,data_vencimento:row.data,pago:false});const id=Array.isArray(res)?res[0].id:res.id;upd(row._id,{originalId:id,_id:`d-${id}`,isNew:false,isSaving:false});}}else{if(!row.originalId)throw new Error();if(row.tipo==="receita")await receitasAPI.atualizar(row.originalId,p);else await despesasAPI.atualizar(row.originalId,{...p,data_vencimento:row.data});upd(row._id,{isSaving:false});}}catch(e:any){upd(row._id,{isSaving:false,error:e.message||"Erro"});}};
  const togglePago=async(row:RowData)=>{if(row.tipo!=="despesa"||row.isNew||!row.originalId)return;upd(row._id,{isSaving:true});try{await despesasAPI.togglePago(row.originalId);upd(row._id,{pago:!row.pago,isSaving:false});}catch{upd(row._id,{isSaving:false});}};
  const addRow=()=>setRows(p=>[...p,{_id:uid(),originalId:null,tipo:"despesa",descricao:"",categoria:catsD[0]||"",valor:0,data:new Date().toISOString().split("T")[0],pago:false,isNew:true,parcela_atual:1,parcela_total:1}]);
  const removeRow=async(row:RowData)=>{if(row.isNew){setRows(p=>p.filter(r=>r._id!==row._id));return;}upd(row._id,{isSaving:true});try{if(row.tipo==="receita")await receitasAPI.deletar(row.originalId!);else await despesasAPI.deletar(row.originalId!);setRows(p=>p.filter(r=>r._id!==row._id));}catch(e:any){upd(row._id,{isSaving:false,error:"Erro"});}};

  /* ── copy month ── */
  const openCopy=()=>{const m=mes===12?1:mes+1,y=mes===12?ano+1:ano;setCopyTarget({m,y,label:`${MONTHS[m-1]} ${y}`});setMCopy(true);};
  const doCopy = async () => {
    if (!copyTarget) return;
    setMCopy(false);
    setSaving(true);
    try {
      const tasks = rows
        .filter(r => r.descricao)
        .map(r => {
          if (r.tipo === "receita") {
            return receitasAPI.criar({
              descricao: r.descricao,
              categoria: r.categoria,
              valor: r.valor,
              data: addM(r.data),
            });
          }
          const p: any = {
            descricao: r.descricao,
            categoria: r.categoria,
            valor: r.valor,
            pago: false,
            data_vencimento: r.data ? addM(r.data) : addM(new Date().toISOString().split("T")[0]),
          };
          if (copyParcels && typeof r.parcela_atual === "number" && (r.parcela_total || 1) > 1) {
            p.parcela_atual = r.parcela_atual + 1;
            p.parcela_total = r.parcela_total;
          } else {
            p.parcela_atual = 1;
            p.parcela_total = 1;
          }
          return despesasAPI.criar(p);
        });

      const results = await Promise.allSettled(tasks);
      const failed = results.filter(r => r.status === "rejected").length;
      if (failed > 0) {
        alert(`Copiado com ${failed} erro(s). Verifique os lançamentos no mês de destino.`);
      }
      setMes(copyTarget.m);
      setAno(copyTarget.y);
    } catch (e: any) {
      alert(`Falha ao copiar: ${e?.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
      setCopyTarget(null);
    }
  };

  /* ── export principal to Excel ── */
  const exportPrincipalExcel=()=>{
    const hdr=["Tipo","Descrição","Data","Categoria","Valor (R$)","Parcela Atual","Parcela Total","Status"];
    const data=visible.map(r=>[r.tipo==="receita"?"Receita":"Despesa",r.descricao,dmy(r.data),r.categoria,r.valor,r.parcela_atual||"",r.parcela_total||"",r.tipo==="despesa"?(r.pago?"Pago":"Pendente"):"Recebida"]);
    const ws=XLSX.utils.aoa_to_sheet([hdr,...data]);
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Planilha Principal");
    XLSX.writeFile(wb,`planilha-principal-${mes}-${ano}.xlsx`);
  };
  const exportCSV=()=>{const csv=[["Tipo","Descrição","Data","Categoria","Valor","Status"],...visible.map(r=>[r.tipo,r.descricao,dmy(r.data),r.categoria,r.valor.toFixed(2).replace(".",","),r.tipo==="despesa"?(r.pago?"Pago":"Pendente"):"Recebida"])].map(r=>r.map(c=>`"${c}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));a.download=`planilha-${mes}-${ano}.csv`;a.click();};

  /* ── custom sheets ── */
  const addPage=(e:React.FormEvent)=>{e.preventDefault();if(!newPageName.trim())return;const ns:SheetData={id:uid(),name:newPageName.trim(),columns:[],rows:[]};persist([...sheets,ns]);setNewPageName("");setMNewPage(false);setTab(ns.id);};
  const delPage=(id:string,e:React.MouseEvent)=>{e.stopPropagation();if(!confirm("Excluir esta aba?"))return;persist(sheets.filter(s=>s.id!==id));if(tab===id)setTab("principal");};
  const activeSheet=sheets.find(s=>s.id===tab);

  const SI=({f}:{f:SortField})=>sortField!==f?<ArrowUpDown size={11} style={{opacity:.3}}/>:sortDir==="asc"?<ArrowUp size={11} style={{color:"#10b981"}}/>:<ArrowDown size={11} style={{color:"#10b981"}}/>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── TOOLBAR ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,padding:"12px 20px",flexShrink:0,borderBottom:"1px solid var(--border-subtle)",background:"var(--bg-surface)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,color:"var(--text-primary)",lineHeight:1.2}}>Planilhas</h1>
            <p style={{fontSize:12,color:"var(--text-muted)",marginTop:2}}>Gerencie e personalize seus dados em formato de tabela</p>
          </div>
          {tab==="principal"&&<MonthSelector mes={mes} ano={ano} onChange={(m,a)=>{setMes(m);setAno(a);}}/>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {tab==="principal"&&<>
            <button onClick={load} style={btn("ghost")} title="Recarregar" disabled={loading}><RefreshCw size={14} style={{animation:loading?"spin 1s linear infinite":undefined}}/></button>
            <button onClick={exportCSV} style={btn("ghost")}><Download size={14}/><span style={{fontSize:12}}>CSV</span></button>
            <button onClick={exportPrincipalExcel} style={btn("secondary")}><Download size={14}/><span style={{fontSize:12}}>Excel</span></button>
            <button onClick={openCopy} disabled={saving} style={btn("secondary")}><Copy size={14}/><span style={{fontSize:13}}>Copiar mês</span></button>
            <button onClick={addRow} style={btn("primary")}><Plus size={15}/><span style={{fontSize:13}}>Nova linha</span></button>
          </>}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      {tab==="principal"&&!loading&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,padding:"12px 20px",flexShrink:0,background:"var(--bg-base)"}}>
          {[
            {label:"RECEITAS",value:tots.rec,icon:TrendingUp,clr:"#10b981",bg:"rgba(16,185,129,.12)",border:"rgba(16,185,129,.2)"},
            {label:"DESPESAS",value:tots.dep,icon:TrendingDown,clr:"#ef4444",bg:"rgba(239,68,68,.1)",border:"rgba(239,68,68,.2)"},
            {label:"SALDO LÍQUIDO",value:tots.saldo,icon:Wallet,clr:tots.saldo>=0?"#10b981":"#ef4444",bg:tots.saldo>=0?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)",border:tots.saldo>=0?"rgba(16,185,129,.2)":"rgba(239,68,68,.2)"},
            {label:"DESPESAS PAGAS",value:tots.pag,icon:CheckCircle2,clr:"#818cf8",bg:"rgba(129,140,248,.1)",border:"rgba(129,140,248,.2)"},
          ].map(c=>(
            <div key={c.label} style={{background:"var(--bg-card)",border:`1px solid ${c.border}`,borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{width:40,height:40,borderRadius:10,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><c.icon size={18} style={{color:c.clr}}/></div>
              <div>
                <p style={{fontSize:10,color:"var(--text-muted)",fontWeight:700,marginBottom:3,letterSpacing:.5}}>{c.label}</p>
                <p style={{fontSize:16,fontWeight:800,color:c.clr,lineHeight:1}}>{brl(c.value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{display:"flex",alignItems:"center",padding:"0 20px",flexShrink:0,overflowX:"auto",background:"var(--bg-surface)",borderBottom:"1px solid var(--border-subtle)"}}>
        <button onClick={()=>setTab("principal")} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",fontSize:13,fontWeight:600,border:"none",cursor:"pointer",background:"transparent",whiteSpace:"nowrap",borderBottom:tab==="principal"?"2px solid #10b981":"2px solid transparent",color:tab==="principal"?"#10b981":"var(--text-muted)"}}>
          <LayoutTemplate size={14}/> Principal
        </button>
        {sheets.map(s=>(
          <div key={s.id} style={{position:"relative",display:"flex"}}>
            <button onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px 10px 14px",paddingRight:30,fontSize:13,fontWeight:600,border:"none",cursor:"pointer",background:"transparent",whiteSpace:"nowrap",borderBottom:tab===s.id?"2px solid #818cf8":"2px solid transparent",color:tab===s.id?"#818cf8":"var(--text-muted)"}}>
              <FileSpreadsheet size={14}/>{s.name}
            </button>
            <button onClick={e=>delPage(s.id,e)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:18,height:18,borderRadius:4,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)",opacity:.5}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=".5"}><X size={11}/></button>
          </div>
        ))}
        <button onClick={()=>setMNewPage(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 12px",fontSize:12,fontWeight:500,border:"1px dashed var(--border-default)",borderRadius:6,cursor:"pointer",background:"transparent",color:"var(--text-muted)",whiteSpace:"nowrap",margin:"4px 0 4px 8px"}} onMouseEnter={e=>e.currentTarget.style.color="var(--text-primary)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
          <Plus size={13}/> Nova aba
        </button>
      </div>

      {/* ── Search + Filter (principal only) ── */}
      {tab==="principal"&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",flexShrink:0,background:"var(--bg-surface)",borderBottom:"1px solid var(--border-subtle)"}}>
          <div style={{position:"relative",flex:1,maxWidth:360}}>
            <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}/>
            <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar…" style={{width:"100%",paddingLeft:32,paddingRight:12,height:34,fontSize:13,background:"var(--bg-elevated)",border:"1px solid var(--border-subtle)",borderRadius:7,color:"var(--text-primary)",outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:2,background:"var(--bg-elevated)",borderRadius:7,padding:2}}>
            {(["all","receita","despesa"] as const).map(t=>(
              <button key={t} onClick={()=>setFilterTipo(t)} style={{padding:"4px 12px",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",borderRadius:5,background:filterTipo===t?"var(--bg-surface)":"transparent",color:filterTipo===t?"var(--text-primary)":"var(--text-muted)",boxShadow:filterTipo===t?"0 1px 3px rgba(0,0,0,.1)":"none"}}>
                {t==="all"?"Todos":t==="receita"?"Receitas":"Despesas"}
              </button>
            ))}
          </div>
          {q&&<span style={{fontSize:12,color:"var(--text-muted)"}}>{visible.length} resultados</span>}
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{flex:1,minHeight:0,overflowY:"hidden",display:"flex",flexDirection:"column"}}>

        {/* Principal Sheet */}
        {tab==="principal"&&(loading?(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"var(--text-muted)"}}>
            <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid var(--border-subtle)",borderTopColor:"#10b981",animation:"spin 0.8s linear infinite"}}/>
            <span style={{fontSize:13}}>Carregando…</span>
          </div>
        ):(
          <div style={{flex:1,overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:860,tableLayout:"fixed"}}>
              <colgroup><col style={{width:42}}/><col style={{width:110}}/><col/><col style={{width:120}}/><col style={{width:150}}/><col style={{width:130}}/><col style={{width:110}}/><col style={{width:100}}/><col style={{width:48}}/></colgroup>
              <thead>
                <tr style={{background:"var(--bg-elevated)"}}>
                  <th style={th()}><span style={{fontSize:11,color:"var(--text-muted)"}}>#</span></th>
                  <th style={th()} onClick={()=>toggleSort("tipo")}><span style={thL}>TIPO <SI f="tipo"/></span></th>
                  <th style={th()} onClick={()=>toggleSort("descricao")}><span style={thL}>DESCRIÇÃO <SI f="descricao"/></span></th>
                  <th style={th()} onClick={()=>toggleSort("data")}><span style={thL}>DATA <SI f="data"/></span></th>
                  <th style={th()} onClick={()=>toggleSort("categoria")}><span style={thL}>CATEGORIA <SI f="categoria"/></span></th>
                  <th style={{...th(),textAlign:"right"}} onClick={()=>toggleSort("valor")}><span style={{...thL,justifyContent:"flex-end"}}>VALOR <SI f="valor"/></span></th>
                  <th style={th()}><span style={thL}>PARCELAS</span></th>
                  <th style={{...th(),textAlign:"center"}}><span style={thL}>STATUS</span></th>
                  <th style={th()}/>
                </tr>
              </thead>
              <tbody>
                {visible.length===0?(
                  <tr><td colSpan={9} style={{textAlign:"center",padding:"64px 0",color:"var(--text-muted)",fontSize:14}}>
                    {q||filterTipo!=="all"?"Nenhum resultado.":<>Nenhum lançamento. <button onClick={addRow} style={{color:"#10b981",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Adicionar</button></>}
                  </td></tr>
                ):visible.map((row,i)=>{
                  const isR=row.tipo==="receita"; const cats=isR?catsR:catsD;
                  return (
                    <tr key={row._id} style={{opacity:row.isSaving?.5:1,borderLeft:`3px solid ${isR?"rgba(16,185,129,.6)":"rgba(239,68,68,.5)"}`,transition:"background .1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isR?"rgba(16,185,129,.04)":"rgba(239,68,68,.04)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...td,textAlign:"center",fontSize:11,fontWeight:600,color:"var(--text-muted)",background:"var(--bg-elevated)",borderRight:"1px solid var(--border-subtle)"}}>{i+1}</td>
                      <td style={{...td,padding:"0 8px"}}>
                        {row.isNew?(<select value={row.tipo} onChange={e=>onChange(row._id,"tipo",e.target.value)} style={{width:"100%",minHeight:42,padding:"0 8px",background:"transparent",border:"none",outline:"none",fontSize:11,fontWeight:700,color:isR?"#10b981":"#ef4444",textTransform:"uppercase",appearance:"none"}}><option value="receita">Receita</option><option value="despesa">Despesa</option></select>
                        ):(<span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:20,textTransform:"uppercase",background:isR?"rgba(16,185,129,.12)":"rgba(239,68,68,.1)",color:isR?"#10b981":"#ef4444"}}>{isR?<TrendingUp size={10}/>:<TrendingDown size={10}/>}{isR?"Receita":"Despesa"}</span>)}
                      </td>
                      <td style={{...td,position:"relative"}}>
                        <input type="text" value={row.descricao} placeholder="Descrição…" onChange={e=>onChange(row._id,"descricao",e.target.value)} onBlur={()=>row.descricao&&saveRow(row)} style={{display:"block",width:"100%",minHeight:42,padding:"6px 12px",background:"transparent",border:"none",outline:"none",fontSize:13,color:"var(--text-primary)",fontWeight:500}}/>
                        {row.error&&<div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)"}} title={row.error}><AlertCircle size={13} style={{color:"#ef4444"}}/></div>}
                      </td>
                      <td style={td}><input type="date" value={row.data} onChange={e=>onChange(row._id,"data",e.target.value)} onBlur={()=>row.descricao&&saveRow(row)} style={{display:"block",width:"100%",minHeight:42,padding:"6px 10px",background:"transparent",border:"none",outline:"none",fontSize:13,color:"var(--text-secondary)"}}/></td>
                      <td style={td}><select value={row.categoria} onChange={e=>onChange(row._id,"categoria",e.target.value)} onBlur={()=>row.descricao&&saveRow(row)} style={{display:"block",width:"100%",minHeight:42,padding:"6px 10px",background:"transparent",border:"none",outline:"none",fontSize:13,color:"var(--text-primary)",appearance:"none"}}><option value="" disabled>Selecione…</option>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select></td>
                      <td style={{...td,position:"relative"}}>
                        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:600,color:"var(--text-muted)",pointerEvents:"none"}}>R$</span>
                        <input
                          type="text"
                          value={maskCurrency(row.valor)}
                          onChange={e => onChange(row._id, "valor", parseCurrencyToNumber(e.target.value))}
                          onBlur={() => row.descricao && saveRow(row)}
                          style={{display:"block",width:"100%",minHeight:42,paddingLeft:28,paddingRight:10,background:"transparent",border:"none",outline:"none",fontSize:13,fontWeight:700,textAlign:"right",color:isR?"#10b981":"var(--text-primary)"}}
                        />
                      </td>
                      <td style={td}>
                        {!isR?(<div style={{display:"flex",alignItems:"center",gap:4,padding:"0 8px"}}>
                          <input type="number" min={1} max={99} value={row.parcela_atual||1} onChange={e=>onChange(row._id,"parcela_atual",+e.target.value||1)} onBlur={()=>row.descricao&&saveRow(row)} style={{width:36,height:26,textAlign:"center",fontSize:12,background:"var(--bg-elevated)",border:"1px solid var(--border-subtle)",borderRadius:4,color:"var(--text-primary)",outline:"none"}}/>
                          <span style={{fontSize:11,color:"var(--text-muted)"}}>/</span>
                          <input type="number" min={1} max={99} value={row.parcela_total||1} onChange={e=>onChange(row._id,"parcela_total",+e.target.value||1)} onBlur={()=>row.descricao&&saveRow(row)} style={{width:36,height:26,textAlign:"center",fontSize:12,background:"var(--bg-elevated)",border:"1px solid var(--border-subtle)",borderRadius:4,color:"var(--text-primary)",outline:"none"}}/>
                        </div>):<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:42}}><span style={{color:"var(--border-default)"}}>—</span></div>}
                      </td>
                      <td style={{...td,textAlign:"center"}}>
                        {!isR?(<button onClick={()=>togglePago(row)} disabled={row.isNew} style={{width:22,height:22,borderRadius:6,border:"2px solid",display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"pointer",borderColor:row.pago?"#10b981":"var(--border-default)",background:row.pago?"#10b981":"transparent",opacity:row.isNew?.4:1}}>{row.pago&&<Check size={12} strokeWidth={3} style={{color:"#fff"}}/>}</button>
                        ):(<span style={{fontSize:10,fontWeight:600,padding:"2px 6px",borderRadius:10,background:"rgba(16,185,129,.1)",color:"#10b981"}}>OK</span>)}
                      </td>
                      <td style={{...td,textAlign:"center"}}>
                        <button onClick={()=>{setDelRow(row);setMDel(true);}} style={{width:28,height:28,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)",opacity:.4,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.background="rgba(239,68,68,.1)";e.currentTarget.style.color="#ef4444";}} onMouseLeave={e=>{e.currentTarget.style.opacity=".4";e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text-muted)";}}>
                          <Trash size={13}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visible.length>0&&(
                  <tr style={{background:"var(--bg-elevated)",borderTop:"2px solid var(--border-default)"}}>
                    <td colSpan={5} style={{padding:"10px 16px",textAlign:"right",fontSize:11,fontWeight:700,color:"var(--text-muted)",letterSpacing:.5,textTransform:"uppercase"}}>Receitas {brl(tots.rec)} · Despesas {brl(tots.dep)}</td>
                    <td style={{padding:"10px 16px",textAlign:"right",fontWeight:800,fontSize:15,color:tots.saldo>=0?"#10b981":"#ef4444"}}>{brl(tots.saldo)}</td>
                    <td colSpan={3} style={{padding:"10px 12px",fontSize:11,color:"var(--text-muted)"}}>Saldo líquido</td>
                  </tr>
                )}
                <tr><td colSpan={9} style={{padding:0,borderTop:"1px solid var(--border-subtle)"}}>
                  <button onClick={addRow} style={{width:"100%",padding:"10px 20px",background:"transparent",border:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#10b981",fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background="var(--bg-elevated)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <Plus size={14}/> Nova linha
                  </button>
                </td></tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Custom SpreadsheetGrid */}
        {tab!=="principal"&&activeSheet&&(
          <SpreadsheetGrid sheet={activeSheet} sheetName={activeSheet.name} onChange={updateSheet}/>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* MODALS */}
      <Modal isOpen={mNewPage} onClose={()=>setMNewPage(false)} title="Nova aba personalizada">
        <form onSubmit={addPage} style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <label style={{fontSize:13,fontWeight:500,color:"var(--text-secondary)",display:"block",marginBottom:6}}>Nome da aba</label>
            <input required autoFocus type="text" value={newPageName} onChange={e=>setNewPageName(e.target.value)} placeholder="Ex: Metas 2026" className="input-field"/>
          </div>
          <div style={{display:"flex",gap:8}}><button type="button" onClick={()=>setMNewPage(false)} className="btn-secondary" style={{flex:1}}>Cancelar</button><button type="submit" className="btn-primary" style={{flex:1}}>Criar</button></div>
        </form>
      </Modal>

      <Modal isOpen={mDel} onClose={()=>setMDel(false)} title="Excluir linha">
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <p style={{fontSize:14,color:"var(--text-secondary)"}}>Excluir <strong style={{color:"var(--text-primary)"}}>{delRow?.descricao||"esta linha"}</strong>?</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setMDel(false)} className="btn-secondary">Cancelar</button>
            <button onClick={async()=>{if(delRow)await removeRow(delRow);setMDel(false);setDelRow(null);}} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,cursor:"pointer",fontSize:14}}>Excluir</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={mCopy} onClose={()=>setMCopy(false)} title={`Copiar para ${copyTarget?.label??""}`}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <p style={{fontSize:14,color:"var(--text-secondary)"}}>Duplicar todos os lançamentos para <strong style={{color:"var(--text-primary)"}}>{copyTarget?.label}</strong>.</p>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"var(--text-secondary)"}}><input type="checkbox" checked={copyParcels} onChange={e=>setCopyParcels(e.target.checked)} style={{width:16,height:16}}/> Avançar parcelas automaticamente</label>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button onClick={()=>setMCopy(false)} className="btn-secondary">Cancelar</button><button onClick={doCopy} className="btn-primary" disabled={saving}>{saving?"Copiando…":"Confirmar"}</button></div>
        </div>
      </Modal>
    </div>
  );
}

/* style helpers */
const th=():React.CSSProperties=>({padding:"10px 12px",borderBottom:"1px solid var(--border-subtle)",borderRight:"1px solid var(--border-subtle)",fontWeight:600,background:"var(--bg-elevated)",position:"sticky" as const,top:0,zIndex:10,cursor:"pointer"});
const thL:React.CSSProperties={display:"flex",alignItems:"center",gap:5,userSelect:"none",fontSize:11,fontWeight:700,letterSpacing:.6,color:"var(--text-muted)",textTransform:"uppercase" as const};
const td:React.CSSProperties={padding:0,borderBottom:"1px solid var(--border-subtle)",borderRight:"1px solid var(--border-subtle)",position:"relative"};
const btn=(v:"primary"|"secondary"|"ghost"):React.CSSProperties=>{const b:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,whiteSpace:"nowrap" as const};if(v==="primary")return{...b,background:"var(--brand)",color:"var(--brand-text)"};if(v==="secondary")return{...b,background:"var(--bg-card)",color:"var(--text-primary)",border:"1px solid var(--border-subtle)"};return{...b,background:"transparent",color:"var(--text-muted)",border:"1px solid var(--border-subtle)"};};
