'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Product, ProductType, PRODUCT_TYPE_LABELS, ProductCategory, PRODUCT_CATEGORY_LABELS } from '@/lib/types';
import { sortProductTypes } from '@/lib/ledger-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, DollarSign, Camera, Upload, Link, Image as ImageIcon } from 'lucide-react';

interface ProductFormData {
  id: string;
  isManualId: boolean;
  name: string;
  type: string; // can be a custom type name
  isCustomType: boolean;
  customTypeName?: string;
  category: ProductCategory;
  priceIn: number;
  priceOut: number;
  priceWalkIn: number;
  imageUrl: string;
  sortOrder: number;
}

interface PriceCategoryFormData {
  type: string;
  priceIn: number;
  priceOut: number;
  priceWalkIn: number;
}

const PRESET_IMAGES = [
  'https://cdn.phototourl.com/free/2026-06-16-0a7bc54d-6982-492e-bf3c-54a3df52e7d4.jpg',
  'https://cdn.phototourl.com/free/2026-06-29-2991ff28-b43f-4fb2-b922-8f528d8140dd.jpg'
];

export function ProductSettings() {
  const { products, addProduct, updateProduct, deleteProduct, updatePricesByType } = useStore();
  
  // State สำหรับจัดการ Dialog ของสินค้า
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState<ProductFormData>({
    id: '',
    isManualId: false,
    name: '',
    type: 'XL',
    isCustomType: false,
    customTypeName: '',
    category: 'XL',
    priceIn: 0,
    priceOut: 0,
    priceWalkIn: 0,
    imageUrl: '',
    sortOrder: 0,
  });

  // State สำหรับจัดการ Dialog แก้ไขราคารายหมวดหมู่
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [priceFormData, setPriceFormData] = useState<PriceCategoryFormData>({
    type: '',
    priceIn: 0,
    priceOut: 0,
    priceWalkIn: 0,
  });

  // State สำหรับการลบ
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // State สำหรับจัดการกล้อง
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ดึงหมวดหมู่ทั้งหมดที่มีอยู่จริงในระบบ และจัดเรียงตามลำดับความสำคัญของสินค้าในหมวดหมู่นั้น (จัดลำดับตามหมวดหมู่หลัก)
  const existingTypes = sortProductTypes(Array.from(new Set(products.map((p) => p.type))));
  
  // รวมป้ายชื่อ (Labels) สำหรับการแสดงผลหน้าจอ
  const getTypeLabel = (type: string) => {
    return PRODUCT_TYPE_LABELS[type as ProductType] || type;
  };

  // จัดกลุ่มสินค้าตามประเภท และจัดเรียงสินค้าภายในแต่ละกลุ่มตาม sortOrder
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.type]) {
      acc[product.type] = [];
    }
    acc[product.type].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // เรียงลำดับสินค้าในแต่ละหมวดหมู่ตาม sortOrder
  Object.keys(groupedProducts).forEach((type) => {
    groupedProducts[type].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  // --- จัดการกล้องถ่ายรูป ---
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.error("Error playing video:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("ไม่สามารถเข้าถึงกล้องถ่ายภาพได้: " + (err.message || err.name));
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setProductFormData(prev => ({ ...prev, imageUrl: dataUrl }));
      }
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // --- จัดการอัปโหลดไฟล์ ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- จัดการสินค้า (Add / Edit Product Name) ---
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductFormData({
      id: '',
      isManualId: false,
      name: '',
      type: existingTypes[0] || 'XL',
      isCustomType: false,
      customTypeName: '',
      category: 'XL',
      priceIn: 0,
      priceOut: 0,
      priceWalkIn: 0,
      imageUrl: '',
      sortOrder: products.length + 1,
    });
    setIsCameraActive(false);
    setCameraError(null);
    setIsProductDialogOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      id: product.id,
      isManualId: false,
      name: product.name,
      type: product.type,
      isCustomType: false,
      customTypeName: '',
      category: product.category || 'XL',
      priceIn: product.priceIn || 0,
      priceOut: product.priceOut || 0,
      priceWalkIn: product.priceWalkIn || 0,
      imageUrl: product.imageUrl || '',
      sortOrder: product.sortOrder || 0,
    });
    setIsCameraActive(false);
    setCameraError(null);
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = () => {
    if (!productFormData.name.trim()) return;

    // คำนวณหาชื่อประเภทสินค้าที่จะใช้บันทึก
    const finalType = productFormData.isCustomType 
      ? (productFormData.customTypeName?.trim() || 'General')
      : productFormData.type;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: productFormData.name,
        type: finalType as ProductType,
        category: productFormData.category,
        priceIn: editingProduct.priceIn,
        priceOut: editingProduct.priceOut,
        priceWalkIn: editingProduct.priceWalkIn,
        imageUrl: productFormData.imageUrl,
        sortOrder: productFormData.sortOrder,
      });
    } else {
      // ค้นหาว่าในหมวดหมู่นี้มีราคาตั้งต้นอยู่แล้วหรือไม่ เพื่อให้ราคาสินค้าชิ้นใหม่เท่ากับเพื่อนในกลุ่ม
      const sameTypeProduct = products.find(p => p.type === finalType);
      
      const pData: Partial<Product> = {
        name: productFormData.name,
        type: finalType as ProductType,
        category: productFormData.category,
        priceIn: sameTypeProduct ? sameTypeProduct.priceIn : 0,
        priceOut: sameTypeProduct ? sameTypeProduct.priceOut : 0,
        priceWalkIn: sameTypeProduct ? sameTypeProduct.priceWalkIn : 0,
        imageUrl: productFormData.imageUrl,
        sortOrder: productFormData.sortOrder,
      };
      if (productFormData.isManualId && productFormData.id.trim() !== '') {
        pData.id = productFormData.id.trim();
      }
      addProduct(pData);
    }

    setIsProductDialogOpen(false);
  };

  // --- จัดการแก้ไขราคารายหมวดหมู่ (Edit Prices By Category) ---
  const handleOpenEditPrice = (type: string) => {
    const typeProducts = groupedProducts[type] || [];
    // ดึงราคาตัวอย่างจากสินค้าตัวแรกในหมวดหมู่
    const sampleProduct = typeProducts[0];

    setPriceFormData({
      type: type,
      priceIn: sampleProduct ? sampleProduct.priceIn : 0,
      priceOut: sampleProduct ? sampleProduct.priceOut : 0,
      priceWalkIn: sampleProduct ? sampleProduct.priceWalkIn : 0,
    });
    setIsPriceDialogOpen(true);
  };

  const handleSavePrice = () => {
    // เรียกฟังก์ชันเพื่ออัปเดตราคาทั้งหมดของสินค้ารายประเภทใน Store/JSON
    if (updatePricesByType) {
      updatePricesByType(priceFormData.type, {
        priceIn: priceFormData.priceIn,
        priceOut: priceFormData.priceOut,
        priceWalkIn: priceFormData.priceWalkIn,
      });
    } else {
      // กรณีฟังก์ชันเฉพาะเจาะจงไม่มี ให้วนลูป updateProduct รายตัวแทน
      const targets = groupedProducts[priceFormData.type] || [];
      targets.forEach(product => {
        updateProduct(product.id, {
          ...product,
          priceIn: priceFormData.priceIn,
          priceOut: priceFormData.priceOut,
          priceWalkIn: priceFormData.priceWalkIn,
        });
      });
    }
    setIsPriceDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">สินค้า ({products.length})</CardTitle>
        <Button size="sm" onClick={handleOpenAddProduct}>
          <Plus className="w-4 h-4 mr-1" />
          เพิ่มสินค้า
        </Button>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            ยังไม่มีสินค้า กดปุ่มเพิ่มเพื่อเริ่มต้น
          </p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {existingTypes.map((type) => {
              const typeProducts = groupedProducts[type] || [];
              if (typeProducts.length === 0) return null;
              
              const sample = typeProducts[0];

              return (
                <AccordionItem key={type} value={type} className="border-b">
                  <div className="flex items-center justify-between pr-2">
                    <AccordionTrigger className="text-sm font-medium flex-1 py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full text-left pr-4">
                        <span>{getTypeLabel(type)} ({typeProducts.length})</span>
                        {/* แสดงราคารวมประจำหมวดหมู่ตรงหัวข้อ */}
                        <div className="hidden sm:flex gap-3 text-xs text-muted-foreground ml-auto">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">In: {sample?.priceIn}</span>
                          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">Out: {sample?.priceOut}</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">WalkIn: {sample?.priceWalkIn}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    {/* ปุ่มสำหรับแก้ไขราคาทั้งหมวดหมู่ */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditPrice(type);
                      }}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      แก้ไขราคาหมวดหมู่
                    </Button>
                  </div>

                  <AccordionContent className="pt-1 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                      {typeProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded-md border bg-muted"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-muted-foreground font-mono">
                                <span className="bg-muted px-1.5 py-0.2 rounded text-foreground">ID: {product.id}</span>
                                <span className="bg-muted px-1.5 py-0.2 rounded">ลำดับ: {product.sortOrder}</span>
                                <span className="bg-muted px-1.5 py-0.2 rounded text-blue-600">In: {product.priceIn}</span>
                                <span className="bg-muted px-1.5 py-0.2 rounded text-orange-600">Out: {product.priceOut}</span>
                                <span className="bg-muted px-1.5 py-0.2 rounded text-green-600">WalkIn: {product.priceWalkIn}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditProduct(product)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(product)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
        
      {/* --- Dialog สำหรับ เพิ่ม/แก้ไข ชื่อและประเภทสินค้า --- */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</DialogTitle>
            <DialogDescription>กรอกข้อมูลรายละเอียดของสินค้าให้ครบถ้วน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* รหัสสินค้า (Product ID) */}
            {editingProduct ? (
              <div className="space-y-2 bg-muted/40 p-2.5 rounded-lg border border-dashed">
                <span className="text-xs text-muted-foreground block font-medium">รหัสสินค้า (Product ID)</span>
                <span className="font-mono text-sm font-semibold text-foreground">{editingProduct.id}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isManualProductId"
                    checked={productFormData.isManualId}
                    onCheckedChange={(checked) =>
                      setProductFormData({ ...productFormData, isManualId: !!checked })
                    }
                  />
                  <Label htmlFor="isManualProductId" className="text-sm cursor-pointer font-medium">ระบุรหัสสินค้าเอง (Manual ID)</Label>
                </div>
                {productFormData.isManualId && (
                  <Input
                    id="productIdInput"
                    value={productFormData.id}
                    onChange={(e) => setProductFormData({ ...productFormData, id: e.target.value })}
                    placeholder="กรอกรหัสสินค้าที่ต้องการ"
                    className="font-mono"
                  />
                )}
              </div>
            )}

            {/* ชื่อสินค้า */}
            <div className="space-y-2">
              <Label htmlFor="productName">ชื่อสินค้า</Label>
              <Input
                id="productName"
                value={productFormData.name}
                onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                placeholder="กรอกชื่อสินค้า"
              />
            </div>

            {/* ประเภทสินค้า (Type) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ประเภทสินค้า (Type กลุ่มราคา)</Label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setProductFormData({ 
                    ...productFormData, 
                    isCustomType: !productFormData.isCustomType 
                  })}
                >
                  {productFormData.isCustomType ? 'เลือกจากที่มีอยู่' : '+ เพิ่มประเภทใหม่'}
                </button>
              </div>

              {productFormData.isCustomType ? (
                <Input
                  value={productFormData.customTypeName || ''}
                  onChange={(e) => setProductFormData({ ...productFormData, customTypeName: e.target.value })}
                  placeholder="พิมพ์ชื่อประเภทสินค้าใหม่ เช่น XXL, ล้างรถ"
                />
              ) : (
                <Select
                  value={productFormData.type}
                  onValueChange={(value) => setProductFormData({ ...productFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* แสดงป้ายเริ่มต้นร่วมกับประเภท Custom เดิมที่มีอยู่ในระบบ */}
                    {Array.from(new Set([...Object.keys(PRODUCT_TYPE_LABELS), ...existingTypes])).map((type) => (
                      <SelectItem key={type} value={type}>
                        {getTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>


            {/* หมวดหมู่ (Category) และ ลำดับการเรียง (Sort Order) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-2">
                <Label htmlFor="category">Category (หมวดหมู่ไอติม)</Label>
                <Select
                  value={productFormData.category}
                  onValueChange={(value: ProductCategory) =>
                    setProductFormData({ ...productFormData, category: value })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="เลือกหมวดหมู่ไอติม" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUCT_CATEGORY_LABELS).map(([cat, label]) => (
                      <SelectItem key={cat} value={cat}>
                        {label} ({cat})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">ลำดับการเรียง (Sort Order)</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={productFormData.sortOrder}
                  onChange={(e) => setProductFormData({ ...productFormData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>
            </div>

            {/* รูปภาพสินค้า */}
            <div className="space-y-2 border-t pt-4">
              <Label className="text-sm font-semibold">รูปภาพสินค้า</Label>
              
              {/* Preview */}
              <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-lg border">
                {productFormData.imageUrl ? (
                  <div className="relative group w-16 h-16 rounded-md overflow-hidden border">
                    <img
                      src={productFormData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/60 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      onClick={() => setProductFormData({ ...productFormData, imageUrl: '' })}
                    >
                      ลบรูปภาพ
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-md border border-dashed flex flex-col items-center justify-center text-[10px] text-muted-foreground bg-card">
                    <ImageIcon className="w-5 h-5 mb-1" />
                    ไม่มีรูป
                  </div>
                )}
                <div className="flex-1 text-xs text-muted-foreground space-y-1">
                  <p>เลือกวิธีใส่รูปภาพสินค้าด้านล่าง</p>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Camera Button */}
                    {isCameraActive ? (
                      <Button type="button" variant="destructive" size="sm" className="text-[10px] h-7 px-2" onClick={stopCamera}>
                        ปิดกล้อง
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="text-[10px] h-7 px-2 gap-1" onClick={startCamera}>
                        <Camera className="w-3 h-3" />
                        ถ่ายภาพด้วยกล้อง
                      </Button>
                    )}
                    
                    {/* File Upload Button */}
                    <Label htmlFor="file-upload-btn" className="cursor-pointer inline-flex items-center justify-center rounded-md text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 gap-1">
                      <Upload className="w-3 h-3" />
                      เลือกจากเครื่อง
                    </Label>
                    <input
                      id="file-upload-btn"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {/* Camera Capture Native Fallback Input for mobile browsers */}
                    <Label htmlFor="camera-capture-native-btn" className="cursor-pointer inline-flex items-center justify-center rounded-md text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-7 px-2 gap-1 sm:hidden">
                      <Camera className="w-3 h-3" />
                      ถ่ายด่วน
                    </Label>
                    <input
                      id="camera-capture-native-btn"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              {/* Live Camera View */}
              {isCameraActive && (
                <div className="space-y-2 p-2.5 rounded-lg border bg-muted/30 animate-in fade-in duration-200">
                  <div className="relative aspect-video rounded-md overflow-hidden bg-black border">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover scale-x-[-1]"
                      playsInline
                      muted
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={stopCamera}>
                      ยกเลิก
                    </Button>
                    <Button type="button" variant="default" size="sm" onClick={capturePhoto}>
                      กดถ่ายรูป
                    </Button>
                  </div>
                </div>
              )}

              {cameraError && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md font-medium">{cameraError}</p>
              )}

              {/* Preset Images Selection */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground block">เลือกจากรูปภาพแนะนำ</span>
                <div className="flex gap-2">
                  {PRESET_IMAGES.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                        productFormData.imageUrl === url ? 'border-primary scale-105' : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setProductFormData({ ...productFormData, imageUrl: url })}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="w-12 h-12 rounded-md border-2 border-dashed flex items-center justify-center text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => setProductFormData({ ...productFormData, imageUrl: '' })}
                  >
                    ล้าง
                  </button>
                </div>
              </div>

              {/* Link Input */}
              <div className="space-y-1">
                <Label htmlFor="imageUrl" className="text-xs text-muted-foreground font-medium">หรือใส่ลิงก์รูปภาพโดยตรง (Image URL)</Label>
                <div className="relative">
                  <Input
                    id="imageUrl"
                    value={productFormData.imageUrl}
                    onChange={(e) => setProductFormData({ ...productFormData, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg หรือ base64 data"
                    className="pr-8 text-xs font-mono"
                  />
                  <Link className="w-3.5 h-3.5 absolute right-2.5 top-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Metadata (timestamps) */}
            {editingProduct && (
              <div className="text-[11px] text-muted-foreground space-y-1 pt-2.5 border-t border-border font-mono">
                <div>สร้างเมื่อ (created_at): {new Date(editingProduct.createdAt).toLocaleString('th-TH')}</div>
                <div>อัปเดตล่าสุด (updated_at): {new Date(editingProduct.updatedAt).toLocaleString('th-TH')}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>ยกเลิก</Button>
            <Button 
              onClick={handleSaveProduct} 
              disabled={!productFormData.name.trim() || (productFormData.isCustomType && !productFormData.customTypeName?.trim())}
            >
              {editingProduct ? 'บันทึก' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Dialog สำหรับ แก้ไขราคาตามหมวดหมู่ (Batch Update) --- */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขราคาประจำหมวดหมู่: {getTypeLabel(priceFormData.type)}</DialogTitle>
            <DialogDescription>
              การแก้ไขราคาที่นี่ จะมีผลกับสินค้าทุกชิ้นที่อยู่ในหมวดหมู่นี้ทันที
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulkPriceIn" className="text-xs">Price In (บ้าน/รถ)</Label>
              <Input
                id="bulkPriceIn"
                type="number"
                step="0.5"
                min="0"
                value={priceFormData.priceIn}
                onChange={(e) => setPriceFormData({ ...priceFormData, priceIn: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkPriceOut" className="text-xs">Price Out</Label>
              <Input
                id="bulkPriceOut"
                type="number"
                step="0.5"
                min="0"
                value={priceFormData.priceOut}
                onChange={(e) => setPriceFormData({ ...priceFormData, priceOut: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkPriceWalkIn" className="text-xs">Price WalkIn</Label>
              <Input
                id="bulkPriceWalkIn"
                type="number"
                step="0.5"
                min="0"
                value={priceFormData.priceWalkIn}
                onChange={(e) => setPriceFormData({ ...priceFormData, priceWalkIn: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSavePrice}>บันทึกราคาหมวดหมู่</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบสินค้า &quot;{deleteTarget?.name}&quot; ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}