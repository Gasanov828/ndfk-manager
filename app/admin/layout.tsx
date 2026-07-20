import AdminNav from "@/components/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mt-1 space-y-2 sm:-mt-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h1 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {"\u0410\u0434\u043c\u0438\u043d\u043a\u0430"}
        </h1>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
