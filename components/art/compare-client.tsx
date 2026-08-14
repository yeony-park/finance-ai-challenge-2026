"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const storageKey="art-compare";
const eventName="art-compare-change";
const maxItems=3;

function normalize(value:unknown){return Array.isArray(value)?[...new Set(value.filter((item):item is string=>typeof item==="string"&&item.length>0))].slice(0,maxItems):[]}
function subscribe(callback:()=>void){window.addEventListener(eventName,callback);window.addEventListener("storage",callback);return()=>{window.removeEventListener(eventName,callback);window.removeEventListener("storage",callback)}}
function snapshot(){return localStorage.getItem(storageKey)||"[]"}
function serverSnapshot(){return "[]"}
function useCompareIds(){const raw=useSyncExternalStore(subscribe,snapshot,serverSnapshot);try{return normalize(JSON.parse(raw))}catch{return[]}}
function save(ids:string[]){const normalized=normalize(ids);localStorage.setItem(storageKey,JSON.stringify(normalized));window.dispatchEvent(new Event(eventName));return normalized}
function compareHref(ids:string[]){return ids.length?`/compare?ids=${ids.join(",")}`:"/compare"}

export function CompareButton({productId}:{productId:string}){
 const ids=useCompareIds();
 const added=ids.includes(productId);
 const [message,setMessage]=useState("");
 function toggle(){
  if(added){save(ids.filter((id)=>id!==productId));setMessage("비교함에서 제외했습니다.");return}
  if(ids.length>=maxItems){setMessage("비교는 최대 3개까지 가능합니다.");return}
  save([...ids,productId]);setMessage("비교함에 추가했습니다.")
 }
 return <div className="compare-button-wrap"><button className={`button button-secondary ${added?"is-added":""}`} type="button" onClick={toggle} aria-pressed={added}>{added?"✓ 비교함 담김":"비교함 추가"}</button>{message?<span className="sr-only" role="status">{message}</span>:null}</div>
}

export function CompareTray(){
 const ids=useCompareIds();
 if(!ids.length)return null;
 return <aside className="compare-tray" aria-label="상품 비교함"><span>비교함 <strong>{ids.length}/{maxItems}</strong>{ids.length<2?<small> · 1개 더 선택</small>:null}</span>{ids.length>=2?<Link className="button button-primary" href={compareHref(ids)}>비교하기</Link>:<span className="button button-primary is-disabled" aria-disabled="true">비교하기</span>}<button className="compare-clear" type="button" onClick={()=>save([])}>전체 비우기</button></aside>
}

export function CompareNavLink({active,onClick}:{active:boolean;onClick?:()=>void}){const ids=useCompareIds();return <Link className={active?"active":""} href={compareHref(ids)} onClick={onClick}>상품 비교{ids.length?` ${ids.length}`:""}</Link>}

export type CompareChoice={id:string;title:string;artist:string;verdictLabel:string;isDemo:boolean};
export function CompareSelectionPanel({products,initialIds}:{products:CompareChoice[];initialIds:string[]}){
 const storedIds=useCompareIds();
 const router=useRouter();
 const [selectionOverride,setSelectionOverride]=useState<string[]|null>(()=>initialIds.length?normalize(initialIds):null);
 const [message,setMessage]=useState("");
 const selected=selectionOverride??storedIds;
 useEffect(()=>{if(initialIds.length)save(initialIds)},[initialIds]);
 function toggle(id:string){setSelectionOverride((current)=>{const base=current??selected;if(base.includes(id)){setMessage("");return base.filter((item)=>item!==id)}if(base.length>=maxItems){setMessage("비교는 최대 3개까지 선택할 수 있습니다.");return base}setMessage("");return [...base,id]})}
 function apply(){const ids=save(selected);if(ids.length<2){setMessage("비교할 상품을 2개 이상 선택하세요.");return}router.push(compareHref(ids))}
 return <section className="compare-selector" aria-labelledby="compare-selector-title"><div className="compare-selector-heading"><div><p className="section-kicker">SELECT PRODUCTS</p><h2 id="compare-selector-title">비교할 상품 선택</h2><p>2개 이상, 최대 3개까지 선택할 수 있습니다.</p></div><strong>{selected.length}/{maxItems}</strong></div><div className="compare-choice-grid">{products.map((product)=>{const checked=selected.includes(product.id);return <label className={`compare-choice ${checked?"selected":""}`} key={product.id}><input type="checkbox" checked={checked} onChange={()=>toggle(product.id)}/><span><small>{product.isDemo?"DEMO · 청약 예정":"기존 DB"}</small><b>{product.title}</b><em>{product.artist} · {product.verdictLabel}</em></span></label>})}</div><div className="compare-selector-actions"><button className="button button-primary" type="button" onClick={apply}>선택 상품 비교하기</button>{selected.length?<button className="button button-secondary" type="button" onClick={()=>{setSelectionOverride([]);save([]);setMessage("")}}>선택 초기화</button>:null}<p role="status">{message}</p></div></section>
}
