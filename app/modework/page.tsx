'use client'

import { useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import Link from 'next/link'
import { doc, setDoc } from 'firebase/firestore'
import { ArrowLeft, Eraser, PenLine, Save, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { getToday, generateId, ProductType } from '@/lib/types'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

type TypeValues = { old: number; w: number; x: number }
type Group = { type: ProductType; label: string }

const groups: Group[] = [
  { type: 'XL', label: 'แท่งใหญ่ · XL' },
  { type: 'S', label: 'แท่งเล็ก · S' },
  { type: 'Coffee', label: 'กาแฟ · Coffee' },
  { type: 'Sandwich', label: 'แซนวิช · Sandwich' },
  { type: 'Cup', label: 'ถ้วย · Cup' },
  { type: 'Cone', label: 'โคน · Cone' },
]

function PencilCell({ value, onChange, label, tone }: { value: number; onChange: (value: number) => void; label: string; tone: 'purple' | 'yellow' | 'brown' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [text, setText] = useState(value ? String(value) : '')
  const toneClass = tone === 'purple' ? 'border-purple-400 bg-purple-50 dark:bg-purple-950/30' : tone === 'yellow' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30' : 'border-amber-700 bg-amber-50 dark:bg-amber-950/30'
  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) * canvas.width / rect.width
    const y = (event.clientY - rect.top) * canvas.height / rect.height
    context.lineWidth = 3
    context.lineCap = 'round'
    context.strokeStyle = '#3f3f46'
    if (!drawing) { context.beginPath(); context.moveTo(x, y) } else { context.lineTo(x, y); context.stroke() }
  }
  const commit = (next: string) => { const clean = next.replace(/[^0-9]/g, ''); setText(clean); onChange(Number(clean) || 0) }
  const clear = () => { canvasRef.current?.getContext('2d')?.clearRect(0, 0, 180, 58); setText(''); onChange(0) }
  return <div className={`relative rounded-md border-2 p-1 ${toneClass}`}>
    <span className="block px-1 text-[10px] font-bold text-muted-foreground">{label}</span>
    <canvas ref={canvasRef} width={180} height={58} className="h-10 w-full touch-none cursor-crosshair" aria-label={`เขียนค่า ${label}`} onPointerDown={(event) => { setDrawing(true); event.currentTarget.setPointerCapture(event.pointerId); draw(event) }} onPointerMove={draw} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} />
    <Input value={text} inputMode="numeric" onChange={(event) => commit(event.target.value)} className="h-7 border-0 bg-transparent px-1 text-center text-lg font-bold focus-visible:ring-0" aria-label={`ค่า ${label}`} />
    <button type="button" onClick={clear} className="absolute right-1 top-1 rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`ล้างค่า ${label}`}><Eraser className="size-3" /></button>
  </div>
}

