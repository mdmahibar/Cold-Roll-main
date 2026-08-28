import { Settings as SettingsIcon, Bell, Shield, User, Globe, HelpCircle } from 'lucide-react';

const Settings = () => {
  const sections = [
    { title: 'General', icon: User, desc: 'Manage your profile and account details.' },
    { title: 'Notifications', icon: Bell, desc: 'Configure how you receive updates.' },
    { title: 'Security', icon: Shield, desc: 'Manage passwords and account protection.' },
    { title: 'Language & Region', icon: Globe, desc: 'Set your preferred language and time zone.' },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-slate-400" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">Manage your system preferences and user account settings.</p>
      </div>

      <div className="grid gap-4">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <button key={sec.title} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md group">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{sec.title}</h3>
                <p className="text-sm text-slate-500">{sec.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl bg-blue-50 p-6 border border-blue-100 flex items-start gap-4">
         <HelpCircle className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
         <div>
            <h4 className="font-semibold text-blue-900 text-sm italic">Need assistance?</h4>
            <p className="text-sm text-blue-700 mt-1">If you need help configuring weights and measures for your milk ERP system, please contact support.</p>
         </div>
      </div>
    </div>
  );
};

export default Settings;
