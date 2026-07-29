'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X, Edit2, Home, Printer, ChevronDown, Package, Calculator, Lock, Receipt, Wallet, PlusCircle, TrendingUp, FileText } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

type Product = {
  id: string;
  name: string;
  priceOut: number;
  priceWalkin: number;
};

type Member = {
  id: string;
  name: string;
};

type BillItem = {
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  totalStock: number;
  returned: number;
  sold: number;
  priceUsed: number;
};

type Bill = {
  id: string;
  memberId: string | null;
  memberName: string | null;
  buyerName: string | null;
  date: string;
  ice: string | null;
  icePrice: number;
  totalSales: number;
  amountPaid: number;
  amountOwed: number;
  previousOwed: number;
  notes: string | null;
  status: string | null;
  dayClosed: boolean;
  createdAt?: string;
  updatedAt?: string;
  items: BillItem[];
  returnInputs: Record<string, any>;
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [formTab, setFormTab] = useState<'pickup' | 'return'>('pickup');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState<Partial<Bill>>({});
  
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  useEffect(() => {
    fetchStaticData();
    
    const unsubscribe = onSnapshot(collection(db, 'bills'), (snapshot) => {
      const billsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
      billsData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setBills(billsData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching bills from Firebase:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchStaticData = async () => {
    try {
      const [productsRes, membersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/members')
      ]);
      setProducts(await productsRes.json());
      setMembers(await membersRes.json());
    } catch (error) {
      console.error('Failed to fetch static data:', error);
    }
  };

  const handleAddNew = () => {
    const defaultItems: BillItem[] = products.map(p => ({
      productId: p.id,
      productName: p.name,
      oldStock: 0,
      newStock: 0,
      totalStock: 0,
      returned: 0,
      sold: 0,
      priceUsed: p.priceOut || 0,
    }));

    setFormData({
      date: new Date().toISOString().split('T')[0],
      memberId: '',
      memberName: '',
      buyerName: '',
      ice: '',
      icePrice: 0,
      totalSales: 0,
      amountPaid: 0,
      amountOwed: 0,
      previousOwed: 0,
      notes: '',
      status: 'draft',
      dayClosed: false,
      items: defaultItems,
      returnInputs: {},
    });
    setEditingBill(null);
    setViewMode('form');
    setFormTab('pickup');
    setExpandedItemIndex(null);
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    // Ensure all products are in the items list, even if not added previously
    let items = [...(bill.items || [])];
    const itemProductIds = new Set(items.map(i => i.productId));
    
    products.forEach(p => {
      if (!itemProductIds.has(p.id)) {
        items.push({
          productId: p.id,
          productName: p.name,
          oldStock: 0,
          newStock: 0,
          totalStock: 0,
          returned: 0,
          sold: 0,
          priceUsed: p.priceOut || 0,
        });
      }
    });

    setFormData({ ...bill, items });
    setViewMode('form');
    setFormTab('pickup');
    setExpandedItemIndex(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bill?')) {
      try {
        await deleteDoc(doc(db, 'bills', id));
      } catch (error) {
        console.error('Failed to delete bill:', error);
      }
    }
  };

  const calculateTotals = (currentFormData: Partial<Bill>) => {
    let newTotalSales = 0;
    
    const updatedItems = (currentFormData.items || []).map(item => {
      const oldS = Number(item.oldStock) || 0;
      const newS = Number(item.newStock) || 0;
      const ret = Number(item.returned) || 0;
      
      const totalStock = oldS + newS;
      const sold = totalStock - ret;
      
      const lineTotal = sold * (Number(item.priceUsed) || 0);
      newTotalSales += lineTotal;
      return { ...item, oldStock: oldS, newStock: newS, returned: ret, sold, totalStock };
    });

    newTotalSales += Number(currentFormData.icePrice || 0);

    const amountPaid = Number(currentFormData.amountPaid || 0);
    const previousOwed = Number(currentFormData.previousOwed || 0);
    const amountOwed = newTotalSales + previousOwed - amountPaid;

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      totalSales: newTotalSales,
      amountOwed
    }));
  };

  const handleFieldChange = (field: keyof Bill, value: any) => {
    const newFormData = { ...formData, [field]: value };
    if (field === 'memberId') {
      const member = members.find(m => m.id === value);
      if (member) newFormData.memberName = member.name;
    }
    setFormData(newFormData);
    if (['icePrice', 'amountPaid', 'previousOwed'].includes(field)) {
      calculateTotals(newFormData);
    }
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...(formData.items || [])];
    
    if (['oldStock', 'newStock', 'returned', 'priceUsed'].includes(field)) {
      newItems[index] = { ...newItems[index], [field]: Number(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    const newFormData = { ...formData, items: newItems };
    calculateTotals(newFormData);
  };

  const handleSubmit = async () => {
    try {
      // Filter out items that have 0 totalStock to save DB space
      const payloadItems = formData.items?.filter(item => item.totalStock > 0 || item.returned > 0) || [];
      
      const payload = {
        ...formData,
        items: payloadItems,
        updatedAt: new Date().toISOString()
      };

      if (editingBill) {
        await setDoc(doc(db, 'bills', editingBill.id), payload, { merge: true });
      } else {
        const newDocRef = doc(collection(db, 'bills'));
        await setDoc(newDocRef, {
          ...payload,
          id: newDocRef.id,
          createdAt: new Date().toISOString()
        });
      }

      setViewMode('list');
    } catch (error) {
      console.error('Failed to save bill:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {viewMode === 'list' ? (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Sales Bills</h1>
            </div>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-5 h-5" /> เพิ่มบิลใหม่
            </button>
          </div>

          {/* Summary Dashboard */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Sales */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Sales (ยอดขายรวม)</p>
                  <p className="text-2xl font-extrabold text-gray-900">
                    ฿{bills.reduce((sum, b) => sum + (b.totalSales || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">จากทั้งหมด {bills.length} บิลในระบบ</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Pending Payments */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pending Payments (ยอดค้างชำระ)</p>
                  <p className="text-2xl font-extrabold text-red-600">
                    ฿{bills.reduce((sum, b) => sum + (b.amountOwed || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">ยอดรวมที่ยังไม่ได้รับชำระ</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* Active Draft Bills Count */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Active Draft Bills (บิลฉบับร่าง)</p>
                  <p className="text-2xl font-extrabold text-amber-600">
                    {bills.filter((b) => b.status === 'draft' || !b.status).length} <span className="text-base font-medium text-gray-600">บิล</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">บิลที่ยังอยู่ในสถานะร่าง / กำลังเบิก</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading data...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 text-sm font-semibold text-gray-600">Date</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Member</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 text-right">Total Sales</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 text-right">Paid</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 text-right">Owed</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-900">{bill.date}</td>
                        <td className="p-4 font-medium text-gray-900">
                          {bill.memberName || bill.buyerName || 'Unknown'}
                        </td>
                        <td className="p-4 text-gray-900 font-medium text-right">฿{bill.totalSales?.toFixed(2)}</td>
                        <td className="p-4 text-green-600 font-medium text-right">฿{bill.amountPaid?.toFixed(2)}</td>
                        <td className="p-4 text-red-600 font-medium text-right">฿{bill.amountOwed?.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${bill.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(bill)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(bill.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bills.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500">
                          No bills found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto pb-24">
          {/* Form Header */}
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <button onClick={() => setViewMode('list')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50">
                 <Home className="w-5 h-5 text-gray-700"/>
               </button>
               <div>
                 <h1 className="text-xl font-bold text-gray-900">
                   {formTab === 'pickup' ? 'เบิกสินค้า' : 'บันทึกยอด'}
                 </h1>
                 <span className="text-sm text-gray-500">{formData.date}</span>
               </div>
             </div>
             <div className="flex gap-2">
               <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-50 shadow-sm">
                 <Printer className="w-4 h-4"/> พิมพ์บิล
               </button>
               <button className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm hover:bg-gray-800">
                 <Plus className="w-4 h-4"/> เพิ่ม
               </button>
             </div>
          </div>

          {/* Member Selection */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center gap-4">
            {formData.memberName ? (
               <div className="bg-black text-white px-5 py-2 rounded-full text-sm font-bold shadow-sm">
                 {formData.memberName}
               </div>
            ) : null}
            <button 
              onClick={() => setIsMemberModalOpen(true)} 
              className="flex items-center gap-2 text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-full transition-colors"
            >
              <PlusCircle className="w-5 h-5"/> {formData.memberName ? 'เปลี่ยนสมาชิก' : 'เลือกสมาชิก'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex rounded-t-xl overflow-hidden border border-gray-200 mb-6 bg-gray-100">
            <button 
              onClick={() => setFormTab('pickup')}
              className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${formTab === 'pickup' ? 'border-t-4 border-t-red-600 bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              เบิกสินค้า
            </button>
            <button 
              onClick={() => setFormTab('return')}
              className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${formTab === 'return' ? 'border-t-4 border-t-red-600 bg-white text-black shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              บันทึกยอด
            </button>
          </div>

          {/* Content based on Tab */}
          {formTab === 'pickup' && (
             <div className="space-y-6">
                {/* Product List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-t-4 border-t-red-600">
                  <div className="p-4 bg-gray-50/80 text-center text-sm text-red-600 font-medium border-b border-gray-200">
                    หน้าแสดงรายการสินค้าที่มาจาก Product มาแสดงเพื่อให้ add item
                  </div>
                  <div className="divide-y divide-gray-100">
                    {formData.items?.map((item, index) => (
                       <div key={item.productId} className="bg-white">
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedItemIndex(expandedItemIndex === index ? null : index)}
                          >
                             <span className="font-bold text-gray-900">{item.productName}</span>
                             <div className="flex items-center gap-3 text-sm">
                               <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md font-medium border border-gray-200">
                                 เก่า {item.oldStock || 0}
                               </span>
                               <span className="bg-black text-white px-3 py-1 rounded-full font-bold shadow-sm">
                                 รวม {item.totalStock || 0}
                               </span>
                               <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedItemIndex === index ? 'rotate-180' : ''}`} />
                             </div>
                          </div>
                          {expandedItemIndex === index && (
                             <div className="p-5 bg-gray-50/50 grid grid-cols-2 gap-6 border-t border-gray-100 shadow-inner">
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-2">ยอดยกมา (เก่า)</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={item.oldStock === 0 ? '' : item.oldStock} 
                                    onChange={(e) => handleItemChange(index, 'oldStock', e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow bg-white" 
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-2">เบิกเพิ่ม (ใหม่)</label>
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={item.newStock === 0 ? '' : item.newStock} 
                                    onChange={(e) => handleItemChange(index, 'newStock', e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow bg-white" 
                                    placeholder="0"
                                  />
                                </div>
                             </div>
                          )}
                       </div>
                    ))}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6 font-bold text-lg text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Package className="w-5 h-5 text-gray-700"/> สรุปยอดเบิก
                    <span className="text-xs font-normal text-gray-500 ml-auto">เก่า + ใหม่ = รวม × ราคา</span>
                  </div>
                  <div className="space-y-4 mb-6 text-sm">
                    {formData.items?.filter(item => item.totalStock > 0).map((item, index) => (
                       <div key={index} className="flex justify-between items-center pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                         <span className="font-medium text-gray-700">{item.productName}</span>
                         <span className="font-bold text-gray-900 text-base">
                           <span className="text-gray-400 font-normal mr-2">({item.totalStock} × ฿{item.priceUsed})</span>
                           {item.totalStock * (item.priceUsed || 0)} บาท
                         </span>
                       </div>
                    ))}
                    {formData.items?.filter(item => item.totalStock > 0).length === 0 && (
                      <div className="text-center text-gray-500 italic py-4">ยังไม่มีสินค้าที่เบิก</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-5 mb-3">
                    <span className="text-gray-500 text-sm font-medium">รวมจำนวนชิ้น</span>
                    <span className="font-bold text-gray-900 text-lg">
                      {formData.items?.reduce((sum, item) => sum + (item.totalStock || 0), 0)} <span className="text-sm font-normal text-gray-500">ชิ้น</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-8">
                    <span className="font-bold text-xl text-gray-900">ยอดเงินรวม</span>
                    <span className="font-black text-3xl text-gray-900">
                      {formData.items?.reduce((sum, item) => sum + ((item.totalStock || 0) * (item.priceUsed || 0)), 0)} <span className="text-lg font-bold text-gray-600">บาท</span>
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormTab('return')}
                    className="w-full bg-black hover:bg-gray-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md text-lg"
                  >
                    ยืนยันการเบิก
                  </button>
                </div>
             </div>
          )}

          {formTab === 'return' && (
             <div className="space-y-6">
                {/* Section 1: Record Returns */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-red-600">
                  <div className="p-5 border-b border-gray-100 flex items-center gap-3 font-bold text-lg text-gray-900">
                    <Calculator className="w-5 h-5 text-red-600"/> 
                    <div>
                      กรอกยอดรวมคงเหลือรายชนิด
                      <div className="text-xs font-normal text-gray-500 mt-0.5">ตรวจสอบยอดขายแยกตามประเภทสินค้า</div>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    {formData.items?.filter(item => item.totalStock > 0).map((item) => {
                       const globalIndex = formData.items!.findIndex(i => i.productId === item.productId);
                       return (
                         <div key={item.productId} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                           <span className="text-sm font-medium text-gray-700">{item.productName}</span>
                           <div className="relative w-56">
                             <input 
                               type="number" 
                               min="0"
                               value={item.returned === 0 ? '' : item.returned} 
                               onChange={(e) => handleItemChange(globalIndex, 'returned', e.target.value)}
                               className="w-full border border-gray-300 rounded-lg p-2.5 text-right pr-14 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow text-gray-900 font-bold"
                               placeholder={`ระบบนับ: ${item.totalStock}`}
                             />
                             <span className="absolute right-4 top-3 text-gray-400 text-sm">ชิ้น</span>
                           </div>
                         </div>
                       );
                    })}
                    {formData.items?.filter(item => item.totalStock > 0).length === 0 && (
                      <div className="text-center text-gray-500 italic py-4">ยังไม่มีสินค้าที่เบิก</div>
                    )}
                    <div className="flex gap-3 pt-6 border-t border-gray-100">
                      <button type="button" className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-sm transition-colors text-sm">
                        ⚡ ไม่เช็คยอด
                      </button>
                      <button type="button" className="flex-1 bg-black hover:bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors text-sm">
                        <Lock className="w-4 h-4"/> ปิดยอด
                      </button>
                    </div>
                    <div className="mt-4 bg-orange-50 text-orange-600 p-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border border-orange-100">
                      <Lock className="w-3 h-3"/> <span>ต้องชำระเงินให้หมดก่อนจึงจะสามารถคืนของได้</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Sales Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-5 border-b border-gray-100 flex items-center gap-3 font-bold text-lg text-gray-900">
                    <Receipt className="w-5 h-5 text-gray-700"/> 
                    <div>
                      สรุปยอดขาย
                      <div className="text-xs font-normal text-gray-500 mt-0.5">รวม - เหลือ = ขาย</div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 text-sm">
                    {formData.items?.filter(item => item.sold > 0).map((item, index) => (
                       <div key={index} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                         <span className="font-medium text-gray-700">{item.productName}</span>
                         <div className="text-gray-500">
                           ({item.totalStock} - {item.returned}) × {item.priceUsed} = <span className="font-bold text-gray-900 text-base">{item.sold * item.priceUsed} บาท</span>
                         </div>
                       </div>
                    ))}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2 text-blue-600 font-medium">
                        🧊 น้ำแข็งแห้ง
                        <input 
                          type="number"
                          value={formData.icePrice || ''}
                          onChange={(e) => handleFieldChange('icePrice', e.target.value)}
                          placeholder="0"
                          className="w-20 border border-blue-200 rounded p-1 text-right text-sm ml-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <span className="font-bold text-blue-600">+{formData.icePrice || 0} บาท</span>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                       <span className="font-bold text-xl text-gray-900">ยอดเงินรวม</span>
                       <span className="font-black text-3xl text-gray-900">{formData.totalSales} บาท</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Payment */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5 border-b border-blue-100 flex items-center gap-3 font-bold text-lg text-blue-900 bg-blue-50/50">
                    <Wallet className="w-5 h-5 text-blue-600"/> 
                    <div>
                      บันทึกการจ่ายเงิน
                      <div className="text-xs font-normal text-blue-600/70 mt-0.5">ยอดที่ได้รับจากผู้ขาย</div>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="flex justify-between items-center p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                      <span className="font-medium">ยอดสินค้า:</span>
                      <span className="font-bold text-lg">{formData.totalSales} บาท</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-orange-50 text-orange-800 rounded-xl border border-orange-100">
                      <span className="font-medium">ยอดค้างสะสม:</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={formData.previousOwed || ''}
                          onChange={(e) => handleFieldChange('previousOwed', e.target.value)}
                          className="w-24 bg-white border border-orange-200 rounded-lg p-1.5 text-right font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <span className="font-bold text-lg">บาท</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">ยอดจ่ายวันนี้ (บาท)</label>
                      <div className="flex gap-3">
                        <input 
                          type="number" 
                          min="0"
                          value={formData.amountPaid === 0 ? '' : formData.amountPaid}
                          onChange={(e) => handleFieldChange('amountPaid', e.target.value)}
                          className="flex-1 border border-gray-300 rounded-xl p-4 text-xl font-black text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                          placeholder="0"
                        />
                        <button 
                          type="button" 
                          onClick={() => handleFieldChange('amountPaid', (formData.totalSales || 0) + (formData.previousOwed || 0))}
                          className="px-6 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                          จ่ายครบ
                        </button>
                      </div>
                    </div>

                    <div className={`flex justify-between items-center p-5 rounded-xl border ${Number(formData.amountOwed) > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      <span className="font-bold text-lg">ยอดค้างสุทธิรวม</span>
                      <span className="font-black text-3xl">{formData.amountOwed} บาท</span>
                    </div>

                    <div className="pt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
                      <input 
                        type="text" 
                        value={formData.notes || ''}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        placeholder="บันทึกเพิ่มเติม..."
                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleSubmit}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-6 shadow-sm transition-colors text-lg"
                    >
                      <Lock className="w-5 h-5"/> ปิดวัน (บันทึกยอด)
                    </button>
                    <div className="text-center text-xs text-gray-400 mt-3">
                      ต้องยืนยันการเบิกก่อนจึงจะปิดวันได้
                    </div>
                  </div>
                </div>
             </div>
          )}
        </div>
      )}

      {/* Member Selection Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-xl text-gray-900">เลือกสมาชิก</h3>
              <button 
                onClick={() => setIsMemberModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
               {members.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">ไม่พบข้อมูลสมาชิก</div>
               ) : (
                 members.map(m => (
                   <button 
                     key={m.id}
                     onClick={() => {
                       handleFieldChange('memberId', m.id);
                       setIsMemberModalOpen(false);
                     }}
                     className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 focus:ring-2 focus:ring-red-500 transition-all font-medium text-gray-700"
                   >
                     {m.name}
                   </button>
                 ))
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