export default function ModeWorkPage() {
  const { members, products } = useStore()
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const [values, setValues] = useState<Record<ProductType, TypeValues>>({} as Record<ProductType, TypeValues>)
  const [previousOwed, setPreviousOwed] = useState(0)
  const [addMoney, setAddMoney] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [saving, setSaving] = useState(false)
  const selectedMember = members.find((member) => member.id === memberId)
  const setTypeValue = (type: ProductType, patch: Partial<TypeValues>) => setValues((current) => ({ ...current, [type]: { old: current[type]?.old || 0, w: current[type]?.w || 0, x: current[type]?.x || 0, ...patch } }))
  const summary = useMemo(() => groups.map((group) => {
    const row = values[group.type] || { old: 0, w: 0, x: 0 }
    const product = products.find((item) => item.type === group.type)
    const y = row.old + row.w
    const sold = y - row.x
    const price = product?.priceOut || 0
    return { ...group, ...row, y, sold, price, money: sold * price }
  }), [products, values])
  const totalSales = summary.reduce((total, row) => total + row.money, 0)
  const memberPayable = totalSales + previousOwed + addMoney
  const totalDue = memberPayable - amountPaid
  const saveModeWork = async () => {
    setSaving(true)
    try { const id = generateId(); await setDoc(doc(db, 'modework', id), { id, memberId, memberName: selectedMember?.name || '', date: getToday(), values, summary, totalSales, previousOwed, addMoney, amountPaid, amountOwed: totalDue, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); toast.success('บันทึก Mode Work แล้ว') } catch { toast.error('บันทึกไม่สำเร็จ') } finally { setSaving(false) }
  }
  const saveBill = async () => {
    setSaving(true)
    try {
      const id = generateId()
      const items = summary.map((row) => ({ productId: `type-${row.type}`, productName: row.label, oldStock: row.old, newStock: row.w, totalStock: row.y, returned: row.x, sold: row.sold, priceUsed: row.price }))
      await setDoc(doc(db, 'bills', id), { id, memberId, memberName: selectedMember?.name || '', buyerName: selectedMember?.name || '', date: getToday(), items, ice: '', icePrice: 0, totalSales, addMoney, amountPaid, amountOwed: totalDue, previousOwed, notes: 'สร้างจาก Mode Work แบบรวมต่อชนิด', status: 'completed', dayClosed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      toast.success('บันทึก Bill แล้ว')
    } catch { toast.error('บันทึก Bill ไม่สำเร็จ') } finally { setSaving(false) }
  }
  return <main className="min-h-screen bg-muted/30 px-2 py-2 text-sm md:px-5"><div className="mx-auto max-w-5xl">
    <header className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Button asChild variant="ghost" size="icon"><Link href="/"><ArrowLeft /></Link></Button><div><p className="text-[11px] text-muted-foreground">สมุดบันทึกดิจิทัล · {getToday()}</p><h1 className="text-lg font-bold">Mode Work — บันทึกสินค้า</h1></div></div><Badge variant="outline"><PenLine className="mr-1 size-3" /> Pencil / Finger</Badge></header>
    <Card className="mb-2"><CardContent className="flex flex-wrap items-end gap-2 p-2"><label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-semibold">สมาชิก<select value={memberId} onChange={(event) => setMemberId(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><div className="rounded-md bg-muted px-3 py-2 text-xs"><span className="text-muted-foreground">สูตรต่อชนิด และยอดสมาชิก</span><br /><strong>Y = Sum เก่า + Sum ใหม่ · ขาย = Y - X · M = ขาย × P</strong><br /><span className="font-semibold text-green-700 dark:text-green-300">รวม += M + ค้างเดิม + บวกเพิ่ม</span></div></CardContent></Card>
    <section className="grid gap-2 lg:grid-cols-[1fr_280px]"><Card><CardHeader className="border-b bg-muted/60 px-3 py-2"><CardTitle className="text-sm">แบบบันทึกสินค���า · คำนวณหนึ่งครั้งต่อชนิด</CardTitle></CardHeader><CardContent className="p-2"><div className="mb-1 hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_0.8fr_1fr_1fr] gap-1 px-1 text-[10px] font-bold text-muted-foreground md:grid"><span>ชนิด</span><span>เก่า</span><span>W ใหม่</span><span>Y รวม</span><span>เหลือ X</span><span>ขาย</span><span>ราคา P</span><span>เงิน M</span></div>{summary.map((row) => <div key={row.type} className="mb-2 rounded-md border border-border p-1.5"><div className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded bg-muted px-2 py-1 font-bold"><span>{row.label}</span><span className="text-[10px] text-muted-foreground">รวม {row.y} ชิ้น</span></div><div className="grid gap-1 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_0.8fr_1fr_1fr] md:items-center"><div className="font-semibold">{row.type}<span className="block text-[10px] font-normal text-muted-foreground">รวมทุกรายการในชนิดนี้</span></div><PencilCell value={row.old} onChange={(value) => setTypeValue(row.type, { old: value })} label="เก่า" tone="purple" /><PencilCell value={row.w} onChange={(value) => setTypeValue(row.type, { w: value })} label="ใหม่รวม" tone="purple" /><div className="rounded-md bg-yellow-100 px-2 py-3 text-center font-bold dark:bg-yellow-950/40">{row.y}</div><PencilCell value={row.x} onChange={(value) => setTypeValue(row.type, { x: value })} label="X เหลือ" tone="yellow" /><div className="rounded-md bg-yellow-100 px-2 py-3 text-center font-bold dark:bg-yellow-950/40">{row.sold}</div><div className="rounded-md bg-yellow-100 px-2 py-3 text-center font-semibold dark:bg-yellow-950/40">{row.price}</div><div className="rounded-md bg-yellow-200 px-2 py-3 text-right font-bold dark:bg-yellow-900/50">{row.money.toLocaleString()} ฿</div></div></div>)}</CardContent></Card>
    <aside className="flex flex-col gap-2"><Card className="border-amber-700/50"><CardHeader className="bg-amber-100 px-3 py-2 dark:bg-amber-950/40"><CardTitle className="text-sm">ยอดค้างชำระ / บวกเพิ่ม</CardTitle></CardHeader><CardContent className="grid gap-2 p-3"><label className="text-xs">ยอดค้างเดิม<Input inputMode="decimal" value={previousOwed || ''} onChange={(event) => setPreviousOwed(Number(event.target.value) || 0)} /></label><label className="text-xs">บวกเพิ่ม<Input inputMode="decimal" value={addMoney || ''} onChange={(event) => setAddMoney(Number(event.target.value) || 0)} /></label><label className="text-xs">ยอดชำระแล้ว<Input inputMode="decimal" value={amountPaid || ''} onChange={(event) => setAmountPaid(Number(event.target.value) || 0)} /></label><Separator /><div className="flex justify-between font-bold"><span>ยอดสินค้า</span><span>{totalSales.toLocaleString()} ฿</span></div><div className="flex justify-between rounded-md border-2 border-green-600/40 bg-green-50 p-2 font-bold text-green-700 dark:bg-green-950/30 dark:text-green-300"><span>รวม += สมาชิกต้องจ่าย</span><span>{memberPayable.toLocaleString()} ฿</span></div><div className="flex justify-between rounded-md bg-amber-100 p-2 font-bold dark:bg-amber-950/40"><span>ค้างสุทธิหลังชำระ</span><span>{totalDue.toLocaleString()} ฿</span></div></CardContent></Card><Card><CardContent className="grid gap-2 p-3"><Button onClick={saveModeWork} disabled={saving}><Save data-icon="inline-start" />Save Mode Work</Button><Button variant="secondary" onClick={saveBill} disabled={saving}><Save data-icon="inline-start" />Save Bill</Button><Button variant="ghost" onClick={() => { setValues({} as Record<ProductType, TypeValues>); setPreviousOwed(0); setAddMoney(0); setAmountPaid(0) }}><Trash2 data-icon="inline-start" />ล้างแบบฟอร์ม</Button></CardContent></Card></aside></section>
  </div></main>
}
