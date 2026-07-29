'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save, X, Edit2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

type FlavorDetail = {
  flavorName: string;
  quantity: number;
};

type SupplyOrderItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  totalQuantity: number;
  totalAmount: number;
  details: FlavorDetail[];
};

type SupplyOrder = {
  id: string;
  date: string;
  totalOrderAmount: number;
  marginAmount: number;
  items: SupplyOrderItem[];
  createdAt?: string;
};

type Product = {
  id: string;
  name: string;
  priceIn: number;
  priceOut: number;
};

export default function SupplyOrdersPage() {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingOrder, setEditingOrder] = useState<SupplyOrder | null>(null);
  const [formData, setFormData] = useState<Partial<SupplyOrder>>({});

  useEffect(() => {
    fetchProducts();
    
    const unsubscribe = onSnapshot(collection(db, 'supply-orders'), (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplyOrder));
      // Sort by date descending
      ordersData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setOrders(ordersData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching supply orders from Firebase:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleAddNew = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      totalOrderAmount: 0,
      marginAmount: 0,
      items: [],
    });
    setEditingOrder(null);
    setViewMode('form');
  };

  const handleEdit = (order: SupplyOrder) => {
    setEditingOrder(order);
    setFormData({ ...order, items: order.items || [] });
    setViewMode('form');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteDoc(doc(db, 'supply-orders', id));
      } catch (error) {
        console.error('Failed to delete order:', error);
      }
    }
  };

  const calculateTotals = (items: SupplyOrderItem[]) => {
    let totalOrderAmount = 0;
    
    const updatedItems = items.map(item => {
      // Calculate total quantity from flavors if details exist, otherwise use direct quantity
      const calculatedQty = item.details.length > 0 
        ? item.details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0)
        : Number(item.totalQuantity) || 0;
      
      const lineTotal = calculatedQty * (Number(item.unitPrice) || 0);
      totalOrderAmount += lineTotal;
      
      return { 
        ...item, 
        totalQuantity: calculatedQty,
        totalAmount: lineTotal 
      };
    });

    // Dummy margin calculation: say 20% margin as example, adjust as needed or let user input it
    // For this app, let's just make it user input or a simple math. Let's keep it as is if they don't want it auto.
    const marginAmount = totalOrderAmount * 0.2; // Example 20% margin

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      totalOrderAmount,
      marginAmount: prev.marginAmount || marginAmount
    }));
  };

  const handleAddItem = () => {
    const newItems = [...(formData.items || []), {
      productId: '',
      productName: '',
      unitPrice: 0,
      totalQuantity: 0,
      totalAmount: 0,
      details: []
    }];
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    calculateTotals(newItems);
  };

  const handleItemChange = (index: number, field: keyof SupplyOrderItem, value: any) => {
    const newItems = [...(formData.items || [])];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.priceIn || 0;
      }
    }
    newItems[index] = { ...newItems[index], [field]: value };
    calculateTotals(newItems);
  };

  const handleAddDetail = (itemIndex: number) => {
    const newItems = [...(formData.items || [])];
    newItems[itemIndex].details.push({ flavorName: '', quantity: 0 });
    calculateTotals(newItems);
  };

  const handleRemoveDetail = (itemIndex: number, detailIndex: number) => {
    const newItems = [...(formData.items || [])];
    newItems[itemIndex].details.splice(detailIndex, 1);
    calculateTotals(newItems);
  };

  const handleDetailChange = (itemIndex: number, detailIndex: number, field: keyof FlavorDetail, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[itemIndex].details[detailIndex] = { ...newItems[itemIndex].details[detailIndex], [field]: value };
    calculateTotals(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrder) {
        await setDoc(doc(db, 'supply-orders', editingOrder.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        const newDocRef = doc(collection(db, 'supply-orders'));
        await setDoc(newDocRef, {
          ...formData,
          id: newDocRef.id,
          createdAt: new Date().toISOString()
        });
      }

      setViewMode('list');
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'list' ? 'Supply Orders' : (editingOrder ? 'Edit Supply Order' : 'Create Supply Order')}
            </h1>
          </div>
          {viewMode === 'list' ? (
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Order
            </button>
          ) : (
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-sm font-semibold text-gray-600">Date</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-right">Total Amount</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 text-right">Margin Amount</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-gray-900">{order.date}</td>
                      <td className="p-4 font-medium text-gray-900 text-right">฿{order.totalOrderAmount?.toFixed(2)}</td>
                      <td className="p-4 text-green-600 font-medium text-right">฿{order.marginAmount?.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No supply orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Margin Amount (฿)</label>
                  <input
                    type="number"
                    value={formData.marginAmount || ''}
                    onChange={(e) => setFormData({ ...formData, marginAmount: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex justify-between items-center h-[46px]">
                    <span className="font-semibold text-sm">Total Order:</span>
                    <span className="font-bold text-lg">฿{(formData.totalOrderAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Ordered Items</h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="space-y-6">
                {(formData.items || []).map((item, itemIndex) => (
                  <div key={itemIndex} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(itemIndex)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-12">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'productId', e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (฿)</label>
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'unitPrice', Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Total Qty</label>
                        <input
                          type="number"
                          value={item.totalQuantity || ''}
                          onChange={(e) => handleItemChange(itemIndex, 'totalQuantity', Number(e.target.value))}
                          disabled={item.details.length > 0}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="pl-4 border-l-2 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Flavors / Details</h4>
                        <button
                          type="button"
                          onClick={() => handleAddDetail(itemIndex)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Flavor
                        </button>
                      </div>
                      
                      {item.details.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">No flavors specified. Using direct Total Qty.</p>
                      ) : (
                        <div className="space-y-2">
                          {item.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-center gap-3">
                              <input
                                type="text"
                                placeholder="Flavor name (e.g. ทุเรียน)"
                                value={detail.flavorName || ''}
                                onChange={(e) => handleDetailChange(itemIndex, detailIndex, 'flavorName', e.target.value)}
                                className="flex-1 border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                              <input
                                type="number"
                                placeholder="Qty"
                                value={detail.quantity || ''}
                                onChange={(e) => handleDetailChange(itemIndex, detailIndex, 'quantity', Number(e.target.value))}
                                className="w-24 border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveDetail(itemIndex, detailIndex)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block mb-1">Line Total</span>
                        <span className="font-bold text-green-600">฿{(item.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!formData.items || formData.items.length === 0) && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    No items added yet. Click "Add Item" to start.
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg shadow-sm"
              >
                <Save className="w-5 h-5" /> Save Supply Order
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
