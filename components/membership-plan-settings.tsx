'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function MembershipPlanSettings() {
  const { membershipPlans, addons, addMembershipPlan, updateMembershipPlan, deleteMembershipPlan, addAddon, updateAddon, deleteAddon } = useStore();
  const [planName, setPlanName] = useState('');
  const [addonName, setAddonName] = useState('');
  const [addonPrice, setAddonPrice] = useState('0');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);

  const savePlan = () => {
    const name = planName.trim();
    if (!name) return;
    if (editingPlanId) updateMembershipPlan(editingPlanId, { name });
    else addMembershipPlan({ name, code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), active: true, addonIds: [] });
    setPlanName('');
    setEditingPlanId(null);
  };

  const saveAddon = () => {
    const name = addonName.trim();
    if (!name) return;
    const price = Math.max(0, Number(addonPrice) || 0);
    if (editingAddonId) updateAddon(editingAddonId, { name, price });
    else addAddon({ name, price, active: true });
    setAddonName('');
    setAddonPrice('0');
    setEditingAddonId(null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Membership Plans ({membershipPlans.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="เช่น In, Out, Walk-in" aria-label="ชื่อ Membership Plan" />
            <Button onClick={savePlan} size="icon" aria-label={editingPlanId ? 'บันทึกแผนสมาชิก' : 'เพิ่มแผนสมาชิก'}><Plus data-icon="inline-start" /></Button>
          </div>
          <div className="flex flex-col gap-2">
            {membershipPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</p>
                  {addons.length > 0 && <div className="mt-2 flex flex-wrap gap-3">
                    {addons.filter((addon) => addon.active).map((addon) => <label key={addon.id} className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={plan.addonIds.includes(addon.id)} onChange={(event) => updateMembershipPlan(plan.id, { addonIds: event.target.checked ? [...plan.addonIds, addon.id] : plan.addonIds.filter((id) => id !== addon.id) })} />
                      {addon.name}
                    </label>)}
                  </div>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingPlanId(plan.id); setPlanName(plan.name); }} aria-label={`แก้ไข ${plan.name}`}><Pencil data-icon="inline-start" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMembershipPlan(plan.id)} aria-label={`ลบ ${plan.name}`}><Trash2 data-icon="inline-start" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Add-ons / บริการเสริม ({addons.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_100px_auto] gap-2">
            <Input value={addonName} onChange={(e) => setAddonName(e.target.value)} placeholder="เช่น ค่าบ้าน" aria-label="ชื่อบริการเสริม" />
            <Input type="number" min="0" value={addonPrice} onChange={(e) => setAddonPrice(e.target.value)} placeholder="ราคา" aria-label="ราคาบริการเสริม" />
            <Button onClick={saveAddon} size="icon" aria-label={editingAddonId ? 'บันทึกบริการเสริม' : 'เพิ่มบริการเสริม'}><Plus data-icon="inline-start" /></Button>
          </div>
          <div className="flex flex-col gap-2">
            {addons.map((addon) => (
              <div key={addon.id} className="flex items-center justify-between rounded-lg border p-3">
                <div><p className="font-medium">{addon.name}</p><p className="text-xs text-muted-foreground">{addon.price.toLocaleString()} บาท · {addon.active ? 'ใช้งาน' : 'ปิดใช้งาน'}</p></div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingAddonId(addon.id); setAddonName(addon.name); setAddonPrice(String(addon.price)); }} aria-label={`แก้ไข ${addon.name}`}><Pencil data-icon="inline-start" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteAddon(addon.id)} aria-label={`ลบ ${addon.name}`}><Trash2 data-icon="inline-start" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
