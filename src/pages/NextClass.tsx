import { useNavigate } from 'react-router-dom';

export default function NextClass() {
  const navigate = useNavigate();

  const menuItems = [
    { label: '联系我们', path: '#' },
    { label: '关于NextClass', path: '#' },
    { label: '个人信息收集清单', path: '#' },
    { label: '第三方信息共享清单', path: '#' },
    { label: '注销账号', path: '#' },
    { label: '退出登录', path: '#' },
  ];

  return (
    <div className="bg-[#F7F7F9] text-on-surface min-h-screen font-body">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#F7F7F9] sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined text-slate-800">arrow_back_ios_new</span>
        </button>
        <h3 className="text-lg font-bold">更多</h3>
        <div className="w-10"></div>
      </div>

      <main className="px-4 pt-2">
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left ${
                index !== menuItems.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <span className="text-[16px] text-slate-800">{item.label}</span>
              <span className="material-symbols-outlined text-slate-300">chevron_right</span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
