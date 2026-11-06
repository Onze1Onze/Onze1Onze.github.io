export const SHEET_KEY = "com.onze1onze.arsenal/sheet";
export const METRICS = Object.freeze([
 {id:"hp",label:"Vida",current:"M9",maximum:"Q9"},
 {id:"san",label:"Sanidade",current:"F9",maximum:"J9"},
 {id:"pe",label:"PE",current:"T9",maximum:"X9"}
]);
export const DETAILS=Object.freeze([
 {id:"movement",label:"Deslocamento",cell:"P16"},
 {id:"defense",label:"Defesa",cell:"F16"},
 {id:"block",label:"Bloqueio",cell:"L16"},
 {id:"dodge",label:"Esquiva",cell:"J16"}
]);
export function parseSheetLink(input) {
 let url;
 try{url=new URL(String(input).trim());}catch{throw Error("Cole um link completo do Google Sheets.");}
 if(url.protocol!=="https:" || url.hostname!=="docs.google.com" || url.username || url.password || url.port)
  throw Error("Use um link HTTPS de docs.google.com/spreadsheets.");
 const match=url.pathname.match(/^\/spreadsheets\/(?:u\/\d+\/)?d\/(e\/)?([A-Za-z0-9_-]+)(?:\/|$)/);
 if(!match)throw Error("Link de planilha não reconhecido.");
 const params=new URLSearchParams(url.hash.replace(/^#/,""));
 const gid=url.searchParams.get("gid")??params.get("gid")??"0";
 if(!/^\d{1,16}$/.test(gid))throw Error("O identificador da aba (gid) é inválido.");
 const published=!!match[1],id=match[2];
 const canonical="https://docs.google.com/spreadsheets/d/"+(published?"e/":"")+id+(published?"/pubhtml":"/edit")+"?gid="+gid;
 return {id,gid,published,url:canonical};
}
export function requestUrl(config) {
 // Re-validate even stored metadata; never fetch arbitrary token-provided hosts.
 const c=parseSheetLink(config.url);
 if(c.published)return "https://docs.google.com/spreadsheets/d/e/"+c.id+"/pub?gid="+c.gid+"&single=true&output=csv";
 return "https://docs.google.com/spreadsheets/d/"+c.id+"/gviz/tq?gid="+c.gid+"&headers=0&range=F9%3AX18&tqx=out%3Ajson";
}
export function numberValue(value) {
 if(typeof value==="number")return Number.isFinite(value)?value:null;
 if(typeof value!=="string")return null;
 let text=value.trim().replace(/[\s\u00a0\u202f]/g,"");
 if(!text)return null;
 if(/^-?\d{1,3}(\.\d{3})+,\d+$/.test(text))text=text.replaceAll(".","").replace(",",".");
 else if(/^-?\d{1,3}(,\d{3})+\.\d+$/.test(text))text=text.replaceAll(",","");
 else if(text.includes(",")&&!text.includes("."))text=text.replace(",",".");
 if(!/^-?\d+(\.\d+)?$/.test(text))return null;
 const n=Number(text);return Number.isFinite(n)?n:null;
}
export function metricValues(cells) {
 return METRICS.map(metric=>{
  const current=numberValue(cells[metric.current]),maximum=numberValue(cells[metric.maximum]);
  if(current===null || maximum===null)throw Error("Preencha "+metric.current+" e "+metric.maximum+" com valores numéricos ("+metric.label+").");
  if(maximum<0)throw Error("O máximo de "+metric.label+" não pode ser negativo.");
  return {...metric,current,maximum,percent:maximum>0?Math.max(0,Math.min(100,current/maximum*100)):0};
 });
}
export function detailValues(cells){
 return DETAILS.map(detail=>({...detail,kind:"detail",value:cells[detail.cell]===null||cells[detail.cell]===undefined||String(cells[detail.cell]).trim()===""?"—":String(cells[detail.cell]).trim().slice(0,40)}));
}
export function parseVisualization(text) {
 if(/^\s*</.test(text))throw Error("A planilha exige login. Compartilhe para leitura por link ou publique a aba.");
 const body=text.trim().replace(/^\/\*O_o\*\/\s*/,"");
 const wrapper="google.visualization.Query.setResponse(";
 const raw=body.startsWith(wrapper)?body.slice(wrapper.length).replace(/\);?\s*$/,""):body;
 let result;try{result=JSON.parse(raw);}catch{throw Error("O Google não retornou dados legíveis. Confira o compartilhamento da planilha.");}
 if(result.status==="error")throw Error("Não foi possível ler a aba. Confira o link, o gid e o acesso público.");
 const rows=result.table?.rows;
 if(!Array.isArray(rows)||!Array.isArray(rows[0]?.c))throw Error("A linha 9 está vazia ou não foi encontrada.");
 const cells={};
 for(const m of METRICS)for(const cell of [m.current,m.maximum]){
  const index=cell.charCodeAt(0)-70,v=rows[0].c[index];cells[cell]=v?.v??v?.f??null;
 }
 for(const detail of DETAILS){const cell=rows[7]?.c?.[detail.cell.charCodeAt(0)-70];cells[detail.cell]=cell?.f??cell?.v??null;}
 return [...metricValues(cells),...detailValues(cells)];
}

export function parseCsv(text) {
 if(/^\s*</.test(text))throw Error("O link publicado não retornou CSV. Confira a publicação da aba.");
 const rows=[],row=[];let value="",quoted=false;
 text=text.replace(/^\uFEFF/,"");
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;
  }else if(c===","&&!quoted){row.push(value);value="";}
  else if((c==="\n"||c==="\r")&&!quoted){row.push(value);rows.push([...row]);row.length=0;value="";if(c==="\r"&&text[i+1]==="\n")i++;}
  else value+=c;
 }
 if(quoted)throw Error("CSV incompleto recebido do Google.");
 if(value.length||row.length){row.push(value);rows.push([...row]);}
 return rows;
}
export function parsePublished(text) {
 const rows=parseCsv(text),cells={};
 if(!rows[8])throw Error("A aba publicada precisa conter a linha 9 da ficha.");
 for(const metric of METRICS)for(const cell of [metric.current,metric.maximum])
  cells[cell]=rows[8][cell.charCodeAt(0)-65];
 for(const detail of DETAILS)cells[detail.cell]=rows[15]?.[detail.cell.charCodeAt(0)-65];
 return [...metricValues(cells),...detailValues(cells)];
}
export async function fetchMetrics(config,{signal,fetchImpl=globalThis.fetch}={}) {
 const canonical=parseSheetLink(config.url);
 let response;
 try{response=await fetchImpl(requestUrl(canonical),{signal,credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer"});}
 catch(error){if(error.name==="AbortError")throw error;throw Error("Sem acesso à planilha. Confira a conexão e o compartilhamento público.");}
 if(!response.ok)throw Error(response.status===429?"Google limitou as consultas. Aguarde a próxima atualização.":"Google recusou a leitura. Verifique se a aba pode ser lida sem login.");
 if(Number(response.headers?.get("content-length"))>2_000_000)throw Error("Planilha muito grande. Publique somente a aba da ficha.");
 const text=await response.text();
 if(text.length>2_000_000)throw Error("Planilha muito grande. Publique somente a aba da ficha.");
 return canonical.published?parsePublished(text):parseVisualization(text);
}
