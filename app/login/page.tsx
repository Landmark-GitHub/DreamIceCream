// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useStore } from '@/lib/store';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import { Phone, LogIn, AlertCircle } from 'lucide-react';

// export default function LoginPage() {
//   const router = useRouter();
//   const {login, _isLoaded } = useStore();
//   const [phone, setPhone] = useState('0999999999');
//   const [error, setError] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setIsLoading(true);

//     // Normalize phone number (remove spaces, dashes)
//     const normalizedPhone = phone.replace(/[\s-]/g, '');

//     if (normalizedPhone.length !== 10) {
//       setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
//       setIsLoading(false);
//       return;
//     }

//     const user = login(normalizedPhone);
    
    
//     if (user) {
//       router.push('/');
//     } else {
//       setError('ไม่พบเบอร์โทรศัพท์นี้ในระบบ กรุณาติดต่อผู้ดูแล');
//     }
    
//     setIsLoading(false);
//   };

//   if (!_isLoaded) {
//     return (
//       <main className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
//           <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
//         </div>
//       </main>
//     );
//   }

//   return (
//     <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-chart-2/5 flex items-center justify-center p-4">
//       <Card className="w-full max-w-sm">
//         <CardHeader className="text-center">
//           {/* Logo */}
//           <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
//             <svg viewBox="0 0 64 64" className="w-10 h-10">
//               <path fill="#8B5CF6" d="M32 8c-8 0-14 6-14 14v4h28v-4c0-8-6-14-14-14z" />
//               <path fill="#EC4899" d="M18 26h28v6c0 12-6 24-14 24s-14-12-14-24v-6z" />
//               <path fill="#F59E0B" d="M28 8c-2-4-4-6-4-6s4 0 8 0 8 0 8 0-2 2-4 6h-8z" />
//             </svg>
//           </div>
//           <CardTitle className="text-xl">Dream IceCream</CardTitle>
//           <CardDescription>เข้าสู่ระบบด้วยเบอร์โทรศัพท์</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
//               <div className="relative">
//                 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                 <Input
//                   id="phone"
//                   type="tel"
//                   placeholder="0XX-XXX-XXXX"
//                   value={phone}
//                   onChange={(e) => {
//                     setPhone(e.target.value);
//                     setError('');
//                   }}
//                   className="pl-10"
//                   maxLength={10}
//                   autoComplete="tel"
//                 />
//               </div>
//             </div>

//             {error && (
//               <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
//                 <AlertCircle className="w-4 h-4 flex-shrink-0" />
//                 <span>{error}</span>
//               </div>
//             )}

//             <Button type="submit" className="w-full" disabled={isLoading || !phone}>
//               {isLoading ? (
//                 <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
//               ) : (
//                 <>
//                   <LogIn className="w-4 h-4 mr-2" />
//                   เข้าสู่ระบบ
//                 </>
//               )}
//             </Button>
//           </form>

//           <p className="text-xs text-muted-foreground text-center mt-4">
//             หากยังไม่มีบัญชี กรุณาติดต่อผู้ดูแลระบบ
//           </p>
//         </CardContent>
//       </Card>
//     </main>
//   );
// }


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Phone, LogIn, AlertCircle } from 'lucide-react';
import PriceNoticeModal from '@/components/PriceNoticeModal'; // <-- Import เพิ่มเติม

export default function LoginPage() {
  const router = useRouter();
  const { login, _isLoaded } = useStore();
  const [phone, setPhone] = useState('0999999999');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedPhone = phone.replace(/[\s-]/g, '');

    if (normalizedPhone.length !== 10) {
      setError('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก');
      setIsLoading(false);
      return;
    }

    const user = login(normalizedPhone);
    
    if (user) {
      router.push('/');
    } else {
      setError('ไม่พบเบอร์โทรศัพท์นี้ในระบบ กรุณาติดต่อผู้ดูแล');
    }
    
    setIsLoading(false);
  };

  if (!_isLoaded) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">กำลังโหลด...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-chart-2/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <svg viewBox="0 0 64 64" className="w-10 h-10">
              <path fill="#8B5CF6" d="M32 8c-8 0-14 6-14 14v4h28v-4c0-8-6-14-14-14z" />
              <path fill="#EC4899" d="M18 26h28v6c0 12-6 24-14 24s-14-12-14-24v-6z" />
              <path fill="#F59E0B" d="M28 8c-2-4-4-6-4-6s4 0 8 0 8 0 8 0-2 2-4 6h-8z" />
            </svg>
          </div>
          <CardTitle className="text-xl">Dream IceCream</CardTitle>
          <CardDescription>เข้าสู่ระบบด้วยเบอร์โทรศัพท์</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0XX-XXX-XXXX"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError('');
                  }}
                  className="pl-10"
                  maxLength={10}
                  autoComplete="tel"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !phone}>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  เข้าสู่ระบบ
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            หากยังไม่มีบัญชี กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </CardContent>
      </Card>

      {/* Modal ประกาศแจ้งเตือน */}
      <PriceNoticeModal />
    </main>
  );
}