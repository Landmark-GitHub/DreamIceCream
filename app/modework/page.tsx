'use client'

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import Link from 'next/link'
import { doc, setDoc } from 'firebase/firestore'
import { ArrowLeft, Check, Eraser, PenLine, Save, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { getToday, generateId, ProductType } from '@/lib/types'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type Row = { productId: string; old: number; w: number; x: number }
const groups: { type: ProductType; label: string }[] = [
  { type: 'XL', label: 'แท่งใหญ่ · XL' }, { type: 'S', label: 'แท่งเล็ก · S' },
  { type: 'Coffee', label: 'กาแฟ · Coffee' }, { type: 'Sandwich', label: 'แซนวิช · Sandwich' },
  { type: 'Cup', label: 'ถ้วย · Cup' }, { type: 'Cone', label: 'โคน · Cone' },
]

function PencilCell({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [text, setText] = useState(value ? String(value) : '')
  const draw = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect(); const ctx = canvas.getContext('2d')
    if (!ctx) return
    const x = (e.clientX - rect.left) * canvas.width / rect.width; const y = (e.clientY - rect.top) * canvas.height / rect.height
    if (!drawing) { ctx.beginPath(); ctx.moveTo(x, y) } else { ctx.lineTo(x, y); ctx.stroke() }
  }
  const clear = () => { const c = canvasRef.current; c?.getContext('2d')?.clearRect(0, 0, c.width, c.height); setText(''); onChange(0) }
  const commit = (next: string) => { const clean = next.replace(/[^0-9]/g, ''); setText(clean); onChange(Number(clean) || 0) }
  return <div className="relative min-w-24 rounded-lg border border-border bg-card p-1.5 shadow-sm touch-none">
    <span className="absolute left-2 top-1 text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <canvas ref={canvasRef} width={160} height={58} className="mt-2 h-12 w-full cursor-crosshair" onPointerDown={(e) => { setDrawing(true); e.currentTarget.setPointerCapture(e.pointerId); draw(e) }} onPointerMove={draw} onPointerUp={() => setDrawing(false)} aria-label={`เขียนค่า ${label}`} />
    <Input inputMode="numeric" value={text} onChange={(e) => commit(e.target.value)} className="h-7 border-0 bg-transparent px-1 text-center text-lg font-bold focus-visible:ring-0" aria-label={`ค่า ${label}`} />
    <button type="button" onClick={clear} className="absolute right-1 top-1 rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`ล้างค่า ${label}`}><Eraser className="size-3" /></button>
  </div>
}

export default function ModeWorkPage() {
  const { members, products } = useStore()
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [previousOwed, setPreviousOwed] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [saving, setSaving] = useState(false)
  const selectedMember = members.find((m) => m.id === memberId)
  const activeProducts = products.filter((p) => groups.some((g) => g.type === p.type)).sort((a, b) => a.sortOrder - b.sortOrder)
  const update = (id: string, patch: Partial<Row>) => setRows((current) => ({ ...current, [id]: { productId: id, old: patch.old ?? current[id]?.old ?? 0, w: patch.w ?? current[id]?.w ?? 0, x: patch.x ?? current[id]?.x ?? 0 } }))
  const summary = useMemo(() => groups.map((group) => {
    const items = activeProducts.filter((p) => p.type === group.type); const data = items.map((p) => ({ p, r: rows[p.id] || { old: 0, w: 0, x: 0 } }))
    const old = data.reduce((n, x) => n + x.r.old, 0); const w = data.reduce((n, x) => n + x.r.w, 0); const y = old + w; const x = data.reduce((n, q) => n + q.r.x, 0); const sold = y - x; const price = items[0]?.priceOut || 0
    return { ...group, old, w, y, x, sold, money: sold * price, price }
  }), [activeProducts, rows])
  const totalSales = summary.reduce((n, g) => n + g.money, 0)
  const totalDue = totalSales + previousOwed - amountPaid
  const saveModeWork = async () => { setSaving(true); try { const id = generateId(); await setDoc(doc(db, 'modework', id), { id, memberId, memberName: selectedMember?.name || '', date: getToday(), rows, summary, totalSales, previousOwed, amountPaid, amountOwed: totalDue, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); toast.success('บันทึก Mode Work แล้ว') } catch { toast.error('บันทึกไม่สำเร็จ') } finally { setSaving(false) } }
  const saveBill = async () => { setSaving(true); try { const id = generateId(); const items = activeProducts.map((p) => { const r = rows[p.id] || { old: 0, w: 0, x: 0 }; const total = r.old + r.w; return { productId: p.id, productName: p.name, oldStock: r.old, newStock: r.w, totalStock: total, returned: r.x, sold: total - r.x, priceUsed: p.priceOut } }); await setDoc(doc(db, 'bills', id), { id, memberId, memberName: selectedMember?.name || '', buyerName: selectedMember?.name || '', date: getToday(), items, ice: '', icePrice: 0, totalSales, addMoney: 0, amountPaid, amountOwed: totalDue, previousOwed, notes: 'สร้างจาก Mode Work', status: 'completed', dayClosed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); toast.success('บันทึก Bill แล้ว') } catch { toast.error('บันทึก Bill ไม่สำเร็จ') } finally { setSaving(false) } }
  return <main className="min-h-screen bg-muted/30 px-3 py-3 text-sm md:px-6"><div className="mx-auto max-w-5xl">
    <header className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href="/"><ArrowLeft /></Link></Button><div><p className="text-xs text-muted-foreground">สมุดบันทึกดิจิทัล</p><h1 className="text-xl font-bold">Mode Work</h1></div></div><Badge variant="outline"><PenLine className="mr-1 size-3" /> iPad / Pencil</Badge></header>
    <Card className="mb-3"><CardContent className="flex flex-wrap items-end gap-3 p-3"><label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">สมาชิก<select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><div className="text-xs text-muted-foreground">วันที่<br /><strong className="text-foreground">{getToday()}</strong></div><div className="text-xs text-muted-foreground">เขียนด้วย Pencil หรือ finger ในช่อง W/X</div></CardContent></Card>
    <section className="grid gap-3 lg:grid-cols-[1fr_280px]"><Card><CardHeader className="border-b bg-muted/60 px-3 py-2"><CardTitle className="text-sm">รายการสินค้า · W = ใหม่ / X = เหลือ</CardTitle></CardHeader><CardContent className="p-2"><div className="hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_1fr_1fr] gap-2 px-2 pb-2 text-[11px] font-semibold text-muted-foreground md:grid"><span>สินค้า / type</span><span>เก่า</span><span>W ใหม่</span><span>Y รวม</span><span>X เหลือ</span><span>ขาย</span><span>เงิน</span></div>{groups.map((group) => <div key={group.type} className="mb-3"><div className="mb-1 flex items-center justify-between rounded bg-muted px-2 py-1 font-semibold">{group.label}<span className="text-xs text-muted-foreground">{summary.find((s) => s.type === group.type)?.sold || 0} ชิ้น</span></div>{activeProducts.filter((p) => p.type === group.type).map((p) => { const r = rows[p.id] || { old: 0, w: 0, x: 0 }; const y = r.old + r.w; const sold = y - r.x; return <div key={p.id} className="grid grid-cols-2 gap-2 border-b py-2 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_1fr_1fr] md:items-center"><div className="font-medium">{p.name}<span className="ml-1 text-[10px] text-muted-foreground">{p.type}</span></div><Input inputMode="numeric" value={r.old || ''} onChange={(e) => update(p.id, { old: Number(e.target.value) || 0 })} className="h-9" placeholder="เก่า" aria-label={`${p.name} เก่า`} /><PencilCell value={r.w} onChange={(w) => update(p.id, { w })} label="W ใหม่" /><div className="rounded bg-muted px-2 py-2 text-center font-bold">{y}</div><PencilCell value={r.x} onChange={(x) => update(p.id, { x })} label="X เหลือ" /><div className="rounded bg-primary/10 px-2 py-2 text-center font-bold">{sold}</div><div className="text-right font-bold">{(sold * p.priceOut).toLocaleString()}</div></div>})}</div>)}</CardContent></Card>
    <aside className="flex flex-col gap-3"><Card><CardHeader className="px-3 py-2"><CardTitle className="text-sm">สรุปของสมาชิก</CardTitle></CardHeader><CardContent className="grid gap-2 p-3">{summary.map((g) => <div key={g.type} className="flex items-center justify-between"><span>{g.label.split(' · ')[0]} <small className="text-muted-foreground">({g.sold} × {g.price})</small></span><strong>{g.money.toLocaleString()} ฿</strong></div>)}<Separator /><div className="flex justify-between text-base font-bold"><span>ยอดสินค้า</span><span>{totalSales.toLocaleString()} ฿</span></div><label className="text-xs">ยอดค้างเดิม<Input inputMode="decimal" value={previousOwed || ''} onChange={(e) => setPreviousOwed(Number(e.target.value) || 0)} /></label><label className="text-xs">ยอดชำระแล้ว<Input inputMode="decimal" value={amountPaid || ''} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} /></label><div className="flex justify-between rounded-md bg-destructive/10 p-2 font-bold"><span>ยอดค้างสุทธิ</span><span>{totalDue.toLocaleString()} ฿</span></div></CardContent></Card><Card><CardContent className="grid gap-2 p-3"><Button onClick={saveModeWork} disabled={saving}><Save data-icon="inline-start" />Save Mode Work</Button><Button variant="secondary" onClick={saveBill} disabled={saving}><Check data-icon="inline-start" />Save Bill</Button><Button variant="ghost" onClick={() => setRows({})}><Trash2 data-icon="inline-start" />ล้างแบบฟอร์ม</Button></CardContent></Card></aside></section>
  </div></main>
}
