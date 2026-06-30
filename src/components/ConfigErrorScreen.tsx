type Props = {
  message: string;
};

const ConfigErrorScreen = ({ message }: Props) => (
  <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7] px-6">
    <div className="max-w-md w-full rounded-2xl border border-orange-200 bg-white p-8 shadow-sm text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-2xl">
        !
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Yapılandırma hatası</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-6">{message}</p>
      <p className="text-xs text-gray-400">
        Geliştirici: <code className="text-orange-600">npm run env:init</code> çalıştırın ve Supabase
        anahtarlarını doldurun.
      </p>
    </div>
  </div>
);

export default ConfigErrorScreen;
