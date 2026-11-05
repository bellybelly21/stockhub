export default function LoadingScreen() {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0F1729] text-white p-4"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium animate-pulse">
            Verificando credenciales de acceso seguro...
          </p>
        </div>
      </div>
    );
  }